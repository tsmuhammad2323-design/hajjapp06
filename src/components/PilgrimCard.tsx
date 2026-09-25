import React, { useState, useEffect } from 'react';
import type { Pilgrim, Leader, Payment, Receipt, AuditLogEntry, User } from '../types';
import {
  getPilgrim, updatePilgrim, getLeaders, getPayments, addPayment, getReceipts, getAuditLogs, getUser,
  formatCurrency, calculateAge, getPassportExpiryStatus, getSystemSettings, getAvailableTags, getTagById
} from '../store/database';
import { formatPhone } from '../utils/phone';
import { numberToWords } from '../utils/numberToWords';
import { exportPilgrimToPDF } from '../utils/pdfExport';
import {
  ArrowLeft, Save, Printer, FileText, CreditCard, History,
  User as UserIcon, FileCheck, AlertCircle, CheckCircle,
  Edit3, Tag as TagIcon, FileDown
} from 'lucide-react';

interface PilgrimCardProps {
  pilgrimId: string;
  user: User;
  onBack: () => void;
  onRefresh: () => void;
}

export default function PilgrimCard({ pilgrimId, user, onBack, onRefresh }: PilgrimCardProps) {
  const [pilgrim, setPilgrim] = useState<Pilgrim | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Pilgrim>>({});
  const [paymentAmount, setPaymentAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'payments' | 'history'>('info');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadData(); }, [pilgrimId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p' && pilgrim) {
        e.preventDefault();
        exportPilgrimToPDF(pilgrim);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pilgrim]);

  const loadData = () => {
    try {
      const p = getPilgrim(pilgrimId);
      if (!p) { onBack(); return; }
      if (!p.programType) {
        const settings = getSystemSettings();
        p.programType = settings.defaultProgram;
      }
      setPilgrim(p);
      setFormData(p);
      setLeaders(getLeaders());
      setPayments(getPayments(pilgrimId));
      setReceipts(getReceipts(pilgrimId));
      setAuditLogs(getAuditLogs(pilgrimId));
    } catch (err) {
      console.error('Error loading pilgrim:', err);
      onBack();
    }
  };

  const showNotif = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = () => {
    try {
      updatePilgrim(pilgrimId, formData);
      setEditing(false);
      loadData();
      onRefresh();
      showNotif('success', 'Данные сохранены');
    } catch (err: any) {
      showNotif('error', err.message || 'Ошибка сохранения');
    }
  };

  const handleAddPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { showNotif('error', 'Введите корректную сумму'); return; }
    try {
      addPayment(pilgrimId, amount);
      setPaymentAmount('');
      loadData();
      showNotif('success', `Оплата ${amount.toLocaleString()} ₽ принята`);
    } catch (err: any) {
      showNotif('error', err.message);
    }
  };

  const handlePrintReceipt = (receipt: Receipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const amountInWords = numberToWords(receipt.amount);
    const date = new Date(receipt.createdAt);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const employee = getUser(receipt.createdBy)?.fullName || '________________________';
    const settings = getSystemSettings();
    const template = settings.receiptTemplateConfig;
    
    const replaceVars = (text: string): string => {
      return text
        .replace(/\{\{number\}\}/g, receipt.number)
        .replace(/\{\{day\}\}/g, String(day))
        .replace(/\{\{month\}\}/g, String(month < 10 ? '0' + month : month))
        .replace(/\{\{year\}\}/g, String(year))
        .replace(/\{\{pilgrimName\}\}/g, receipt.pilgrimName)
        .replace(/\{\{amount\}\}/g, receipt.amount.toLocaleString('ru-RU'))
        .replace(/\{\{amountWords\}\}/g, amountInWords)
        .replace(/\{\{employee\}\}/g, employee);
    };
    
    const fieldsHTML = template.fields.map(field => `
      <div class="field">
        <div class="field-label">${field.label}</div>
        <div class="field-value ${field.isAmount ? 'amount-digits' : ''} ${field.isLarge ? 'large-field' : ''}">${replaceVars(field.value)}</div>
      </div>
    `).join('');
    
    const receiptHTML = `
      <div class="receipt">
        <div class="receipt-header">
          ${template.headerLeft ? `<div class="receipt-left">${replaceVars(template.headerLeft)}</div>` : ''}
          <div class="receipt-title">${template.title}</div>
          <div class="receipt-meta">${replaceVars(template.headerRight).replace(/\n/g, '<br>')}</div>
        </div>
        <div class="receipt-body">${fieldsHTML}</div>
        <div class="receipt-footer">
          <div class="footer-row">
            <div class="footer-field">
              <div class="field-label">${template.footerText}</div>
              <div class="field-value">${replaceVars('{{employee}}')}</div>
            </div>
          </div>
          <div class="footer-row">
            ${template.showSignature ? `
              <div class="footer-field signature-field">
                <div class="field-label">Подпись исполнителя:</div>
                <div class="signature-line">_________________</div>
              </div>
            ` : ''}
            ${template.showStamp ? `
              <div class="footer-field stamp-field">
                <div class="field-label">М.П.</div>
                <div class="stamp-circle"></div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    
    const pageContent = template.copies === 2 
      ? `${receiptHTML}<div class="cut-line"></div>${receiptHTML}`
      : receiptHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Квитанция ${receipt.number}</title>
        <style>
          @page { size: A4; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 12pt; }
          .page { width: 210mm; height: 297mm; padding: 10mm; display: flex; flex-direction: column; }
          .receipt { flex: 1; display: flex; flex-direction: column; padding: 5mm; border: 1px solid #ccc; }
          .receipt-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; border-bottom: 2px solid #333; padding-bottom: 3mm; }
          .receipt-title { font-size: 16pt; font-weight: bold; text-align: center; flex: 1; }
          .receipt-meta { text-align: right; font-size: 10pt; }
          .receipt-body { flex: 1; display: flex; flex-direction: column; gap: 4mm; }
          .field { display: flex; flex-direction: column; }
          .field-label { font-size: 10pt; margin-bottom: 1mm; }
          .field-value { font-size: 12pt; border-bottom: 1px solid #333; padding: 2mm 0; min-height: 6mm; }
          .amount-digits { font-size: 14pt; font-weight: bold; }
          .receipt-footer { margin-top: 6mm; }
          .footer-row { display: flex; gap: 5mm; margin-top: 4mm; }
          .footer-field { flex: 1; }
          .signature-field { flex: 2; }
          .stamp-field { flex: 1; text-align: center; }
          .signature-line { border-bottom: 1px solid #333; padding: 2mm 0; margin-top: 2mm; }
          .stamp-circle { width: 25mm; height: 25mm; border: 2px dashed #999; border-radius: 50%; margin: 2mm auto; }
          .cut-line { width: 100%; height: 0; border-top: 2px dashed #666; margin: 5mm 0; position: relative; }
          .cut-line::before { content: '✂'; position: absolute; left: 5mm; top: -8pt; font-size: 14pt; background: white; padding: 0 2mm; }
        </style>
      </head>
      <body>
        <div class="page">${pageContent}</div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const getStatusBadge = (value: string, type: string) => {
    const styles: Record<string, string> = {
      'complete': 'bg-emerald-100 text-emerald-700',
      'incomplete': 'bg-amber-100 text-amber-700',
      'not_paid': 'bg-red-100 text-red-700',
      'partial': 'bg-yellow-100 text-yellow-700',
      'paid': 'bg-emerald-100 text-emerald-700',
      'overpaid': 'bg-blue-100 text-blue-700',
      'reserve': 'bg-purple-100 text-purple-700',
      'main': 'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      'complete': 'Полный комплект', 'incomplete': 'Неполный',
      'not_paid': 'Не оплачено', 'partial': 'Частично', 'paid': 'Оплачено', 'overpaid': 'Переплата',
      'reserve': 'Резерв', 'main': 'Основа',
    };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${styles[value] || 'bg-gray-100 text-gray-600'}`}>{labels[value] || '—'}</span>;
  };

  if (!pilgrim) return null;

  const canEdit = user.role === 'admin' || user.role === 'employee';
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = pilgrim.totalAmount - totalPaid;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notification.text}
        </div>
      )}

      <div className="bg-white border-b px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-start md:items-center gap-2 md:gap-4 flex-wrap">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-xl font-bold truncate">{pilgrim.lastName} {pilgrim.firstName} {pilgrim.middleName}</h1>
            <div className="flex items-center gap-2 md:gap-3 mt-1 text-xs md:text-sm text-gray-500 flex-wrap">
              <span>Папка: {pilgrim.folderNumber || '—'}</span>
              <span className="hidden md:inline">•</span>
              <span className="truncate">Рук.: {leaders.find(l => l.id === pilgrim.leaderId)?.fullName || '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            {getStatusBadge(pilgrim.documentStatus, 'doc')}
            {getStatusBadge(pilgrim.paymentStatus, 'pay')}
            {pilgrim.uploadStatus && getStatusBadge(pilgrim.uploadStatus, 'upload')}
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm flex items-center justify-center gap-1.5 hover:bg-blue-700">
                <Edit3 className="w-4 h-4" /> Редактировать
              </button>
            )}
            {editing && (
              <>
                <button onClick={handleSave} className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs md:text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-700">
                  <Save className="w-4 h-4" /> Сохранить
                </button>
                <button onClick={() => { setEditing(false); setFormData(pilgrim); }} className="flex-1 md:flex-none px-3 md:px-4 py-2 border rounded-lg text-xs md:text-sm hover:bg-gray-50">
                  Отмена
                </button>
              </>
            )}
            <button 
              onClick={() => exportPilgrimToPDF(pilgrim)} 
              className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg text-xs md:text-sm flex items-center justify-center gap-1.5 hover:bg-purple-700"
              title="Экспорт в PDF (Ctrl+P)"
            >
              <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b px-2 md:px-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {[
            { key: 'info', label: 'Информация', icon: UserIcon },
            { key: 'documents', label: `Документы (${[pilgrim.hasPhoto, pilgrim.hasPassport, pilgrim.hasRegistration, pilgrim.hasForeignPassport].filter(Boolean).length}/4)`, icon: FileCheck },
            { key: 'payments', label: `Оплата (${formatCurrency(totalPaid)})`, icon: CreditCard },
            { key: 'history', label: 'История', icon: History },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition flex items-center gap-1 md:gap-1.5 whitespace-nowrap ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 md:p-6">
        {activeTab === 'info' && (
          <div className="max-w-3xl space-y-4 md:space-y-6">
            <div className="bg-white rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><UserIcon className="w-5 h-5" /> Основная информация</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ФИО</label>
                  {editing ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input value={formData.lastName || ''} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Фамилия" />
                      <input value={formData.firstName || ''} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Имя" />
                      <input value={formData.middleName || ''} onChange={e => setFormData({ ...formData, middleName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Отчество" />
                    </div>
                  ) : <p className="text-sm font-medium">{`${pilgrim.lastName} ${pilgrim.firstName} ${pilgrim.middleName}`.trim() || '—'}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Номер папки</label>
                    {editing ? (
                      <input value={formData.folderNumber || ''} onChange={e => setFormData({ ...formData, folderNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    ) : <p className="text-sm font-medium">{pilgrim.folderNumber || '—'}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Дата рождения</label>
                    {editing ? (
                      <input type="date" value={formData.birthDate || ''} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    ) : (
                      <p className="text-sm">
                        {pilgrim.birthDate ? (
                          <>
                            {new Date(pilgrim.birthDate).toLocaleDateString('ru-RU')} 
                            <span className="text-gray-400 ml-2">({calculateAge(pilgrim.birthDate)} лет)</span>
                          </>
                        ) : '—'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Срок загранпаспорта</label>
                    {editing ? (
                      <input type="date" value={formData.passportExpiry || ''} onChange={e => setFormData({ ...formData, passportExpiry: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    ) : (() => {
                      if (!pilgrim.passportExpiry) return <p className="text-sm">—</p>;
                      const status = getPassportExpiryStatus(pilgrim.passportExpiry);
                      const colors = { valid: 'text-emerald-700', warning: 'text-amber-700', expired: 'text-red-700', empty: 'text-gray-400' };
                      const labels = { 
                        valid: `Действителен (${status.daysLeft} дн.)`, 
                        warning: `Истекает через ${status.daysLeft} дн. ⚠️`, 
                        expired: `Просрочен на ${Math.abs(status.daysLeft)} дн. ❌`, 
                        empty: '' 
                      };
                      return (
                        <p className={`text-sm font-medium ${colors[status.status]}`}>
                          {new Date(pilgrim.passportExpiry).toLocaleDateString('ru-RU')}
                          <span className="ml-2 text-xs">{labels[status.status]}</span>
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">Контакты</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Телефон</label>
                  {editing ? (
                    <input 
                      value={formData.phone || ''} 
                      onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })} 
                      className="w-full px-3 py-2 border rounded-lg text-sm" 
                      placeholder="+7 (___) ___-__-__"
                    />
                  ) : <p className="text-sm">{pilgrim.phone || '—'}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Руководитель</label>
                  {editing ? (
                    <select value={formData.leaderId || ''} onChange={e => setFormData({ ...formData, leaderId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="">— Выберите —</option>
                      {leaders.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                    </select>
                  ) : <p className="text-sm">{leaders.find(l => l.id === pilgrim.leaderId)?.fullName || '—'}</p>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><TagIcon className="w-5 h-5 text-purple-500" /> Теги</h3>
              {editing ? (
                <div className="flex flex-wrap gap-2">
                  {getAvailableTags().map(tag => {
                    const isSelected = (formData.tags || []).includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          const newTags = isSelected 
                            ? (formData.tags || []).filter(id => id !== tag.id)
                            : [...(formData.tags || []), tag.id];
                          setFormData({ ...formData, tags: newTags });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border-2 transition ${isSelected ? 'text-white border-transparent' : 'bg-white border-gray-300 text-gray-600'}`}
                        style={isSelected ? { backgroundColor: tag.color } : {}}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(pilgrim.tags || []).length === 0 ? (
                    <span className="text-sm text-gray-400">Нет тегов</span>
                  ) : (
                    (pilgrim.tags || []).map(tagId => {
                      const tag = getTagById(tagId);
                      if (!tag) return null;
                      return (
                        <span key={tag.id} className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: tag.color }}>
                          {tag.name}
                        </span>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Программа и оплата</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Программа</label>
                  {editing ? (
                    <select 
                      value={formData.programType || 'direct'} 
                      onChange={e => {
                        const settings = getSystemSettings();
                        const newProgram = e.target.value as any;
                        const newPrice = newProgram === 'direct' ? settings.programDirect.price : settings.programEconomy.price;
                        setFormData({ ...formData, programType: newProgram, totalAmount: newPrice });
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="direct">{getSystemSettings().programDirect.name}</option>
                      <option value="economy">{getSystemSettings().programEconomy.name}</option>
                    </select>
                  ) : (
                    <p className="text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${(pilgrim.programType || 'direct') === 'direct' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                        {(pilgrim.programType || 'direct') === 'direct' ? getSystemSettings().programDirect.name : getSystemSettings().programEconomy.name}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Общая сумма</label>
                  {editing ? (
                    <input type="number" value={formData.totalAmount || 0} onChange={e => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  ) : <p className="text-sm font-semibold">{formatCurrency(pilgrim.totalAmount)}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-xl border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Документы паломника</h3>
                {getStatusBadge(pilgrim.documentStatus, 'doc')}
              </div>
              <div className="space-y-3">
                {[
                  { key: 'hasPhoto', label: 'Фото', desc: 'Фотография 3x4' },
                  { key: 'hasPassport', label: 'Паспорт РФ', desc: 'Копия паспорта' },
                  { key: 'hasRegistration', label: 'Прописка', desc: 'Копия прописки' },
                  { key: 'hasForeignPassport', label: 'Загранпаспорт', desc: 'Копия загранпаспорта' }
                ].map(doc => (
                  <label key={doc.key} className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <input
                      type="checkbox"
                      checked={(pilgrim as any)[doc.key]}
                      onChange={e => {
                        updatePilgrim(pilgrimId, { [doc.key]: e.target.checked });
                        loadData();
                      }}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{doc.label}</div>
                      <div className="text-sm text-gray-500">{doc.desc}</div>
                    </div>
                    {(pilgrim as any)[doc.key] ? (
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-amber-500" />
                    )}
                  </label>
                ))}
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Статус:</strong> {pilgrim.hasPhoto && pilgrim.hasPassport && pilgrim.hasRegistration && pilgrim.hasForeignPassport 
                    ? '✅ Все документы собраны' 
                    : '⚠️ Не все документы предоставлены'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-gray-700 mb-4">Информация об оплате</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Общая сумма</p>
                  <p className="text-lg font-bold">{formatCurrency(pilgrim.totalAmount)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Оплачено</p>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${remaining > 0 ? 'bg-red-50' : 'bg-blue-50'}`}>
                  <p className="text-xs text-gray-500">{remaining > 0 ? 'Остаток' : 'Переплата'}</p>
                  <p className={`text-lg font-bold ${remaining > 0 ? 'text-red-700' : 'text-blue-700'}`}>{formatCurrency(Math.abs(remaining))}</p>
                </div>
              </div>

              {canEdit && (
                <div className="flex gap-2 mb-4 p-4 bg-blue-50 rounded-lg">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="Сумма оплаты"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button onClick={handleAddPayment} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> Принять оплату
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-gray-700 mb-4">История оплат</h3>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Оплат пока нет</p>
              ) : (
                <div className="space-y-3">
                  {payments.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()).map(payment => {
                    const receipt = receipts.find(r => r.paymentId === payment.id);
                    return (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-gray-500">{new Date(payment.paidAt).toLocaleString('ru-RU')} • {payment.method}</p>
                        </div>
                        {receipt && (
                          <button onClick={() => handlePrintReceipt(receipt)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs flex items-center gap-1.5">
                            <Printer className="w-3 h-3" /> Квитанция {receipt.number}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-3xl">
            <div className="bg-white rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-gray-700 mb-4">История изменений</h3>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">История пуста</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex gap-3 p-3 border-l-2 border-blue-200 bg-gray-50 rounded-r-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{log.action.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString('ru-RU')}</span>
                        </div>
                        <p className="text-sm text-gray-700">{log.userName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
