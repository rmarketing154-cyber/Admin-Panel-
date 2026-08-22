import { useEffect, useState, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

export function useAdminData(user: any) {
  const [refreshKey, setRefreshKey] = useState(0);
  const forceRefresh = () => setRefreshKey(k => k + 1);
  const [data, setData] = useState({
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

  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const knownSubmissionIds = useRef(new Set());
  const knownWithdrawIds = useRef(new Set());
  const knownChatIds = useRef(new Set());

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

    const unsubs = [
      onValue(ref(db, "users"), (snap) => {
        const users: any[] = [];
        snap.forEach(c => { users.push({ uid: c.key, ...c.val() }); });
        setData(prev => ({ ...prev, users }));
      }),

      onValue(ref(db, "submissions"), (snap) => {
        const submissions: any[] = [];
        let newCount = 0;
        snap.forEach(c => {
          const s = { key: c.key, ...c.val() };
          submissions.push(s);
          
          if (!isFirstSub && !knownSubmissionIds.current.has(c.key)) {
            newCount++;
            if (s.status === 'pending') {
               notify('New Submission!', `User ${s.username || 'Someone'} submitted new accounts.`);
            }
          }
          knownSubmissionIds.current.add(c.key);
        });
        
        setData(prev => ({ ...prev, submissions }));
        isFirstSub = false;
      }),

      onValue(ref(db, "withdraw_requests"), (snap) => {
        const withdraws: any[] = [];
        snap.forEach(c => {
          const w = { key: c.key, ...c.val() };
          withdraws.push(w);
          
          if (!isFirstWd && !knownWithdrawIds.current.has(c.key)) {
            if (w.status === 'pending') {
              notify('New Withdraw Request!', `৳${w.amount} via ${w.paymentMethod || 'bkash'}`);
            }
          }
          knownWithdrawIds.current.add(c.key);
        });
        
        setData(prev => ({ ...prev, withdraws }));
        isFirstWd = false;
      }),

      onValue(ref(db, "settings"), (snap) => {
        setData(prev => ({ ...prev, settings: snap.val() }));
      }),

      onValue(ref(db, "top_sellers"), (snap) => {
        const topSellers: any[] = [];
        if (snap.exists()) {
          const tsData = snap.val();
          Object.values(tsData).forEach(v => topSellers.push(v));
        }
        setData(prev => ({ ...prev, topSellers }));
      }),

      onValue(ref(db, "top_referrals"), (snap) => {
        const topReferrals: any[] = [];
        if (snap.exists()) {
          const trData = snap.val();
          Object.values(trData).forEach(v => topReferrals.push(v));
        }
        setData(prev => ({ ...prev, topReferrals }));
      }),

      onValue(ref(db, "reviews"), (snap) => {
        const reviews: any[] = [];
        snap.forEach(c => { reviews.push({ key: c.key, ...c.val() }); });
        setData(prev => ({ ...prev, reviews }));
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
          }
        });
        setData(prev => ({ ...prev, chats }));
        isFirstChat = false;
      }),

      onValue(ref(db, "history"), (snap) => {
        const history: any[] = [];
        snap.forEach(c => { history.push({ key: c.key, ...c.val() }); });
        setData(prev => ({ ...prev, history: history.reverse() }));
        setLoading(false);
      })
    ];

    return () => unsubs.forEach(u => u());
  }, [user, refreshKey]);

  return { ...data, loading, forceRefresh };
}
