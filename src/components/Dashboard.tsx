import React, { useMemo } from 'react';
import type { User } from '../types';
import { getPilgrims, getLeaders, getPayments, getDocuments, getAuditLogs } from '../store/database';
import { Users, FileCheck, CreditCard, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const stats = useMemo(() => {
    const pilgrims = getPilgrims().filter(p => !p.isArchived);
    const leaders = getLeaders();
    const payments = getPayments();
    const docs = getDocuments();
    const logs = getAuditLogs();

    const totalAmount = pilgrims.reduce((s, p) => s + p.totalAmount, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const completeDocs = pilgrims.filter(p => p.documentStatus === 'complete').length;
    const incompleteDocs = pilgrims.filter(p => p.documentStatus === 'incomplete').length;
    const paidCount = pilgrims.filter(p => p.paymentStatus === 'paid').length;
    const partialCount = pilgrims.filter(p => p.paymentStatus === 'partial').length;
    const notPaidCount = pilgrims.filter(p => p.paymentStatus === 'not_paid').length;
    const uploadReserve = pilgrims.filter(p => p.uploadStatus === 'reserve').length;
    const uploadMain = pilgrims.filter(p => p.uploadStatus === 'main').length;
    const uploadEmpty = pilgrims.filter(p => !p.uploadStatus).length;

    const todayLogs = logs.filter(l => {
      const today = new Date().toDateString();
      return new Date(l.createdAt).toDateString() === today;
    }).length;

    return {
      totalPilgrims: pilgrims.length,
      totalLeaders: leaders.length,
      totalAmount,
      totalPaid,
      completeDocs,
      incompleteDocs,
      paidCount,
      partialCount,
      notPaidCount,
      uploadReserve,
      uploadMain,
      uploadEmpty,
      todayActions: todayLogs,
      totalDocs: docs.length,
    };
  }, []);

  const cards = [
    { title: 'Паломники', value: stats.totalPilgrims, icon: Users, color: 'bg-blue-500', sub: `${stats.totalLeaders} руководителей` },
    { title: 'Собрано средств', value: `${(stats.totalPaid / 1000).toFixed(0)}т ₽`, icon: CreditCard, color: 'bg-emerald-500', sub: `из ${(stats.totalAmount / 1000).toFixed(0)}т ₽` },
    { title: 'Документы полные', value: stats.completeDocs, icon: FileCheck, color: 'bg-purple-500', sub: `${stats.incompleteDocs} неполных` },
    { title: 'Действий сегодня', value: stats.todayActions, icon: Clock, color: 'bg-amber-500', sub: `${stats.totalDocs} документов загружено` },
  ];

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Обзор системы</h1>
          <p className="text-gray-500">Общая статистика по паломникам и операциям</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <div key={i} className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Status breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-500" /> Статус оплаты
            </h3>
            <div className="space-y-3">
              <StatusBar label="Оплачено" count={stats.paidCount} total={stats.totalPilgrims} color="bg-emerald-500" />
              <StatusBar label="Частично" count={stats.partialCount} total={stats.totalPilgrims} color="bg-yellow-500" />
              <StatusBar label="Не оплачено" count={stats.notPaidCount} total={stats.totalPilgrims} color="bg-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-purple-500" /> Статус загрузки
            </h3>
            <div className="space-y-3">
              <StatusBar label="Основа" count={stats.uploadMain} total={stats.totalPilgrims} color="bg-blue-500" />
              <StatusBar label="Резерв" count={stats.uploadReserve} total={stats.totalPilgrims} color="bg-purple-500" />
              <StatusBar label="Не загружены" count={stats.uploadEmpty} total={stats.totalPilgrims} color="bg-gray-400" />
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Требуют внимания
          </h3>
          <div className="space-y-2">
            {stats.incompleteDocs > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-amber-800">{stats.incompleteDocs} паломников с неполным пакетом документов</span>
              </div>
            )}
            {stats.notPaidCount > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-800">{stats.notPaidCount} паломников без оплаты</span>
              </div>
            )}
            {stats.uploadEmpty > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-blue-800">{stats.uploadEmpty} паломников не загружены на платформу</span>
              </div>
            )}
            {stats.incompleteDocs === 0 && stats.notPaidCount === 0 && stats.uploadEmpty === 0 && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm text-emerald-800">Всё в порядке! Нет записей, требующих внимания.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-gray-800">{count} <span className="text-gray-400 font-normal">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
