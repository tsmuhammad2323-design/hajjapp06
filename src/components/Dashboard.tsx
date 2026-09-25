import React, { useMemo } from 'react';
import type { User } from '../types';
import { getPilgrims, getLeaders, getPayments, formatCurrency } from '../store/database';
import { Users, UserPlus, CreditCard, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

interface DashboardProps {
  user: User;
}

function detectGender(middleName: string): 'male' | 'female' | 'unknown' {
  if (!middleName) return 'unknown';
  const name = middleName.toLowerCase();
  if (name.endsWith('ович') || name.endsWith('евич') || name.endsWith('ич')) return 'male';
  if (name.endsWith('овна') || name.endsWith('евна') || name.endsWith('ична') || name.endsWith('инична')) return 'female';
  return 'unknown';
}

export default function Dashboard({ user }: DashboardProps) {
  const stats = useMemo(() => {
    const pilgrims = getPilgrims().filter(p => !p.isArchived);
    const leaders = getLeaders();
    const allPayments = getPayments();

    let maleCount = 0;
    let femaleCount = 0;
    let unknownCount = 0;
    pilgrims.forEach(p => {
      const gender = detectGender(p.middleName);
      if (gender === 'male') maleCount++;
      else if (gender === 'female') femaleCount++;
      else unknownCount++;
    });

    const today = new Date();
    const todayStr = today.toDateString();
    const todayPilgrims = pilgrims.filter(p => 
      new Date(p.createdAt).toDateString() === todayStr
    );

    const todayPayments = allPayments.filter(p => 
      new Date(p.paidAt).toDateString() === todayStr
    );
    const todayPaymentsSum = todayPayments.reduce((s, p) => s + p.amount, 0);

    const totalAmount = pilgrims.reduce((s, p) => s + p.totalAmount, 0);
    const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
    const paymentProgress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

    const paidCount = pilgrims.filter(p => p.paymentStatus === 'paid').length;
    const partialCount = pilgrims.filter(p => p.paymentStatus === 'partial').length;
    const notPaidCount = pilgrims.filter(p => p.paymentStatus === 'not_paid').length;
    const overpaidCount = pilgrims.filter(p => p.paymentStatus === 'overpaid').length;

    const uploadReserve = pilgrims.filter(p => p.uploadStatus === 'reserve').length;
    const uploadMain = pilgrims.filter(p => p.uploadStatus === 'main').length;
    const uploadEmpty = pilgrims.filter(p => !p.uploadStatus).length;

    const completeDocs = pilgrims.filter(p => p.documentStatus === 'complete').length;
    const incompleteDocs = pilgrims.filter(p => p.documentStatus === 'incomplete').length;

    const paymentsByMonth = useMemo(() => {
      const months: Record<string, number> = {};
      allPayments.forEach(p => {
        const date = new Date(p.paidAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months[key] = (months[key] || 0) + p.amount;
      });
      return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, amount]) => ({
          month: new Date(month + '-01').toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
          amount
        }));
    }, [allPayments]);

    const pilgrimsByLeader = useMemo(() => {
      const byLeader: Record<string, number> = {};
      pilgrims.forEach(p => {
        const leader = leaders.find(l => l.id === p.leaderId);
        const name = leader ? leader.fullName.split(' ')[0] : 'Не указан';
        byLeader[name] = (byLeader[name] || 0) + 1;
      });
      return Object.entries(byLeader)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }, [pilgrims, leaders]);

    const newPilgrimsByMonth = useMemo(() => {
      const months: Record<string, number> = {};
      pilgrims.forEach(p => {
        const date = new Date(p.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months[key] = (months[key] || 0) + 1;
      });
      return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, count]) => ({
          month: new Date(month + '-01').toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
          count
        }));
    }, [pilgrims]);

    const paymentStatusData = [
      { name: 'Оплачено', value: paidCount, color: '#10B981' },
      { name: 'Частично', value: partialCount, color: '#F59E0B' },
      { name: 'Не оплачено', value: notPaidCount, color: '#EF4444' },
      { name: 'Переплата', value: overpaidCount, color: '#3B82F6' }
    ].filter(item => item.value > 0);

    return {
      totalPilgrims: pilgrims.length,
      totalLeaders: leaders.length,
      maleCount,
      femaleCount,
      unknownCount,
      todayPilgrims: todayPilgrims.length,
      todayPaymentsCount: todayPayments.length,
      todayPaymentsSum,
      totalAmount,
      totalPaid,
      paymentProgress,
      paidCount,
      partialCount,
      notPaidCount,
      overpaidCount,
      uploadReserve,
      uploadMain,
      uploadEmpty,
      completeDocs,
      incompleteDocs,
      paymentsByMonth,
      pilgrimsByLeader,
      newPilgrimsByMonth,
      paymentStatusData,
    };
  }, []);

  const mainCards = [
    {
      title: 'Всего паломников',
      value: stats.totalPilgrims,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      subtitle: `${stats.totalLeaders} руководителей`,
      details: (
        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-around text-xs">
          <div className="flex items-center gap-1">
            <span className="text-lg">♂</span>
            <span>{stats.maleCount} муж.</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg">♀</span>
            <span>{stats.femaleCount} жен.</span>
          </div>
          {stats.unknownCount > 0 && (
            <div className="text-white/70">
              {stats.unknownCount} не опр.
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Записи сегодня',
      value: stats.todayPilgrims,
      icon: UserPlus,
      color: 'from-purple-500 to-purple-600',
      subtitle: 'новых паломников',
      details: null
    },
    {
      title: 'Оплаты сегодня',
      value: formatCurrency(stats.todayPaymentsSum),
      icon: CreditCard,
      color: 'from-emerald-500 to-emerald-600',
      subtitle: `${stats.todayPaymentsCount} платежей`,
      details: null
    },
    {
      title: 'Собрано средств',
      value: formatCurrency(stats.totalPaid),
      icon: TrendingUp,
      color: 'from-amber-500 to-orange-500',
      subtitle: `из ${formatCurrency(stats.totalAmount)}`,
      details: (
        <div className="mt-3 pt-3 border-t border-white/20">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>Прогресс</span>
            <span className="font-semibold">{stats.paymentProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all" 
              style={{ width: `${Math.min(stats.paymentProgress, 100)}%` }}
            />
          </div>
        </div>
      )
    },
  ];

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Добро пожаловать, {user.fullName.split(' ')[1] || user.fullName} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('ru-RU', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mainCards.map((card, i) => (
            <div 
              key={i} 
              className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white/80 text-xs uppercase tracking-wide font-medium">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold mt-2">{card.value}</p>
                  <p className="text-white/80 text-sm mt-1">{card.subtitle}</p>
                </div>
                <div className="bg-white/20 p-2 rounded-xl">
                  <card.icon className="w-6 h-6" />
                </div>
              </div>
              {card.details}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Оплаты по месяцам
            </h3>
            {stats.paymentsByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={stats.paymentsByMonth}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#10B981" fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                Нет данных об оплатах
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-500" />
              Статусы оплаты
            </h3>
            {stats.paymentStatusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} паломников`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {stats.paymentStatusData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-700">{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                Нет данных
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-500" />
              Новые паломники по месяцам
            </h3>
            {stats.newPilgrimsByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.newPilgrimsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    formatter={(value: number) => `${value} паломников`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                Нет данных
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Топ руководителей
            </h3>
            {stats.pilgrimsByLeader.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.pilgrimsByLeader} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis dataKey="name" type="category" stroke="#6B7280" style={{ fontSize: '12px' }} width={100} />
                  <Tooltip 
                    formatter={(value: number) => `${value} паломников`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                Нет данных
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> 
            Требуют внимания
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
