import React, { useState, useEffect } from 'react';
import type { Leader, User } from '../types';
import { createPilgrim, getLeaders } from '../store/database';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';

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
    leaderId: '', comments: '', additionalComments: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    setLeaders(getLeaders());
    if (user.role === 'leader' && user.leaderId) {
      setForm(f => ({ ...f, leaderId: user.leaderId! }));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.lastName || !form.firstName) { setError('Укажите ФИО паломника'); return; }
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Фамилия *</label>
                <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Имя *</label>
                <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Отчество</label>
                <input value={form.middleName} onChange={e => setForm({ ...form, middleName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Номер папки</label>
                <input value={form.folderNumber} onChange={e => setForm({ ...form, folderNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="П-XXX" />
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

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Контакты и руководитель</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Телефон</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="+7 (___) ___-__-__" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Руководитель *</label>
                <select value={form.leaderId} onChange={e => setForm({ ...form, leaderId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" required>
                  <option value="">— Выберите —</option>
                  {leaders.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Общая сумма (₽)</label>
                <input type="number" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
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
