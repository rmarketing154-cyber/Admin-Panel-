import { copyToClipboardFallback } from "../lib/clipboard";
import React, { useState, useEffect, useMemo } from 'react';
import { ref, update, push } from 'firebase/database';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import Swal from 'sweetalert2';
import { exportToPDF } from '../utils/pdfExport';
import { 
  Users as UsersIcon, 
  ChevronLeft, 
  Search, 
  Download, 
  FileText,
  ChevronRight, 
  ShieldBan, 
  Trophy, 
  Coins, 
  Mail, 
  Clock, 
  Smartphone, 
  Calendar, 
  ArrowUpCircle, 
  MessageSquare, 
  Key, 
  List, 
  TrendingUp, 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Filter, 
  ArrowUpDown, 
  ExternalLink,
  ShieldCheck,
  Percent,
  Inbox,
  UserCheck,
  AlertCircle,
  Eye,
  Hash,
  Activity
} from 'lucide-react';

export default function Users({ data, setCurrentTab }: any) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'submissions' | 'withdrawals' | 'referrals' | 'actions'>('overview');

  // Keep selected user updated if live data changes
  useEffect(() => {
    if (selectedUser) {
      const updated = (data.users || []).find((u: any) => u.uid === selectedUser.uid);
      if (updated) setSelectedUser(updated);
    }
  }, [data.users]);

  const copyToClipboard = (text: string, label = 'Copied') => {
    copyToClipboardFallback(text);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${label} copied to clipboard`,
      showConfirmButton: false,
      timer: 1500
    });
  };

  const formatTime = (ts: any) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0 mins';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getReferrerUser = (referredBy: any) => {
    if (!referredBy) return null;
    const allUsers = data.users || [];
    const cleanKey = String(referredBy).trim().toLowerCase();
    return allUsers.find((u: any) => 
      (u.uid && u.uid.toLowerCase() === cleanKey) ||
      (u.id && String(u.id).toLowerCase() === cleanKey) ||
      (u.referralCode && String(u.referralCode).toLowerCase() === cleanKey)
    );
  };

  // User Stats & Calculations for Filter/Sort
  const usersWithStats = useMemo(() => {
    const subs = data.submissions || [];
    const withs = data.withdraws || [];
    const allUsers = data.users || [];

    // Map for faster lookups
    const subsByUser: Record<string, any[]> = {};
    subs.forEach((s: any) => {
      if (!subsByUser[s.userId]) subsByUser[s.userId] = [];
      subsByUser[s.userId].push(s);
    });

    const withsByUser: Record<string, any[]> = {};
    withs.forEach((w: any) => {
      if (!withsByUser[w.userId]) withsByUser[w.userId] = [];
      withsByUser[w.userId].push(w);
    });

    const refsByUser: Record<string, any[]> = {};
    allUsers.forEach((u: any) => {
      if (u.referredBy) {
        if (!refsByUser[u.referredBy]) refsByUser[u.referredBy] = [];
        refsByUser[u.referredBy].push(u);
      }
    });

    return allUsers.map((u: any) => {
      const userSubs = subsByUser[u.uid] || [];
      const userWiths = withsByUser[u.uid] || [];
      const userRefs = refsByUser[u.uid] || refsByUser[u.referralCode] || [];

      const approvedSubs = userSubs.filter((s: any) => s.status === 'approved');
      const pendingSubs = userSubs.filter((s: any) => s.status === 'pending' || s.status === 'checking');
      const rejectedSubs = userSubs.filter((s: any) => s.status === 'rejected');
      const approvedWiths = userWiths.filter((w: any) => w.status === 'approved');
      const pendingWiths = userWiths.filter((w: any) => w.status === 'pending');

      const totalWithdrawn = approvedWiths.reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);
      const approvedEmails = approvedSubs.reduce((sum: number, s: any) => sum + Number(s.approvedCount || s.gmails?.length || 0), 0) + Number(u.manual_approved_count || 0);
      const totalSubmittedEmails = userSubs.reduce((sum: number, s: any) => sum + (s.gmails?.length || 1), 0);

      const approvalRate = totalSubmittedEmails > 0 
        ? Math.min(100, Math.round((approvedEmails / totalSubmittedEmails) * 100))
        : (approvedEmails > 0 ? 100 : 0);

      const lifetimeEarned = Number(u.balance || 0) + totalWithdrawn;

      return {
        ...u,
        totalSubsCount: userSubs.length,
        pendingSubsCount: pendingSubs.length,
        approvedSubsCount: approvedSubs.length,
        rejectedSubsCount: rejectedSubs.length,
        totalWithdrawn,
        pendingWithsCount: pendingWiths.length,
        approvedEmails,
        totalSubmittedEmails,
        approvalRate,
        lifetimeEarned,
        referralsCount: userRefs.length,
        userSubs,
        userWiths,
        userRefs
      };
    });
  }, [data.users, data.submissions, data.withdraws]);

  // Filtering & Sorting
  const filteredUsers = useMemo(() => {
    let list = [...usersWithStats];
    const now = Date.now();

    // Filter
    if (filter === 'active') {
      list = list.filter((u: any) => u.last_login && (now - new Date(u.last_login).getTime() < 86400000));
    } else if (filter === 'new') {
      list = list.filter((u: any) => u.createdAt && (now - new Date(u.createdAt).getTime() < 86400000));
    } else if (filter === 'blocked') {
      list = list.filter((u: any) => u.is_blocked);
    } else if (filter === 'top') {
      list = list.filter((u: any) => u.isTopSeller);
    } else if (filter === 'pending_subs') {
      list = list.filter((u: any) => u.pendingSubsCount > 0);
    } else if (filter === 'pending_withs') {
      list = list.filter((u: any) => u.pendingWithsCount > 0);
    } else if (filter === 'high_earners') {
      list = list.filter((u: any) => (u.balance || 0) >= 500 || u.totalWithdrawn >= 1000);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((u: any) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.uid || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.device || u.device_name || '').toLowerCase().includes(q) ||
        (u.referralCode || '').toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a: any, b: any) => {
      if (sortBy === 'newest') {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      }
      if (sortBy === 'oldest') {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tA - tB;
      }
      if (sortBy === 'balance_high') return (b.balance || 0) - (a.balance || 0);
      if (sortBy === 'withdrawn_high') return b.totalWithdrawn - a.totalWithdrawn;
      if (sortBy === 'approved_high') return b.approvedEmails - a.approvedEmails;
      if (sortBy === 'subs_high') return b.totalSubsCount - a.totalSubsCount;
      if (sortBy === 'refs_high') return b.referralsCount - a.referralsCount;
      if (sortBy === 'last_login') {
        const lA = a.last_login ? new Date(a.last_login).getTime() : 0;
        const lB = b.last_login ? new Date(b.last_login).getTime() : 0;
        return lB - lA;
      }
      return 0;
    });

    return list;
  }, [usersWithStats, filter, search, sortBy]);

  const exportPDF = () => {
    const headers = [
      'UID',
      'Name / Username',
      'Email',
      'Phone',
      'Lv',
      'Balance',
      'Hold',
      'Paid Out',
      'Approved Mails',
      'Status',
      'Joined Date'
    ];

    const data = usersWithStats.map((u: any) => [
      u.uid ? u.uid.substring(0, 10) + '...' : '',
      u.username || u.name || 'N/A',
      u.email || 'N/A',
      u.phone || 'N/A',
      `Lv.${u.level || 1}`,
      `Tk ${Number(u.balance || 0).toFixed(2)}`,
      `Tk ${Number(u.hold || 0).toFixed(2)}`,
      `Tk ${Number(u.totalWithdrawn || 0).toFixed(2)}`,
      String(u.approvedEmails || 0),
      u.is_blocked ? 'Blocked' : 'Active',
      u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : 'N/A'
    ]);

    const totalBalance = usersWithStats.reduce((sum: number, u: any) => sum + Number(u.balance || 0), 0);
    const totalWithdrawn = usersWithStats.reduce((sum: number, u: any) => sum + Number(u.totalWithdrawn || 0), 0);

    exportToPDF({
      title: 'Users Dossier & Financial Summary Report',
      subtitle: `Total Users: ${usersWithStats.length}`,
      filename: `users_report_${Date.now()}`,
      headers,
      data,
      summaryStats: [
        { label: 'Total Registered', value: usersWithStats.length },
        { label: 'Total Active Balances', value: `Tk ${totalBalance.toFixed(2)}` },
        { label: 'Total Disbursed', value: `Tk ${totalWithdrawn.toFixed(2)}` }
      ]
    });
  };

  // Administrative Actions
  const handleMessage = async (u: any) => {
    const { value: msg } = await Swal.fire({
      title: `Send Notification to ${u.username || 'User'}`,
      input: 'textarea',
      inputPlaceholder: 'Enter push notification message...',
      inputAttributes: {
        'aria-label': 'Type message here'
      },
      showCancelButton: true,
      confirmButtonText: 'Send Notification',
      confirmButtonColor: '#4f46e5'
    });

    if (msg) {
      await push(ref(db, `users/${u.uid}/notifications`), {
        title: 'Admin Message',
        message: msg,
        type: 'info',
        timestamp: Date.now()
      });
      Swal.fire('Delivered', 'Notification queued for user', 'success');
    }
  };

  const handleAddBal = async (u: any) => {
    const { value: amt } = await Swal.fire({
      title: 'Adjust Main Balance (৳)',
      text: `Current balance: ৳${(u.balance || 0).toFixed(2)}. Enter positive number to add, negative to deduct.`,
      input: 'number',
      inputPlaceholder: 'e.g. 50 or -20',
      showCancelButton: true,
      confirmButtonText: 'Apply Adjustment',
      confirmButtonColor: '#4f46e5'
    });

    if (amt !== undefined && amt !== '') {
      const newBal = (u.balance || 0) + Number(amt);
      await update(ref(db, `users/${u.uid}`), { balance: newBal });
      
      // Log notification
      await push(ref(db, `users/${u.uid}/notifications`), {
        title: 'ব্যালেন্স অ্যাডজাস্টমেন্ট',
        message: `অ্যাডমিন কর্তৃক আপনার একাউন্টে ৳${amt} সমন্বয় করা হয়েছে। বর্তমান ব্যালেন্স: ৳${newBal.toFixed(2)}`,
        type: Number(amt) >= 0 ? 'success' : 'warning',
        timestamp: Date.now()
      });

      Swal.fire('Updated', `Balance modified by ৳${amt}. New balance: ৳${newBal.toFixed(2)}`, 'success');
    }
  };

  const handleHoldBal = async (u: any) => {
    const { value: amt } = await Swal.fire({
      title: 'Adjust Hold Balance (৳)',
      text: `Current hold: ৳${(u.hold || 0).toFixed(2)}`,
      input: 'number',
      inputPlaceholder: 'e.g. 0 to clear hold',
      showCancelButton: true,
      confirmButtonText: 'Save Hold',
      confirmButtonColor: '#f59e0b'
    });

    if (amt !== undefined && amt !== '') {
      await update(ref(db, `users/${u.uid}`), { hold: Number(amt) });
      Swal.fire('Updated', `Hold balance updated to ৳${amt}`, 'success');
    }
  };

  const handleBoostLvl = async (u: any) => {
    const { value: lvl } = await Swal.fire({
      title: 'Set User Level',
      input: 'select',
      inputOptions: {
        '1': 'Level 1 (Novice)',
        '2': 'Level 2 (Active Worker)',
        '3': 'Level 3 (Pro Seller)',
        '4': 'Level 4 (Elite Partner)',
        '5': 'Level 5 (VIP Master)'
      },
      inputValue: String(u.level || 1),
      showCancelButton: true,
      confirmButtonColor: '#7c3aed'
    });

    if (lvl) {
      await update(ref(db, `users/${u.uid}`), { level: Number(lvl) });
      Swal.fire('Level Updated', `User promoted to Level ${lvl}`, 'success');
    }
  };

  const handleRefEarn = async (u: any) => {
    const { value: amt } = await Swal.fire({
      title: 'Set Referral Commission (৳)',
      input: 'number',
      inputValue: u.referralEarnings || 0,
      showCancelButton: true,
      confirmButtonColor: '#10b981'
    });

    if (amt !== undefined && amt !== '') {
      await update(ref(db, `users/${u.uid}`), { referralEarnings: Number(amt) });
      Swal.fire('Saved', 'Referral earnings updated', 'success');
    }
  };

  const handleResetPass = async (u: any) => {
    if (!u.email) return Swal.fire('Error', 'User has no registered email address', 'error');
    try {
      await sendPasswordResetEmail(auth, u.email);
      Swal.fire('Email Sent', `Password reset link sent to ${u.email}`, 'success');
    } catch (e: any) {
      Swal.fire('Notice', `Attempted reset email: ${e.message}`, 'info');
    }
  };

  const handleBlock = async (u: any) => {
    const willBlock = !u.is_blocked;
    const confirm = await Swal.fire({
      title: willBlock ? 'Ban / Block User?' : 'Unblock User?',
      text: willBlock ? 'This will prevent the user from logging in and submitting work.' : 'User will be restored to active status.',
      icon: willBlock ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: willBlock ? 'Yes, Ban Account' : 'Yes, Unban',
      confirmButtonColor: willBlock ? '#ef4444' : '#10b981'
    });

    if (confirm.isConfirmed) {
      await update(ref(db, `users/${u.uid}`), { is_blocked: willBlock });
      Swal.fire('Updated', willBlock ? 'User banned successfully' : 'User unbanned successfully', 'success');
    }
  };

  const handleTopSeller = async (u: any) => {
    await update(ref(db, `users/${u.uid}`), { isTopSeller: !u.isTopSeller });
    Swal.fire('Updated', u.isTopSeller ? 'Removed from Top Sellers' : 'Marked as Top Seller', 'success');
  };

  // DETAILED USER PROFILE VIEW
  if (selectedUser) {
    const selectedStats = usersWithStats.find((u: any) => u.uid === selectedUser.uid) || selectedUser;
    const userSubs = selectedStats.userSubs || [];
    const userWiths = selectedStats.userWiths || [];
    const userRefs = selectedStats.userRefs || [];

    return (
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
        {/* Top Navigation Bar */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button 
            onClick={() => setSelectedUser(null)}
            className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold transition-colors text-sm"
          >
            <ChevronLeft size={18} />
            Back to All Users ({usersWithStats.length})
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMessage(selectedUser)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare size={14} /> Send Alert
            </button>
            <button
              onClick={() => handleBlock(selectedUser)}
              className={`px-3 py-1.5 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
                selectedUser.is_blocked 
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' 
                  : 'bg-red-50 hover:bg-red-100 text-red-700'
              }`}
            >
              <ShieldBan size={14} /> {selectedUser.is_blocked ? 'Unban' : 'Ban User'}
            </button>
          </div>
        </div>

        {/* User Profile Header Card */}
        <div className="p-5 sm:p-6 bg-slate-50/60 border-b border-slate-200">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 flex items-center justify-center font-black text-3xl shadow-sm border border-indigo-200 shrink-0 overflow-hidden relative">
                {selectedUser.photoURL ? (
                  <img 
                    src={selectedUser.photoURL} 
                    alt={selectedUser.username} 
                    className="w-full h-full object-cover absolute inset-0" 
                    onError={(e: any) => { e.currentTarget.style.display = 'none'; }} 
                  />
                ) : null}
                <span className={selectedUser.photoURL ? 'opacity-0' : ''}>
                  {selectedUser.username?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-extrabold text-slate-900 text-xl sm:text-2xl truncate">
                    {selectedUser.username || 'Unnamed User'}
                  </h1>
                  {selectedUser.isTopSeller && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <Trophy size={12} className="fill-amber-500" /> Top Seller
                    </span>
                  )}
                  {selectedUser.is_blocked ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                      <ShieldBan size={12} /> Banned
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <ShieldCheck size={12} /> Active
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                    Lv-{selectedUser.level || 1}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1 font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    <Hash size={12} /> UID: {selectedUser.uid}
                    <button onClick={() => copyToClipboard(selectedUser.uid, 'UID')} className="text-slate-400 hover:text-indigo-600">
                      <Copy size={12} />
                    </button>
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Mail size={13} className="text-slate-400" /> {selectedUser.email || 'No email provided'}
                  </span>
                  {selectedUser.phone && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Smartphone size={13} className="text-slate-400" /> {selectedUser.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Balances Highlight */}
            <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 shrink-0">
              <div className="px-3 border-r border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Main Balance</div>
                <div className="font-black text-2xl text-emerald-600">৳{(selectedUser.balance || 0).toFixed(2)}</div>
              </div>
              <div className="px-3 border-r border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hold (Pending)</div>
                <div className="font-black text-2xl text-amber-600">৳{(selectedUser.hold || 0).toFixed(2)}</div>
              </div>
              <div className="px-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paid</div>
                <div className="font-black text-2xl text-indigo-600">৳{selectedStats.totalWithdrawn.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Tab Navigation inside Profile */}
          <div className="flex gap-2 overflow-x-auto mt-4 pb-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Activity size={14} /> Comprehensive Dossier
            </button>

            <button
              onClick={() => setActiveTab('visits')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                activeTab === 'visits'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Clock size={14} /> Visits & Time Open ({selectedUser.visit_count || selectedUser.visitHistory?.length || (selectedUser.last_login ? 1 : 0)})
            </button>

            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                activeTab === 'submissions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Inbox size={14} /> Submissions History ({userSubs.length})
            </button>

            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                activeTab === 'withdrawals'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Wallet size={14} /> Withdrawals ({userWiths.length})
            </button>

            <button
              onClick={() => setActiveTab('referrals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                activeTab === 'referrals'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <UsersIcon size={14} /> Referrals ({userRefs.length})
            </button>

            <button
              onClick={() => setActiveTab('actions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                activeTab === 'actions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Key size={14} /> Admin Controls
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto bg-slate-50/40">
          
          {/* 1. OVERVIEW DOSSIER TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Performance Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Value</div>
                  <div className="text-xl font-black text-slate-800 mt-1">৳{selectedStats.lifetimeEarned.toFixed(2)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Balance + Paid</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved Emails</div>
                  <div className="text-xl font-black text-indigo-600 mt-1">{selectedStats.approvedEmails}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Verified Accounts</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Batches</div>
                  <div className="text-xl font-black text-slate-800 mt-1">{selectedStats.totalSubsCount}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{selectedStats.pendingSubsCount} in queue</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approval Rate</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">{selectedStats.approvalRate}%</div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${selectedStats.approvalRate}%` }}></div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referral Earnings</div>
                  <div className="text-xl font-black text-blue-600 mt-1">৳{(selectedUser.referralEarnings || 0).toFixed(2)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{userRefs.length} downline members</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Level</div>
                  <div className="text-xl font-black text-purple-600 mt-1">Level {selectedUser.level || 1}</div>
                  <div className="text-[11px] text-purple-400 mt-0.5">Commission tier</div>
                </div>
              </div>

              {/* Technical & Registration Identity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Smartphone size={16} className="text-indigo-600" /> Device & Session Telemetry
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block">Registered Device</span>
                      <span className="font-bold text-slate-700 break-words">{selectedUser.device || selectedUser.device_name || 'Generic Web / Android'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block">Last Active Session</span>
                      <span className="font-bold text-slate-700">{formatTime(selectedUser.last_login)}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block">Total Time Open</span>
                      <span className="font-bold text-indigo-600">{formatDuration(selectedUser.total_time_open || selectedUser.totalTimeOpen || (selectedUser.last_login ? 1800 : 0))}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block">Total Visit Count</span>
                      <span className="font-bold text-emerald-600">{selectedUser.visit_count || selectedUser.visitCount || (selectedUser.last_login ? 1 : 0)} visits</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block">App Version</span>
                      <span className="font-bold text-slate-700">{selectedUser.app_version || '1.0.0 (Latest)'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block">Push Notification Token</span>
                      <span className="font-bold text-slate-700 truncate block">
                        {selectedUser.fcmToken || selectedUser.push_token ? '✓ Connected' : 'None Registered'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Calendar size={16} className="text-indigo-600" /> Account Lifecycle & Affiliation
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block">Registration Timestamp</span>
                      <span className="font-bold text-slate-700">{formatTime(selectedUser.createdAt)}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block">Referral Code</span>
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                        {selectedUser.referralCode || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block">Referred By</span>
                      {(() => {
                        if (!selectedUser.referredBy) {
                          return <span className="font-bold text-slate-500 block mt-0.5">Organic (Direct)</span>;
                        }
                        const referrer = getReferrerUser(selectedUser.referredBy);
                        if (referrer) {
                          const displayName = referrer.username || referrer.name || referrer.displayName || referrer.email?.split('@')[0] || 'User';
                          return (
                            <button
                              type="button"
                              onClick={() => setSelectedUser(referrer)}
                              className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold transition-all text-xs group cursor-pointer text-left shadow-2xs max-w-full"
                              title={`Click to open ${displayName}'s profile`}
                            >
                              <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-black text-slate-800 group-hover:text-indigo-700 truncate max-w-[120px]">
                                {displayName}
                              </span>
                              <span className="text-[10px] text-indigo-600 font-medium shrink-0">↗</span>
                            </button>
                          );
                        }
                        return (
                          <span className="font-bold text-slate-700 truncate block mt-0.5">
                            {selectedUser.referredBy.length > 14 ? `ID: ${selectedUser.referredBy.substring(0, 10)}...` : selectedUser.referredBy}
                          </span>
                        );
                      })()}
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block">Security Status</span>
                      <span className={`font-bold ${selectedUser.is_blocked ? 'text-red-600' : 'text-emerald-600'}`}>
                        {selectedUser.is_blocked ? 'Banned / Restricted' : 'Clean & Verified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Jump Buttons to Sub-Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setActiveTab('submissions')}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600">View All Submissions</div>
                    <div className="text-xs text-slate-400">{userSubs.length} total work records</div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  onClick={() => setActiveTab('withdrawals')}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600">View Payout History</div>
                    <div className="text-xs text-slate-400">৳{selectedStats.totalWithdrawn.toFixed(2)} paid in {userWiths.length} transactions</div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  onClick={() => setActiveTab('referrals')}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600">View Invited Users</div>
                    <div className="text-xs text-slate-400">{userRefs.length} downline members</div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </div>
          )}

          {/* 2. VISITS & TIME OPEN TAB */}
          {activeTab === 'visits' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Time Open</div>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    {formatDuration(selectedUser.total_time_open || selectedUser.totalTimeOpen || 0)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Cumulative active app usage</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Visit Count</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {selectedUser.visit_count || selectedUser.visitCount || (selectedUser.visitHistory ? Object.keys(selectedUser.visitHistory).length : 0)} visits
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Times opened app / logged in</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Visit Timestamp</div>
                  <div className="text-sm font-black text-slate-800 mt-2">
                    {formatTime(selectedUser.last_login || selectedUser.lastVisit)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Device: {selectedUser.device || selectedUser.device_name || 'Android App'}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Activity size={16} className="text-indigo-600" /> Visit Records & Session History
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Live Telemetry Log</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {selectedUser.visitHistory && Object.keys(selectedUser.visitHistory).length > 0 ? (
                    Object.entries(selectedUser.visitHistory).map(([key, v]: [string, any], index) => (
                      <div key={key || index} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">App Session Opened</div>
                            <div className="text-[11px] text-slate-400">Device: {v.device || selectedUser.device || 'Android App'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-700">{formatTime(v.timestamp || v.time || selectedUser.last_login)}</div>
                          <div className="text-[11px] text-emerald-600 font-semibold">Duration: {formatDuration(v.duration || 300)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      <Clock size={32} className="mx-auto text-slate-300 mb-2" />
                      <div>Active Session & Visit Recorded</div>
                      <div className="text-[11px] text-slate-500 mt-1">Last seen online at: {formatTime(selectedUser.last_login)}</div>
                      <div className="text-[11px] text-indigo-600 font-bold mt-2">Total Accumulated Time Open: {formatDuration(selectedUser.total_time_open || selectedUser.totalTimeOpen || 1800)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. SUBMISSIONS HISTORY TAB */}
          {activeTab === 'submissions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Inbox size={18} className="text-indigo-600" />
                  All Work Batches Submitted by {selectedUser.username || 'this user'}
                </div>
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                  {userSubs.length} Total Submissions
                </span>
              </div>

              {userSubs.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                  User has not submitted any email batches yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {userSubs.map((s: any) => (
                    <div key={s.key} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${
                            s.status === 'approved' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : s.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : s.status === 'checking'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {s.status}
                          </span>
                          <span className="text-xs font-bold text-slate-700 font-mono">#{s.key.substring(0, 10)}</span>
                          <span className="text-xs text-slate-400">{formatTime(s.submittedAt)}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-600">৳{s.totalAmount || s.finalPayout || 0}</span>
                          <span className="text-xs text-slate-400 ml-1.5">({s.gmails?.length || 1} Mails)</span>
                        </div>
                      </div>

                      {/* Gmail Accounts list */}
                      {s.gmails && s.gmails.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {s.gmails.map((m: any, mIdx: number) => (
                            <div key={mIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between items-center gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 truncate">{m.email}</div>
                                <div className="text-slate-500 font-mono truncate">Pass: {m.password}</div>
                                {m.recoveryEmail && <div className="text-slate-400 text-[10px] truncate">Rec: {m.recoveryEmail}</div>}
                              </div>
                              <button onClick={() => copyToClipboard(`${m.email} | ${m.password}`, 'Credentials')} className="text-slate-400 hover:text-indigo-600 shrink-0">
                                <Copy size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. WITHDRAWALS TAB */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Wallet size={18} className="text-indigo-600" />
                  Payout Requests & Settlement History
                </div>
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                  {userWiths.length} Total Requests
                </span>
              </div>

              {userWiths.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                  User has no withdrawal records yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {userWiths.map((w: any) => (
                    <div key={w.key} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-800">৳{w.amount}</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-indigo-50 text-indigo-700">
                            {w.paymentMethod || w.method || 'bKash'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${
                            w.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            w.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {w.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Account: <span className="font-bold text-slate-700">{w.paymentNumber || w.accountNumber || 'N/A'}</span>
                          {w.trxId && <span className="ml-2 text-indigo-600 font-mono">TrxID: {w.trxId}</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Requested: {formatTime(w.requestedAt)}
                        </div>
                      </div>

                      <button
                        onClick={() => copyToClipboard(w.paymentNumber || w.accountNumber, 'Account Number')}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Copy size={13} /> Copy Number
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. REFERRALS TAB */}
          {activeTab === 'referrals' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <UsersIcon size={18} className="text-indigo-600" />
                  Users Invited by {selectedUser.username || 'this user'}
                </div>
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  {userRefs.length} Downline Members
                </span>
              </div>

              {userRefs.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                  This user has not referred any users yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userRefs.map((refUser: any) => (
                    <div 
                      key={refUser.uid}
                      onClick={() => setSelectedUser(refUser)}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                          {refUser.username?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            {refUser.username || 'User'}
                            {refUser.is_blocked && <span className="text-[10px] text-red-500 font-bold">(Blocked)</span>}
                          </div>
                          <div className="text-xs text-slate-400">{refUser.email || 'No email'}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Joined: {formatTime(refUser.createdAt)}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-emerald-600 text-sm">৳{(refUser.balance || 0).toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400">Balance</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. ADMIN CONTROLS TAB */}
          {activeTab === 'actions' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldBan size={20} className="text-indigo-600" /> Direct Account Controls & Permissions
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <button
                  onClick={() => handleMessage(selectedUser)}
                  className="p-4 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold flex flex-col items-center justify-center gap-2 transition-colors text-center"
                >
                  <MessageSquare size={22} />
                  <span className="text-xs">Send Push Notification</span>
                </button>

                <button
                  onClick={() => handleAddBal(selectedUser)}
                  className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold flex flex-col items-center justify-center gap-2 transition-colors text-center"
                >
                  <Coins size={22} />
                  <span className="text-xs">Adjust Main Balance</span>
                </button>

                <button
                  onClick={() => handleHoldBal(selectedUser)}
                  className="p-4 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 font-bold flex flex-col items-center justify-center gap-2 transition-colors text-center"
                >
                  <Wallet size={22} />
                  <span className="text-xs">Adjust Hold Balance</span>
                </button>

                <button
                  onClick={() => handleBoostLvl(selectedUser)}
                  className="p-4 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 font-bold flex flex-col items-center justify-center gap-2 transition-colors text-center"
                >
                  <ArrowUpCircle size={22} />
                  <span className="text-xs">Promote / Change Level</span>
                </button>

                <button
                  onClick={() => handleRefEarn(selectedUser)}
                  className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold flex flex-col items-center justify-center gap-2 transition-colors text-center"
                >
                  <TrendingUp size={22} />
                  <span className="text-xs">Edit Ref Earnings</span>
                </button>

                <button
                  onClick={() => handleResetPass(selectedUser)}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex flex-col items-center justify-center gap-2 transition-colors text-center"
                >
                  <Key size={22} />
                  <span className="text-xs">Send Password Reset</span>
                </button>

                <button
                  onClick={() => handleTopSeller(selectedUser)}
                  className={`p-4 rounded-xl border font-bold flex flex-col items-center justify-center gap-2 transition-colors text-center ${
                    selectedUser.isTopSeller
                      ? 'bg-slate-100 border-slate-300 text-slate-700'
                      : 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700'
                  }`}
                >
                  <Trophy size={22} />
                  <span className="text-xs">{selectedUser.isTopSeller ? 'Remove Top Seller' : 'Make Top Seller'}</span>
                </button>

                <button
                  onClick={() => handleBlock(selectedUser)}
                  className={`p-4 rounded-xl border font-bold flex flex-col items-center justify-center gap-2 transition-colors text-center ${
                    selectedUser.is_blocked
                      ? 'bg-slate-100 border-slate-300 text-slate-700'
                      : 'bg-red-50 border-red-200 hover:bg-red-100 text-red-700'
                  }`}
                >
                  <ShieldBan size={22} />
                  <span className="text-xs">{selectedUser.is_blocked ? 'Unban Account' : 'Ban / Restrict User'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // MAIN ALL USERS DIRECTORY VIEW
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h2 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <UsersIcon className="text-indigo-600" />
            Registered Users Intelligence
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Realtime directory of {usersWithStats.length} user accounts with full financial & work telemetry
          </p>
        </div>

        <button 
          onClick={exportPDF} 
          className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors shadow-2xs text-indigo-700 cursor-pointer"
        >
          <FileText size={15} /> Export PDF Report
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0 space-y-3 bg-white">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Name, Email, UID, Phone, Device, or Referral Code..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-sm text-slate-800"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600">
                Clear
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown size={14} /> Sort:
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="newest">Newest Registered</option>
              <option value="oldest">Oldest Registered</option>
              <option value="balance_high">Highest Balance</option>
              <option value="withdrawn_high">Highest Withdrawn</option>
              <option value="approved_high">Most Approved Emails</option>
              <option value="subs_high">Most Submissions</option>
              <option value="refs_high">Most Referrals</option>
              <option value="last_login">Recently Active</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <button 
            onClick={() => setFilter('all')} 
            className={`px-3.5 py-1.5 rounded-lg shrink-0 transition-colors ${
              filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Users ({usersWithStats.length})
          </button>

          <button 
            onClick={() => setFilter('active')} 
            className={`px-3.5 py-1.5 rounded-lg shrink-0 transition-colors ${
              filter === 'active' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Active Today (24h)
          </button>

          <button 
            onClick={() => setFilter('new')} 
            className={`px-3.5 py-1.5 rounded-lg shrink-0 transition-colors ${
              filter === 'new' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            New Users (24h)
          </button>

          <button 
            onClick={() => setFilter('pending_subs')} 
            className={`px-3.5 py-1.5 rounded-lg shrink-0 transition-colors ${
              filter === 'pending_subs' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Has Pending Work
          </button>

          <button 
            onClick={() => setFilter('pending_withs')} 
            className={`px-3.5 py-1.5 rounded-lg shrink-0 transition-colors ${
              filter === 'pending_withs' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Has Pending Payout
          </button>

          <button 
            onClick={() => setFilter('top')} 
            className={`px-3.5 py-1.5 rounded-lg shrink-0 transition-colors ${
              filter === 'top' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Top Sellers
          </button>

          <button 
            onClick={() => setFilter('blocked')} 
            className={`px-3.5 py-1.5 rounded-lg shrink-0 transition-colors ${
              filter === 'blocked' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Banned ({usersWithStats.filter((u: any) => u.is_blocked).length})
          </button>

          <button 
            onClick={() => setFilter('high_earners')} 
            className={`px-3.5 py-1.5 rounded-lg shrink-0 transition-colors ${
              filter === 'high_earners' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            High Earners (৳500+)
          </button>
        </div>
      </div>

      {/* Users List Body */}
      <div className="flex-1 overflow-y-auto bg-slate-50/30 divide-y divide-slate-100">
        {filteredUsers.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <UserCheck size={24} />
            </div>
            <div className="font-bold text-slate-700">No users found</div>
            <div className="text-xs text-slate-400">Try adjusting your search query or filter tags.</div>
          </div>
        )}

        {filteredUsers.map((u: any) => (
          <div 
            key={u.uid} 
            onClick={() => setSelectedUser(u)} 
            className="p-4 sm:px-6 bg-white hover:bg-indigo-50/30 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
          >
            {/* Left: User Identity & Avatar */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-lg shrink-0 group-hover:scale-105 transition-transform overflow-hidden relative shadow-sm">
                {u.photoURL ? (
                  <img src={u.photoURL} alt={u.username} className="w-full h-full object-cover absolute inset-0" onError={(e: any) => { e.currentTarget.style.display = 'none'; }} />
                ) : null}
                <span className={u.photoURL ? 'opacity-0' : ''}>{u.username?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`font-bold text-sm sm:text-base ${u.is_blocked ? 'text-red-500 line-through' : 'text-slate-900 group-hover:text-indigo-600 transition-colors'}`}>
                    {u.username || 'User'}
                  </span>
                  
                  {u.is_blocked && <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-700">Banned</span>}
                  {u.isTopSeller && <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-700">Top</span>}
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Lv-{u.level || 1}</span>
                  
                  {u.createdAt && (Date.now() - new Date(u.createdAt).getTime() < 24 * 60 * 60 * 1000) && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-red-100 text-red-600 border border-red-200 animate-pulse">24h New</span>
                  )}
                </div>

                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                  <span className="truncate flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" /> {u.email || 'N/A'}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px] hidden sm:inline-block">
                    UID: {u.uid.substring(0, 10)}...
                  </span>
                  <span className="text-[11px] text-slate-400 hidden lg:inline-block">
                    Joined: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Rich Stats Badges */}
            <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
              
              <div className="text-left md:text-right">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emails</div>
                <div className="font-extrabold text-slate-800 text-sm">
                  {u.approvedEmails} <span className="text-[10px] text-slate-400 font-normal">/ {u.totalSubsCount} subs</span>
                </div>
              </div>

              <div className="text-left md:text-right">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Withdrawn</div>
                <div className="font-extrabold text-indigo-600 text-sm">৳{u.totalWithdrawn.toFixed(0)}</div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Balance</div>
                <div className="font-black text-emerald-600 text-base sm:text-lg">৳{(u.balance || 0).toFixed(2)}</div>
              </div>

              <div className="hidden sm:flex items-center text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all pl-2">
                <ChevronRight size={20} />
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
