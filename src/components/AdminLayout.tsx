import React, { useState } from 'react';
import { Menu, X, Cpu, LogOut, LayoutDashboard, Inbox, CheckCircle2, Wallet, Users, Trophy, Star, Settings, MessageSquare, BellRing, Network, Coins, CreditCard, Clock, Megaphone, ScrollText, Volume2, VolumeX, Activity, Wrench } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { soundAlerts } from '../lib/sound';

export default function AdminLayout({ children, currentTab, setCurrentTab, onLogout, userEmail, data }: any) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const unreadChats = data.chats?.filter((c: any) => c.unread).length || 0;
  const pendingSubmissions = data.submissions?.filter((s: any) => s.status === 'pending').length || 0;
  const pendingWithdrawals = data.withdraws?.filter((w: any) => w.status === 'pending').length || 0;
  const totalAlerts = unreadChats + pendingSubmissions + pendingWithdrawals;

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
      title: 'App Rates & Settings',
      items: [
        { id: 'settings', label: 'Financial & Rates', icon: Coins, icon3d: 'icon-3d-emerald' },
        { id: 'maintenance', label: 'Maintenance & Controls', icon: Wrench, icon3d: 'icon-3d-slate' },
        { id: 'gateways', label: 'Payment Gateways', icon: CreditCard, icon3d: 'icon-3d-indigo' },
        { id: 'shifts', label: 'Review Shifts', icon: Clock, icon3d: 'icon-3d-purple' },
      ]
    },
    {
      title: 'Support & Audit',
      items: [
        { id: 'chat', label: 'Live Support Chat', icon: MessageSquare, badge: data.chats?.filter((c: any) => c.unread).length, icon3d: 'icon-3d-indigo' },
        { id: 'notif', label: 'Push & Popup Notice', icon: BellRing, icon3d: 'icon-3d-rose' },
        { id: 'log', label: 'Activity Logs', icon: ScrollText, icon3d: 'icon-3d-slate' },
      ]
    }
  ];

  return (
    <div className="h-[100dvh] bg-slate-50 text-slate-900 flex flex-col overflow-hidden font-sans">
      {/* Navbar */}
      <header className="bg-slate-900 text-white h-14 lg:h-16 flex items-center justify-between px-4 sm:px-6 shrink-0 z-50 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden flex items-center justify-center w-10 h-10 bg-slate-800/80 hover:bg-slate-700/90 active:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-200 hover:text-indigo-400 shadow-md transition-all duration-200 active:scale-90 shrink-0"
            title="Open Master Menu"
          >
            <Menu size={18} className="stroke-[2.5]" />
          </button>
          <div className="flex items-center gap-2.5 font-black text-sm sm:text-base tracking-wider text-white">
            <img 
              src="https://files.catbox.moe/cqiv5k.png" 
              alt="Logo" 
              className="w-8 h-8 rounded-xl object-cover shadow-lg shadow-indigo-500/30 border border-white/20 icon-3d transition-transform hover:scale-105 shrink-0" 
              referrerPolicy="no-referrer" 
            />
            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">MAIL FACTORY ADMIN</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick Sound Alert Toggle */}
          <button
            onClick={toggleAudio}
            title={audioEnabled ? "Audio Alerts Enabled (Click to Mute)" : "Audio Alerts Muted (Click to Enable)"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${
              audioEnabled 
                ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700/60'
            }`}
          >
            {audioEnabled ? <Volume2 size={16} className="text-indigo-400 animate-pulse" /> : <VolumeX size={16} />}
            <span className="hidden sm:inline text-[11px]">{audioEnabled ? 'Sound On' : 'Muted'}</span>
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
            className="fixed inset-0 bg-slate-950/40 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col shadow-xl lg:shadow-none
        `}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between lg:hidden bg-slate-50/50">
            <div className="flex items-center gap-2.5 font-bold text-slate-800">
              <img 
                src="https://files.catbox.moe/cqiv5k.png" 
                alt="Logo" 
                className="w-7 h-7 rounded-lg object-cover shadow-md shadow-indigo-500/20 border border-slate-200 icon-3d shrink-0" 
                referrerPolicy="no-referrer" 
              />
              <span className="text-xs tracking-wider font-black uppercase text-slate-500">Master Menu</span>
            </div>
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

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3.5 pb-1">{cat.title}</div>
                {cat.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setCurrentTab(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all duration-200 active:scale-[0.98]
                      ${currentTab === item.id 
                        ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-600/15' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${item.icon3d || 'icon-3d-indigo'} ${currentTab === item.id ? 'ring-2 ring-white/40 shadow-lg' : 'opacity-90'}`}>
                        <item.icon size={15} className="stroke-[2.5] drop-shadow-sm text-white" />
                      </div>
                      <span>{item.label}</span>
                    </div>
                    {(item.badge && item.badge > 0) ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-normal min-w-5 text-center
                        ${currentTab === item.id ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600 border border-red-100'}
                      `}>{item.badge}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6 relative scroll-smooth bg-slate-50/50">
          <div className="max-w-6xl mx-auto min-h-full flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
