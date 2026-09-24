import React, { useState, useEffect } from 'react';
import type { User } from './types';
import { getSession, setSession, logout, seedDatabase, getUser, getPilgrimsForUser, getLeaders, getPayments, getDocuments } from './store/database';
import LoginPage from './components/LoginPage';
import PilgrimTable from './components/PilgrimTable';
import PilgrimCard from './components/PilgrimCard';
import CreatePilgrim from './components/CreatePilgrim';
import AdminPanel from './components/AdminPanel';
import Dashboard from './components/Dashboard';
import {
  LogOut, Shield, Settings, Home, User as UserIcon,
  ChevronRight, BarChart3, Download
} from 'lucide-react';

type Page = 'dashboard' | 'table' | 'card' | 'create' | 'admin';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedPilgrimId, setSelectedPilgrimId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    seedDatabase();
    const session = getSession();
    if (session) {
      const u = getUser(session.userId);
      if (u) setUser(u);
    }
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    setPage('dashboard');
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setPage('dashboard');
  };

  const handleOpenCard = (id: string) => {
    setSelectedPilgrimId(id);
    setPage('card');
  };

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  const handleExport = () => {
    const pilgrims = getPilgrimsForUser();
    const leaders = getLeaders();
    const csv = [
      ['ID', 'Папка', 'Фамилия', 'Имя', 'Отчество', 'Телефон', 'Руководитель', 'Сумма', 'Документы', 'Оплата', 'Загрузка', 'Дата создания'].join(';'),
      ...pilgrims.map(p => [
        p.id.slice(0, 8), p.folderNumber, p.lastName, p.firstName, p.middleName,
        p.phone, leaders.find(l => l.id === p.leaderId)?.fullName || '',
        p.totalAmount, p.documentStatus === 'complete' ? 'Полный' : 'Неполный',
        p.paymentStatus, p.uploadStatus || '', new Date(p.createdAt).toLocaleDateString('ru-RU')
      ].join(';'))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pilgrims_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const roleLabels: Record<string, string> = { admin: 'Администратор', employee: 'Сотрудник', leader: 'Руководитель' };
  const roleColors: Record<string, string> = { admin: 'bg-red-500', employee: 'bg-blue-500', leader: 'bg-purple-500' };

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-60'} bg-slate-900 text-white flex flex-col transition-all duration-200 flex-shrink-0`}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-sm">CRM Паломники</h1>
                <p className="text-xs text-slate-400">Система учёта v1.0</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <button
            onClick={() => setPage('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${page === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Обзор</span>}
          </button>
          <button
            onClick={() => setPage('table')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${page === 'table' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Паломники</span>}
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => setPage('admin')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${page === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>Админ-панель</span>}
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${roleColors[user.role]} rounded-full flex items-center justify-center flex-shrink-0`}>
              <UserIcon className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.fullName}</p>
                <p className="text-xs text-slate-400">{roleLabels[user.role]}</p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button onClick={handleLogout} className="w-full mt-3 flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
              <LogOut className="w-4 h-4" /> Выйти
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b px-4 py-2 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronRight className={`w-5 h-5 transition ${sidebarCollapsed ? '' : 'rotate-180'}`} />
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Home className="w-4 h-4" />
            {page === 'dashboard' && <span>Обзор</span>}
            {page === 'table' && <span>Паломники</span>}
            {page === 'card' && <><ChevronRight className="w-4 h-4" /><span>Карточка паломника</span></>}
            {page === 'create' && <><ChevronRight className="w-4 h-4" /><span>Новый паломник</span></>}
            {page === 'admin' && <><ChevronRight className="w-4 h-4" /><span>Админ-панель</span></>}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {(page === 'table' || page === 'dashboard') && (
              <button onClick={handleExport} className="px-3 py-1.5 border rounded-lg text-sm flex items-center gap-1.5 hover:bg-gray-50 text-gray-600" title="Экспорт в CSV">
                <Download className="w-4 h-4" /> Экспорт
              </button>
            )}
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Выйти">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          {page === 'dashboard' && <Dashboard user={user} />}
          {page === 'table' && (
            <PilgrimTable
              key={refreshKey}
              user={user}
              onOpenCard={handleOpenCard}
              onCreateNew={() => setPage('create')}
              onRefresh={handleRefresh}
            />
          )}
          {page === 'card' && (
            <PilgrimCard
              pilgrimId={selectedPilgrimId}
              user={user}
              onBack={() => setPage('table')}
              onRefresh={handleRefresh}
            />
          )}
          {page === 'create' && (
            <CreatePilgrim
              user={user}
              onBack={() => setPage('table')}
              onCreated={(id) => { handleOpenCard(id); handleRefresh(); }}
            />
          )}
          {page === 'admin' && user.role === 'admin' && (
            <AdminPanel user={user} onBack={() => setPage('table')} />
          )}
        </div>
      </main>
    </div>
  );
}
