import React, { useState, useEffect } from 'react';
import type { SystemSettings, User } from '../types';
import { CURRENCIES } from '../types';
import { getSystemSettings, updateSystemSettings, exportBackup, importBackup, formatCurrency, getTheme, setTheme } from '../store/database';
import { formatPhone } from '../utils/phone';
import TagsManager from './TagsManager';
import { ArrowLeft, Save, Download, Upload, AlertCircle, CheckCircle, Settings as SettingsIcon, Globe, Building, Bell, Database, Plane, Calendar, FileText, Tag, Moon, Sun } from 'lucide-react';

interface SettingsPageProps {
  user: User;
  onBack: () => void;
}

export default function SettingsPage({ user, onBack }: SettingsPageProps) {
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings());
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'programs' | 'tags' | 'company' | 'backup'>('general');
  const [theme, setThemeState] = useState<'light' | 'dark'>(getTheme());

  const showNotif = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = () => {
    try {
      updateSystemSettings(settings);
      showNotif('success', 'Настройки сохранены');
    } catch (err: any) {
      showNotif('error', err.message || 'Ошибка сохранения');
    }
  };

  const handleExport = () => {
    try {
      const data = exportBackup();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotif('success', 'Резервная копия создана');
    } catch (err: any) {
      showNotif('error', err.message || 'Ошибка экспорта');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = importBackup(event.target?.result as string);
        if (result.success) {
          showNotif('success', 'Данные восстановлены');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          showNotif('error', result.error || 'Ошибка импорта');
        }
      } catch (err: any) {
        showNotif('error', err.message || 'Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notification.text}
        </div>
      )}

      <div className="bg-white border-b px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" /> Настройки системы
            </h1>
            <p className="text-xs md:text-sm text-gray-500">Конфигурация, валюта, резервное копирование</p>
          </div>
          <div className="flex-1" />
          <button 
            onClick={() => {
              const newTheme = theme === 'light' ? 'dark' : 'light';
              setTheme(newTheme);
              setThemeState(newTheme);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button onClick={handleSave} className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm flex items-center gap-1.5 hover:bg-blue-700">
            <Save className="w-4 h-4" /> <span className="hidden sm:inline">Сохранить</span>
          </button>
        </div>
      </div>

      <div className="bg-white border-b px-2 md:px-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {[
            { key: 'general', label: 'Общие', icon: Globe },
            { key: 'programs', label: 'Программы', icon: Plane },
            { key: 'tags', label: 'Теги', icon: Tag },
            { key: 'company', label: 'Организация', icon: Building },
            { key: 'backup', label: 'Резервные копии', icon: Database },
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
        <div className="max-w-3xl space-y-4 md:space-y-6">
          {activeTab === 'general' && (
            <>
              <div className="bg-white rounded-xl border p-4 md:p-6">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" /> Валюта и форматирование
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Валюта системы</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.values(CURRENCIES).map(curr => (
                        <button
                          key={curr.code}
                          onClick={() => setSettings({ ...settings, currency: curr.code })}
                          className={`p-3 border-2 rounded-lg text-left transition ${settings.currency === curr.code ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{curr.symbol}</span>
                            <div>
                              <div className="text-sm font-medium">{curr.code}</div>
                              <div className="text-xs text-gray-500">{curr.name}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-4 md:p-6">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" /> Дата хаджа
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Дата хаджа</label>
                  <input
                    type="date"
                    value={settings.hajjDate}
                    onChange={e => setSettings({ ...settings, hajjDate: e.target.value })}
                    className="w-full md:w-64 px-3 py-2 border rounded-lg text-sm"
                  />
                  {settings.hajjDate && (
                    <p className="text-xs text-gray-500 mt-2">
                      Паспорт должен быть действителен до: <span className="font-semibold">
                        {new Date(new Date(settings.hajjDate).getTime() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'programs' && (
            <div className="bg-white rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-500" /> Программы паломничества
              </h3>
              <div className="space-y-4">
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30">
                  <h4 className="font-semibold text-blue-900 mb-3">{settings.programDirect.name}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Название</label>
                      <input value={settings.programDirect.name} onChange={e => setSettings({ ...settings, programDirect: { ...settings.programDirect, name: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Стоимость ({CURRENCIES[settings.currency].symbol})</label>
                      <input type="number" value={settings.programDirect.price} onChange={e => setSettings({ ...settings, programDirect: { ...settings.programDirect, price: parseFloat(e.target.value) || 0 } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
                <div className="border-2 border-emerald-200 rounded-lg p-4 bg-emerald-50/30">
                  <h4 className="font-semibold text-emerald-900 mb-3">{settings.programEconomy.name}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Название</label>
                      <input value={settings.programEconomy.name} onChange={e => setSettings({ ...settings, programEconomy: { ...settings.programEconomy, name: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Стоимость ({CURRENCIES[settings.currency].symbol})</label>
                      <input type="number" value={settings.programEconomy.price} onChange={e => setSettings({ ...settings, programEconomy: { ...settings.programEconomy, price: parseFloat(e.target.value) || 0 } })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Программа по умолчанию</label>
                  <div className="flex gap-3">
                    <button onClick={() => setSettings({ ...settings, defaultProgram: 'direct' })} className={`flex-1 p-3 border-2 rounded-lg text-left transition ${settings.defaultProgram === 'direct' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="font-medium text-sm">{settings.programDirect.name}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(settings.programDirect.price)}</div>
                    </button>
                    <button onClick={() => setSettings({ ...settings, defaultProgram: 'economy' })} className={`flex-1 p-3 border-2 rounded-lg text-left transition ${settings.defaultProgram === 'economy' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                      <div className="font-medium text-sm">{settings.programEconomy.name}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(settings.programEconomy.price)}</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="bg-white rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-500" /> Управление тегами
              </h3>
              <TagsManager onTagsChange={() => setSettings(getSystemSettings())} />
            </div>
          )}

          {activeTab === 'company' && (
            <div className="bg-white rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-500" /> Данные организации
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Название</label>
                  <input value={settings.companyName} onChange={e => setSettings({ ...settings, companyName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Адрес</label>
                  <input value={settings.companyAddress} onChange={e => setSettings({ ...settings, companyAddress: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Телефон</label>
                    <input value={settings.companyPhone} onChange={e => setSettings({ ...settings, companyPhone: formatPhone(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">ИНН</label>
                    <input value={settings.companyInn} onChange={e => setSettings({ ...settings, companyInn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-4 md:p-6">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5 text-blue-500" /> Экспорт данных
                </h3>
                <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-emerald-700">
                  <Download className="w-4 h-4" /> Создать резервную копию
                </button>
              </div>
              <div className="bg-white rounded-xl border p-4 md:p-6">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-500" /> Импорт данных
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
                  <p className="font-medium flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Внимание!</p>
                  <p className="text-xs mt-1">Импорт полностью заменит текущие данные.</p>
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm cursor-pointer hover:bg-blue-700">
                  <Upload className="w-4 h-4" /> Выбрать файл
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
