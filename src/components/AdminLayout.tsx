import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Cpu, 
  LogOut, 
  LayoutDashboard, 
  Inbox, 
  CheckCircle2, 
  Wallet, 
  Users, 
  Trophy, 
  Star, 
  Settings, 
  MessageSquare, 
  BellRing, 
  Network, 
  Coins, 
  CreditCard, 
  Clock, 
  Megaphone, 
  ScrollText, 
  Volume2, 
  VolumeX, 
  Activity, 
  Wrench,
  Timer,
  ShieldAlert,
  Play,
  Square,
  Mail,
  ShoppingCart,
  Sparkles,
  Layers,
  ArrowRightLeft,
  Store,
  Package,
  DollarSign,
  Server,
  Code2
} from 'lucide-react';
import { ref, update, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { soundAlerts } from '../lib/sound';
import { computeDurationCountdown, formatDurationLabel, ShiftTimerData } from '../lib/shiftCountdown';
import { getTimeUntilNextReminder, formatRemainingTime, showAttractiveGmailReminder } from '../lib/gmailReminder';
import ApiConnectionModal from './ApiConnectionModal';

export default function AdminLayout({ 
  children, 
  currentTab, 
  setCurrentTab, 
  portalMode = 'selling',
  setPortalMode,
  buyerTab = 'storefront',
  setBuyerTab,
  onLogout, 
  userEmail, 
  data 
}: any) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [, setTicker] = useState(0);

  // Live ticking interval (every second) for header live countdown clocks
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const unreadChats = data.chats?.filter((c: any) => c.unread).length || 0;
  const pendingSubmissions = data.submissions?.filter((s: any) => s.status === 'pending').length || 0;
  const pendingWithdrawals = data.withdraws?.filter((w: any) => w.status === 'pending').length || 0;

  const totalProductsCount = (data.buyerProducts || []).length;
  const totalDepositsCount = (data.buyerDeposits || []).length;
  const pendingDepositsCount = (data.buyerDeposits || []).filter((d: any) => d.status === 'pending').length;
  const pendingOrdersCount = (data.buyerOrders || []).filter((o: any) => o.status === 'pending').length;
  const claimedOrdersCount = (data.buyerOrders || []).filter((o: any) => o.status === 'warranty_claimed' || o.warrantyStatus === 'claimed').length;
  const totalOrdersCount = (data.buyerOrders || []).length;

  const totalAlerts = unreadChats + pendingSubmissions + pendingWithdrawals + pendingDepositsCount + pendingOrdersCount;

  const buyerMenuItems = [
    { 
      id: 'buyer_storefront', 
      tab: 'storefront',
      label: 'Buyer Storefront & Dashboard', 
      icon: Store, 
      icon3d: 'icon-3d-indigo',
      badge: undefined
    },
    { 
      id: 'buyer_products', 
      tab: 'products',
      label: `Products & Stock Bank (${totalProductsCount})`, 
      icon: Package, 
      badge: totalProductsCount,
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      icon3d: 'icon-3d-emerald'
    },
    { 
      id: 'buyer_deposits', 
      tab: 'deposits',
      label: pendingDepositsCount > 0 ? `Deposit Requests (${pendingDepositsCount} New)` : `Deposit Requests (${totalDepositsCount})`, 
      icon: DollarSign, 
      badge: pendingDepositsCount > 0 ? `${pendingDepositsCount} New` : (totalDepositsCount > 0 ? `${totalDepositsCount} Total` : undefined),
      badgeColor: pendingDepositsCount > 0 ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-black animate-pulse shadow-sm ring-2 ring-red-400/40' : 'bg-slate-100 text-slate-700 font-bold border border-slate-200',
      icon3d: 'icon-3d-amber'
    },
    { 
      id: 'buyer_orders', 
      tab: 'orders',
      label: 'Orders & Delivery Ledger', 
      icon: ShoppingCart, 
      badge: pendingOrdersCount > 0 
        ? `${pendingOrdersCount} Pending` 
        : (claimedOrdersCount > 0 ? `${claimedOrdersCount} Claimed` : undefined),
      badgeColor: pendingOrdersCount > 0 
        ? 'bg-amber-500 text-white font-black animate-pulse' 
        : 'bg-red-500 text-white font-black animate-pulse',
      icon3d: 'icon-3d-rose'
    },
    { 
      id: 'buyer_gateways', 
      tab: 'gateways',
      label: 'Deposit Gateways & Numbers', 
      icon: CreditCard, 
      badge: undefined,
      icon3d: 'icon-3d-purple'
    }
  ];

  const handleBuyerTabClick = (tabKey: 'storefront' | 'products' | 'deposits' | 'orders' | 'gateways') => {
    if (setBuyerTab) setBuyerTab(tabKey);
    if (setPortalMode) setPortalMode('buying');
    setSidebarOpen(false);
  };

  const audioEnabled = data.settings?.audio_alert_enabled !== undefined
    ? data.settings.audio_alert_enabled
    : (localStorage.getItem('audio_alert_enabled') !== 'false');

  const toggleAudio = async () => {
    const nextVal = !audioEnabled;
    localStorage.setItem('audio_alert_enabled', String(nextVal));
    if (nextVal) {
      soundAlerts.playSubmissionAlert();
    }
    try {
      await update(ref(db, "settings"), {
        audio_alert_enabled: nextVal
      });
    } catch (e) {
      console.warn('Failed to update audio setting:', e);
    }
  };

  // Read Shift 1 (Report Time / রিপোর্ট দেওয়া হবে)
  const s1Data = data?.settings?.review_shifts?.shift_1 || data?.shifts?.shift_1 || data?.shifts?.shift1;
  const s1DaysRaw = Number(s1Data?.days || s1Data?.duration_days || 0);
  const s1HoursRaw = s1Data?.hours !== undefined ? Number(s1Data.hours) : (s1Data?.duration_hours !== undefined ? Number(s1Data.duration_hours) : 3);
  const s1Hours = s1DaysRaw * 24 + s1HoursRaw;
  const s1Days = 0;
  const s1Minutes = Number(s1Data?.minutes || s1Data?.duration_minutes || 0);
  const s1StartTime = Number(s1Data?.startTime || s1Data?.timer_started_at || 0);
  const s1Active = s1Data?.active !== undefined 
    ? Boolean(s1Data.active) 
    : (data?.settings?.report_time_enabled !== undefined ? Boolean(data.settings.report_time_enabled) : true);

  // Read Shift 2 (Receive Time / রিসিভ করা হবে)
  const s2Data = data?.settings?.review_shifts?.shift_2 || data?.shifts?.shift_2 || data?.shifts?.shift2;
  const s2DaysRaw = Number(s2Data?.days || s2Data?.duration_days || 0);
  const s2HoursRaw = s2Data?.hours !== undefined ? Number(s2Data.hours) : (s2Data?.duration_hours !== undefined ? Number(s2Data.duration_hours) : 5);
  const s2Hours = s2DaysRaw * 24 + s2HoursRaw;
  const s2Days = 0;
  const s2Minutes = Number(s2Data?.minutes || s2Data?.duration_minutes || 0);
  const s2StartTime = Number(s2Data?.startTime || s2Data?.timer_started_at || 0);
  const s2Active = s2Data?.active !== undefined 
    ? Boolean(s2Data.active) 
    : (data?.settings?.receive_time_enabled !== undefined ? Boolean(data.settings.receive_time_enabled) : true);

  // Compute countdowns for shift tabs
  const reportCountdown = computeDurationCountdown(s1Days, s1Hours, s1Minutes, s1StartTime, s1Active);
  const receiveCountdown = computeDurationCountdown(s2Days, s2Hours, s2Minutes, s2StartTime, s2Active);

  const categories = [
    {
      title: 'Work & Operations',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard, icon3d: 'icon-3d-indigo' },
        { id: 'submissions', label: 'New Submissions', icon: Inbox, badge: data.submissions?.filter((s: any) => s.status === 'pending').length, icon3d: 'icon-3d-amber' },
        { id: 'checking', label: 'Checking Queue', icon: CheckCircle2, badge: data.submissions?.filter((s: any) => s.status === 'checking').length, icon3d: 'icon-3d-cyan' },
        { id: 'withdrawals', label: 'Withdrawals (Pay)', icon: Wallet, badge: data.withdraws?.filter((w: any) => w.status === 'pending').length, icon3d: 'icon-3d-rose' },
      ]
    },
    {
      title: 'Users & Growth',
      items: [
        { id: 'users', label: 'User Management', icon: Users, badge: data.users?.length, icon3d: 'icon-3d-emerald' },
        { id: 'today_activity', label: 'Today Visits & Earnings', icon: Activity, icon3d: 'icon-3d-purple' },
        { id: 'topsellers', label: 'Top 10 Sellers', icon: Trophy, icon3d: 'icon-3d-amber' },
        { id: 'reviews', label: 'Review Moderation', icon: Star, icon3d: 'icon-3d-rose' },
        { id: 'referrals', label: 'Referral Analytics', icon: Network, icon3d: 'icon-3d-cyan' },
      ]
    },
    {
      title: 'App Rates & Shifts',
      items: [
        { 
          id: 'shifts', 
          label: 'রিপোর্ট ও রিসিভ টাইম', 
          icon: Clock, 
          icon3d: 'icon-3d-purple',
          subLabel: s1Active || s2Active ? 'Active Timers' : 'Stopped'
        },
        { id: 'settings', label: 'Financial & Rates', icon: Coins, icon3d: 'icon-3d-emerald' },
        { id: 'maintenance', label: 'Maintenance & Controls', icon: Wrench, icon3d: 'icon-3d-slate' },
        { id: 'gateways', label: 'Payment Gateways', icon: CreditCard, icon3d: 'icon-3d-indigo' },
      ]
    },
    {
      title: 'Support & Audit',
      items: [
        { id: 'chat', label: 'Live Support Chat', icon: MessageSquare, badge: data.chats?.filter((c: any) => c.unread).length, icon3d: 'icon-3d-indigo' },
        { id: 'notif', label: 'Push & Popup Notice', icon: BellRing, icon3d: 'icon-3d-rose' },
        { id: 'log', label: 'Activity Logs', icon: ScrollText, icon3d: 'icon-3d-slate' },
        { id: 'api_docs', label: 'REST API & DB Connect', icon: Server, icon3d: 'icon-3d-cyan' },
      ]
    }
  ];

  return (
    <div className="h-[100dvh] bg-slate-50 text-slate-900 flex flex-col overflow-hidden font-sans">
      {/* Navbar */}
      <header className="bg-slate-900 text-white min-h-[3.75rem] lg:min-h-[4.25rem] flex flex-wrap items-center justify-between px-3 sm:px-6 shrink-0 z-50 border-b border-slate-800 gap-2 py-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden flex items-center justify-center w-10 h-10 bg-slate-800/80 hover:bg-slate-700/90 active:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-200 hover:text-indigo-400 shadow-md transition-all duration-200 active:scale-90 shrink-0"
            title="Open Master Menu"
          >
            <Menu size={18} className="stroke-[2.5]" />
          </button>
          <div className="flex items-center gap-2.5 font-black text-sm sm:text-base tracking-wider text-white group cursor-pointer" onClick={() => setCurrentTab('home')}>
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-emerald-500 p-0.5 shadow-2xl shadow-indigo-600/50 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden border border-white/30 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 via-transparent to-emerald-500/20 pointer-events-none"></div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-400 rounded-full blur-[2px] opacity-70 animate-pulse"></div>
                <svg className="w-5 h-5 text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 2l9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V6l9-4z" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="bg-gradient-to-r from-white via-indigo-200 to-emerald-300 bg-clip-text text-transparent font-black tracking-wider text-xs sm:text-sm drop-shadow">MAIL FACTORY</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 -mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> 3D PRO ADMIN
              </span>
            </div>
          </div>
        </div>

        {/* ================= Mode Switcher: Selling Gmail vs Buying Gmail ================= */}
        <div className="flex items-center bg-slate-950/90 p-1 rounded-2xl border border-slate-800 shadow-inner order-3 md:order-2">
          <button
            onClick={() => setPortalMode && setPortalMode('selling')}
            title="Selling Gmail মোডে স্যুইচ করুন (বর্তমান সকল ফিচার ও সাবমিশন)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 ${
              portalMode === 'selling'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/40 ring-1 ring-indigo-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Store size={14} className={portalMode === 'selling' ? 'text-white' : 'text-slate-400'} />
            <span className="tracking-wide">Selling Gmail</span>
            {pendingSubmissions > 0 && portalMode === 'selling' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setPortalMode && setPortalMode('buying')}
            title="Buying Gmail মোডে স্যুইচ করুন"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 ${
              portalMode === 'buying'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/40 ring-1 ring-amber-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <ShoppingCart size={14} className={portalMode === 'buying' ? 'text-white' : 'text-amber-400'} />
            <span className="tracking-wide">Buying Gmail</span>
          </button>
        </div>

        {/* ================= Live Shift Timer Tab Badges in Topbar ================= */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          
          {/* Shift 1: রিপোর্ট টাইম (Report Time) Tab Badge */}
          <button
            onClick={() => setCurrentTab('shifts')}
            title="রিপোর্ট টাইম (Report Time) কন্ট্রোল করতে ক্লিক করুন"
            className={`group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 shadow-xs ${
              s1Active 
                ? (reportCountdown.isFinished
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                    : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/30 ring-1 ring-indigo-500/30')
                : 'bg-slate-800/90 border-slate-700/70 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              s1Active ? (reportCountdown.isFinished ? 'bg-amber-400' : 'bg-indigo-400 animate-ping') : 'bg-red-500'
            }`}></div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-300">
              রিপোর্ট:
            </span>
            <span className={`font-mono font-black text-xs sm:text-sm ${
              !s1Active ? 'text-red-400' : (reportCountdown.isFinished ? 'text-amber-300' : 'text-indigo-300')
            }`}>
              {reportCountdown.timeStr}
            </span>
          </button>

          {/* Shift 2: রিসিভ টাইম (Receive Time) Tab Badge */}
          <button
            onClick={() => setCurrentTab('shifts')}
            title="রিসিভ টাইম (Receive Time) কন্ট্রোল করতে ক্লিক করুন"
            className={`group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 shadow-xs ${
              s2Active 
                ? (receiveCountdown.isFinished
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30')
                : 'bg-slate-800/90 border-slate-700/70 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              s2Active ? (receiveCountdown.isFinished ? 'bg-amber-400' : 'bg-emerald-400 animate-ping') : 'bg-red-500'
            }`}></div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-300">
              রিসিভ:
            </span>
            <span className={`font-mono font-black text-xs sm:text-sm ${
              !s2Active ? 'text-red-400' : (receiveCountdown.isFinished ? 'text-amber-300' : 'text-emerald-300')
            }`}>
              {receiveCountdown.timeStr}
            </span>
          </button>
        </div>

        {/* Right Action Icons (API Connect, Gmail Reminder, Audio, Alerts, Logout) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Deposit Requests Live Alert Trigger */}
          {pendingDepositsCount > 0 && (
            <button
              onClick={() => {
                if (setBuyerTab) setBuyerTab('deposits');
                if (setPortalMode) setPortalMode('buying');
              }}
              title={`${pendingDepositsCount}টি নতুন ডিপোজিট রিকোয়েস্ট পেন্ডিং রয়েছে! ক্লিক করে দেখতে যান।`}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/40 ring-2 ring-amber-300 animate-bounce"
            >
              <DollarSign size={14} className="text-white stroke-[3]" />
              <span className="text-[11px] font-black">{pendingDepositsCount} Deposit New!</span>
            </button>
          )}

          {/* REST API & DB Connection Button */}
          <button
            onClick={() => setApiModalOpen(true)}
            title="REST API & External Admin Panel Connection Setup"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40"
          >
            <Server size={14} className="text-indigo-400" />
            <span className="hidden md:inline text-[11px] font-black text-indigo-200">API Setup</span>
          </button>

          {/* Configurable Gmail Check Reminder Trigger */}
          <button
            onClick={() => showAttractiveGmailReminder(true)}
            title={`জিমেইল চেকিং রিমাইন্ডার (${formatRemainingTime(getTimeUntilNextReminder())}) - ক্লিক করে এখনই নোটিফিকেশন টেস্ট ও জিমেইল চেক করুন`}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30"
          >
            <Mail size={15} className="text-rose-400 animate-pulse" />
            <span className="hidden md:inline text-[11px] font-black text-rose-200">জিমেইল চেক</span>
          </button>

          {/* Quick Sound Alert Toggle */}
          <button
            onClick={toggleAudio}
            title={audioEnabled ? "Audio Alerts Enabled (Click to Mute)" : "Audio Alerts Muted (Click to Enable)"}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${
              audioEnabled 
                ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700/60'
            }`}
          >
            {audioEnabled ? <Volume2 size={16} className="text-indigo-400 animate-pulse" /> : <VolumeX size={16} />}
            <span className="hidden xl:inline text-[11px]">{audioEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          {/* Real-time System Alerts Counter */}
          <div 
            onClick={() => setCurrentTab('submissions')}
            className="relative flex items-center justify-center p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 transition-all cursor-pointer mr-1"
            title={`${totalAlerts} Pending Alerts`}
          >
            <BellRing size={18} className={totalAlerts > 0 ? "animate-bounce text-amber-400" : ""} />
            {totalAlerts > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-md">
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </div>
            )}
          </div>

          <button 
            onClick={onLogout} 
            className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-200 active:scale-95"
            title="Logout"
          >
            <LogOut size={18} className="stroke-[2.5]" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Backdrop */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          />
        )}

        {/* Sidebar Navigation */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-white border-r border-slate-200 flex flex-col
          transform transition-transform duration-300 ease-in-out shrink-0 shadow-xl lg:shadow-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between lg:hidden">
            <span className="font-extrabold text-sm text-slate-800">Admin Navigation</span>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="p-2 text-slate-400 hover:bg-slate-150 hover:text-slate-700 rounded-xl transition-all"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>
          </div>
          
          <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4f46e5] font-black shrink-0 relative shadow-inner">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'A'}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">System Admin</div>
              <div className="text-xs font-extrabold text-slate-800 truncate" title={userEmail}>{userEmail}</div>
            </div>
          </div>

          {/* ================= Sidebar Portal Switcher Card ================= */}
          <div className="p-3 bg-slate-50 border-b border-slate-200/70">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1 mb-2 flex items-center justify-between">
              <span>Platform Portal</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                portalMode === 'selling' 
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {portalMode === 'selling' ? 'Selling Active' : 'Buying (Preview)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/80 rounded-xl">
              <button
                onClick={() => {
                  if (setPortalMode) setPortalMode('selling');
                  setSidebarOpen(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-black transition-all ${
                  portalMode === 'selling'
                    ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store size={13} />
                <span>Selling</span>
              </button>

              <button
                onClick={() => {
                  if (setPortalMode) setPortalMode('buying');
                  setSidebarOpen(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-black transition-all relative ${
                  portalMode === 'buying'
                    ? 'bg-white text-amber-700 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart size={13} />
                <span>Buying</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping absolute top-1 right-1"></span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {portalMode === 'buying' ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-300/60 rounded-2xl p-3.5 text-amber-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                      <Sparkles size={16} className="text-amber-600 animate-spin" />
                      <span>Buying Gmail Portal</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black uppercase">
                      Live Hub
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed font-medium">
                    মার্কেটপ্লেস প্রোডাক্ট, ক্রেতা স্টক ব্যাংক, ডিপোজিট ও অর্ডার লেজার পরিচালনা করুন।
                  </p>
                  <button
                    onClick={() => {
                      if (setPortalMode) setPortalMode('selling');
                      setSidebarOpen(false);
                    }}
                    className="w-full py-2 px-3 bg-white text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black hover:bg-indigo-50 shadow-xs flex items-center justify-center gap-1.5 mt-1"
                  >
                    <ArrowRightLeft size={13} />
                    <span>Selling Gmail এ ফিরে যান</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3.5 pb-1">
                    Buyer Menu Navigation (মেনু আইকন)
                  </div>
                  {buyerMenuItems.map((bItem) => {
                    const isActive = buyerTab === bItem.tab;
                    const IconComp = bItem.icon;
                    return (
                      <button
                        key={bItem.id}
                        onClick={() => handleBuyerTabClick(bItem.tab as any)}
                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all duration-200 active:scale-[0.98] ${
                          isActive
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25 ring-1 ring-amber-400/40'
                            : 'text-slate-700 hover:bg-amber-50/70 hover:text-amber-900 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${bItem.icon3d || 'icon-3d-amber'} ${isActive ? 'ring-2 ring-white/40 shadow-lg' : 'opacity-90'}`}>
                            <IconComp size={15} className="stroke-[2.5] drop-shadow-sm text-white" />
                          </div>
                          <div className="truncate text-left">
                            <div className="truncate">{bItem.label}</div>
                          </div>
                        </div>
                        {bItem.badge !== undefined && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-normal min-w-5 text-center shrink-0 ${
                            isActive 
                              ? 'bg-white/25 text-white' 
                              : (bItem.badgeColor || 'bg-amber-100 text-amber-800 border border-amber-200')
                          }`}>
                            {bItem.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {categories.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3.5 pb-1">{cat.title}</div>
                    {cat.items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'api_docs') {
                            setApiModalOpen(true);
                            setSidebarOpen(false);
                            return;
                          }
                          setCurrentTab(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all duration-200 active:scale-[0.98]
                          ${currentTab === item.id 
                            ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-600/15' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold'
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${item.icon3d || 'icon-3d-indigo'} ${currentTab === item.id ? 'ring-2 ring-white/40 shadow-lg' : 'opacity-90'}`}>
                            <item.icon size={15} className="stroke-[2.5] drop-shadow-sm text-white" />
                          </div>
                          <div className="truncate text-left">
                            <div className="truncate">{item.label}</div>
                          </div>
                        </div>
                        {(item.badge && item.badge > 0) ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-normal min-w-5 text-center shrink-0
                            ${currentTab === item.id ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600 border border-red-100'}
                          `}>{item.badge}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ))}

                {/* Direct Buyer Hub Section in Sidebar (accessible from Selling mode) */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between px-3.5 pb-1">
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles size={11} className="text-amber-500" />
                      Buyer Hub (মার্কেটপ্লেস)
                    </span>
                    <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">5 টি মেনু</span>
                  </div>
                  {buyerMenuItems.map((bItem) => {
                    const IconComp = bItem.icon;
                    return (
                      <button
                        key={bItem.id}
                        onClick={() => handleBuyerTabClick(bItem.tab as any)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold tracking-wide transition-all duration-200 active:scale-[0.98] text-slate-700 hover:bg-amber-50/80 hover:text-amber-900 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${bItem.icon3d || 'icon-3d-amber'} opacity-90 group-hover:opacity-100`}>
                            <IconComp size={14} className="stroke-[2.5] text-white" />
                          </div>
                          <div className="truncate text-left font-extrabold text-[11px] text-slate-800 group-hover:text-amber-900">
                            {bItem.label}
                          </div>
                        </div>
                        {bItem.badge !== undefined && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-normal min-w-5 text-center shrink-0 ${bItem.badgeColor || 'bg-amber-100 text-amber-800'}`}>
                            {bItem.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6 relative scroll-smooth bg-slate-50/50">
          <div className="max-w-6xl mx-auto min-h-full flex flex-col">
            {children}
          </div>
        </main>
      </div>

      {/* REST API & DB Connection Modal */}
      <ApiConnectionModal 
        isOpen={apiModalOpen} 
        onClose={() => setApiModalOpen(false)} 
      />
    </div>
  );
}
