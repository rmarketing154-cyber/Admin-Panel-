import React, { useState, useMemo, useEffect } from 'react';
import { ref, update, get, push, set } from 'firebase/database';
import { db } from '../../lib/firebase';
import { BuyerDepositRequest } from '../../types';
import Swal from 'sweetalert2';
import { 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Search, 
  Download, 
  Copy, 
  Clock, 
  DollarSign, 
  User, 
  Smartphone, 
  CreditCard, 
  ArrowUpRight, 
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Bell,
  Sparkles,
  Check,
  Trash2
} from 'lucide-react';
import { copyToClipboardFallback } from '../../lib/clipboard';

export default function BuyerDepositsManager({ data, adminEmail }: { data: any; adminEmail?: string }) {
  const depositRequests: BuyerDepositRequest[] = data.buyerDeposits || [];
  const users = data.users || [];

  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, { status: 'approved' | 'rejected'; reason?: string }>>({});

  // User Map for quick lookup
  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    users.forEach((u: any) => {
      map.set(u.uid, u);
    });
    return map;
  }, [users]);

  // Enrich deposits with user's current wallet balance
  const enrichedDeposits = useMemo(() => {
    return depositRequests.map(d => {
      const rKey = (d as any).rawKey || (d as any).firebaseKey || (d as any).key || '';
      const override = statusOverrides[d.id] || 
                       (rKey ? statusOverrides[rKey] : null) || 
                       (d.trxId ? statusOverrides[d.trxId] : null);
      const effectiveStatus = override ? override.status : d.status;
      const u = userMap.get(d.userId) || {};
      const currentBalance = u.buyerWalletBalance ?? 0;
      return {
        ...d,
        status: effectiveStatus,
        rejectReason: override?.reason || d.rejectReason,
        userCurrentBalance: currentBalance,
        userFullInfo: u
      };
    });
  }, [depositRequests, userMap, statusOverrides]);

  const filteredDeposits = useMemo(() => {
    let list = enrichedDeposits;

    if (filterTab !== 'all') {
      list = list.filter(d => d.status === filterTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(d => 
        (d.userName || '').toLowerCase().includes(q) ||
        (d.userEmail || '').toLowerCase().includes(q) ||
        (d.trxId || '').toLowerCase().includes(q) ||
        (d.senderNumber || '').toLowerCase().includes(q) ||
        (d.paymentMethod || '').toLowerCase().includes(q) ||
        (d.id || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      if (filterTab === 'pending') {
        return (a.createdAt || 0) - (b.createdAt || 0); // oldest first for pending
      }
      return (b.approvedAt || b.rejectedAt || b.createdAt || 0) - (a.approvedAt || a.rejectedAt || a.createdAt || 0);
    });
  }, [enrichedDeposits, filterTab, search]);

  const pendingCount = useMemo(() => {
    return enrichedDeposits.filter(d => d.status === 'pending').length;
  }, [enrichedDeposits]);

  const approvedCount = useMemo(() => {
    return enrichedDeposits.filter(d => d.status === 'approved').length;
  }, [enrichedDeposits]);

  const rejectedCount = useMemo(() => {
    return enrichedDeposits.filter(d => d.status === 'rejected').length;
  }, [enrichedDeposits]);

  const totalApprovedAmount = useMemo(() => {
    return enrichedDeposits
      .filter(d => d.status === 'approved')
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [enrichedDeposits]);

  // Manual Instant Refresh
  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/deposits');
      if (res.ok) {
        const json = await res.json();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `সিঙ্ক সম্পন্ন! মোট ${json.count || depositRequests.length}টি ডিপোজিট লোড হয়েছে।`,
          showConfirmButton: false,
          timer: 2000
        });
      }
    } catch (e) {
      console.warn('Sync warning:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Approve Deposit Request
  const handleApproveDeposit = async (dep: any) => {
    const amountToAdd = Number(dep.amount) || 0;
    if (amountToAdd <= 0) {
      Swal.fire('ত্রুটি', 'ডিপোজিট অ্যামাউন্ট সঠিক নয়!', 'error');
      return;
    }

    Swal.fire({
      title: 'ডিপোজিট অ্যাপ্রুভ করবেন?',
      html: `
        <div class="text-left space-y-2 text-xs bg-slate-50 p-3 rounded-xl border">
          <div>ক্রেতা: <strong class="text-slate-900">${dep.userName || 'Buyer'}</strong> (${dep.userEmail || 'N/A'})</div>
          <div>মেথড: <strong class="text-indigo-600 uppercase">${dep.paymentMethod}</strong></div>
          <div>সেন্ডার নম্বর: <strong class="font-mono text-slate-800">${dep.senderNumber || 'N/A'}</strong></div>
          <div>TrxID: <strong class="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">${dep.trxId}</strong></div>
          <div class="pt-2 border-t text-sm font-black text-slate-900">
            ক্রেতার ওয়ালেটে যুক্ত হবে: <span class="text-emerald-600 font-extrabold text-base">৳ ${amountToAdd}</span>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ, অ্যাপ্রুভ ও ব্যালেন্স ক্রেডিট করুন',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#10b981',
    }).then(async (res) => {
      if (res.isConfirmed) {
        setProcessingId(dep.id);

        // 0. Set local override immediately for instant, zero-delay UI sync
        const rawK = (dep as any).rawKey || (dep as any).firebaseKey || (dep as any).key || '';
        const keysToOverride = Array.from(new Set([dep.id, rawK, (dep as any).key, dep.trxId].filter(Boolean)));
        setStatusOverrides(prev => {
          const next = { ...prev };
          keysToOverride.forEach(k => {
            next[k] = { status: 'approved' };
          });
          return next;
        });

        try {
          const rawK = (dep as any).rawKey || (dep as any).firebaseKey || (dep as any).key || '';
          const targetUid = dep.userId || (dep as any).user_id || (dep as any).uid || (dep as any).userUid || '';
          const safeAmountToAdd = isNaN(amountToAdd) ? 0 : Number(amountToAdd);

          // Get fresh balance directly from database to prevent race conditions or stale local state
          let freshBalance = 0;
          if (targetUid) {
            try {
              const userSnap = await get(ref(db, `users/${targetUid}`));
              const walletSnap = await get(ref(db, `buyer_wallets/${targetUid}`));
              const uData = userSnap.val() || {};
              const wData = walletSnap.val() || {};
              
              if (uData.buyerWalletBalance !== undefined && uData.buyerWalletBalance !== null) {
                freshBalance = Number(uData.buyerWalletBalance);
              } else if (wData.balance !== undefined && wData.balance !== null) {
                freshBalance = Number(wData.balance);
              } else if (uData.deposit_balance !== undefined && uData.deposit_balance !== null) {
                freshBalance = Number(uData.deposit_balance);
              } else if (uData.depositBalance !== undefined && uData.depositBalance !== null) {
                freshBalance = Number(uData.depositBalance);
              } else if (uData.buyingBalance !== undefined && uData.buyingBalance !== null) {
                freshBalance = Number(uData.buyingBalance);
              } else if (wData.buyerWalletBalance !== undefined && wData.buyerWalletBalance !== null) {
                freshBalance = Number(wData.buyerWalletBalance);
              }
              if (isNaN(freshBalance)) freshBalance = 0;
            } catch (err) {
              console.warn("Failed to fetch fresh balance from RTDB, using fallback:", err);
              freshBalance = Number(dep.userCurrentBalance || 0);
            }
          } else {
            freshBalance = Number(dep.userCurrentBalance || 0);
          }

          const newBalance = Number((freshBalance + safeAmountToAdd).toFixed(2));
          const updates: Record<string, any> = {};
          const now = Date.now();
          const candidateKeys = Array.from(new Set([dep.id, rawK, (dep as any).key, dep.trxId].filter(Boolean)));

          // 1. Update status on all root nodes
          const rootNodes = [
            'buyer_deposits', 'deposit_requests', 'deposits', 'user_deposits',
            'payment_requests', 'Pending_Deposits', 'pending_deposits',
            'recharge_requests', 'add_money', 'AddMoney'
          ];

          candidateKeys.forEach(k => {
            rootNodes.forEach(node => {
              updates[`${node}/${k}/status`] = "approved";
              updates[`${node}/${k}/approvedAt`] = now;
              updates[`${node}/${k}/approvedBy`] = adminEmail || "Admin";
              updates[`${node}/${k}/adminNote`] = `Approved by ${adminEmail || 'Admin'}`;
            });
            
            // 2. Update status on user's sub-nodes
            if (targetUid) {
              const uSubs = ['deposits', 'deposit_requests', 'depositRequests', 'user_deposits', 'pending_deposits', 'Pending_Deposits', 'recharges', 'add_money', 'AddMoney', 'payment_requests', 'Payment_Requests'];
              uSubs.forEach(sub => {
                updates[`users/${targetUid}/${sub}/${k}/status`] = "approved";
                updates[`users/${targetUid}/${sub}/${k}/approvedAt`] = now;
                updates[`users/${targetUid}/${sub}/${k}/approvedBy`] = adminEmail || "Admin";
              });
            }
          });

          // 3. Update User Buyer Wallet Balance (Buying Gmail deposit balance)
          if (targetUid) {
            updates[`users/${targetUid}/buyerWalletBalance`] = newBalance;
            updates[`users/${targetUid}/deposit_balance`] = newBalance;
            updates[`users/${targetUid}/depositBalance`] = newBalance;
            updates[`users/${targetUid}/buyingBalance`] = newBalance;
            updates[`users/${targetUid}/buying_balance`] = newBalance;

            updates[`buyer_wallets/${targetUid}/balance`] = newBalance;
            updates[`buyer_wallets/${targetUid}/buyerWalletBalance`] = newBalance;
            updates[`buyer_wallets/${targetUid}/deposit_balance`] = newBalance;
            updates[`buyer_wallets/${targetUid}/depositBalance`] = newBalance;
            updates[`buyer_wallets/${targetUid}/lastDepositAt`] = now;

            // Record transaction log in 'transactions' node
            const txId = `tx_dep_${now}`;
            updates[`transactions/${txId}`] = {
              id: txId,
              userId: targetUid,
              type: "deposit",
              amount: safeAmountToAdd,
              balanceAfter: newBalance,
              description: `Wallet Deposit Approved (TrxID: ${dep.trxId || 'N/A'})`,
              method: dep.paymentMethod || "wallet",
              timestamp: now,
              status: "completed"
            };

            // In-app Notification to the buyer
            const notifId = `notif_${now}`;
            updates[`users/${targetUid}/notifications/${notifId}`] = {
              id: notifId,
              title: "ডিপোজিট অনুমোদন সফল হয়েছে! 🎉",
              message: `আপনার ৳${safeAmountToAdd.toLocaleString()} ডিপোজিট রিকোয়েস্ট সফলভাবে অনুমোদন করা হয়েছে। বর্তমান ব্যালেন্স: ৳${newBalance.toLocaleString()}`,
              type: "deposit_approved",
              amount: safeAmountToAdd,
              timestamp: now,
              read: false
            };
          }

          // Execute authoritative atomic update directly using admin client session
          await update(ref(db), updates);

          Swal.fire({
            icon: 'success',
            title: 'ডিপোজিট অ্যাপ্রুভ সম্পন্ন!',
            text: `৳${amountToAdd} ক্রেতার ওয়ালেটে সফলভাবে যোগ করা হয়েছে।`,
            confirmButtonColor: '#10b981'
          });
        } catch (e: any) {
          console.error(e);
          // Rollback status override on error
          setStatusOverrides(prev => {
            const next = { ...prev };
            keysToOverride.forEach(k => {
              delete next[k];
            });
            return next;
          });
          Swal.fire('Error', e.message || 'Failed to approve deposit', 'error');
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  // Reject Deposit Request
  const handleRejectDeposit = (dep: any) => {
    Swal.fire({
      title: 'ডিপোজিট বাতিল / রিজেক্ট করবেন?',
      html: `
        <div class="text-left space-y-2 text-xs">
          <p class="text-slate-600">বাতিলের কারণ নির্বাচন করুন অথবা লিখুন:</p>
          <select id="swal-reject-quick" class="swal2-select !m-0 !w-full !text-xs mb-2">
            <option value="Invalid / Fake TrxID">ভুল বা ভুয়া TrxID প্রদান করা হয়েছে</option>
            <option value="Payment not received">পেমেন্ট একাউন্টে জমা হয়নি</option>
            <option value="Amount mismatch">টাকার পরিমাণ মেলেনি</option>
            <option value="Duplicate TrxID submitted">একই TrxID পূর্বে ব্যবহার করা হয়েছে</option>
            <option value="Custom">অন্যান্য কারণ (নিচে লিখুন)</option>
          </select>
          <input id="swal-reject-reason" class="swal2-input !m-0 !w-full !text-xs" placeholder="কাস্টম কারণ লিখুন...">
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'রিজেক্ট করুন',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#ef4444',
      didOpen: () => {
        const quick = document.getElementById('swal-reject-quick') as HTMLSelectElement;
        const input = document.getElementById('swal-reject-reason') as HTMLInputElement;
        quick.addEventListener('change', () => {
          if (quick.value !== 'Custom') {
            input.value = quick.value;
          } else {
            input.value = '';
          }
        });
        input.value = quick.value;
      },
      preConfirm: () => {
        const reason = (document.getElementById('swal-reject-reason') as HTMLInputElement).value.trim();
        return reason || 'Invalid Transaction';
      }
    }).then(async (res) => {
      if (res.isConfirmed && res.value) {
        setProcessingId(dep.id);
        const reason = res.value;
        const now = Date.now();

        // 0. Set local override immediately for instant, zero-delay UI sync
        const rawK = (dep as any).rawKey || (dep as any).firebaseKey || (dep as any).key || '';
        const keysToOverride = Array.from(new Set([dep.id, rawK, (dep as any).key, dep.trxId].filter(Boolean)));
        setStatusOverrides(prev => {
          const next = { ...prev };
          keysToOverride.forEach(k => {
            next[k] = { status: 'rejected', reason };
          });
          return next;
        });

        try {
          const targetUid = dep.userId || (dep as any).user_id || (dep as any).uid || (dep as any).userUid || '';
          const updates: Record<string, any> = {};
          const candidateKeys = Array.from(new Set([dep.id, rawK, (dep as any).key, dep.trxId].filter(Boolean)));

          // 1. Update status on all root nodes
          const rootNodes = [
            'buyer_deposits', 'deposit_requests', 'deposits', 'user_deposits',
            'payment_requests', 'Pending_Deposits', 'pending_deposits',
            'recharge_requests', 'add_money', 'AddMoney'
          ];

          candidateKeys.forEach(k => {
            rootNodes.forEach(node => {
              updates[`${node}/${k}/status`] = "rejected";
              updates[`${node}/${k}/rejectedAt`] = now;
              updates[`${node}/${k}/rejectedBy`] = adminEmail || "Admin";
              updates[`${node}/${k}/rejectReason`] = reason;
              updates[`${node}/${k}/adminNote`] = reason;
            });
            
            // 2. Update status on user's sub-nodes
            if (targetUid) {
              const uSubs = ['deposits', 'deposit_requests', 'depositRequests', 'user_deposits', 'pending_deposits', 'Pending_Deposits', 'recharges', 'add_money', 'AddMoney', 'payment_requests', 'Payment_Requests'];
              uSubs.forEach(sub => {
                updates[`users/${targetUid}/${sub}/${k}/status`] = "rejected";
                updates[`users/${targetUid}/${sub}/${k}/rejectedAt`] = now;
                updates[`users/${targetUid}/${sub}/${k}/rejectedBy`] = adminEmail || "Admin";
                updates[`users/${targetUid}/${sub}/${k}/rejectReason`] = reason;
              });
            }
          });

          // 3. Send Notification to user for rejection
          if (targetUid) {
            const notifId = `notif_${now}`;
            updates[`users/${targetUid}/notifications/${notifId}`] = {
              id: notifId,
              title: "ডিপোজিট বাতিল করা হয়েছে ⚠️",
              message: `আপনার ৳${Number(dep.amount || 0).toLocaleString()} ডিপোজিট রিকোয়েস্ট বাতিল করা হয়েছে। কারণ: ${reason}`,
              type: "deposit_rejected",
              amount: Number(dep.amount || 0),
              timestamp: now,
              read: false
            };
          }

          // Execute authoritative atomic update directly using admin client session
          await update(ref(db), updates);

          Swal.fire({
            icon: 'info',
            title: 'ডিপোজিট বাতিল করা হয়েছে',
            text: `কারণ: ${reason}`,
            confirmButtonColor: '#4f46e5'
          });
        } catch (e: any) {
          console.error(e);
          // Rollback status override on error
          setStatusOverrides(prev => {
            const next = { ...prev };
            keysToOverride.forEach(k => {
              delete next[k];
            });
            return next;
          });
          Swal.fire('Error', e.message || 'Failed to reject deposit', 'error');
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  // Delete Single Deposit
  const handleDeleteDeposit = (dep: BuyerDepositRequest) => {
    Swal.fire({
      title: 'ডিপোজিট রিকোয়েস্ট মুছে ফেলবেন?',
      html: `
        <div class="text-xs text-slate-600 text-left space-y-2">
          <p>আপনি কি নিশ্চিত যে <strong>${dep.userName || 'Buyer'}</strong> এর <strong>৳${dep.amount}</strong> (TrxID: <code>${dep.trxId}</code>) ডিপোজিট রিকোয়েস্ট স্থায়ীভাবে মুছে ফেলতে চান?</p>
          <p class="text-red-600 font-bold bg-red-50 p-2 rounded-xl border border-red-200">এই রেকর্ডটি ডাটাবেজ থেকে সম্পূর্ণ মুছে যাবে।</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ, ডিলিট করুন',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#ef4444'
    }).then(async (res) => {
      if (res.isConfirmed) {
        setProcessingId(dep.id);
        try {
          // 1. Call Backend API
          try {
            await fetch(`/api/admin/deposits/${dep.id}`, { method: 'DELETE' });
          } catch (e) {
            console.warn('API delete error:', e);
          }

          // 2. Direct RTDB cleanup
          const updates: Record<string, any> = {};
          updates[`buyer_deposits/${dep.id}`] = null;
          updates[`deposit_requests/${dep.id}`] = null;
          updates[`deposits/${dep.id}`] = null;
          updates[`user_deposits/${dep.id}`] = null;
          updates[`Pending_Deposits/${dep.id}`] = null;
          updates[`pending_deposits/${dep.id}`] = null;
          if (dep.userId) {
            updates[`users/${dep.userId}/deposits/${dep.id}`] = null;
          }
          await update(ref(db), updates);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'ডিপোজিট রিকোয়েস্ট সফলভাবে ডিলিট হয়েছে!',
            showConfirmButton: false,
            timer: 2000
          });
        } catch (err: any) {
          console.error(err);
          Swal.fire('Error', err.message || 'Failed to delete deposit', 'error');
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  // Clear All Pending Deposits
  const handleClearAllPending = () => {
    const pendingList = depositRequests.filter(d => d.status === 'pending');
    if (pendingList.length === 0) {
      Swal.fire('তথ্য', 'কোনো পেন্ডিং ডিপোজিট রিকোয়েস্ট অবশিষ্ট নেই।', 'info');
      return;
    }

    Swal.fire({
      title: 'সমস্ত পেন্ডিং ডিপোজিট ডিলিট করবেন?',
      html: `
        <div class="text-xs text-slate-600 text-left space-y-2">
          <p>বর্তমানে <strong>${pendingList.length}টি</strong> পেন্ডিং ডিপোজিট রিকোয়েস্ট রয়েছে। আপনি কি এগুলো একসাথে ডাটাবেজ থেকে সম্পূর্ণ মুছে ফেলতে চান?</p>
          <p class="text-red-600 font-bold bg-red-50 p-2 rounded-xl border border-red-200">এই অ্যাকশনটি অপরিবর্তনীয়!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `হ্যাঁ, সব পেন্ডিং (${pendingList.length}টি) ডিলিট করুন`,
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#ef4444'
    }).then(async (res) => {
      if (res.isConfirmed) {
        setIsRefreshing(true);
        try {
          // 1. API call
          try {
            await fetch('/api/admin/deposits/clear-pending', { method: 'POST' });
          } catch (e) {
            console.warn('API clear error:', e);
          }

          // 2. RTDB bulk cleanup
          const updates: Record<string, any> = {};
          pendingList.forEach(dep => {
            updates[`buyer_deposits/${dep.id}`] = null;
            updates[`deposit_requests/${dep.id}`] = null;
            updates[`deposits/${dep.id}`] = null;
            updates[`user_deposits/${dep.id}`] = null;
            updates[`Pending_Deposits/${dep.id}`] = null;
            updates[`pending_deposits/${dep.id}`] = null;
            if (dep.userId) {
              updates[`users/${dep.userId}/deposits/${dep.id}`] = null;
            }
          });
          await update(ref(db), updates);

          Swal.fire({
            icon: 'success',
            title: 'পেন্ডিং ডিপোজিট ক্লিন করা হয়েছে!',
            text: `সফলভাবে ${pendingList.length}টি পেন্ডিং রিকোয়েস্ট মুছে ফেলা হয়েছে।`,
            confirmButtonColor: '#4f46e5'
          });
        } catch (err: any) {
          console.error(err);
          Swal.fire('Error', err.message || 'Failed to clear pending deposits', 'error');
        } finally {
          setIsRefreshing(false);
        }
      }
    });
  };

  // Export deposits to CSV
  const handleExportCSV = () => {
    if (filteredDeposits.length === 0) return;
    const headers = ['ID', 'User Name', 'Email', 'Amount (BDT)', 'Method', 'Sender Number', 'TrxID', 'Status', 'Date'];
    const rows = filteredDeposits.map(d => [
      d.id,
      `"${d.userName || ''}"`,
      d.userEmail || '',
      d.amount,
      d.paymentMethod,
      d.senderNumber,
      `"${d.trxId}"`,
      d.status,
      new Date(d.createdAt).toLocaleString('en-US')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `buyer_deposits_${filterTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* High-Impact Notification Alert Banner if Pending Deposits Exist */}
      {pendingCount > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-4 sm:p-5 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              <Bell size={24} className="animate-bounce text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base">নতুন ডিপোজিট রিকোয়েস্ট পেন্ডিং রয়েছে!</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-rose-600 font-extrabold text-xs">
                  {pendingCount} New
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                ক্রেতারা ওয়ালেট রিচার্জের জন্য পেমেন্ট সম্পন্ন করে রিকোয়েস্ট জমা দিয়েছেন। দ্রুত ট্রানজেকশন আইডি যাচাই করে অ্যাপ্রুভ করুন।
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterTab('pending')}
              className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-900 hover:bg-amber-50 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Clock size={14} className="text-amber-600" />
              <span>পেন্ডিংগুলো দেখুন ({pendingCount})</span>
            </button>

            <button
              onClick={handleClearAllPending}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-400/40 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              title="সবগুলো পেন্ডিং রিকোয়েস্ট একবারে ডিলিট করুন"
            >
              <Trash2 size={14} className="text-rose-400" />
              <span>সব পেন্ডিং মুছুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Header Actions & Diagnostic Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>Deposit Requests Management</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live Real-Time Sync
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              সর্বমোট রিকোয়েস্ট: <strong>{depositRequests.length}টি</strong> | পেন্ডিং: <strong className="text-amber-600">{pendingCount}টি</strong> | অনুমোদিত: <strong className="text-emerald-600">{approvedCount}টি</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleClearAllPending}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
              title="সব পেন্ডিং রিকোয়েস্ট ডিলিট করুন"
            >
              <Trash2 size={13} className="text-rose-600" />
              <span>পেন্ডিং মুছুন ({pendingCount})</span>
            </button>
          )}

          <button
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="রিফ্রেশ ও ডাটাবেস সিঙ্ক করুন"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-indigo-600' : ''} />
            <span>{isRefreshing ? 'Syncing...' : 'Live Sync'}</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilterTab('pending')}
          className={`cursor-pointer bg-white rounded-3xl p-5 border transition-all ${
            filterTab === 'pending' ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md' : 'border-slate-200 shadow-sm hover:border-slate-300'
          } flex items-center justify-between`}
        >
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Requests</div>
            <div className="text-2xl font-black text-amber-600 flex items-center gap-1.5">
              <span>{pendingCount}</span>
              {pendingCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div 
          onClick={() => setFilterTab('approved')}
          className={`cursor-pointer bg-white rounded-3xl p-5 border transition-all ${
            filterTab === 'approved' ? 'border-emerald-400 ring-2 ring-emerald-400/20 shadow-md' : 'border-slate-200 shadow-sm hover:border-slate-300'
          } flex items-center justify-between`}
        >
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Approved Volume</div>
            <div className="text-2xl font-black text-emerald-600">৳ {totalApprovedAmount.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-700 font-bold">({approvedCount} approved)</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet size={24} />
          </div>
        </div>

        <div 
          onClick={() => setFilterTab('rejected')}
          className={`cursor-pointer bg-white rounded-3xl p-5 border transition-all ${
            filterTab === 'rejected' ? 'border-red-400 ring-2 ring-red-400/20 shadow-md' : 'border-slate-200 shadow-sm hover:border-slate-300'
          } flex items-center justify-between`}
        >
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rejected Requests</div>
            <div className="text-2xl font-black text-red-600">{rejectedCount}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <XCircle size={24} />
          </div>
        </div>

        <div 
          onClick={() => setFilterTab('all')}
          className={`cursor-pointer bg-white rounded-3xl p-5 border transition-all ${
            filterTab === 'all' ? 'border-indigo-400 ring-2 ring-indigo-400/20 shadow-md' : 'border-slate-200 shadow-sm hover:border-slate-300'
          } flex items-center justify-between`}
        >
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">All Total Requests</div>
            <div className="text-2xl font-black text-slate-900">{depositRequests.length}</div>
            <div className="text-[10px] text-indigo-600 font-bold">Lifetime records</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CreditCard size={24} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setFilterTab('pending')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterTab === 'pending'
                  ? 'bg-white text-amber-800 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending</span>
              {pendingCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                  {pendingCount} New
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600 text-[10px]">
                  0
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterTab('all')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All Requests ({depositRequests.length})</span>
            </button>

            <button
              onClick={() => setFilterTab('approved')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterTab === 'approved'
                  ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({approvedCount})
            </button>

            <button
              onClick={() => setFilterTab('rejected')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterTab === 'rejected'
                  ? 'bg-white text-red-800 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, TrxID, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
              title="Export CSV File"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Deposit List */}
        {filteredDeposits.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <Wallet size={40} className="mx-auto text-slate-300" />
            <div className="text-sm font-bold text-slate-700">কোনো ডিপোজিট রিকোয়েস্ট পাওয়া যায়নি</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search ? 'আপনার সার্চের সাথে কোনো রেকর্ড মেলেনি।' : 'নতুন ডিপোজিট রিকোয়েস্ট আসলেই তা স্বয়ংক্রিয়ভাবে এখানে নোটিফিকেশন সহ শো করবে।'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 rounded-l-xl">Buyer & Details</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method & Number</th>
                  <th className="py-3 px-4">TrxID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeposits.map((dep) => {
                  const isPending = dep.status === 'pending';
                  const isApproved = dep.status === 'approved';
                  const isRejected = dep.status === 'rejected';

                  return (
                    <tr 
                      key={dep.id} 
                      className={`transition-colors ${
                        isPending 
                          ? 'bg-amber-50/40 hover:bg-amber-50/70' 
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Buyer Info */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span>{userMap.get(dep.userId)?.username || userMap.get(dep.userId)?.name || userMap.get(dep.userId)?.full_name || dep.userName || 'Buyer'}</span>
                          {isPending && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {userMap.get(dep.userId)?.email || userMap.get(dep.userId)?.phone || dep.userEmail || dep.userId}
                        </div>
                        <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                          Current Wallet: ৳ {dep.userCurrentBalance}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4">
                        <div className="text-base font-black text-emerald-600">৳ {dep.amount}</div>
                        <div className="text-[10px] font-bold text-slate-400">BDT Deposit</div>
                      </td>

                      {/* Method & Sender Number */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-black uppercase text-[10px]">
                          {dep.paymentMethod}
                        </div>
                        <div className="font-mono font-bold text-slate-800 text-xs mt-1 flex items-center gap-1">
                          <span>{dep.senderNumber || 'N/A'}</span>
                          {dep.senderNumber && (
                            <button
                              onClick={() => {
                                copyToClipboardFallback(dep.senderNumber);
                                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Number copied!', showConfirmButton: false, timer: 1000 });
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <Copy size={11} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* TrxID */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 select-all">
                            {dep.trxId}
                          </span>
                          <button
                            onClick={() => {
                              copyToClipboardFallback(dep.trxId);
                              Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'TrxID copied!', showConfirmButton: false, timer: 1000 });
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded bg-slate-50 border"
                            title="Copy TrxID"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600 text-[11px] font-medium">
                        <div>{new Date(dep.createdAt).toLocaleDateString('en-GB')}</div>
                        <div className="text-[10px] text-slate-400">{new Date(dep.createdAt).toLocaleTimeString('en-US')}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black animate-pulse">
                            <Clock size={11} />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">
                            <CheckCircle size={11} />
                            <span>Approved</span>
                          </span>
                        )}
                        {isRejected && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 text-[10px] font-black">
                              <XCircle size={11} />
                              <span>Rejected</span>
                            </span>
                            {dep.rejectReason && (
                              <div className="text-[10px] text-red-600 mt-1 font-medium max-w-[150px] truncate" title={dep.rejectReason}>
                                {dep.rejectReason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                disabled={processingId === dep.id}
                                onClick={() => handleApproveDeposit(dep)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                title="ডিপোজিট অনুমোদন করুন"
                              >
                                <CheckCircle size={13} />
                                <span>Approve</span>
                              </button>

                              <button
                                disabled={processingId === dep.id}
                                onClick={() => handleRejectDeposit(dep)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50"
                                title="ডিপোজিট বাতিল করুন"
                              >
                                <XCircle size={13} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {!isPending && (
                            <div className="text-[10px] text-slate-400 font-bold mr-1">
                              {isApproved && dep.approvedBy ? `By: ${dep.approvedBy}` : ''}
                              {isRejected && dep.rejectedBy ? `By: ${dep.rejectedBy}` : ''}
                            </div>
                          )}

                          <button
                            disabled={processingId === dep.id}
                            onClick={() => handleDeleteDeposit(dep)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                            title="ডিপোজিট ডিলিট করুন"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
