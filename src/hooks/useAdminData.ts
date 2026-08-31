import { useEffect, useState, useRef } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { soundAlerts } from '../lib/sound';
import { mergeOrderObjects } from '../lib/orderUtils';

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
    history: [],
    transactions: [],
    dailyBonuses: [],
    checkins: [],
    dailyCheckins: [],
    bonusClaims: [],
    buyerProducts: [],
    buyerDeposits: [],
    buyerOrders: [],
    buyerCredentialsBank: {},
    depositGateways: {}
  });

  const [loading, setLoading] = useState(true);
  const settingsRef = useRef<any>(null);
  const knownSubmissionIds = useRef(new Set());
  const knownWithdrawIds = useRef(new Set());
  const knownDepositIds = useRef(new Set());
  const knownOrderIds = useRef(new Set());
  const knownChatIds = useRef(new Set());
  const knownNotifIds = useRef(new Set());

  // Helper to check if audio alert is enabled for specific categories
  const shouldPlayAudio = (category: 'submissions' | 'push_notif' | 'withdrawals' | 'chats' | 'deposits') => {
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
      case 'deposits':
        return s.audio_deposits !== undefined 
          ? s.audio_deposits 
          : (localStorage.getItem('audio_deposits') !== 'false');
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
        history: [],
        transactions: [],
        dailyBonuses: [],
        checkins: [],
        dailyCheckins: [],
        bonusClaims: [],
        buyerProducts: [],
        buyerDeposits: [],
        buyerOrders: [],
        buyerCredentialsBank: {},
        depositGateways: {}
      });
      setLoading(true);
      return;
    }

    // Browser notifications can be shown if permission was already granted by user
    const notify = (title: string, body: string) => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: '/vite.svg' });
      }
    };

    let isFirstUsers = true;
    let isFirstSub = true;
    let isFirstWd = true;
    let isFirstDep = true;
    let isFirstOrder = true;
    let isFirstChat = true;
    let isFirstNotif = true;

    // Dual-sync paths memory buffers
    let buyerProductsRaw: any[] = [];
    let productsRaw: any[] = [];
    let buyerDepositsRaw: any[] = [];
    let depositRequestsRaw: any[] = [];
    let depositsRaw: any[] = [];
    let userDepositsRaw: any[] = [];
    let paymentRequestsRaw: any[] = [];
    let addMoneyRaws: any[] = [];
    let pendingDepositsRaw: any[] = [];
    let pendingDepositsRaw2: any[] = [];
    let paymentReqRaws2: any[] = [];
    let depReqRaws2: any[] = [];
    let rechargeReqRaws: any[] = [];
    let userEmbeddedDepositsRaw: any[] = [];
    let transactionsDepositsRaw: any[] = [];
    let buyerOrdersRaw: any[] = [];
    let ordersRaw: any[] = [];

    let apiDepositsRaw: any[] = [];

    let reviewsRaw1: any[] = [];
    let reviewsRaw2: any[] = [];
    let reviewsRaw3: any[] = [];
    let reviewsRaw4: any[] = [];
    let reviewsRaw5: any[] = [];
    let reviewsRaw6: any[] = [];
    let reviewsRaw7: any[] = [];
    let reviewsRaw8: any[] = [];
    let reviewsRaw9: any[] = [];

    const extractReviewsFromSnap = (snap: any, arrayToPush: any[]) => {
      if (snap.exists()) {
        snap.forEach((c: any) => {
          const val = c.val();
          if (val && typeof val === 'object') {
            const isFlat = val.rating !== undefined || 
                           val.comment !== undefined || 
                           val.message !== undefined || 
                           val.text !== undefined || 
                           val.review !== undefined || 
                           val.userName !== undefined || 
                           val.name !== undefined ||
                           val.nameEnglish !== undefined ||
                           val.description !== undefined ||
                           val.feedback !== undefined;
            if (isFlat) {
              arrayToPush.push({ key: c.key, ...val });
            } else {
              // Nested review map
              Object.entries(val).forEach(([subKey, subVal]: [string, any]) => {
                if (subVal && typeof subVal === 'object') {
                  arrayToPush.push({ key: subKey, parentKey: c.key, ...subVal });
                }
              });
            }
          }
        });
      }
    };

    const mergeAndSetReviews = () => {
      const mergedMap = new Map<string, any>();
      const allRaw = [
        ...reviewsRaw1,
        ...reviewsRaw2,
        ...reviewsRaw3,
        ...reviewsRaw4,
        ...reviewsRaw5,
        ...reviewsRaw6,
        ...reviewsRaw7,
        ...reviewsRaw8,
        ...reviewsRaw9
      ];
      allRaw.forEach(r => {
        if (r && r.key) {
          if (!mergedMap.has(r.key)) {
            mergedMap.set(r.key, r);
          } else {
            mergedMap.set(r.key, { ...mergedMap.get(r.key), ...r });
          }
        }
      });
      const mergedList = Array.from(mergedMap.values());
      setData(prev => ({ ...prev, reviews: mergedList }));
    };

    const fetchApiDeposits = async () => {
      try {
        const res = await fetch('/api/deposits');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.deposits)) {
            apiDepositsRaw = json.deposits;
            mergeAndSetDeposits();
          }
        }
      } catch (err) {
        // silent error fallback
      }
    };

    fetchApiDeposits();
    const apiInterval = setInterval(fetchApiDeposits, 10000);

    const mergeAndSetProducts = () => {
      const merged: any[] = [...buyerProductsRaw];
      productsRaw.forEach(r => {
        if (!merged.some(m => m.id === r.id)) {
          merged.push(r);
        } else {
          const idx = merged.findIndex(m => m.id === r.id);
          merged[idx] = { ...merged[idx], ...r };
        }
      });
      setData(prev => ({ ...prev, buyerProducts: merged }));
    };

    const normalizeDeposit = (r: any) => {
      if (!r || typeof r !== 'object') return null;
      const statusRaw = r.status ? String(r.status).toLowerCase().trim() : 'pending';
      const normalizedStatus = (statusRaw === 'approved' || statusRaw === 'accepted' || statusRaw === 'success' || statusRaw === 'completed' || statusRaw === 'done') 
        ? 'approved' 
        : (statusRaw === 'rejected' || statusRaw === 'cancelled' || statusRaw === 'failed' || statusRaw === 'declined') 
        ? 'rejected' 
        : 'pending';

      const primaryId = String(r.id || r.rawKey || r.firebaseKey || r.key || `dep_${Date.now()}`);

      return {
        ...r,
        id: primaryId,
        rawKey: String(r.rawKey || r.firebaseKey || r.key || primaryId),
        userId: r.userId || r.user_id || r.uid || r.userUid || '',
        userName: r.userName || r.user_name || r.username || r.name || r.userEmail || 'Buyer',
        userEmail: r.userEmail || r.user_email || r.email || '',
        amount: Number(r.amount ?? r.depositAmount ?? r.deposit_amount ?? r.tk ?? r.money ?? 0),
        paymentMethod: r.paymentMethod || r.payment_method || r.method || r.gateway || r.type || 'bKash',
        senderNumber: r.senderNumber || r.sender_number || r.phone || r.phoneNumber || r.sender || r.number || '',
        trxId: r.trxId || r.trx_id || r.transactionId || r.transaction_id || r.txId || r.trxID || r.transaction_code || '',
        depositId: r.depositId || '',
        status: normalizedStatus,
        createdAt: Number(r.createdAt || r.timestamp || r.created_at || r.date || Date.now()),
        approvedAt: r.approvedAt ? Number(r.approvedAt) : undefined,
        rejectedAt: r.rejectedAt ? Number(r.rejectedAt) : undefined,
        approvedBy: r.approvedBy || '',
        rejectedBy: r.rejectedBy || '',
        rejectReason: r.rejectReason || r.adminNote || r.reason || ''
      };
    };

    const isTestDeposit = (norm: any) => {
      if (!norm || typeof norm !== 'object') return true;
      const amt = Number(norm.amount ?? norm.depositAmount ?? 0);
      const trx = String(norm.trxId || norm.trx_id || '').trim();
      const uid = String(norm.userId || norm.uid || '').trim();
      // Only filter if object has no amount, no trxId, and no userId
      if (!amt && !trx && !uid) return true;
      return false;
    };

    const mergeAndSetDeposits = () => {
      const allRaws = [
        ...apiDepositsRaw,
        ...buyerDepositsRaw,
        ...depositRequestsRaw,
        ...depositsRaw,
        ...userDepositsRaw,
        ...paymentRequestsRaw,
        ...userEmbeddedDepositsRaw,
        ...transactionsDepositsRaw,
        ...addMoneyRaws,
        ...paymentReqRaws2,
        ...depReqRaws2,
        ...rechargeReqRaws,
        ...pendingDepositsRaw,
        ...pendingDepositsRaw2
      ];

      const mergedMap = new Map<string, any>();
      allRaws.forEach(item => {
        const norm = normalizeDeposit(item);
        if (norm && norm.id) {
          if (isTestDeposit(norm)) return; // Exclude test deposit requests

          let targetKey: string = norm.id;
          if (mergedMap.has(norm.id)) {
            targetKey = norm.id;
          } else {
            const normIdStr = String(norm.id || '').trim();
            const normRawKey = String(norm.rawKey || '').trim();
            const normTrx = String(norm.trxId || '').trim().toLowerCase();
            const normUid = String(norm.userId || '').trim().toLowerCase();
            const normPhone = String(norm.senderNumber || '').trim();
            const normAmt = Number(norm.amount || 0);
            const normTime = Number(norm.createdAt || 0);

            for (const [k, existing] of mergedMap.entries()) {
              const exId = String(existing.id || k).trim();
              const exRawKey = String(existing.rawKey || '').trim();
              const exTrx = String(existing.trxId || '').trim().toLowerCase();
              const normDepId = String(norm.depositId || '').trim();

              // 1. Direct ID / Key matching
              if (
                exId === normIdStr ||
                exRawKey === normIdStr ||
                exId === normRawKey ||
                (exRawKey && normRawKey && exRawKey === normRawKey) ||
                (normDepId && (exId === normDepId || exRawKey === normDepId)) ||
                (exId && normIdStr && (exId.includes(normIdStr) || normIdStr.includes(exId)))
              ) {
                targetKey = k;
                break;
              }

              // 2. TrxID matching (only if BOTH have valid non-empty trxId)
              if (normTrx && exTrx && normTrx.length >= 3 && normTrx === exTrx) {
                targetKey = k;
                break;
              }
            }
          }

          if (!mergedMap.has(targetKey)) {
            mergedMap.set(targetKey, norm);
          } else {
            const existing = mergedMap.get(targetKey)!;
            const existingStatus = String(existing.status || '').toLowerCase().trim();
            const normStatus = String(norm.status || '').toLowerCase().trim();

            let finalStatus = 'pending';
            if (existingStatus === 'approved' || normStatus === 'approved') {
              finalStatus = 'approved';
            } else if (existingStatus === 'rejected' || normStatus === 'rejected') {
              finalStatus = 'rejected';
            } else {
              finalStatus = normStatus || existingStatus || 'pending';
            }

            mergedMap.set(targetKey, {
              ...existing,
              ...norm,
              id: existing.id || norm.id,
              status: finalStatus,
              approvedAt: norm.approvedAt || existing.approvedAt,
              rejectedAt: norm.rejectedAt || existing.rejectedAt,
              approvedBy: norm.approvedBy || existing.approvedBy,
              rejectedBy: norm.rejectedBy || existing.rejectedBy,
              rejectReason: norm.rejectReason || existing.rejectReason || norm.adminNote || existing.adminNote
            });
          }
        }
      });

      const merged = Array.from(mergedMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      merged.forEach(d => {
        const isAlreadyKnown = 
          knownDepositIds.current.has(d.id) || 
          (d.rawKey && knownDepositIds.current.has(d.rawKey)) ||
          (d.trxId && knownDepositIds.current.has(`trx_${d.trxId}`));

        if (!isFirstDep && !isAlreadyKnown) {
          if (d.status === 'pending') {
            notify('New Buyer Deposit!', `৳${d.amount} from ${d.userName || 'Buyer'} (${d.paymentMethod || 'bKash'})`);
            if (shouldPlayAudio('deposits')) {
              soundAlerts.playDepositAlert();
            }
          }
        }

        knownDepositIds.current.add(d.id);
        if (d.rawKey) knownDepositIds.current.add(d.rawKey);
        if (d.trxId) knownDepositIds.current.add(`trx_${d.trxId}`);
      });

      setData(prev => ({ ...prev, buyerDeposits: merged }));
    };

    const mergeAndSetOrders = () => {
      const mergedMap = new Map<string, any>();
      [...buyerOrdersRaw, ...ordersRaw].forEach(r => {
        if (r && r.id) {
          if (!mergedMap.has(r.id)) {
            mergedMap.set(r.id, mergeOrderObjects(null, r));
          } else {
            const existing = mergedMap.get(r.id);
            mergedMap.set(r.id, mergeOrderObjects(existing, r));
          }
        }
      });
      const merged = Array.from(mergedMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      merged.forEach(o => {
        if (!isFirstOrder && !knownOrderIds.current.has(o.id)) {
          if (o.status === 'pending') {
            notify('New Buyer Order!', `Order #${o.id}: ${o.productTitle} (${o.quantity} pcs) from ${o.userName || 'Buyer'}`);
            if (shouldPlayAudio('deposits')) {
              soundAlerts.playDepositAlert();
            }
          }
        }
        knownOrderIds.current.add(o.id);
      });

      setData(prev => ({ ...prev, buyerOrders: merged }));
      isFirstOrder = false;
    };

    const unsubs = [
      onValue(ref(db, "users"), (snap) => {
        const users: any[] = [];
        userEmbeddedDepositsRaw = [];
        const userEmbeddedOrdersRaw: any[] = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const u = { uid: c.key, ...c.val() };
            users.push(u);
            const depNodes = [u.deposits, u.deposit_requests, u.depositRequests, u.recharges, u.user_deposits];
            depNodes.forEach(node => {
              if (node && typeof node === 'object') {
                Object.entries(node).forEach(([dKey, dVal]: [string, any]) => {
                  if (dVal && typeof dVal === 'object') {
                    userEmbeddedDepositsRaw.push({ id: dKey, userId: c.key, userName: u.name || u.displayName || u.userName, userEmail: u.email || u.userEmail, ...dVal });
                  }
                });
              }
            });

            const ordNodes = [u.orders, u.buyer_orders, u.buyerOrders];
            ordNodes.forEach(node => {
              if (node && typeof node === 'object') {
                Object.entries(node).forEach(([oKey, oVal]: [string, any]) => {
                  if (oVal && typeof oVal === 'object') {
                    userEmbeddedOrdersRaw.push({ id: oKey, userId: c.key, userName: u.name || u.displayName || u.userName, userEmail: u.email || u.userEmail, ...oVal });
                  }
                });
              }
            });
          });
        }
        setData(prev => ({ ...prev, users }));
        mergeAndSetDeposits();
        
        if (userEmbeddedOrdersRaw.length > 0) {
          ordersRaw = [...ordersRaw, ...userEmbeddedOrdersRaw];
          mergeAndSetOrders();
        }
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
        reviewsRaw1 = [];
        extractReviewsFromSnap(snap, reviewsRaw1);
        mergeAndSetReviews();
      }, (error) => {
        console.warn("reviews listener error:", error.message);
      }),

      onValue(ref(db, "review"), (snap) => {
        reviewsRaw2 = [];
        extractReviewsFromSnap(snap, reviewsRaw2);
        mergeAndSetReviews();
      }, (error) => {
        console.warn("review listener error:", error.message);
      }),

      onValue(ref(db, "user_reviews"), (snap) => {
        reviewsRaw3 = [];
        extractReviewsFromSnap(snap, reviewsRaw3);
        mergeAndSetReviews();
      }, (error) => {
        console.warn("user_reviews listener error:", error.message);
      }),

      onValue(ref(db, "app_reviews"), (snap) => {
        reviewsRaw4 = [];
        extractReviewsFromSnap(snap, reviewsRaw4);
        mergeAndSetReviews();
      }, (error) => {
        console.warn("app_reviews listener error:", error.message);
      }),

      onValue(ref(db, "settings/reviews"), (snap) => {
        reviewsRaw5 = [];
        extractReviewsFromSnap(snap, reviewsRaw5);
        mergeAndSetReviews();
      }, (error) => {
        console.warn("settings/reviews listener error:", error.message);
      }),

      onValue(ref(db, "testimonials"), (snap) => {
        reviewsRaw6 = [];
        extractReviewsFromSnap(snap, reviewsRaw6);
        mergeAndSetReviews();
      }, (error) => {
        console.warn("testimonials listener error:", error.message);
      }),

      onValue(ref(db, "testimonial"), (snap) => {
        reviewsRaw7 = [];
        extractReviewsFromSnap(snap, reviewsRaw7);
        mergeAndSetReviews();
      }, (error) => {
        console.warn("testimonial listener error:", error.message);
      }),

      onValue(ref(db, "feedback"), (snap) => {
        reviewsRaw8 = [];
        extractReviewsFromSnap(snap, reviewsRaw8);
        mergeAndSetReviews();
      }, (error) => {
        console.warn("feedback listener error:", error.message);
      }),

      onValue(ref(db, "feedbacks"), (snap) => {
        reviewsRaw9 = [];
        extractReviewsFromSnap(snap, reviewsRaw9);
        mergeAndSetReviews();
      }, (error) => {
        console.warn("feedbacks listener error:", error.message);
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
      }),

      onValue(ref(db, "transactions"), (snap) => {
        const txs: any[] = [];
        transactionsDepositsRaw = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            const txObj = { key: c.key, id: c.key, ...val };
            txs.push(txObj);
            if (val && (val.type === 'deposit' || val.type === 'buyer_deposit' || val.type === 'deposit_approved' || val.type === 'recharge' || val.depositId || (val.paymentMethod && val.trxId))) {
              transactionsDepositsRaw.push(txObj);
            }
          });
        }
        setData(prev => ({ ...prev, transactions: txs }));
        mergeAndSetDeposits();
      }, (error) => {
        console.warn("transactions listener error:", error.message);
      }),

      onValue(ref(db, "daily_bonuses"), (snap) => {
        const bList: any[] = [];
        if (snap.exists()) {
          snap.forEach(c => { bList.push({ key: c.key, ...c.val() }); });
        }
        setData(prev => ({ ...prev, dailyBonuses: bList }));
      }, (error) => {
        console.warn("daily_bonuses listener error:", error.message);
      }),

      onValue(ref(db, "checkins"), (snap) => {
        const chList: any[] = [];
        if (snap.exists()) {
          snap.forEach(c => { chList.push({ key: c.key, ...c.val() }); });
        }
        setData(prev => ({ ...prev, checkins: chList }));
      }, (error) => {
        console.warn("checkins listener error:", error.message);
      }),

      onValue(ref(db, "daily_checkins"), (snap) => {
        const dchList: any[] = [];
        if (snap.exists()) {
          snap.forEach(c => { dchList.push({ key: c.key, ...c.val() }); });
        }
        setData(prev => ({ ...prev, dailyCheckins: dchList }));
      }, (error) => {
        console.warn("daily_checkins listener error:", error.message);
      }),

      onValue(ref(db, "bonus_claims"), (snap) => {
        const bcList: any[] = [];
        if (snap.exists()) {
          snap.forEach(c => { bcList.push({ key: c.key, ...c.val() }); });
        }
        setData(prev => ({ ...prev, bonusClaims: bcList }));
      }, (error) => {
        console.warn("bonus_claims listener error:", error.message);
      }),

      // Buyer Marketplace & Products Listener (Dual-sync)
      onValue(ref(db, "buyer_products"), (snap) => {
        buyerProductsRaw = [];
        if (snap.exists()) {
          snap.forEach(c => {
            buyerProductsRaw.push({ id: c.key, ...c.val() });
          });
        }
        mergeAndSetProducts();
      }, (error) => {
        console.warn("buyer_products listener error:", error.message);
      }),

      onValue(ref(db, "products"), (snap) => {
        productsRaw = [];
        if (snap.exists()) {
          snap.forEach(c => {
            productsRaw.push({ id: c.key, ...c.val() });
          });
        }
        mergeAndSetProducts();
      }, (error) => {
        console.warn("products listener error:", error.message);
      }),

      // Buyer Deposit Requests Listeners (Universal Multi-Path Sync)
      onValue(ref(db, "buyer_deposits"), (snap) => {
        buyerDepositsRaw = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            // check if it's a direct deposit object (has amount or status)
            if (val.amount !== undefined || val.status || val.trxId) {
              buyerDepositsRaw.push({ ...val, id: val.id || c.key, rawKey: c.key });
            } else if (typeof val === 'object') {
              // probably nested by uid: parent -> uid -> {depId: dep}
              Object.entries(val).forEach(([depId, depVal]) => {
                if (depVal && typeof depVal === 'object') {
                   buyerDepositsRaw.push({ ...(depVal as any), id: (depVal as any).id || depId, rawKey: depId, userId: c.key });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
        isFirstDep = false;
      }, (error) => {
        console.warn("buyer_deposits listener error:", error.message);
      }),

      onValue(ref(db, "deposit_requests"), (snap) => {
        depositRequestsRaw = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            // check if it's a direct deposit object (has amount or status)
            if (val.amount !== undefined || val.status || val.trxId) {
              depositRequestsRaw.push({ ...val, id: val.id || c.key, rawKey: c.key });
            } else if (typeof val === 'object') {
              // probably nested by uid: parent -> uid -> {depId: dep}
              Object.entries(val).forEach(([depId, depVal]) => {
                if (depVal && typeof depVal === 'object') {
                   depositRequestsRaw.push({ ...(depVal as any), id: (depVal as any).id || depId, rawKey: depId, userId: c.key });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
        isFirstDep = false;
      }, (error) => {
        console.warn("deposit_requests listener error:", error.message);
      }),

      onValue(ref(db, "deposits"), (snap) => {
        depositsRaw = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            // check if it's a direct deposit object (has amount or status)
            if (val.amount !== undefined || val.status || val.trxId) {
              depositsRaw.push({ ...val, id: val.id || c.key, rawKey: c.key });
            } else if (typeof val === 'object') {
              // probably nested by uid: parent -> uid -> {depId: dep}
              Object.entries(val).forEach(([depId, depVal]) => {
                if (depVal && typeof depVal === 'object') {
                   depositsRaw.push({ ...(depVal as any), id: (depVal as any).id || depId, rawKey: depId, userId: c.key });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
        isFirstDep = false;
      }, (error) => {
        console.warn("deposits listener error:", error.message);
      }),

      onValue(ref(db, "user_deposits"), (snap) => {
        userDepositsRaw = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            // check if it's a direct deposit object (has amount or status)
            if (val.amount !== undefined || val.status || val.trxId) {
              userDepositsRaw.push({ ...val, id: val.id || c.key, rawKey: c.key });
            } else if (typeof val === 'object') {
              // probably nested by uid: parent -> uid -> {depId: dep}
              Object.entries(val).forEach(([depId, depVal]) => {
                if (depVal && typeof depVal === 'object') {
                   userDepositsRaw.push({ ...(depVal as any), id: (depVal as any).id || depId, rawKey: depId, userId: c.key });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
        isFirstDep = false;
      }, (error) => {
        console.warn("user_deposits listener error:", error.message);
      }),

      onValue(ref(db, "payment_requests"), (snap) => {
        paymentRequestsRaw = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            // check if it's a direct deposit object (has amount or status)
            if (val.amount !== undefined || val.status || val.trxId) {
              paymentRequestsRaw.push({ ...val, id: val.id || c.key, rawKey: c.key });
            } else if (typeof val === 'object') {
              // probably nested by uid: parent -> uid -> {depId: dep}
              Object.entries(val).forEach(([depId, depVal]) => {
                if (depVal && typeof depVal === 'object') {
                   paymentRequestsRaw.push({ ...(depVal as any), id: (depVal as any).id || depId, rawKey: depId, userId: c.key });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
        isFirstDep = false;
      }, (error) => {
        console.warn("payment_requests listener error:", error.message);
      }),

      
      // Extra fallback listeners for Android Apps

      onValue(ref(db, "Pending_Deposits"), (snap) => {
        pendingDepositsRaw = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            if (val.amount !== undefined || val.status || val.trxId) {
              pendingDepositsRaw.push({ id: c.key, ...val });
            } else if (typeof val === 'object') {
              Object.entries(val).forEach(([k, vv]) => {
                if (vv && typeof vv === 'object') {
                  pendingDepositsRaw.push({ id: k, userId: c.key, ...(vv as any) });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
      }),

      onValue(ref(db, "pending_deposits"), (snap) => {
        pendingDepositsRaw2 = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            if (val.amount !== undefined || val.status || val.trxId) {
              pendingDepositsRaw2.push({ id: c.key, ...val });
            } else if (typeof val === 'object') {
              Object.entries(val).forEach(([k, vv]) => {
                if (vv && typeof vv === 'object') {
                  pendingDepositsRaw2.push({ id: k, userId: c.key, ...(vv as any) });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
      }),

      onValue(ref(db, "AddMoney"), (snap) => {
        addMoneyRaws = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            if (val.amount !== undefined || val.status || val.trxId) {
              addMoneyRaws.push({ id: c.key, ...val });
            } else if (typeof val === 'object') {
              Object.entries(val).forEach(([k, vv]) => {
                if (vv && typeof vv === 'object') {
                  addMoneyRaws.push({ id: k, userId: c.key, ...(vv as any) });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
      }),

      onValue(ref(db, "Payment_Requests"), (snap) => {
        paymentReqRaws2 = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            if (val.amount !== undefined || val.status || val.trxId) {
              paymentReqRaws2.push({ id: c.key, ...val });
            } else if (typeof val === 'object') {
              Object.entries(val).forEach(([k, vv]) => {
                if (vv && typeof vv === 'object') {
                  paymentReqRaws2.push({ id: k, userId: c.key, ...(vv as any) });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
      }),

      onValue(ref(db, "Deposit_Requests"), (snap) => {
        depReqRaws2 = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            if (val.amount !== undefined || val.status || val.trxId) {
              depReqRaws2.push({ id: c.key, ...val });
            } else if (typeof val === 'object') {
              Object.entries(val).forEach(([k, vv]) => {
                if (vv && typeof vv === 'object') {
                  depReqRaws2.push({ id: k, userId: c.key, ...(vv as any) });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
      }),

      onValue(ref(db, "recharges"), (snap) => {
        rechargeReqRaws = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            if (val.amount !== undefined || val.status || val.trxId) {
              rechargeReqRaws.push({ id: c.key, ...val });
            } else if (typeof val === 'object') {
              Object.entries(val).forEach(([k, vv]) => {
                if (vv && typeof vv === 'object') {
                  rechargeReqRaws.push({ id: k, userId: c.key, ...(vv as any) });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
      }),

      // Buyer Orders & Delivery Ledger Listener (Dual-sync)
      onValue(ref(db, "buyer_orders"), (snap) => {
        buyerOrdersRaw = [];
        if (snap.exists()) {
          snap.forEach(c => {
            buyerOrdersRaw.push({ id: c.key, ...c.val() });
          });
        }
        mergeAndSetOrders();
      }, (error) => {
        console.warn("buyer_orders listener error:", error.message);
      }),

      onValue(ref(db, "orders"), (snap) => {
        ordersRaw = [];
        if (snap.exists()) {
          snap.forEach(c => {
            ordersRaw.push({ id: c.key, ...c.val() });
          });
        }
        mergeAndSetOrders();
      }, (error) => {
        console.warn("orders listener error:", error.message);
      }),

      // Credentials Stock Bank
      onValue(ref(db, "buyer_credentials_bank"), (snap) => {
        const bankData = snap.exists() ? snap.val() : {};
        setData(prev => ({ ...prev, buyerCredentialsBank: bankData }));
      }, (error) => {
        console.warn("buyer_credentials_bank listener error:", error.message);
      }),

      // Deposit Gateways & Receiving Numbers (Multi-path fallback sync)
      onValue(ref(db, "deposit_gateways"), (snap) => {
        if (snap.exists()) {
          setData(prev => ({ ...prev, depositGateways: { ...(prev.depositGateways || {}), ...snap.val() } }));
        }
      }, (error) => {
        console.warn("deposit_gateways listener error:", error.message);
      }),

      onValue(ref(db, "settings/deposit_gateways"), (snap) => {
        if (snap.exists()) {
          setData(prev => ({ ...prev, depositGateways: { ...(prev.depositGateways || {}), ...snap.val() } }));
        }
      }, (error) => {
        console.warn("settings/deposit_gateways listener error:", error.message);
      }),

      onValue(ref(db, "buyer_gateways"), (snap) => {
        if (snap.exists()) {
          setData(prev => ({ ...prev, depositGateways: { ...(prev.depositGateways || {}), ...snap.val() } }));
        }
      }, (error) => {
        console.warn("buyer_gateways listener error:", error.message);
      })
    ];

    return () => {
      clearInterval(apiInterval);
      unsubs.forEach(u => u());
    };
  }, [user, refreshKey]);

  return { ...data, loading, forceRefresh };
}

