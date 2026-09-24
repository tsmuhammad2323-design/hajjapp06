import React, { useState, useEffect } from 'react';
import type { User, Leader, UserRole, AuditLogEntry, TelegramNotification } from '../types';
import { getUsers, createUser, updateUser, deleteUser, getLeaders, createLeader, updateLeader, deleteLeader, getAuditLogs, getTelegramNotifications } from '../store/database';
import { ArrowLeft, Users, Shield, UserPlus, Trash2, Edit3, Save, History, Settings, MessageCircle, Send } from 'lucide-react';

interface AdminPanelProps {
  user: User;
  onBack: () => void;
}

export default function AdminPanel({ user, onBack }: AdminPanelProps) {
  const [tab, setTab] = useState<'users' | 'leaders' | 'audit' | 'telegram'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [telegramNotifs, setTelegramNotifs] = useState<TelegramNotification[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingLeader, setEditingLeader] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateLeader, setShowCreateLeader] = useState(false);
  const [newUser, setNewUser] = useState({ login: '', password: '', fullName: '', role: 'employee' as UserRole, leaderId: '' });
  const [newLeader, setNewLeader] = useState({ fullName: '', phone: '', telegramChatId: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setUsers(getUsers());
    setLeaders(getLeaders());
    setAuditLogs(getAuditLogs().slice(0, 100));
    setTelegramNotifs(getTelegramNotifications().slice(0, 50));
  };

  const handleCreateUser = () => {
    setError('');
    if (!newUser.login || !newUser.password || !newUser.fullName) { setError('Заполните все обязательные поля'); return; }
    try {
      createUser(newUser);
      setNewUser({ login: '', password: '', fullName: '', role: 'employee', leaderId: '' });
      setShowCreateUser(false);
      loadData();
    } catch (err: any) { setError(err.message); }
  };

  const handleCreateLeader = () => {
    setError('');
    if (!newLeader.fullName || !newLeader.phone) { setError('Заполните все обязательные поля'); return; }
    try {
      createLeader(newLeader);
      setNewLeader({ fullName: '', phone: '', telegramChatId: '' });
      setShowCreateLeader(false);
      loadData();
    } catch (err: any) { setError(err.message); }
  };

  const handleDeleteUser = (id: string) => {
    if (id === user.id) { setError('Нельзя удалить свой аккаунт'); return; }
    if (confirm('Удалить пользователя?')) { deleteUser(id); loadData(); }
  };

  const handleDeleteLeader = (id: string) => {
    if (confirm('Удалить руководителя?')) { deleteLeader(id); loadData(); }
  };

  const roleLabels: Record<UserRole, string> = { admin: 'Администратор', employee: 'Сотрудник', leader: 'Руководитель' };
  const roleColors: Record<UserRole, string> = { admin: 'bg-red-100 text-red-700', employee: 'bg-blue-100 text-blue-700', leader: 'bg-purple-100 text-purple-700' };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-blue-600" /> Панель администратора</h1>
            <p className="text-sm text-gray-500">Управление пользователями, руководителями и журналом</p>
          </div>
        </div>
      </div>

      <div className="bg-white border-b px-6">
        <div className="flex gap-0">
          {[
            { key: 'users', label: 'Пользователи', icon: Shield, count: users.length },
            { key: 'leaders', label: 'Руководители', icon: Users, count: leaders.length },
            { key: 'telegram', label: 'Telegram', icon: MessageCircle, count: telegramNotifs.length },
            { key: 'audit', label: 'Журнал', icon: History, count: auditLogs.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key as any); setError(''); }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <t.icon className="w-4 h-4" /> {t.label} <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {tab === 'users' && (
          <div className="max-w-4xl space-y-4">
            <button onClick={() => setShowCreateUser(!showCreateUser)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-blue-700">
              <UserPlus className="w-4 h-4" /> Добавить пользователя
            </button>

            {showCreateUser && (
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold mb-4">Новый пользователь</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Логин *</label>
                    <input value={newUser.login} onChange={e => setNewUser({ ...newUser, login: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Пароль *</label>
                    <input value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">ФИО *</label>
                    <input value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Роль *</label>
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })} className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="admin">Администратор</option>
                      <option value="employee">Сотрудник</option>
                      <option value="leader">Руководитель</option>
                    </select>
                  </div>
                  {newUser.role === 'leader' && (
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Привязать к руководителю</label>
                      <select value={newUser.leaderId} onChange={e => setNewUser({ ...newUser, leaderId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="">—</option>
                        {leaders.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleCreateUser} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">Создать</button>
                  <button onClick={() => setShowCreateUser(false)} className="px-4 py-2 border rounded-lg text-sm">Отмена</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Логин</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">ФИО</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Роль</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Создан</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{u.login}</td>
                      <td className="px-4 py-3 text-sm">{u.fullName}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>{roleLabels[u.role]}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'leaders' && (
          <div className="max-w-4xl space-y-4">
            <button onClick={() => setShowCreateLeader(!showCreateLeader)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-blue-700">
              <UserPlus className="w-4 h-4" /> Добавить руководителя
            </button>

            {showCreateLeader && (
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold mb-4">Новый руководитель</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">ФИО *</label>
                    <input value={newLeader.fullName} onChange={e => setNewLeader({ ...newLeader, fullName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Телефон *</label>
                    <input value={newLeader.phone} onChange={e => setNewLeader({ ...newLeader, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Telegram Chat ID</label>
                    <input value={newLeader.telegramChatId} onChange={e => setNewLeader({ ...newLeader, telegramChatId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Для уведомлений" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleCreateLeader} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">Создать</button>
                  <button onClick={() => setShowCreateLeader(false)} className="px-4 py-2 border rounded-lg text-sm">Отмена</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">ФИО</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Телефон</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Telegram ID</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.map(l => (
                    <tr key={l.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{l.fullName}</td>
                      <td className="px-4 py-3 text-sm">{l.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{l.telegramChatId || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteLeader(l.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'telegram' && (
          <div className="max-w-4xl space-y-4">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" /> Telegram-уведомления
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Уведомления отправляются руководителям при изменении данных паломников. Для работы требуется настроить Telegram Bot Token в конфигурации.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">Как подключить:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Создайте бота через @BotFather в Telegram</li>
                  <li>Получите токен бота</li>
                  <li>Укажите Telegram Chat ID для каждого руководителя</li>
                  <li>В production-версии настройте переменную TELEGRAM_BOT_TOKEN</li>
                </ol>
              </div>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h4 className="text-sm font-semibold text-gray-600">Последние уведомления ({telegramNotifs.length})</h4>
              </div>
              {telegramNotifs.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Send className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Уведомлений пока нет</p>
                </div>
              ) : (
                <div className="divide-y">
                  {telegramNotifs.map(notif => (
                    <div key={notif.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${notif.status === 'sent' ? 'bg-emerald-500' : notif.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <span className="text-sm font-medium">{leaders.find(l => l.id === notif.leaderId)?.fullName || '—'}</span>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(notif.sentAt).toLocaleString('ru-RU')}</span>
                      </div>
                      <p className="text-sm text-gray-600 ml-4">{notif.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'audit' && (
          <div className="max-w-4xl">
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Дата</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Пользователь</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Действие</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Объект</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Детали</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('ru-RU')}</td>
                      <td className="px-4 py-2 text-sm">{log.userName}</td>
                      <td className="px-4 py-2"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{log.action.replace(/_/g, ' ')}</span></td>
                      <td className="px-4 py-2 text-sm text-gray-600">{log.objectName || log.objectId.slice(0, 8)}</td>
                      <td className="px-4 py-2 text-xs text-gray-400 max-w-[200px] truncate">{log.newValue || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
