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
import Swal from 'sweetalert2';
import { Loader2 } from 'lucide-react';

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
  
  const data = useAdminData(user);

  // Listen for Deep Link navigation from Android FCM notification clicks & 3-hour Gmail check reminder
  useEffect(() => {
    // Request Browser Notification permission if on Web
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          console.log('Web Notification permission:', permission);
        });
      }
    }

    // Set up 3-hour interval push notification reminder for checking Gmail
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const triggerGmailReminder = () => {
      const title = "⚠️ রিমাইন্ডার: জিমেইল চেক করুন";
      const body = "ডিয়ার এডমিন, অনুগ্রহ করে আপনার জিমেইল ইনবক্স চেক করুন।";
      
      // Show browser notification if permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body: body,
            icon: 'https://files.catbox.moe/cqiv5k.png'
          });
        } catch (e) {
          console.error(e);
        }
      }

      // Also trigger SweetAlert popup if admin is active on app
      Swal.fire({
        title: title,
        text: body,
        icon: 'info',
        confirmButtonText: 'ঠিক আছে',
        timer: 15000,
        timerProgressBar: true
      });
      localStorage.setItem('last_gmail_reminder_time', Date.now().toString());
    };

    // Attach to window so Settings test button can call it reliably without cloud function errors
    (window as any).triggerGmailReminder = triggerGmailReminder;

    // Check if 3 hours have already elapsed since last reminder
    const lastReminder = Number(localStorage.getItem('last_gmail_reminder_time') || '0');
    if (Date.now() - lastReminder > THREE_HOURS_MS) {
      // If never ran or 3h passed, we can schedule an initial check or save timestamp
      if (!lastReminder) {
        localStorage.setItem('last_gmail_reminder_time', Date.now().toString());
      }
    }

    // Initial check timer setup
    const reminderInterval = setInterval(triggerGmailReminder, THREE_HOURS_MS);

    (window as any).onNotificationDeepLink = (target: string, id?: string) => {
      console.log('FCM Deep Link received:', target, id);
      if (target) {
        setCurrentTab(target);
      }
    };

    return () => {
      clearInterval(reminderInterval);
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
      onLogout={handleLogout}
      userEmail={user.email}
      data={data}
    >
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
    </AdminLayout>
  );
}

