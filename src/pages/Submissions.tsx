import { copyToClipboardFallback } from "../lib/clipboard";
import React, { useState, useMemo, useEffect } from 'react';
import { ref, update, get, push } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { 
  ClipboardCopy, 
  ArrowRightCircle, 
  Check,
  RefreshCw,
  ToggleLeft,
  ToggleRight, 
  XCircle, 
  CheckCircle2,
  Inbox, 
  Search, 
  Filter, 
  Copy, 
  User, 
  Mail, 
  Calendar, 
  Coins, 
  ShieldCheck, 
  AlertTriangle,
  History,
  Download,
  Eye
} from 'lucide-react';

export default function Submissions({ data, type = 'pending' }: any) {
  const [selectedMails, setSelectedMails] = useState<Record<string, Record<number, boolean>>>({});
  const [subType, setSubType] = useState<string>(type);
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
  const [search, setSearch] = useState('');
  const [userModal, setUserModal] = useState<any>(null);

  // Synchronize prop change
  React.useEffect(() => {
    if (type) setSubType(type);
  }, [type]);

  // Lookup map of users for fast enrichment
  const usersMap = useMemo(() => {
    const map = new Map<string, any>();
    (data.users || []).forEach((u: any) => {
      map.set(u.uid, u);
    });
    return map;
  }, [data.users]);

  // Enriched Submissions List
  const enrichedSubmissions = useMemo(() => {
    const subs = data.submissions || [];
    return subs.map((s: any) => {
      const user = usersMap.get(s.userId) || {};
      const totalUserSubs = subs.filter((other: any) => other.userId === s.userId).length;
      const approvedUserSubs = subs.filter((other: any) => other.userId === s.userId && other.status === 'approved').length;

      return {
        ...s,
        userInfo: {
          username: user.username || s.username || 'User',
          email: user.email || 'N/A',
          balance: user.balance || 0,
          hold: user.hold || 0,
          level: user.level || 1,
          createdAt: user.createdAt,
          manual_approved_count: user.manual_approved_count || 0,
          isTopSeller: user.isTopSeller,
          is_blocked: user.is_blocked,
          totalSubs: totalUserSubs,
          approvedSubs: approvedUserSubs
        }
      };
    });
  }, [data.submissions, usersMap]);

  // Filtered List
  const list = useMemo(() => {
    let filtered = enrichedSubmissions.filter((s: any) => s.status === subType);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter((s: any) => 
        (s.username || '').toLowerCase().includes(q) ||
        (s.userId || '').toLowerCase().includes(q) ||
        (s.key || '').toLowerCase().includes(q) ||
        (s.userInfo?.email || '').toLowerCase().includes(q) ||
        (s.gmails || []).some((m: any) => 
          (m.email || '').toLowerCase().includes(q) || 
          (m.recoveryEmail || '').toLowerCase().includes(q)
        )
      );
    }

    return filtered.sort((a: any, b: any) => (b.submittedAt || 0) - (a.submittedAt || 0));
  }, [enrichedSubmissions, subType, search]);

  const toggleMail = (subKey: string, mailIdx: number) => {
    setSelectedMails(prev => ({
      ...prev,
      [subKey]: {
        ...(prev[subKey] || {}),
        [mailIdx]: !(prev[subKey]?.[mailIdx] ?? true)
      }
    }));
  };

  const selectAllMailsInBatch = (subKey: string, count: number, value: boolean) => {
    const batchState: Record<number, boolean> = {};
    for (let i = 0; i < count; i++) {
      batchState[i] = value;
    }
    setSelectedMails(prev => ({
      ...prev,
      [subKey]: batchState
    }));
  };

  const copyText = (text: string, label = 'Copied') => {
    copyToClipboardFallback(text);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${label} copied!`,
      showConfirmButton: false,
      timer: 1500
    });
  };

  const copyBatchAll = (s: any) => {
    let text = `Submission: #${s.key}\nUser: ${s.userInfo?.username} (${s.userId})\n\n`;
    (s.gmails || []).forEach((m: any, idx: number) => {
      text += `Account #${idx + 1}:\nEmail: ${m.email}\nPassword: ${m.password}\nRecovery: ${m.recoveryEmail || 'None'}\n\n`;
    });
    copyText(text, 'Full Batch Data');
  };

  const moveToChecking = async (key: string) => {
    await update(ref(db, `submissions/${key}`), { status: 'checking' });
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: 'Moved to Checking Queue',
      showConfirmButton: false,
      timer: 1500
    });
  };

  const approveSubmission = async (s: any) => {
    const checks = selectedMails[s.key] || {};
    let count = 0;
    (s.gmails || []).forEach((_: any, i: number) => {
      if (checks[i] !== false) count++;
    });

    if (count === 0) {
      Swal.fire("Warning", "No mails are selected for approval.", "warning");
      return;
    }

    const emailCount = s.gmails?.length || 1;
    const rate = s.rate || (s.totalAmount ? (s.totalAmount / emailCount) : 10);
    const payout = Number((count * rate).toFixed(2));

    const confirm = await Swal.fire({
      title: 'Approve Submission?',
      html: `
        <div class="text-left text-sm bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div><strong>User:</strong> ${s.userInfo?.username}</div>
          <div><strong>Selected Accounts:</strong> ${count} of ${emailCount}</div>
          <div><strong>Calculated Payout:</strong> <span class="text-emerald-600 font-bold text-base">৳${payout}</span></div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Approve & Credit ৳${payout}`,
      confirmButtonColor: '#10b981'
    });

    if (confirm.isConfirmed) {
      const updatedGmails = (s.gmails || []).map((m: any, i: number) => ({
        ...m,
        status: checks[i] !== false ? 'approved' : 'rejected'
      }));

      await update(ref(db, `submissions/${s.key}`), {
        status: 'approved',
        approvedCount: count,
        finalPayout: payout,
        processedAt: Date.now(),
        gmails: updatedGmails
      });

      const userRef = ref(db, `users/${s.userId}`);
      const uSnap = await get(userRef);
      if (uSnap.exists()) {
        const u = uSnap.val();
        await update(userRef, {
          balance: (u.balance || 0) + payout,
          hold: Math.max(0, (u.hold || 0) - Number(s.totalAmount || payout)),
          manual_approved_count: (u.manual_approved_count || 0) + count
        });

        // Send Push notification
        await push(ref(db, `users/${s.userId}/notifications`), {
          title: 'সাবমিশন অনুমোদিত হয়েছে!',
          message: `আপনার সাবমিশনকৃত ${count} টি জিমেইলের জন্য ৳${payout} মূল ব্যালেন্সে যোগ করা হয়েছে।`,
          type: 'success',
          timestamp: Date.now()
        });
      }

      Swal.fire('Approved!', `Credited ৳${payout} to ${s.userInfo?.username}`, 'success');
    }
  };

  const rejectSubmission = async (s: any) => {
    const { value: reason } = await Swal.fire({
      title: 'Reject Submission?',
      input: 'text',
      inputPlaceholder: 'Reason (e.g. Wrong password, 2FA enabled, invalid mail)',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reject',
      confirmButtonColor: '#ef4444'
    });

    if (reason !== undefined) {
      const updatedGmails = (s.gmails || []).map((m: any) => ({
        ...m,
        status: 'rejected'
      }));

      await update(ref(db, `submissions/${s.key}`), {
        status: 'rejected',
        rejectReason: reason || 'Incorrect or non-functional credentials',
        processedAt: Date.now(),
        gmails: updatedGmails
      });

      const userRef = ref(db, `users/${s.userId}`);
      const uSnap = await get(userRef);
      if (uSnap.exists()) {
        const u = uSnap.val();
        await update(userRef, { 
          hold: Math.max(0, (u.hold || 0) - Number(s.totalAmount || 0)) 
        });

        await push(ref(db, `users/${s.userId}/notifications`), {
          title: 'সাবমিশন বাতিল করা হয়েছে',
          message: `আপনার সাবমিশন বাতিল করা হয়েছে। কারণ: ${reason || 'ভুল তথ্য'}`,
          type: 'danger',
          timestamp: Date.now()
        });
      }

      Swal.fire('Rejected', 'Hold amount cleared and user notified', 'info');
    }
  };

  const exportSubmissionsCSV = () => {
    let csv = 'Key,User,User UID,Status,Submitted At,Total Amount,Total Mails,Mails Data\n';
    list.forEach((s: any) => {
      const mailsStr = (s.gmails || []).map((m: any) => `${m.email}:${m.password}`).join(' | ');
      csv += `"${s.key}","${s.userInfo?.username || s.username || ''}","${s.userId || ''}","${s.status}","${s.submittedAt ? new Date(s.submittedAt).toISOString() : ''}",${s.totalAmount || 0},${s.gmails?.length || 0},"${mailsStr}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `submissions_${subType}_${Date.now()}.csv`;
    a.click();
  };

  const formatTime = (ts: any) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h2 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Inbox className="text-indigo-600" />
            Work Queue & Account Submissions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect credentials, user productivity history, and selectively approve accounts
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div 
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl cursor-pointer select-none"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw size={14} className={autoRefresh ? "text-indigo-600 animate-spin" : "text-slate-400"} />
            <span className="text-xs font-bold text-slate-700">Auto Refresh</span>
            {autoRefresh ? <ToggleRight size={24} className="text-indigo-600" /> : <ToggleLeft size={24} className="text-slate-300" />}
          </div>
          <button 
            onClick={exportSubmissionsCSV}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm text-slate-700"
        >
          <Download size={14} /> Export CSV
        </button>
        </div>
      </div>

      {/* Sub-Tab Navigation & Search */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-white space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by User, Email, Password, or Submission ID..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setSubType('pending')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 transition-colors ${
              subType === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Pending New ({enrichedSubmissions.filter((s: any) => s.status === 'pending').length})
          </button>

          <button
            onClick={() => setSubType('checking')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 transition-colors ${
              subType === 'checking'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            In Checking ({enrichedSubmissions.filter((s: any) => s.status === 'checking').length})
          </button>

          <button
            onClick={() => setSubType('approved')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 transition-colors ${
              subType === 'approved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Approved History ({enrichedSubmissions.filter((s: any) => s.status === 'approved').length})
          </button>

          <button
            onClick={() => setSubType('rejected')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 transition-colors ${
              subType === 'rejected'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Rejected ({enrichedSubmissions.filter((s: any) => s.status === 'rejected').length})
          </button>
        </div>
      </div>

      {/* Submissions List */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50/30 space-y-4">
        {/* Dynamic Queue Header matching the design */}
        <div className="flex items-center gap-2 mb-2 shrink-0 px-1">
          <Mail className="text-[#4f46e5] w-5 h-5 stroke-[2.5]" />
          <h3 className="font-extrabold text-slate-800 text-base sm:text-lg">
            {subType === 'pending' ? 'New Submissions' :
             subType === 'checking' ? 'In Checking Queue' :
             subType === 'approved' ? 'Approved History' : 'Rejected Submissions'}
          </h3>
        </div>

        {list.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
            <Inbox size={36} className="mx-auto text-slate-300" />
            <div className="font-bold text-slate-700 text-base">No {subType} submissions found</div>
            <div className="text-xs text-slate-400">All submissions in this queue have been processed or none exist.</div>
          </div>
        )}

        {list.map((s: any) => {
          const emailCount = s.gmails?.length || 1;
          const checks = selectedMails[s.key] || {};
          let selectedCount = 0;
          (s.gmails || []).forEach((_: any, i: number) => {
            if (checks[i] !== false) selectedCount++;
          });

          return (
            <div 
              key={s.key} 
              className="bg-white rounded-3xl border border-slate-100 shadow-md shadow-slate-100/70 overflow-hidden border-l-[6px] border-l-[#4f46e5] p-5 sm:p-6 mb-5 space-y-4"
            >
              {/* Card Header matching screenshot layout */}
              <div className="flex items-start justify-between gap-3 flex-wrap border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4f46e5] shrink-0">
                    <User size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#4f46e5] text-sm sm:text-base leading-tight">
                      {s.userInfo?.username || s.username || 'User'}
                    </h4>
                    <div className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">
                      {formatTime(s.submittedAt)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[#10b981] font-black text-lg sm:text-xl leading-none">
                    ৳{s.totalAmount || s.finalPayout || (emailCount * (s.rate || 15))}
                  </span>
                  <span className="bg-[#0066ff] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold leading-none shrink-0 shadow-xs">
                    {emailCount} {emailCount === 1 ? 'Email' : 'Emails'}
                  </span>
                </div>
              </div>

              {/* Mails Accounts Sub-List */}
              <div className="space-y-4">
                
                {/* Select All / Deselect Toolbar for Active Verification (Compact) */}
                {(subType === 'pending' || subType === 'checking') && (
                  <div className="flex items-center justify-between text-xs pb-1 text-slate-500 font-bold">
                    <div>
                      Selected: <span className="text-[#4f46e5] font-extrabold">{selectedCount} / {emailCount}</span>
                    </div>
                    <div className="flex gap-2 text-[11px]">
                      <button 
                        onClick={() => selectAllMailsInBatch(s.key, emailCount, true)}
                        className="text-[#4f46e5] hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-200">|</span>
                      <button 
                        onClick={() => selectAllMailsInBatch(s.key, emailCount, false)}
                        className="text-slate-400 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {s.gmails?.map((m: any, idx: number) => {
                  const isChecked = checks[idx] ?? true;
                  return (
                    <div 
                      key={idx} 
                      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all space-y-3 relative ${
                        (subType === 'pending' || subType === 'checking') 
                          ? (isChecked ? 'border-slate-200 shadow-2xs' : 'border-red-200 bg-red-50/10 opacity-70')
                          : (m.status === 'rejected' ? 'border-red-200 bg-red-50/10 opacity-70' : 'border-slate-200 shadow-2xs')
                      }`}
                    >
                      {/* Box Sub-header: Checkbox & Status */}
                      <div className="flex items-center justify-between">
                        {/* Custom Checkbox exactly as shown in screenshot */}
                        {(subType === 'pending' || subType === 'checking') ? (
                          <div className="flex items-center gap-2.5">
                            <div 
                              onClick={() => toggleMail(s.key, idx)}
                              className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                                isChecked 
                                  ? 'bg-[#4f46e5] text-white' 
                                  : 'border-2 border-slate-300 bg-white hover:border-slate-400'
                              }`}
                            >
                              {isChecked && <Check size={14} className="stroke-[3.5]" />}
                            </div>
                            <span className="text-xs font-bold text-slate-500 select-none cursor-pointer" onClick={() => toggleMail(s.key, idx)}>
                              {isChecked ? 'Selected' : 'Excluded'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">Account #{idx + 1}</span>
                        )}

                        {/* Status pill exactly as shown */}
                        <span className={`px-3 py-0.5 rounded-full text-xs font-semibold select-none border ${
                          m.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                          m.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-600' :
                          'bg-[#f8fafc] border-slate-200 text-slate-500'
                        }`}>
                          {m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : s.status}
                        </span>
                      </div>

                      {/* Fields with Labels */}
                      <div className="space-y-2.5">
                        {/* Email box */}
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex-1 bg-[#f8fafc] border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-black text-slate-400 tracking-wider w-11 shrink-0">EMAIL</span>
                            <span className="text-sm font-semibold text-slate-800 truncate select-all min-w-0 flex-1">{m.email}</span>
                          </div>
                          <button 
                            onClick={() => copyText(m.email, 'Email')} 
                            className="p-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-95 rounded-xl text-slate-400 hover:text-[#4f46e5] transition-all shadow-xs shrink-0 flex items-center justify-center w-11 h-11"
                            title="Copy Email"
                          >
                            <Copy size={16} />
                          </button>
                        </div>

                        {/* Password box */}
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex-1 bg-[#f8fafc] border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-black text-slate-400 tracking-wider w-11 shrink-0">PASS</span>
                            <span className="text-sm font-semibold text-slate-800 truncate select-all min-w-0 flex-1">{m.password}</span>
                          </div>
                          <button 
                            onClick={() => copyText(m.password, 'Password')} 
                            className="p-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-95 rounded-xl text-slate-400 hover:text-[#4f46e5] transition-all shadow-xs shrink-0 flex items-center justify-center w-11 h-11"
                            title="Copy Password"
                          >
                            <Copy size={16} />
                          </button>
                        </div>

                        {/* Optional Recovery Email box */}
                        {m.recoveryEmail && (
                          <div className="flex items-center gap-2 w-full">
                            <div className="flex-1 bg-[#f8fafc] border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3 min-w-0">
                              <span className="text-[10px] font-black text-slate-400 tracking-wider w-11 shrink-0">RECOV</span>
                              <span className="text-sm font-semibold text-slate-800 truncate select-all min-w-0 flex-1">{m.recoveryEmail}</span>
                            </div>
                            <button 
                              onClick={() => copyText(m.recoveryEmail, 'Recovery Email')} 
                              className="p-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-95 rounded-xl text-[#94a3b8] hover:text-[#4f46e5] transition-all shadow-xs shrink-0 flex items-center justify-center w-11 h-11"
                              title="Copy Recovery Email"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Rejection Note if Rejected */}
                {s.rejectReason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
                    <strong>Rejection Reason:</strong> {s.rejectReason}
                  </div>
                )}

                {/* Workflow Buttons with exact screenshot layout styles */}
                <div className="pt-2">
                  {subType === 'pending' && (
                    <div className="flex flex-col gap-2.5">
                      <button 
                        onClick={() => moveToChecking(s.key)} 
                        className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all shadow-md shadow-indigo-600/10 active:scale-[0.99]"
                      >
                        <ArrowRightCircle size={18} className="stroke-[2.5]" />
                        <span>Move to Checking</span>
                      </button>
                    </div>
                  )}

                  {subType === 'checking' && (
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button 
                        onClick={() => approveSubmission(s)} 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all shadow-md shadow-emerald-600/10 active:scale-[0.99]"
                      >
                        <CheckCircle2 size={18} className="stroke-[2.5]" />
                        <span>Approve Selected ({selectedCount})</span>
                      </button>
                      <button 
                        onClick={() => rejectSubmission(s)} 
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all border border-red-200"
                      >
                        <XCircle size={18} className="stroke-[2.5]" />
                        <span>Reject All</span>
                      </button>
                    </div>
                  )}

                  {subType === 'approved' && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Approved {s.approvedCount || emailCount} out of {emailCount} accounts (Payout: ৳{s.finalPayout || s.totalAmount || 0})</span>
                    </div>
                  )}

                  {subType === 'rejected' && (
                    <div className="bg-red-50/50 border border-red-150 rounded-2xl p-4 text-xs font-semibold text-red-800 space-y-1">
                      <div className="flex items-center gap-2">
                        <XCircle size={16} className="text-red-600 shrink-0" />
                        <span>Submission Rejected</span>
                      </div>
                      {s.rejectReason && (
                        <div className="text-slate-500 font-medium pl-6">
                          Reason: {s.rejectReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
