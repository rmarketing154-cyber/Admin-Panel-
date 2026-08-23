import React, { useMemo, useState } from 'react';
import { Activity, Clock, Coins, Users, TrendingUp, Calendar, ShieldCheck, Award, Search, Sparkles } from 'lucide-react';

export default function TodayActivity({ data }: any) {
  const [search, setSearch] = useState('');

  // Calculate today start timestamp (00:00:00 local time)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayStartTime = startOfToday.getTime();

  // Process data for today's visits, earnings, and referral commissions
  const todayStats = useMemo(() => {
    const allUsers = data.users || [];
    const allSubmissions = data.submissions || [];

    let totalVisitsToday = 0;
    let totalEarningsToday = 0;
    let totalReferralCommissionToday = 0;

    const userActivityList = allUsers.map((user: any) => {
      // 1. Check if user visited today
      // Check last_login or visitHistory or lastVisit
      const lastLogin = Number(user.last_login || user.lastVisit || 0);
      const isVisitedToday = lastLogin >= todayStartTime || 
        (user.visitHistory && Object.values(user.visitHistory).some((v: any) => Number(v.timestamp || v.time || 0) >= todayStartTime));

      if (isVisitedToday) {
        totalVisitsToday++;
      }

      // 2. Calculate earnings today from approved submissions today
      const userSubs = allSubmissions.filter((s: any) => s.userId === user.uid && s.status === 'approved');
      let earnedToday = 0;
      userSubs.forEach((s: any) => {
        const pTime = Number(s.processedAt || s.submittedAt || 0);
        if (pTime >= todayStartTime) {
          earnedToday += Number(s.finalPayout || s.totalAmount || 0);
        }
      });
      totalEarningsToday += earnedToday;

      // 3. Referral commission today (strict real data only)
      let referralCommissionToday = Number(user.referralEarningsToday || user.todayReferralEarnings || 0);
      totalReferralCommissionToday += referralCommissionToday;

      return {
        ...user,
        isVisitedToday,
        lastLogin,
        earnedToday,
        referralCommissionToday,
        timeOpenToday: Number(user.total_time_open || user.totalTimeOpen || 0)
      };
    });

    // Filter users who visited today OR earned today OR got referral commission today
    const activeTodayUsers = userActivityList.filter((u: any) => u.isVisitedToday || u.earnedToday > 0 || u.referralCommissionToday > 0);

    return {
      totalVisitsToday,
      totalEarningsToday,
      totalReferralCommissionToday,
      activeTodayUsers: activeTodayUsers.sort((a: any, b: any) => b.earnedToday - a.earnedToday)
    };
  }, [data.users, data.submissions, todayStartTime]);

  const filteredUsers = todayStats.activeTodayUsers.filter((u: any) =>
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (ts: any) => {
    if (!ts) return 'Not yet';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0 mins';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} mins`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Calendar size={14} /> Today's Live Telemetry & Earnings Log
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Today's Visits & Income Report</h1>
          <p className="text-indigo-200 text-xs sm:text-sm max-w-2xl">
            Real-time tracking of users who visited the app/website today, active session durations, earnings from approved submissions, and referral commissions received today.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Visitors Today</div>
            <div className="text-3xl font-black text-indigo-600 mt-1">{todayStats.totalVisitsToday} Users</div>
            <div className="text-[11px] text-slate-400 mt-1">Logged in or opened app today</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Earnings Today</div>
            <div className="text-3xl font-black text-emerald-600 mt-1">৳ {todayStats.totalEarningsToday.toFixed(2)}</div>
            <div className="text-[11px] text-slate-400 mt-1">Approved submissions today</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Coins size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Referral Commission Today</div>
            <div className="text-3xl font-black text-amber-600 mt-1">৳ {todayStats.totalReferralCommissionToday.toFixed(2)}</div>
            <div className="text-[11px] text-slate-400 mt-1">Referral bonuses distributed</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Date</div>
            <div className="text-lg font-black text-slate-800 mt-1">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div className="text-[11px] text-indigo-600 font-bold mt-1">● Live Telemetry Synced</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="text-xs font-bold text-slate-500">
          Showing <span className="text-indigo-600 font-black">{filteredUsers.length}</span> active users today
        </div>
      </div>

      {/* Users Activity & Earnings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Activity size={18} className="text-indigo-600" /> Today's Visitor & Income Breakdown
          </div>
          <span className="text-xs font-semibold text-slate-400">Refreshed in Real-Time</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Last Visit Time (Today)</th>
                <th className="py-3 px-4">Time Open Today</th>
                <th className="py-3 px-4">Earned Today (৳)</th>
                <th className="py-3 px-4">Referral Commission Today</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <div className="font-bold text-slate-600">No visitors recorded for today yet</div>
                    <div className="text-[11px] text-slate-400 mt-1">Users visiting the app today will appear here automatically.</div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u: any) => (
                  <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 shrink-0">
                          {u.username ? u.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{u.username || 'Unnamed User'}</div>
                          <div className="text-[11px] text-slate-400">{u.email || u.uid}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-700">
                      {u.isVisitedToday ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          {formatTime(u.lastLogin)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not active today</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-bold text-indigo-600">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        {formatDuration(u.timeOpenToday)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-black text-emerald-600 text-sm">
                        ৳ {u.earnedToday.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-black text-amber-600 text-sm">
                        ৳ {u.referralCommissionToday.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        u.isVisitedToday ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {u.isVisitedToday ? 'Active Today' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
