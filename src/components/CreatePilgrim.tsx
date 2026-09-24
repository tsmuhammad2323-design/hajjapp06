import React, { useState, useEffect } from 'react';
import type { Leader, User, ProgramType, Tag } from '../types';
import { createPilgrim, getLeaders, getSystemSettings, formatCurrency, generateNextFolderNumber, getAvailableTags } from '../store/database';
import { formatPhone } from '../utils/phone';
import { ArrowLeft, Save, UserPlus, Plane, Tag as TagIcon, Check } from 'lucide-react';

interface CreatePilgrimProps {
  user: User;
  onBack: () => void;
  onCreated: (id: string) => void;
}

export default function CreatePilgrim({ user, onBack, onCreated }: CreatePilgrimProps) {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [form, setForm] = useState({
    folderNumber: '', lastName: '', firstName: '', middleName: '',
    birthDate: '', passportExpiry: '', phone: '', totalAmount: 0,
    leaderId: '', programType: 'direct' as ProgramType,
    tags: [] as string[],
    comments: '', additionalComments: ''
  });
  const [error, setError] = useState('');
  const settings = getSystemSettings();
  const nextFolderNumber = generateNextFolderNumber();
  const availableTags = getAvailableTags();

  useEffect(() => {
    setLeaders(getLeaders());
    
    // Установить программу по умолчанию и её цену
    const defaultProgram = settings.defaultProgram || 'direct';
    const defaultPrice = defaultProgram === 'direct' ? settings.programDirect.price : settings.programEconomy.price;
    
    setForm(f => ({ 
      ...f, 
      programType: defaultProgram as ProgramType,
      totalAmount: defaultPrice,
      leaderId: user.role === 'leader' && user.leaderId ? user.leaderId : f.leaderId
    }));
  }, []);

  const handleProgramChange = (programType: ProgramType) => {
    const price = programType === 'direct' ? settings.programDirect.price : settings.programEconomy.price;
    setForm({ ...form, programType, totalAmount: price });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.lastName.trim()) { setError('Укажите фамилию'); return; }
    if (!form.firstName.trim()) { setError('Укажите имя'); return; }
    if (!form.leaderId) { setError('Выберите руководителя'); return; }
    try {
      const p = createPilgrim(form);
      onCreated(p.id);
    } catch (err: any) {
      setError(err.message || 'Ошибка создания');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><UserPlus className="w-6 h-6 text-blue-600" /> Новый паломник</h1>
            <p className="text-sm text-gray-500">Заполните данные для создания карточки</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Основные данные</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">ФИО *</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input 
                    value={form.lastName} 
                    onChange={e => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" 
                    placeholder="Фамилия"
                    required 
                  />
                  <input 
                    value={form.firstName} 
                    onChange={e => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" 
                    placeholder="Имя"
                    required 
                  />
                  <input 
                    value={form.middleName} 
                    onChange={e => setForm({ ...form, middleName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" 
                    placeholder="Отчество"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Заполните каждое поле отдельно</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Номер папки 
                    <span className="text-xs text-blue-600 ml-1">(авто: {nextFolderNumber})</span>
                  </label>
                  <input 
                    value={form.folderNumber} 
                    onChange={e => setForm({ ...form, folderNumber: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" 
                    placeholder={nextFolderNumber}
                  />
                  <p className="text-xs text-gray-400 mt-1">Оставьте пустым для авто-нумерации (А01-А1500)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Дата рождения</label>
                  <input type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Срок загранпаспорта</label>
                  <input type="date" value={form.passportExpiry} onChange={e => setForm({ ...form, passportExpiry: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Plane className="w-5 h-5 text-blue-500" /> Программа паломничества
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => handleProgramChange('direct')}
                className={`p-4 border-2 rounded-lg text-left transition ${form.programType === 'direct' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">{settings.programDirect.name}</span>
                </div>
                <div className="text-lg font-bold text-blue-700">{formatCurrency(settings.programDirect.price)}</div>
                <div className="text-xs text-gray-500 mt-1">{settings.programDirect.description}</div>
              </button>
              <button
                type="button"
                onClick={() => handleProgramChange('economy')}
                className={`p-4 border-2 rounded-lg text-left transition ${form.programType === 'economy' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold">{settings.programEconomy.name}</span>
                </div>
                <div className="text-lg font-bold text-emerald-700">{formatCurrency(settings.programEconomy.price)}</div>
                <div className="text-xs text-gray-500 mt-1">{settings.programEconomy.description}</div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Контакты и руководитель</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Телефон</label>
                <input 
                  value={form.phone} 
                  onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} 
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" 
                  placeholder="+7 (___) ___-__-__" 
                />
                <p className="text-xs text-gray-400 mt-1">Формат: +7 (XXX) XXX-XX-XX</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Руководитель *</label>
                <select value={form.leaderId} onChange={e => setForm({ ...form, leaderId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" required>
                  <option value="">— Выберите —</option>
                  {leaders.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Общая сумма ({settings.currency})</label>
                <input 
                  type="number" 
                  value={form.totalAmount} 
                  onChange={e => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })} 
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" 
                />
                <p className="text-xs text-gray-400 mt-1">Можно изменить после выбора программы</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Комментарии</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Комментарии</label>
                <textarea value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Дополнительные комментарии</label>
                <textarea value={form.additionalComments} onChange={e => setForm({ ...form, additionalComments: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" rows={2} />
              </div>
            </div>
          </div>

          {/* Теги */}
          {availableTags.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-purple-500" /> Теги
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => {
                  const isSelected = form.tags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setForm({ ...form, tags: form.tags.filter(id => id !== tag.id) });
                        } else {
                          setForm({ ...form, tags: [...form.tags, tag.id] });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition ${
                        isSelected 
                          ? 'text-white border-transparent' 
                          : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                      style={isSelected ? { backgroundColor: tag.color } : {}}
                    >
                      {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
              <Save className="w-5 h-5" /> Создать паломника
            </button>
            <button type="button" onClick={onBack} className="px-6 py-3 border rounded-lg font-medium hover:bg-gray-50">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
