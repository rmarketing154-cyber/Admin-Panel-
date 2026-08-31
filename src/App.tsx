import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAdminData } from './hooks/useAdminData';
import LoginScreen from './components/LoginScreen';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import Submissions from './pages/Submissions';
import Withdrawals from './pages/Withdrawals';
import Users from './pages/Users';
import Settings from './pages/Settings';
import SupportChat from './pages/SupportChat';
import TopSellers from './pages/TopSellers';
import Reviews from './pages/Reviews';
import Referrals from './pages/Referrals';
import Gateways from './pages/Gateways';
import Shifts from './pages/Shifts';
import PushNotification from './pages/PushNotification';
import AuditLogs from './pages/AuditLogs';
import TodayActivity from './pages/TodayActivity';
import Maintenance from './pages/Maintenance';
import BuyingGmail from './pages/BuyingGmail';
import Swal from 'sweetalert2';
import { Loader2 } from 'lucide-react';
import { initGmailReminderService } from './lib/gmailReminder';

const AUTHORIZED_ADMINS = [
  "gmrony135@gmail.com", 
  "iamronyofficial1@gmail.com", 
  "mailfactorybd@gmail.com",
  "rmarketing154@gmail.com"
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [portalMode, setPortalMode] = useState<'selling' | 'buying'>('selling');
  const [buyerTab, setBuyerTab] = useState<'storefront' | 'products' | 'deposits' | 'orders' | 'gateways'>('storefront');
  
  const data = useAdminData(user);

  // Initialize 3-hour Gmail Reminder from localStorage & Deep Link handler
  useEffect(() => {
    const cleanupReminder = initGmailReminderService();

    (window as any).onNotificationDeepLink = (target: string, id?: string) => {
      console.log('FCM Deep Link received:', target, id);
      if (target) {
        setPortalMode('selling');
        setCurrentTab(target);
      }
    };

    return () => {
      cleanupReminder();
      delete (window as any).onNotificationDeepLink;
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && u.email && AUTHORIZED_ADMINS.includes(u.email.toLowerCase())) {
        setUser(u);
      } else {
        if (u) signOut(auth);
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Logout'
    }).then((r) => {
      if (r.isConfirmed) {
        // Notify Android container to unregister FCM token
        if ((window as any).AndroidBridge?.onAdminLogout) {
          try {
            (window as any).AndroidBridge.onAdminLogout();
          } catch (e) {
            console.error('Android bridge logout error:', e);
          }
        }
        signOut(auth);
      }
    });
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
    </div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <AdminLayout 
      currentTab={currentTab} 
      setCurrentTab={setCurrentTab} 
      portalMode={portalMode}
      setPortalMode={setPortalMode}
      buyerTab={buyerTab}
      setBuyerTab={setBuyerTab}
      onLogout={handleLogout}
      userEmail={user.email}
      data={data}
    >
      {portalMode === 'buying' ? (
        <BuyingGmail 
          onSwitchToSelling={() => setPortalMode('selling')} 
          data={data} 
          currentUser={user} 
          activeSubTab={buyerTab}
          setActiveSubTab={setBuyerTab}
        />
      ) : (
        <>
          {currentTab === 'dashboard' && <Dashboard data={data} setCurrentTab={setCurrentTab} />}
          {currentTab === 'submissions' && <Submissions data={data} type="pending" />}
          {currentTab === 'checking' && <Submissions data={data} type="checking" />}
          {currentTab === 'withdrawals' && <Withdrawals data={data} />}
          {currentTab === 'users' && <Users data={data} />}
          {currentTab === 'today_activity' && <TodayActivity data={data} />}
          {currentTab === 'topsellers' && <TopSellers data={data} />}
          {currentTab === 'reviews' && <Reviews data={data} />}
          {currentTab === 'referrals' && <Referrals data={data} />}
          {currentTab === 'settings' && <Settings data={data} />}
          {currentTab === 'maintenance' && <Maintenance data={data} />}
          {currentTab === 'gateways' && <Gateways data={data} />}
          {currentTab === 'shifts' && <Shifts data={data} />}
          {currentTab === 'chat' && <SupportChat data={data} />}
          {currentTab === 'notif' && <PushNotification data={data} />}
          {currentTab === 'log' && <AuditLogs data={data} />}
        </>
      )}
    </AdminLayout>
  );
}

