import React, { useState, useEffect } from 'react';
import type { User } from './types';
import { getSession, logout, seedDatabase, getUser, getPilgrimsForUser, getLeaders, formatCurrency, getTheme, setTheme, initBackendMode } from './api/dataProvider';
import { NotificationProvider } from './components/NotificationProvider';
import LoginPage from './components/LoginPage';
import PilgrimTable from './components/PilgrimTable';
import PilgrimCard from './components/PilgrimCard';
import CreatePilgrim from './components/CreatePilgrim';
import AdminPanel from './components/AdminPanel';
import Dashboard from './components/Dashboard';
import SettingsPage from './components/SettingsPage';
import {
  LogOut, Shield, Settings, Home, User as UserIcon,
  ChevronRight, BarChart3, Download, Menu, X, Moon, Sun
} from 'lucide-react';

type Page = 'dashboard' | 'table' | 'card' | 'create' | 'admin' | 'settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedPilgrimId, setSelectedPilgrimId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [theme, setThemeState] = useState<'light' | 'dark'>(getTheme());

  useEffect(() => {
    initBackendMode();
    seedDatabase();
    const session = getSession();
    if (session) {
      const u = getUser(session.userId);
      if (u) setUser(u);
    }
  }, []);

  // Горячие клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        if (user && (user.role === 'admin' || user.role === 'employee')) {
          setPage('create');
        }
      }
      
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        if (page === 'table') {
          const searchInput = document.querySelector('input[placeholder*="Поиск"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }
      }
      
      if (e.key === 'Escape') {
        if (page === 'card' || page === 'create') setPage('table');
        else if (page === 'admin' || page === 'settings') setPage('dashboard');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, page]);

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

  const handleExport = async () => {
    const pilgrims = await getPilgrimsForUser();
    const leaders = await getLeaders();
    const csv = [
      ['ID', 'Папка', 'ФИО', 'Возраст', 'Телефон', 'Руководитель', 'Сумма', 'Документы', 'Оплата', 'Загрузка', 'Дата создания'].join(';'),
      ...pilgrims.map((p: any) => [
        p.id.slice(0, 8), p.folderNumber,
        `${p.lastName} ${p.firstName} ${p.middleName}`.trim(),
        p.birthDate ? `${Math.floor((new Date().getTime() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} лет` : '',
        p.phone, leaders.find((l: any) => l.id === p.leaderId)?.fullName || '',
        formatCurrency(p.totalAmount), p.documentStatus === 'complete' ? 'Полный' : 'Неполный',
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

  const handleNavClick = (newPage: Page) => {
    setPage(newPage);
    setMobileMenuOpen(false);
  };

  const roleLabels: Record<string, string> = { admin: 'Администратор', employee: 'Сотрудник', leader: 'Руководитель' };
  const roleColors: Record<string, string> = { admin: 'bg-red-500', employee: 'bg-blue-500', leader: 'bg-purple-500' };

  if (!user) {
    return (
      <NotificationProvider>
        <LoginPage onLogin={handleLogin} />
      </NotificationProvider>
    );
  }

  return (
    <NotificationProvider>
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
        fixed md:relative 
        z-50 md:z-auto
        h-full
        ${sidebarCollapsed ? 'md:w-16' : 'md:w-60'} w-60
        bg-slate-900 text-white flex flex-col transition-all duration-200 flex-shrink-0
      `}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm">CRM Паломники</h1>
              <p className="text-xs text-slate-400">Система учёта v1.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <button onClick={() => handleNavClick('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${page === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            <span>Обзор</span>
          </button>
          <button onClick={() => handleNavClick('table')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${page === 'table' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
            <Home className="w-5 h-5 flex-shrink-0" />
            <span>Паломники</span>
          </button>
          {user.role === 'admin' && (
            <>
              <button onClick={() => handleNavClick('admin')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${page === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span>Админ-панель</span>
              </button>
              <button onClick={() => handleNavClick('settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${page === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span>Настройки</span>
              </button>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${roleColors[user.role]} rounded-full flex items-center justify-center flex-shrink-0`}>
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.fullName}</p>
              <p className="text-xs text-slate-400">{roleLabels[user.role]}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              const newTheme = theme === 'light' ? 'dark' : 'light';
              setTheme(newTheme);
              setThemeState(newTheme);
            }}
            className="w-full mt-3 flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
          </button>
          <button onClick={handleLogout} className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
            <LogOut className="w-4 h-4" /> Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-2 md:px-4 py-2 flex items-center gap-2 md:gap-3 flex-shrink-0">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden md:block p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronRight className={`w-5 h-5 transition ${sidebarCollapsed ? '' : 'rotate-180'}`} />
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500 min-w-0 flex-1">
            <Home className="w-4 h-4 flex-shrink-0 hidden sm:block" />
            <span className="truncate">
              {page === 'dashboard' && 'Обзор'}
              {page === 'table' && 'Паломники'}
              {page === 'card' && 'Карточка'}
              {page === 'create' && 'Новый паломник'}
              {page === 'admin' && 'Админ-панель'}
              {page === 'settings' && 'Настройки'}
            </span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {(page === 'table' || page === 'dashboard') && (
              <button onClick={handleExport} className="px-2 md:px-3 py-1.5 border rounded-lg text-xs md:text-sm flex items-center gap-1 md:gap-1.5 hover:bg-gray-50 text-gray-600">
                <Download className="w-3 h-3 md:w-4 md:h-4" /> 
                <span className="hidden sm:inline">Экспорт</span>
              </button>
            )}
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

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
          {page === 'settings' && user.role === 'admin' && (
            <SettingsPage user={user} onBack={() => setPage('dashboard')} />
          )}
        </div>
      </main>
    </div>
    </NotificationProvider>
  );
}
