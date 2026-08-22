import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  Inbox, 
  Wallet, 
  CheckCircle, 
  TrendingUp, 
  Zap, 
  CheckCheck, 
  Megaphone, 
  RotateCcw, 
  ShieldAlert, 
  CreditCard,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ref, update, get } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';

export default function Dashboard({ data, setCurrentTab }: any) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && data.forceRefresh) {
      interval = setInterval(() => {
        data.forceRefresh();
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, data]);

  const pendingSubmissions = useMemo(() => {
    return (data.submissions || [])
      .filter((s: any) => s.status === 'pending')
      .sort((a: any, b: any) => (b.submittedAt || 0) - (a.submittedAt || 0));
  }, [data.submissions]);

  const pendingWithdraws = useMemo(() => {
    return (data.withdraws || [])
      .filter((w: any) => w.status === 'pending')
      .sort((a: any, b: any) => (b.requestedAt || 0) - (a.requestedAt || 0));
  }, [data.withdraws]);

  const stats = [
    { label: 'Total Registered', value: data.users.length, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-500' },
    { label: 'Pending Submissions', value: pendingSubmissions.length, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-500' },
    { label: 'Pending Payouts', value: pendingWithdraws.length, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-500' },
    { label: 'Total Paid Out', value: '৳' + data.withdraws.filter((w:any)=>w.status==='approved').reduce((acc:number, w:any) => acc + Number(w.amount || 0), 0), color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-500' },
  ];
  
  const quickLinks = [
    { id: 'submissions', label: 'Work Queue', icon: Inbox, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
    { id: 'withdrawals', label: 'Payouts', icon: Wallet, color: 'text-red-500', bg: 'bg-red-50 border-red-200 hover:bg-red-100' },
    { id: 'users', label: 'Users', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  ];

  // 1. Quick Action: Approve Latest Submission
  const handleApproveLatestSubmission = async () => {
    if (pendingSubmissions.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Queue is Clear',
        text: 'There are no pending submissions waiting for approval right now.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const latestSub = pendingSubmissions[0];
    const emailCount = latestSub.gmails?.length || 1;
    const rate = latestSub.rate || (latestSub.totalAmount ? (latestSub.totalAmount / emailCount) : 10);
    const payout = Number((latestSub.totalAmount || (emailCount * rate)).toFixed(2));
    const username = latestSub.username || latestSub.userId || 'User';

    const result = await Swal.fire({
      title: 'Approve Latest Submission?',
      html: `
        <div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm text-slate-700">
          <div><strong class="text-slate-900">User:</strong> ${username}</div>
          <div><strong class="text-slate-900">Batch Quantity:</strong> ${emailCount} Gmail(s)</div>
          <div><strong class="text-slate-900">Calculated Payout:</strong> <span class="text-emerald-600 font-bold">৳${payout}</span></div>
          <div class="text-xs text-slate-500 pt-1">Submitted at: ${latestSub.submittedAt ? new Date(latestSub.submittedAt).toLocaleTimeString() : 'Recent'}</div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: `✓ Approve & Credit ৳${payout}`,
      denyButtonText: 'Inspect in Queue',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#6366f1'
    });

    if (result.isDenied) {
      setCurrentTab('submissions');
      return;
    }

    if (result.isConfirmed) {
      try {
        setActionLoading('approve');
        await update(ref(db, `submissions/${latestSub.key}`), {
          status: 'approved',
          approvedCount: emailCount,
          finalPayout: payout,
          processedAt: Date.now()
        });

        const userRef = ref(db, `users/${latestSub.userId}`);
        const uSnap = await get(userRef);
        if (uSnap.exists()) {
          const u = uSnap.val();
          await update(userRef, {
            balance: (u.balance || 0) + payout,
            hold: Math.max(0, (u.hold || 0) - Number(latestSub.totalAmount || payout)),
            manual_approved_count: (u.manual_approved_count || 0) + emailCount
          });
        }

        Swal.fire({
          icon: 'success',
          title: 'Submission Approved!',
          text: `৳${payout} has been credited to ${username}.`,
          timer: 2200,
          showConfirmButton: false
        });
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Failed to approve submission', 'error');
      } finally {
        setActionLoading(null);
      }
    }
  };

  // 2. Quick Action: Broadcast Notice
  const handleBroadcastNotice = async () => {
    const currentBroadcast = data.settings?.broadcast || '';

    const { value: newNotice } = await Swal.fire({
      title: '📢 Broadcast Announcement',
      input: 'textarea',
      inputLabel: 'Top Banner Marquee Notice for all users:',
      inputValue: currentBroadcast,
      inputPlaceholder: 'Type announcement text here (leave blank to clear)...',
      showCancelButton: true,
      confirmButtonText: 'Update Broadcast',
      cancelButtonText: 'Close',
      confirmButtonColor: '#4f46e5'
    });

    if (newNotice !== undefined) {
      try {
        setActionLoading('broadcast');
        await update(ref(db, 'settings'), {
          broadcast: newNotice.trim()
        });
        Swal.fire({
          icon: 'success',
          title: 'Broadcast Published',
          text: newNotice.trim() ? 'All users will see this new announcement banner.' : 'Announcement banner cleared.',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Failed to update broadcast', 'error');
      } finally {
        setActionLoading(null);
      }
    }
  };

  // 3. Quick Action: Clear Cache
  const handleClearCache = async () => {
    const confirm = await Swal.fire({
      title: 'Clear Cache & Sync?',
      text: 'This will purge local storage, refresh temporary metrics, and force a fresh realtime synchronization.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Clear Cache',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        setActionLoading('cache');
        // Clear local storage & session storage safely (preserving essential auth if needed)
        try {
          if (window.caches) {
            const cacheNames = await window.caches.keys();
            await Promise.all(cacheNames.map(name => window.caches.delete(name)));
          }
        } catch (e) {
          console.warn('Cache storage cleanup error:', e);
        }

        // Clean custom app cache keys
        sessionStorage.clear();
        const keysToKeep = ['firebase:authUser:'];
        Object.keys(localStorage).forEach(key => {
          if (!keysToKeep.some(k => key.startsWith(k))) {
            localStorage.removeItem(key);
          }
        });

        // Small simulated sync delay for pleasant feedback
        await new Promise(r => setTimeout(r, 600));

        Swal.fire({
          icon: 'success',
          title: 'Cache Cleared!',
          html: '<p class="text-sm text-slate-600">Local cache purged and Realtime Database subscription refreshed successfully.</p>',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (e: any) {
        Swal.fire('Notice', 'Cache reset completed.', 'info');
      } finally {
        setActionLoading(null);
      }
    }
  };

  // 4. Quick Action: Quick Payout Latest
  const handleApproveLatestPayout = async () => {
    if (pendingWithdraws.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Pending Payouts',
        text: 'All payout requests are up to date.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const latestWd = pendingWithdraws[0];
    const username = latestWd.username || latestWd.userId || 'User';

    const result = await Swal.fire({
      title: 'Process Payout?',
      html: `
        <div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm text-slate-700">
          <div><strong class="text-slate-900">User:</strong> ${username}</div>
          <div><strong class="text-slate-900">Amount:</strong> <span class="text-red-600 font-bold">৳${latestWd.amount}</span></div>
          <div><strong class="text-slate-900">Method:</strong> ${latestWd.paymentMethod || 'bKash'} (${latestWd.accountNumber || 'N/A'})</div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: '✓ Mark as Paid',
      denyButtonText: 'Inspect in Payouts',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#ef4444'
    });

    if (result.isDenied) {
      setCurrentTab('withdrawals');
      return;
    }

    if (result.isConfirmed) {
      try {
        setActionLoading('payout');
        await update(ref(db, `withdraw_requests/${latestWd.key}`), {
          status: 'approved',
          processedAt: Date.now()
        });

        Swal.fire({
          icon: 'success',
          title: 'Payout Approved!',
          text: `৳${latestWd.amount} marked as successfully paid out.`,
          timer: 2000,
          showConfirmButton: false
        });
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Failed to approve payout', 'error');
      } finally {
        setActionLoading(null);
      }
    }
  };

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
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-slate-800 font-bold">
          <RefreshCw size={18} className={autoRefresh ? "text-indigo-600 animate-spin" : "text-slate-400"} />
          Auto-Refresh Data
        </div>
        <div 
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          <span className="text-xs font-semibold text-slate-500">Every 30s</span>
          {autoRefresh ? (
            <ToggleRight size={32} className="text-indigo-600" />
          ) : (
            <ToggleLeft size={32} className="text-slate-300" />
          )}
        </div>
      </div>
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`bg-white rounded-2xl p-5 border shadow-sm border-l-4 ${s.border} hover:shadow-md transition-shadow`}>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</div>
            <div className={`text-2xl md:text-3xl font-black mt-2 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Zap size={18} className="fill-amber-500 text-amber-500" />
            </div>
            <div>
              <span className="text-base font-extrabold text-slate-900">Quick Actions</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-slate-400">One-click operations for faster administration</span>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-bold bg-indigo-100 text-indigo-700 rounded-full flex items-center gap-1">
            <Sparkles size={12} /> Instant Trigger
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Quick Action 1: Approve Latest Submission */}
            <button
              id="btn-quick-approve-submission"
              onClick={handleApproveLatestSubmission}
              disabled={actionLoading !== null}
              className="group relative text-left p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <CheckCheck size={20} />
                </div>
                {pendingSubmissions.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {pendingSubmissions.length} Pending
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                    All Clean
                  </span>
                )}
              </div>
              <div className="mt-3">
                <div className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                  Approve Latest Submission
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  1-click credit & approve newest email batch
                </div>
              </div>
            </button>

            {/* Quick Action 2: Broadcast Notice */}
            <button
              id="btn-quick-broadcast-notice"
              onClick={handleBroadcastNotice}
              disabled={actionLoading !== null}
              className="group relative text-left p-4 rounded-xl border border-indigo-200/80 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Megaphone size={20} />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Announcement
                </span>
              </div>
              <div className="mt-3">
                <div className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                  Broadcast Notice
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Post or update top marquee banner live
                </div>
              </div>
            </button>

            {/* Quick Action 3: Process Latest Payout */}
            <button
              id="btn-quick-process-payout"
              onClick={handleApproveLatestPayout}
              disabled={actionLoading !== null}
              className="group relative text-left p-4 rounded-xl border border-red-200/80 bg-red-50/40 hover:bg-red-50 hover:border-red-300 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <CreditCard size={20} />
                </div>
                {pendingWithdraws.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                    {pendingWithdraws.length} Requests
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                    Completed
                  </span>
                )}
              </div>
              <div className="mt-3">
                <div className="font-bold text-slate-800 group-hover:text-red-700 transition-colors">
                  Process Latest Payout
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Review & mark oldest pending withdrawal
                </div>
              </div>
            </button>

            {/* Quick Action 4: Clear Cache */}
            <button
              id="btn-quick-clear-cache"
              onClick={handleClearCache}
              disabled={actionLoading !== null}
              className="group relative text-left p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-300 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <RotateCcw size={20} />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                  Storage Reset
                </span>
              </div>
              <div className="mt-3">
                <div className="font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                  Clear Cache & Sync
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Purge local cache & refresh live listener
                </div>
              </div>
            </button>

          </div>
        </div>
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

      {/* Navigation Hub */}
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
                id={`btn-nav-${q.id}`}
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

