import React, { useState, useMemo } from 'react';
import { ref, update, get, push } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { 
  Wallet, 
  ClipboardCopy, 
  CheckCircle, 
  XCircle, 
  Search, 
  Download, 
  Copy, 
  Calendar, 
  Coins, 
  ArrowUpRight, 
  CheckCheck,
  Smartphone,
  CreditCard,
  User,
  ExternalLink
} from 'lucide-react';

export default function Withdrawals({ data }: any) {
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');

  // Lookup map of users for rich context
  const usersMap = useMemo(() => {
    const map = new Map<string, any>();
    (data.users || []).forEach((u: any) => {
      map.set(u.uid, u);
    });
    return map;
  }, [data.users]);

  // Enrich withdrawals with user statistics
  const enrichedWithdrawals = useMemo(() => {
    const withs = data.withdraws || [];
    const subs = data.submissions || [];

    return withs.map((w: any) => {
      const user = usersMap.get(w.userId) || {};
      const userApprovedWiths = withs.filter((other: any) => other.userId === w.userId && other.status === 'approved');
      const userTotalWithdrawn = userApprovedWiths.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
      const userApprovedSubs = subs.filter((s: any) => s.userId === w.userId && s.status === 'approved');
      const userApprovedEmails = userApprovedSubs.reduce((acc: number, s: any) => acc + Number(s.approvedCount || s.gmails?.length || 0), 0) + Number(user.manual_approved_count || 0);

      return {
        ...w,
        userInfo: {
          username: user.username || w.username || 'User',
          email: user.email || 'N/A',
          balance: user.balance || 0,
          hold: user.hold || 0,
          level: user.level || 1,
          createdAt: user.createdAt,
          is_blocked: user.is_blocked,
          isTopSeller: user.isTopSeller,
          totalWithdrawn: userTotalWithdrawn,
          approvedEmails: userApprovedEmails
        }
      };
    });
  }, [data.withdraws, data.submissions, usersMap]);

  // Filtered & Searched List
  const list = useMemo(() => {
    let filtered = enrichedWithdrawals.filter((w: any) => {
      if (filterTab === 'pending') return w.status === 'pending';
      if (filterTab === 'approved') return w.status === 'approved';
      if (filterTab === 'rejected') return w.status === 'rejected';
      return true;
    });

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter((w: any) => 
        (w.username || '').toLowerCase().includes(q) ||
        (w.userInfo?.username || '').toLowerCase().includes(q) ||
        (w.paymentNumber || w.accountNumber || '').toLowerCase().includes(q) ||
        (w.trxId || '').toLowerCase().includes(q) ||
        (w.paymentMethod || w.method || '').toLowerCase().includes(q) ||
        (w.userId || '').toLowerCase().includes(q)
      );
    }

    return filtered.sort((a: any, b: any) => {
      if (filterTab === 'pending') return (a.requestedAt || 0) - (b.requestedAt || 0);
      return (b.approvedAt || b.rejectedAt || b.requestedAt || 0) - (a.approvedAt || a.rejectedAt || a.requestedAt || 0);
    });
  }, [enrichedWithdrawals, filterTab, search]);

  const copyText = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${label} copied!`,
      showConfirmButton: false,
      timer: 1500
    });
  };

  const approveWithdraw = async (w: any) => {
    const { value: trxId } = await Swal.fire({
      title: 'Confirm Payment Settlement',
      html: `
        <div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm text-slate-700">
          <div><strong class="text-slate-900">User:</strong> ${w.userInfo?.username || w.username}</div>
          <div><strong class="text-slate-900">Amount:</strong> <span class="text-emerald-600 font-bold text-base">৳${w.amount}</span></div>
          <div><strong class="text-slate-900">Method:</strong> ${w.paymentMethod || w.method || 'bKash'}</div>
          <div><strong class="text-slate-900">Target Number:</strong> <span class="font-mono font-bold text-indigo-600">${w.paymentNumber || w.accountNumber}</span></div>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'Transaction ID / Reference (Optional)',
      showCancelButton: true,
      confirmButtonText: '✓ Mark as Paid',
      confirmButtonColor: '#10b981'
    });

    if (trxId !== undefined) {
      await update(ref(db, `withdraw_requests/${w.key}`), {
        status: 'approved',
        trxId: trxId || 'DIRECT_PAYMENT',
        approvedAt: Date.now()
      });

      await push(ref(db, `users/${w.userId}/notifications`), {
        title: 'উইথড্র সফল হয়েছে!',
        message: `আপনার ৳${w.amount} উইথড্র সফলভাবে প্রদান করা হয়েছে। ${trxId ? `TrxID: ${trxId}` : ''}`,
        type: 'success',
        timestamp: Date.now()
      });

      Swal.fire('Approved', `৳${w.amount} payout marked as completed.`, 'success');
    }
  };

  const rejectWithdraw = async (w: any) => {
    const { value: reason } = await Swal.fire({
      title: 'Reject & Refund to Balance?',
      html: `
        <div class="text-left text-sm text-slate-600 mb-2">
          This will reject the request and return <strong>৳${w.amount}</strong> to the user's active wallet balance.
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'Rejection reason (e.g. Invalid account number)',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reject & Refund',
      confirmButtonColor: '#ef4444'
    });

    if (reason !== undefined) {
      const userRef = ref(db, `users/${w.userId}`);
      const uSnap = await get(userRef);
      if (uSnap.exists()) {
        const u = uSnap.val();
        await update(userRef, { balance: (u.balance || 0) + Number(w.amount) });
      }

      await update(ref(db, `withdraw_requests/${w.key}`), {
        status: 'rejected',
        rejectReason: reason || 'Invalid payment credentials',
        rejectedAt: Date.now()
      });

      await push(ref(db, `users/${w.userId}/notifications`), {
        title: 'উইথড্র বাতিল ও রিফান্ড',
        message: `আপনার ৳${w.amount} উইথড্র বাতিল করে মূল ব্যালেন্সে রিফান্ড করা হয়েছে। কারণ: ${reason || 'ভুল তথ্য'}`,
        type: 'danger',
        timestamp: Date.now()
      });

      Swal.fire('Refunded', 'Amount returned to user balance', 'info');
    }
  };

  const exportCSV = () => {
    let csv = 'Key,User,User UID,Amount,Method,Account Number,Status,TrxID,Requested At,Processed At\n';
    list.forEach((w: any) => {
      csv += `"${w.key}","${w.userInfo?.username || w.username || ''}","${w.userId || ''}",${w.amount || 0},"${w.paymentMethod || w.method || ''}","${w.paymentNumber || w.accountNumber || ''}","${w.status}","${w.trxId || ''}","${w.requestedAt ? new Date(w.requestedAt).toISOString() : ''}","${w.approvedAt || w.rejectedAt ? new Date(w.approvedAt || w.rejectedAt).toISOString() : ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `withdrawals_${filterTab}_${Date.now()}.csv`;
    a.click();
  };

  const formatTime = (ts: any) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const totalPendingAmount = useMemo(() => {
    return enrichedWithdrawals
      .filter((w: any) => w.status === 'pending')
      .reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);
  }, [enrichedWithdrawals]);

  const totalPaidAmount = useMemo(() => {
    return enrichedWithdrawals
      .filter((w: any) => w.status === 'approved')
      .reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);
  }, [enrichedWithdrawals]);

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h2 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Wallet className="text-red-500" />
            Payouts & Withdrawal Settlements
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit user balances, copy target account numbers, and process disbursement
          </p>
        </div>

        <button 
          onClick={exportCSV} 
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm text-slate-700"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 sm:px-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Payouts</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">৳{totalPendingAmount.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400">
            {enrichedWithdrawals.filter((w: any) => w.status === 'pending').length} requests waiting
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Disbursed</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">৳{totalPaidAmount.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400">
            {enrichedWithdrawals.filter((w: any) => w.status === 'approved').length} completed payouts
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Most Active Gateway</div>
          <div className="text-xl font-black text-indigo-600 mt-0.5 uppercase">bKash / Nagad</div>
          <div className="text-[11px] text-slate-400">Instant direct MFS</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-white space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Username, Account Number, TrxID, or Method..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 transition-colors ${
              filterTab === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Pending Requests ({enrichedWithdrawals.filter((w: any) => w.status === 'pending').length})
          </button>

          <button
            onClick={() => setFilterTab('approved')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 transition-colors ${
              filterTab === 'approved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Paid / Approved ({enrichedWithdrawals.filter((w: any) => w.status === 'approved').length})
          </button>

          <button
            onClick={() => setFilterTab('rejected')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 transition-colors ${
              filterTab === 'rejected'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Rejected ({enrichedWithdrawals.filter((w: any) => w.status === 'rejected').length})
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50/40 space-y-4">
        {list.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
            <Wallet size={36} className="mx-auto text-slate-300" />
            <div className="font-bold text-slate-700 text-base">No {filterTab} withdrawal requests</div>
            <div className="text-xs text-slate-400">All payouts in this category are up to date.</div>
          </div>
        )}

        {list.map((w: any) => (
          <div 
            key={w.key} 
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4 hover:border-indigo-200 transition-all"
          >
            {/* Top row: Amount, Gateway, User & Timestamp */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-slate-900">৳{w.amount}</span>
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black uppercase tracking-wider border border-indigo-200">
                    {w.paymentMethod || w.method || 'bKash'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${
                    w.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    w.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {w.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Requested on {formatTime(w.requestedAt)}
                </div>
              </div>

              {/* User Intelligence Summary Badge */}
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-left sm:text-right">
                <div className="font-bold text-slate-800 text-sm flex items-center sm:justify-end gap-1.5">
                  <User size={14} className="text-indigo-600" />
                  {w.userInfo?.username || w.username || 'User'}
                  <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded">Lv-{w.userInfo?.level || 1}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center sm:justify-end gap-2">
                  <span>Bal: <strong>৳{(w.userInfo?.balance || 0).toFixed(2)}</strong></span>
                  <span>•</span>
                  <span>Paid so far: <strong>৳{(w.userInfo?.totalWithdrawn || 0).toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            {/* Middle row: Payment Account Box with 1-click copy */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block sm:inline">Disbursement Target:</span>
                <span className="font-mono font-extrabold text-slate-900 text-lg sm:ml-2">
                  {w.paymentNumber || w.accountNumber || 'N/A'}
                </span>
                {w.trxId && (
                  <span className="block sm:inline sm:ml-3 text-xs font-bold text-indigo-600 font-mono">
                    TrxID: {w.trxId}
                  </span>
                )}
              </div>

              <button 
                onClick={() => copyText(w.paymentNumber || w.accountNumber, 'Account Number')} 
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
              >
                <Copy size={13} /> Copy Account
              </button>
            </div>

            {/* Rejection Note if present */}
            {w.rejectReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
                <strong>Rejection Reason:</strong> {w.rejectReason}
              </div>
            )}

            {/* Action Buttons for Pending Payouts */}
            {filterTab === 'pending' && (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button 
                  onClick={() => approveWithdraw(w)} 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-sm"
                >
                  <CheckCircle size={16} /> Mark Paid & Enter TrxID
                </button>
                <button 
                  onClick={() => rejectWithdraw(w)} 
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors border border-red-200"
                >
                  <XCircle size={16} /> Reject & Refund Balance
                </button>
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}
