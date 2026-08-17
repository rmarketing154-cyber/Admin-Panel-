import React, { useMemo } from 'react';
import { Users, Inbox, Wallet, CheckCircle, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard({ data, setCurrentTab }: any) {
  const stats = [
    { label: 'Total Registered', value: data.users.length, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-500' },
    { label: 'Pending Submissions', value: data.submissions.filter((s:any)=>s.status==='pending').length, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-500' },
    { label: 'Pending Payouts', value: data.withdraws.filter((w:any)=>w.status==='pending').length, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-500' },
    { label: 'Total Paid Out', value: '৳' + data.withdraws.filter((w:any)=>w.status==='approved').reduce((acc:number, w:any) => acc + Number(w.amount || 0), 0), color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-500' },
  ];
  
  const quickLinks = [
    { id: 'submissions', label: 'Work Queue', icon: Inbox, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
    { id: 'withdrawals', label: 'Payouts', icon: Wallet, color: 'text-red-500', bg: 'bg-red-50 border-red-200 hover:bg-red-100' },
    { id: 'users', label: 'Users', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  ];

  // Calculate chart data for the last 7 days
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return {
        dateStr: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        start: d.getTime(),
        end: d.getTime() + 86400000,
        organic: 0,
        referrals: 0,
      };
    });

    data.users.forEach((u: any) => {
      if (!u.createdAt) return;
      const ts = new Date(u.createdAt).getTime();
      
      const dayIndex = days.findIndex(d => ts >= d.start && ts < d.end);
      if (dayIndex !== -1) {
        if (u.referredBy) {
          days[dayIndex].referrals += 1;
        } else {
          days[dayIndex].organic += 1;
        }
      }
    });

    return days;
  }, [data.users]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`bg-white rounded-2xl p-5 border shadow-sm border-l-4 ${s.border} hover:shadow-md transition-shadow`}>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</div>
            <div className={`text-2xl md:text-3xl font-black mt-2 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
      
      {/* Chart Widget */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 font-bold text-slate-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <TrendingUp size={18} />
          </div>
          Weekly Growth: New Users & Referrals
        </div>
        <div className="p-4 sm:p-6 h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOrganic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReferral" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="dateStr" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 'bold' }} />
              <Area type="monotone" name="Organic Users" dataKey="organic" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorOrganic)" />
              <Area type="monotone" name="Referred Users" dataKey="referrals" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReferral)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 font-bold text-slate-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
            <CheckCircle size={18} />
          </div>
          Quick Navigation Hub
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {quickLinks.map((q, i) => (
              <button
                key={i}
                onClick={() => setCurrentTab(q.id)}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-1 hover:shadow-md ${q.bg}`}
              >
                <q.icon size={28} className={q.color} />
                <span className="text-sm font-bold text-slate-700">{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
