import { useEffect, useState, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { soundAlerts } from '../lib/sound';

export function useAdminData(user: any) {
  const [refreshKey, setRefreshKey] = useState(0);
  const forceRefresh = () => setRefreshKey(k => k + 1);
  const [data, setData] = useState({
    users: [],
    submissions: [],
    withdraws: [],
    settings: null,
    shifts: {},
    topSellers: [],
    topReferrals: [],
    reviews: [],
    chats: [],
    history: []
  });

  const [loading, setLoading] = useState(true);
  const settingsRef = useRef<any>(null);
  const knownSubmissionIds = useRef(new Set());
  const knownWithdrawIds = useRef(new Set());
  const knownChatIds = useRef(new Set());
  const knownNotifIds = useRef(new Set());

  // Helper to check if audio alert is enabled for specific categories
  const shouldPlayAudio = (category: 'submissions' | 'push_notif' | 'withdrawals' | 'chats') => {
    const s = settingsRef.current || {};
    
    // Master audio switch check (Firebase setting or localStorage fallback)
    const masterEnabled = s.audio_alert_enabled !== undefined 
      ? s.audio_alert_enabled 
      : (localStorage.getItem('audio_alert_enabled') !== 'false');

    if (!masterEnabled) return false;

    // Category specific check
    switch (category) {
      case 'submissions':
        return s.audio_submissions !== undefined 
          ? s.audio_submissions 
          : (localStorage.getItem('audio_submissions') !== 'false');
      case 'push_notif':
        return s.audio_push_notif !== undefined 
          ? s.audio_push_notif 
          : (localStorage.getItem('audio_push_notif') !== 'false');
      case 'withdrawals':
        return s.audio_withdrawals !== undefined 
          ? s.audio_withdrawals 
          : (localStorage.getItem('audio_withdrawals') !== 'false');
      case 'chats':
        return s.audio_chats !== undefined 
          ? s.audio_chats 
          : (localStorage.getItem('audio_chats') !== 'false');
      default:
        return true;
    }
  };

  useEffect(() => {
    if (!user) {
      setData({
        users: [],
        submissions: [],
        withdraws: [],
        settings: null,
        topSellers: [],
        topReferrals: [],
        reviews: [],
        chats: [],
        history: []
      });
      setLoading(true);
      return;
    }

    // Request notification permission
    if ("Notification" in window) {
      Notification.requestPermission();
    }

    const notify = (title: string, body: string) => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: '/vite.svg' });
      }
    };

    let isFirstUsers = true;
    let isFirstSub = true;
    let isFirstWd = true;
    let isFirstChat = true;
    let isFirstNotif = true;

    const unsubs = [
      onValue(ref(db, "users"), (snap) => {
        const users: any[] = [];
        snap.forEach(c => { users.push({ uid: c.key, ...c.val() }); });
        setData(prev => ({ ...prev, users }));
      }, (error) => {
        console.warn("users listener error:", error.message);
      }),

      onValue(ref(db, "submissions"), (snap) => {
        const submissions: any[] = [];
        snap.forEach(c => {
          const s = { key: c.key, ...c.val() };
          submissions.push(s);
          
          if (!isFirstSub && !knownSubmissionIds.current.has(c.key)) {
            if (s.status === 'pending') {
              notify('New Submission!', `User ${s.username || 'Someone'} submitted new accounts.`);
              if (shouldPlayAudio('submissions')) {
                soundAlerts.playSubmissionAlert();
              }
            }
          }
          knownSubmissionIds.current.add(c.key);
        });
        
        setData(prev => ({ ...prev, submissions }));
        isFirstSub = false;
      }, (error) => {
        console.warn("submissions listener error:", error.message);
      }),

      onValue(ref(db, "withdraw_requests"), (snap) => {
        const withdraws: any[] = [];
        snap.forEach(c => {
          const w = { key: c.key, ...c.val() };
          withdraws.push(w);
          
          if (!isFirstWd && !knownWithdrawIds.current.has(c.key)) {
            if (w.status === 'pending') {
              notify('New Withdraw Request!', `৳${w.amount} via ${w.paymentMethod || 'bkash'}`);
              if (shouldPlayAudio('withdrawals')) {
                soundAlerts.playWithdrawalAlert();
              }
            }
          }
          knownWithdrawIds.current.add(c.key);
        });
        
        setData(prev => ({ ...prev, withdraws }));
        isFirstWd = false;
      }, (error) => {
        console.warn("withdraw_requests listener error:", error.message);
      }),

      onValue(ref(db, "settings"), (snap) => {
        const sVal = snap.val();
        settingsRef.current = sVal;
        setData(prev => ({ ...prev, settings: sVal }));
      }, (error) => {
        console.warn("settings listener error:", error.message);
      }),

      onValue(ref(db, "shifts"), (snap) => {
        const shiftsVal = snap.val() || {};
        setData(prev => ({ ...prev, shifts: shiftsVal }));
      }, (error) => {
        console.warn("shifts listener error:", error.message);
      }),

      onValue(ref(db, "admin_notifications"), (snap) => {
        if (snap.exists()) {
          snap.forEach(c => {
            const notifKey = c.key;
            const notifVal = c.val() || {};
            if (!isFirstNotif && notifKey && !knownNotifIds.current.has(notifKey)) {
              notify(notifVal.title || 'Push Notification', notifVal.message || notifVal.body || 'New alert received');
              if (shouldPlayAudio('push_notif')) {
                soundAlerts.playPushNotificationAlert();
              }
            }
            if (notifKey) knownNotifIds.current.add(notifKey);
          });
        }
        isFirstNotif = false;
      }, (error) => {
        console.warn("admin_notifications listener error:", error.message);
      }),

      onValue(ref(db, "top_sellers"), (snap) => {
        const topSellers: any[] = [];
        if (snap.exists()) {
          const tsData = snap.val();
          Object.values(tsData).forEach(v => topSellers.push(v));
        }
        setData(prev => ({ ...prev, topSellers }));
      }, (error) => {
        console.warn("top_sellers listener error:", error.message);
      }),

      onValue(ref(db, "top_referrals"), (snap) => {
        const topReferrals: any[] = [];
        if (snap.exists()) {
          const trData = snap.val();
          Object.values(trData).forEach(v => topReferrals.push(v));
        }
        setData(prev => ({ ...prev, topReferrals }));
      }, (error) => {
        console.warn("top_referrals listener error:", error.message);
      }),

      onValue(ref(db, "reviews"), (snap) => {
        const reviews: any[] = [];
        snap.forEach(c => { reviews.push({ key: c.key, ...c.val() }); });
        setData(prev => ({ ...prev, reviews }));
      }, (error) => {
        console.warn("reviews listener error:", error.message);
      }),

      onValue(ref(db, "support_chats"), (snap) => {
        const chats: any[] = [];
        snap.forEach(c => {
          let lastMsg = null;
          let unread = false;
          let newMsgs = false;
          const msgs: any[] = [];
          c.forEach(m => {
             const msg = { msgKey: m.key, ...m.val() };
             msgs.push(msg);
             if (!lastMsg || msg.timestamp > lastMsg.timestamp) lastMsg = msg;
             if (msg.from === 'user' && !msg.read) unread = true;
             
             if (!isFirstChat && msg.from === 'user' && !knownChatIds.current.has(m.key)) {
               newMsgs = true;
             }
             knownChatIds.current.add(m.key);
          });
          chats.push({ uid: c.key, lastMsg, unread, msgs });
          if (newMsgs) {
            notify('New Support Message', lastMsg?.message || 'You have a new message');
            if (shouldPlayAudio('chats')) {
              soundAlerts.playChatAlert();
            }
          }
        });
        setData(prev => ({ ...prev, chats }));
        isFirstChat = false;
      }, (error) => {
        console.warn("support_chats listener error:", error.message);
      }),

      onValue(ref(db, "history"), (snap) => {
        const history: any[] = [];
        snap.forEach(c => { history.push({ key: c.key, ...c.val() }); });
        setData(prev => ({ ...prev, history: history.reverse() }));
        setLoading(false);
      }, (error) => {
        console.warn("history listener error:", error.message);
        setLoading(false);
      })
    ];

    return () => unsubs.forEach(u => u());
  }, [user, refreshKey]);

  return { ...data, loading, forceRefresh };
}
