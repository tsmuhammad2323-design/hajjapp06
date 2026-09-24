import React, { useState, useEffect, useRef } from 'react';
import type { Pilgrim, Leader, DocumentFile, Payment, Receipt, AuditLogEntry, DocumentType, User } from '../types';
import {
  getPilgrim, updatePilgrim, getLeaders, getDocuments, uploadDocument, deleteDocument,
  getPayments, addPayment, getReceipts, getAuditLogs, getSession, getUser,
  formatCurrency, calculateAge, getPassportExpiryStatus, getSystemSettings
} from '../store/database';
import { formatPhone } from '../utils/phone';
import {
  ArrowLeft, Save, Upload, Trash2, Printer, FileText, CreditCard, History,
  User as UserIcon, Phone, Calendar, FileCheck, AlertCircle, CheckCircle,
  XCircle, Download, Image, File, Eye, Edit3
} from 'lucide-react';

interface PilgrimCardProps {
  pilgrimId: string;
  user: User;
  onBack: () => void;
  onRefresh: () => void;
}

const DOC_LABELS: Record<DocumentType, string> = {
  photo: 'Фото', passport: 'Паспорт РФ', registration: 'Прописка', foreign_passport: 'Загранпаспорт'
};

export default function PilgrimCard({ pilgrimId, user, onBack, onRefresh }: PilgrimCardProps) {
  const [pilgrim, setPilgrim] = useState<Pilgrim | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Pilgrim>>({});
  const [paymentAmount, setPaymentAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'payments' | 'history'>('info');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewDoc, setViewDoc] = useState<DocumentFile | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { loadData(); }, [pilgrimId]);

  const loadData = () => {
    const p = getPilgrim(pilgrimId);
    if (!p) { onBack(); return; }
    setPilgrim(p);
    setFormData(p);
    setLeaders(getLeaders());
    setDocuments(getDocuments(pilgrimId));
    setPayments(getPayments(pilgrimId));
    setReceipts(getReceipts(pilgrimId));
    setAuditLogs(getAuditLogs(pilgrimId));
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

  const handleFileUpload = async (type: DocumentType, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showNotif('error', 'Файл слишком большой (макс. 10 МБ)');
      return;
    }
    try {
      await uploadDocument(pilgrimId, type, file);
      loadData();
      showNotif('success', 'Документ загружен');
    } catch (err: any) {
      showNotif('error', err.message || 'Ошибка загрузки');
    }
  };

  const handleDeleteDoc = (docId: string) => {
    if (confirm('Удалить документ?')) {
      deleteDocument(docId);
      loadData();
      showNotif('success', 'Документ удалён');
    }
  };

  const handleAddPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { showNotif('error', 'Введите корректную сумму'); return; }
    try {
      addPayment(pilgrimId, amount);
      setPaymentAmount('');
      loadData();
      showNotif('success', `Оплата ${amount.toLocaleString()} ₽ принята. Квитанция создана.`);
    } catch (err: any) {
      showNotif('error', err.message);
    }
  };

  const handlePrintReceipt = (receipt: Receipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Квитанция ${receipt.number}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 18px; margin: 0; }
        .header p { font-size: 14px; color: #666; margin: 5px 0; }
        .info { margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .info-label { font-weight: bold; }
        .amount { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; padding: 15px; border: 2px solid #333; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; }
        .signature { border-top: 1px solid #333; padding-top: 5px; width: 200px; text-align: center; font-size: 12px; }
      </style></head><body>
      <div class="header">
        <h1>КВИТАНЦИЯ ОБ ОПЛАТЕ</h1>
        <p>№ ${receipt.number} от ${new Date(receipt.createdAt).toLocaleDateString('ru-RU')}</p>
      </div>
      <div class="info">
        <div class="info-row"><span class="info-label">Плательщик:</span><span>${receipt.pilgrimName}</span></div>
        <div class="info-row"><span class="info-label">Назначение:</span><span>Оплата услуг по организации паломничества</span></div>
        <div class="info-row"><span class="info-label">Принял:</span><span>${getUser(receipt.createdBy)?.fullName || 'Сотрудник'}</span></div>
      </div>
      <div class="amount">${receipt.amount.toLocaleString('ru-RU')} ₽</div>
      <div class="footer">
        <div class="signature">Подпись плательщика</div>
        <div class="signature">Подпись кассира</div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
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

      {/* View document modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewDoc(null)}>
          <div className="bg-white rounded-xl max-w-3xl max-h-[90vh] overflow-auto p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{DOC_LABELS[viewDoc.type]} — {viewDoc.fileName}</h3>
              <button onClick={() => setViewDoc(null)} className="p-1 hover:bg-gray-100 rounded"><XCircle className="w-5 h-5" /></button>
            </div>
            {viewDoc.mimeType.startsWith('image/') ? (
              <img src={viewDoc.dataUrl} alt={viewDoc.fileName} className="max-w-full max-h-[70vh] object-contain mx-auto" />
            ) : (
              <div className="text-center py-12 text-gray-400">
                <File className="w-16 h-16 mx-auto mb-4" />
                <p>Предпросмотр недоступен для данного типа файла</p>
                <a href={viewDoc.dataUrl} download={viewDoc.fileName} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
                  <Download className="w-4 h-4" /> Скачать
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
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
              <span className="hidden md:inline">ID: {pilgrim.id.slice(0, 8)}</span>
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
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-2 md:px-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {[
            { key: 'info', label: 'Информация', icon: UserIcon },
            { key: 'documents', label: `Документы (${documents.length}/4)`, icon: FileCheck },
            { key: 'payments', label: `Оплата (${totalPaid.toLocaleString()} ₽)`, icon: CreditCard },
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 md:p-6">
        {activeTab === 'info' && (
          <div className="max-w-3xl space-y-4 md:space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><UserIcon className="w-5 h-5" /> Основная информация</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ФИО</label>
                  {editing ? (
                    <input 
                      value={`${formData.lastName || ''} ${formData.firstName || ''} ${formData.middleName || ''}`.trim()} 
                      onChange={e => {
                        const parts = e.target.value.trim().split(/\s+/);
                        setFormData({ 
                          ...formData, 
                          lastName: parts[0] || '', 
                          firstName: parts[1] || '', 
                          middleName: parts[2] || '' 
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm" 
                      placeholder="Фамилия Имя Отчество"
                    />
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

            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Phone className="w-5 h-5" /> Контакты</h3>
              <div className="grid grid-cols-2 gap-4">
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

            <div className="bg-white rounded-xl border p-6">
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${pilgrim.programType === 'direct' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                        {pilgrim.programType === 'direct' ? getSystemSettings().programDirect.name : getSystemSettings().programEconomy.name}
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
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Статус загрузки</label>
                  {editing ? (
                    <select value={formData.uploadStatus || ''} onChange={e => setFormData({ ...formData, uploadStatus: e.target.value as any })} className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="">—</option>
                      <option value="reserve">Резерв</option>
                      <option value="main">Основа</option>
                    </select>
                  ) : <div>{pilgrim.uploadStatus ? getStatusBadge(pilgrim.uploadStatus, 'upload') : <span className="text-sm text-gray-400">—</span>}</div>}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Комментарии</label>
                  {editing ? (
                    <textarea value={formData.comments || ''} onChange={e => setFormData({ ...formData, comments: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
                  ) : <p className="text-sm">{pilgrim.comments || '—'}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Дополнительные комментарии</label>
                  {editing ? (
                    <textarea value={formData.additionalComments || ''} onChange={e => setFormData({ ...formData, additionalComments: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
                  ) : <p className="text-sm">{pilgrim.additionalComments || '—'}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Документы паломника</h3>
                {getStatusBadge(pilgrim.documentStatus, 'doc')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(['photo', 'passport', 'registration', 'foreign_passport'] as DocumentType[]).map(type => {
                  const doc = documents.find(d => d.type === type);
                  return (
                    <div key={type} className={`border rounded-xl p-4 ${doc ? 'border-emerald-200 bg-emerald-50/30' : 'border-dashed border-gray-300 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{DOC_LABELS[type]}</span>
                        {doc ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      {doc ? (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
                          <p className="text-xs text-gray-400">{(doc.fileSize / 1024).toFixed(1)} КБ • {new Date(doc.uploadedAt).toLocaleDateString('ru-RU')}</p>
                          <div className="flex gap-2">
                            <button onClick={() => setViewDoc(doc)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Просмотр
                            </button>
                            {canEdit && (
                              <>
                                <button onClick={() => fileInputRefs.current[type]?.click()} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 flex items-center gap-1">
                                  <Upload className="w-3 h-3" /> Заменить
                                </button>
                                <button onClick={() => handleDeleteDoc(doc.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : canEdit ? (
                        <button onClick={() => fileInputRefs.current[type]?.click()} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-2">
                          <Upload className="w-4 h-4" /> Загрузить
                        </button>
                      ) : (
                        <p className="text-sm text-gray-400">Не загружен</p>
                      )}
                      <input ref={el => { fileInputRefs.current[type] = el; }} type="file" className="hidden" accept="image/*,.pdf" onChange={e => { if (e.target.files?.[0]) handleFileUpload(type, e.target.files[0]); e.target.value = ''; }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-xl border p-6">
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

            <div className="bg-white rounded-xl border p-6">
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

            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-700 mb-4">Квитанции</h3>
              {receipts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Квитанций пока нет</p>
              ) : (
                <div className="space-y-2">
                  {receipts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(receipt => (
                    <div key={receipt.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{receipt.number}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(receipt.amount)} • {new Date(receipt.createdAt).toLocaleString('ru-RU')}</p>
                      </div>
                      <button onClick={() => handlePrintReceipt(receipt)} className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs flex items-center gap-1.5">
                        <Printer className="w-3 h-3" /> Печать
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-3xl">
            <div className="bg-white rounded-xl border p-6">
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
                        {log.oldValue && log.newValue && (
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="text-red-500">{log.oldValue.slice(0, 50)}</span> → <span className="text-emerald-600">{log.newValue.slice(0, 50)}</span>
                          </p>
                        )}
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
