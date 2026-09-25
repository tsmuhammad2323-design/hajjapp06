import React, { useState } from 'react';
import { login } from '../store/database';
import type { User } from '../types';
import { LogIn, Shield, Users } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loginStr, setLoginStr] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      const result = login(loginStr, password);
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Ошибка входа');
      }
      setLoading(false);
    }, 300);
  };

  const demoAccounts = [
    { login: 'admin', password: 'admin123', role: 'Администратор' },
    { login: 'employee', password: 'emp123', role: 'Сотрудник' },
    { login: 'ahmedov', password: 'lead123', role: 'Руководитель' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Учёт паломников</h1>
          <p className="text-blue-200">CRM-система офиса</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1.5">Логин</label>
              <input
                type="text"
                value={loginStr}
                onChange={e => setLoginStr(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                placeholder="Введите логин"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1.5">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                placeholder="Введите пароль"
                required
              />
            </div>
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-200 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </div>
        </form>

        <div className="mt-6 bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-blue-300" />
            <span className="text-sm text-blue-200 font-medium">Демо-аккаунты:</span>
          </div>
          <div className="space-y-2">
            {demoAccounts.map(acc => (
              <button
                key={acc.login}
                onClick={() => { setLoginStr(acc.login); setPassword(acc.password); }}
                className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-sm"
              >
                <span className="text-blue-100 font-mono">{acc.login}</span>
                <span className="text-blue-300/60 ml-2">/ {acc.password}</span>
                <span className="text-blue-400/80 ml-2 text-xs">({acc.role})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
