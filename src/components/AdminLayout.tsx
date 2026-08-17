import React, { useState } from 'react';
import { Menu, X, Cpu, LogOut, LayoutDashboard, Inbox, CheckCircle2, Wallet, Users, Trophy, Star, Settings, MessageSquare, BellRing, Network, Coins, CreditCard, Clock, Megaphone, ScrollText } from 'lucide-react';

export default function AdminLayout({ children, currentTab, setCurrentTab, onLogout, userEmail, data }: any) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const unreadChats = data.chats?.filter((c: any) => c.unread).length || 0;
  const pendingSubmissions = data.submissions?.filter((s: any) => s.status === 'pending').length || 0;
  const pendingWithdrawals = data.withdraws?.filter((w: any) => w.status === 'pending').length || 0;
  const totalAlerts = unreadChats + pendingSubmissions + pendingWithdrawals;

  const categories = [
    {
      title: 'Work & Operations',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
        { id: 'submissions', label: 'New Submissions', icon: Inbox, badge: data.submissions?.filter((s: any) => s.status === 'pending').length },
        { id: 'checking', label: 'Checking Queue', icon: CheckCircle2, badge: data.submissions?.filter((s: any) => s.status === 'checking').length },
        { id: 'withdrawals', label: 'Withdrawals (Pay)', icon: Wallet, badge: data.withdraws?.filter((w: any) => w.status === 'pending').length },
      ]
    },
    {
      title: 'Users & Growth',
      items: [
        { id: 'users', label: 'User Management', icon: Users, badge: data.users?.length },
        { id: 'topsellers', label: 'Top 10 Sellers', icon: Trophy },
        { id: 'reviews', label: 'Review Moderation', icon: Star },
        { id: 'referrals', label: 'Referral Analytics', icon: Network },
      ]
    },
    {
      title: 'App Rates & Settings',
      items: [
        { id: 'settings', label: 'Financial & Rates', icon: Coins },
        { id: 'gateways', label: 'Payment Gateways', icon: CreditCard },
        { id: 'shifts', label: 'Review Shifts', icon: Clock },
        { id: 'notices', label: 'Notice & Maintenance', icon: Megaphone },
      ]
    },
    {
      title: 'Support & Audit',
      items: [
        { id: 'chat', label: 'Live Support Chat', icon: MessageSquare, badge: data.chats?.filter((c: any) => c.unread).length },
        { id: 'notif', label: 'Push Notification', icon: BellRing },
        { id: 'log', label: 'Activity Logs', icon: ScrollText },
      ]
    }
  ];

  return (
    <div className="h-[100dvh] bg-slate-50 text-slate-900 flex flex-col overflow-hidden">
      {/* Navbar */}
      <header className="bg-slate-900 text-white h-14 lg:h-16 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-800 rounded-lg">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 font-bold text-lg">
            <Cpu className="text-indigo-400" />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">MAIL FACTORY PRO</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Real-time System Alerts Counter */}
          <div className="relative flex items-center justify-center p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white mr-2">
            <BellRing size={20} className={totalAlerts > 0 ? "animate-[ring_2s_ease-in-out_infinite]" : ""} />
            {totalAlerts > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-sm animate-pulse">
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </div>
            )}
          </div>

          <button onClick={onLogout} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between lg:hidden">
            <div className="font-bold text-slate-800">Menu</div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20}/></button>
          </div>
          
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="text-sm font-semibold text-slate-800">Master Console</div>
            <div className="text-xs text-slate-500 truncate">{userEmail}</div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-1">{cat.title}</div>
                {cat.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setCurrentTab(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors
                      ${currentTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className={currentTab === item.id ? 'text-indigo-600' : 'text-slate-400'} />
                      {item.label}
                    </div>
                    {(item.badge && item.badge > 0) ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs
                        ${currentTab === item.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}
                      `}>{item.badge}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-6 pb-24 lg:pb-6 relative scroll-smooth">
          <div className="max-w-6xl mx-auto min-h-full flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
