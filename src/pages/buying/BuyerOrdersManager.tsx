import React, { useState, useMemo } from 'react';
import { ref, update, get, push, set } from 'firebase/database';
import { db } from '../../lib/firebase';
import { BuyerOrder, BuyerProduct, BuyerCredential } from '../../types';
import { extractDeliveredAccounts, extractDownloadText } from '../../lib/orderUtils';
import Swal from 'sweetalert2';
import { 
  ShoppingBag, 
  Search, 
  Download, 
  Copy, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  DollarSign, 
  Eye, 
  EyeOff,
  User, 
  Package, 
  RotateCcw,
  FileText,
  Send,
  Plus,
  XCircle,
  Check,
  AlertCircle,
  Lock,
  Unlock,
  Sparkles,
  Info
} from 'lucide-react';
import { copyToClipboardFallback } from '../../lib/clipboard';

interface DeliveryAccountInput {
  email: string;
  password: string;
}

export default function BuyerOrdersManager({ data, adminEmail }: { data: any; adminEmail?: string }) {
  const orders: BuyerOrder[] = data.buyerOrders || [];
  const products: BuyerProduct[] = data.buyerProducts || [];
  const credentialsBank = data.buyerCredentialsBank || {};
  const users = data.users || [];

  // Filter tabs: all | pending | delivered | cancelled | claimed
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'delivered' | 'cancelled' | 'claimed'>('all');
  const [search, setSearch] = useState('');
  
  // Selected order for detailed modal (Delivery or View)
  const [activeOrder, setActiveOrder] = useState<BuyerOrder | null>(null);
  
  // Dynamic delivery form state for activeOrder
  const [deliveryInputs, setDeliveryInputs] = useState<DeliveryAccountInput[]>([]);
  const [adminNote, setAdminNote] = useState('');
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeliveredPassMap, setShowDeliveredPassMap] = useState<Record<string, boolean>>({});

  // Map users for fast balance and profile lookup
  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    users.forEach((u: any) => {
      if (u.uid) map.set(u.uid, u);
    });
    return map;
  }, [users]);

  // Orders filtering
  const filteredOrders = useMemo(() => {
    let list = orders;

    if (filterTab === 'pending') {
      list = list.filter(o => o.status === 'pending' || o.status === 'processing');
    } else if (filterTab === 'delivered') {
      list = list.filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'replaced');
    } else if (filterTab === 'cancelled') {
      list = list.filter(o => o.status === 'cancelled' || o.status === 'refunded');
    } else if (filterTab === 'claimed') {
      list = list.filter(o => o.status === 'warranty_claimed' || o.warrantyStatus === 'claimed');
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(o => 
        (o.id || '').toLowerCase().includes(q) ||
        (o.userName || '').toLowerCase().includes(q) ||
        (o.userEmail || '').toLowerCase().includes(q) ||
        (o.productTitle || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [orders, filterTab, search]);

  // Counts for Badges & Metrics
  const pendingCount = useMemo(() => orders.filter(o => o.status === 'pending' || o.status === 'processing').length, [orders]);
  const deliveredCount = useMemo(() => orders.filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'replaced').length, [orders]);
  const cancelledCount = useMemo(() => orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length, [orders]);
  const claimedCount = useMemo(() => orders.filter(o => o.status === 'warranty_claimed' || o.warrantyStatus === 'claimed').length, [orders]);

  const totalDeliveredRevenue = useMemo(() => {
    return orders
      .filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'replaced')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [orders]);

  const totalPendingAmount = useMemo(() => {
    return orders
      .filter(o => o.status === 'pending' || o.status === 'processing')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [orders]);

  // Open Order Details / Delivery Modal
  const handleOpenOrder = (order: BuyerOrder) => {
    setActiveOrder(order);
    setAdminNote(order.adminNote || order.admin_note || '');
    setBulkPasteText('');
    setShowBulkPaste(false);

    // Initialize delivery inputs based on order quantity
    const initialInputs: DeliveryAccountInput[] = [];
    const count = Number(order.quantity || 1);
    
    // If order already has deliveredAccounts, preload them
    if (order.deliveredAccounts && order.deliveredAccounts.length > 0) {
      for (let i = 0; i < count; i++) {
        const existing = order.deliveredAccounts[i];
        initialInputs.push({
          email: existing?.email || '',
          password: existing?.password || ''
        });
      }
    } else {
      for (let i = 0; i < count; i++) {
        initialInputs.push({ email: '', password: '' });
      }
    }
    setDeliveryInputs(initialInputs);
  };

  // Update specific input set
  const handleInputChange = (index: number, field: keyof DeliveryAccountInput, value: string) => {
    setDeliveryInputs(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  // Handle Bulk Paste Parser into the sets
  const handleApplyBulkPaste = () => {
    if (!bulkPasteText.trim() || !activeOrder) return;
    const lines = bulkPasteText.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Strict Quantity Check
    if (lines.length !== Number(activeOrder.quantity)) {
      Swal.fire('ভুল সংখ্যা!', `অর্ডার কোয়ান্টিটি ${activeOrder.quantity} টি, কিন্তু আপনি ${lines.length} টি লাইন দিয়েছেন। ঠিক ${activeOrder.quantity} টি লাইন দিন।`, 'error');
      return;
    }

    const parsed: DeliveryAccountInput[] = lines.map(line => {
      const parts = line.split(/[:|,|\t]/).map(p => p.trim());
      return {
        email: parts[0] || '',
        password: parts[1] || ''
      };
    });

    setDeliveryInputs(parsed);
    setShowBulkPaste(false);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${parsed.length} টি অ্যাকাউন্ট ইনপুট বক্সে বসানো হয়েছে!`,
      showConfirmButton: false,
      timer: 1500
    });
  };

  // Auto-fill from Credentials Stock Bank
  const handleAutoFillFromStockBank = () => {
    if (!activeOrder) return;
    const pBank = credentialsBank[activeOrder.productId] || {};
    const availableCreds: BuyerCredential[] = Object.keys(pBank)
      .map(k => ({ id: k, ...pBank[k] }))
      .filter(c => c.status === 'available' || !c.status);

    if (availableCreds.length === 0) {
      Swal.fire('স্টক খালি', 'এই প্রোডাক্টের স্টক ব্যাংকে কোনো স্বয়ংক্রিয় অ্যাকাউন্ট নেই। অনুগ্রহ করে ম্যানুয়ালি পেস্ট করুন।', 'warning');
      return;
    }

    const needed = activeOrder.quantity;
    const selected = availableCreds.slice(0, needed);

    setDeliveryInputs(prev => {
      const next = [...prev];
      selected.forEach((c, idx) => {
        if (next[idx]) {
          next[idx] = {
            email: c.email,
            password: c.password
          };
        }
      });
      return next;
    });

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `স্টক ব্যাংক থেকে ${selected.length} টি অ্যাকাউন্ট যুক্ত করা হয়েছে!`,
      showConfirmButton: false,
      timer: 1500
    });
  };

  // ==========================================
  // 1. APPROVE & DELIVER ORDER
  // ==========================================
  const handleApproveOrder = async () => {
    if (!activeOrder) return;

    // Regex to validate real Gmail address
    const gmailRegex = /^[a-zA-Z0-9.+-]+@gmail\.com$/i;

    // 1. Validation: Check that every Gmail and Password set is filled, format check, duplicate check
    const enteredEmails: string[] = [];

    for (let i = 0; i < deliveryInputs.length; i++) {
      const item = deliveryInputs[i];
      const email = item.email.trim();
      const password = item.password.trim();

      if (!email || !password) {
        Swal.fire('অসম্পূর্ণ তথ্য!', `Gmail #${i + 1} এর ইমেইল এবং পাসওয়ার্ড উভয়ই পূরণ করা আবশ্যক।`, 'warning');
        return;
      }

      // Check for valid Gmail
      if (!gmailRegex.test(email)) {
        Swal.fire('ভুয়া জিমেইল!', `Gmail #${i + 1} ("${email}") একটি বৈধ জিমেইল অ্যাড্রেস নয়। অনুগ্রহ করে সঠিক @gmail.com অ্যাড্রেস দিন।`, 'warning');
        return;
      }

      const lowerEmail = email.toLowerCase();
      // Check for duplicates inside the current modal inputs
      if (enteredEmails.includes(lowerEmail)) {
        Swal.fire('ডুপ্লিকেট জিমেইল!', `আপনি ইনপুট বক্সে একই জিমেইল ("${email}") একাধিকবার লিখেছেন। প্রতিটি জিমেইল ইউনিক হতে হবে।`, 'warning');
        return;
      }
      enteredEmails.push(lowerEmail);
    }

    // 2. Check duplicates across ALL system orders (Buyer orders)
    const allOrders = data.buyerOrders || [];
    for (const email of enteredEmails) {
      const alreadyUsed = allOrders.some((order: any) => {
        // Ignore current order itself
        if (order.id === activeOrder.id) return false;

        const accounts = order.deliveredAccounts || order.delivered_accounts || order.accounts || order.gmails;
        if (Array.isArray(accounts)) {
          return accounts.some((acc: any) => acc && String(acc.email || acc.gmail || '').trim().toLowerCase() === email);
        } else if (accounts && typeof accounts === 'object') {
          return Object.values(accounts).some((acc: any) => acc && String(acc.email || acc.gmail || '').trim().toLowerCase() === email);
        }
        return false;
      });

      if (alreadyUsed) {
        Swal.fire('ইতোমধ্যে ব্যবহৃত জিমেইল!', `জিমেইলটি ("${email}") ইতোপূর্বে অন্য কোনো অর্ডারে ডেলিভারি করা হয়েছে। একটি জিমেইল কেবল একবারই দেওয়া যাবে।`, 'error');
        return;
      }
    }

    // Pre-calculate values for the Swal dialog to avoid 'undefined'
    const rawOrderTotal = activeOrder.totalAmount ?? (activeOrder as any).total_amount ?? (activeOrder as any).amount ?? (Number(activeOrder.quantity || deliveryInputs.length || 1) * Number(activeOrder.unitPrice || (activeOrder as any).price || 0));
    const orderTotal = Number(rawOrderTotal || 0);
    const safeOrderTotal = isNaN(orderTotal) ? 0 : Number(orderTotal.toFixed(2));
    const safeQty = Number(activeOrder.quantity || deliveryInputs.length || 1);
    const safeProductTitle = activeOrder.productTitle || (activeOrder as any).title || 'Gmail Accounts';
    const safeUserName = activeOrder.userName || (activeOrder as any).username || (activeOrder as any).name || 'Buyer';

    // Confirmation Popup
    const confirmRes = await Swal.fire({
      title: `অর্ডার #${activeOrder.id} ডেলিভারি করবেন?`,
      html: `
        <div class="text-left space-y-3 text-xs">
          <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950">
            <div>ক্রেতার নাম: <b>${safeUserName}</b></div>
            <div>প্রোডাক্ট: <b>${safeProductTitle}</b> (কোয়ান্টিটি: <b>${safeQty}</b> টি)</div>
            <div>কর্তনযোগ্য অর্থ: <b class="text-sm font-black text-emerald-700">৳ ${safeOrderTotal}</b></div>
          </div>
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-medium">
            ⚠️ <b>সতর্কতা:</b> "This action cannot be undone!"<br/>
            Approve বাটনে চাপার সাথে সাথে ক্রেতার <b>Reserved Balance</b> থেকে ৳${safeOrderTotal} ফাইনাল কেটে নেওয়া হবে এবং ক্রেতার My Orders এ জিমেইল ও পাসওয়ার্ড লাইভ দৃশ্যমান হবে।
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `হ্যাঁ, Approve & Deduct ৳${safeOrderTotal}`,
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#10b981'
    });

    if (!confirmRes.isConfirmed) return;

    setIsProcessing(true);
    try {
      const orderId = activeOrder.id;

      // 1. Live State Lock & Anti-Duplicate Check in RTDB
      const [checkSnap1, checkSnap2] = await Promise.all([
        get(ref(db, `buyer_orders/${orderId}`)),
        get(ref(db, `orders/${orderId}`))
      ]);
      const currentOrderState1 = checkSnap1.val() || {};
      const currentOrderState2 = checkSnap2.val() || {};

      if (currentOrderState1.status === 'delivered' || currentOrderState1.status === 'completed' ||
          currentOrderState2.status === 'delivered' || currentOrderState2.status === 'completed') {
        setIsProcessing(false);
        setActiveOrder(null);
        Swal.fire('তথ্য', 'এই অর্ডারটি ইতোমধ্যে সফলভাবে ডেলিভারি ও অ্যাপ্রুভ করা হয়েছে। ডাবল অ্যাকশন রোধ করা হয়েছে।', 'info');
        return;
      }

      if (currentOrderState1.status === 'cancelled' || currentOrderState1.status === 'refunded' ||
          currentOrderState2.status === 'cancelled' || currentOrderState2.status === 'refunded') {
        setIsProcessing(false);
        setActiveOrder(null);
        Swal.fire('ত্রুটি', 'এই অর্ডারটি ইতিমধ্যে বাতিল/রিফান্ড করা হয়েছে। এটি ডেলিভারি করা সম্ভব নয়।', 'error');
        return;
      }

      const deliveredAccounts = deliveryInputs.map(item => ({
        email: item.email.trim(),
        password: item.password.trim()
      }));

      // Default Admin Note
      const finalAdminNote = 'Verified and delivered successfully';

        const targetUserId = activeOrder.userId || activeOrder.user_id || activeOrder.uid || activeOrder.userUid;
        const now = Date.now();
        const updates: Record<string, any> = {};

        const warrantyHours = activeOrder.warrantyHours || 12;
        const warrantyExpiresAt = now + (Number(warrantyHours) * 60 * 60 * 1000);
        const downloadText = deliveredAccounts
          .map(acc => `${acc.email}:${acc.password}${acc.recovery ? `:${acc.recovery}` : ''}${acc.ip ? `:${acc.ip}` : ''}`)
          .join('\n');

        const orderUpdate = {
          status: "delivered",
          deliveredAccounts: deliveredAccounts,
          downloadText: downloadText,
          warrantyExpiresAt: warrantyExpiresAt,
          adminNote: finalAdminNote,
          deliveredAt: now,
          delivered_at: now,
          updatedAt: now
        };

        Object.entries(orderUpdate).forEach(([k, v]) => {
          updates[`buyer_orders/${orderId}/${k}`] = v;
          updates[`orders/${orderId}/${k}`] = v;
          if (targetUserId) {
            updates[`users/${targetUserId}/orders/${orderId}/${k}`] = v;
            updates[`users/${targetUserId}/buyer_orders/${orderId}/${k}`] = v;
            updates[`users/${targetUserId}/buyerOrders/${orderId}/${k}`] = v;
          }
        });

        const logId = `log_${now}`;
        updates[`admin_logs/${logId}`] = {
          id: logId,
          action: "approve_order",
          orderId,
          userId: targetUserId,
          amount: safeOrderTotal || 0,
          quantity: activeOrder.quantity || 1,
          timestamp: now,
          adminNote: finalAdminNote
        };

        if (targetUserId && safeOrderTotal > 0) {
           const userSnap = await get(ref(db, `users/${targetUserId}`));
           const walletSnap = await get(ref(db, `buyer_wallets/${targetUserId}`));
           const uData = userSnap.val() || {};
           const wData = walletSnap.val() || {};

           let curReserved = Number(wData.reserved_balance ?? uData.reserved_balance ?? 0);
           let curHold = Number(uData.hold ?? 0);
           const newReserved = Math.max(0, Number((curReserved - safeOrderTotal).toFixed(2)));
           const newHold = Math.max(0, Number((curHold - safeOrderTotal).toFixed(2)));

           updates[`users/${targetUserId}/reserved_balance`] = newReserved;
           updates[`buyer_wallets/${targetUserId}/reserved_balance`] = newReserved;
           updates[`users/${targetUserId}/hold`] = newHold;

           const txId = `tx_buy_${now}`;
           updates[`transactions/${txId}`] = {
              id: txId,
              userId: targetUserId,
              userName: activeOrder.userName || "Buyer",
              type: "buyer_purchase",
              amount: safeOrderTotal,
              orderId: orderId,
              productTitle: activeOrder.productTitle || "Gmail Accounts",
              quantity: activeOrder.quantity || 1,
              status: "completed",
              timestamp: now,
              note: `Order #${orderId} Delivered & Escrow Settled`
           };
        }

        if (activeOrder.productId && deliveredAccounts.length > 0) {
           const bankSnap = await get(ref(db, `buyer_credentials_bank/${activeOrder.productId}`));
           const bankNode = bankSnap.val();
           if (bankNode) {
              Object.entries(bankNode).forEach(([k, v]: [string, any]) => {
                 if (v && deliveredAccounts.some(d => d.email.toLowerCase() === (v.email || "").toLowerCase())) {
                    updates[`buyer_credentials_bank/${activeOrder.productId}/${k}/status`] = "sold";
                    updates[`buyer_credentials_bank/${activeOrder.productId}/${k}/soldAt`] = now;
                    updates[`buyer_credentials_bank/${activeOrder.productId}/${k}/soldToOrderId`] = orderId;
                 }
              });
           }
        }

        if (targetUserId) {
           const notifId = `notif_ord_${now}`;
           updates[`users/${targetUserId}/notifications/${notifId}`] = {
              id: notifId,
              title: "✅ অর্ডার অ্যাপ্রুভ ও ডেলিভারি সম্পন্ন!",
              message: `আপনার অর্ডার #${orderId.slice(-6) || orderId} (${activeOrder.quantity || 1}টি জিমেইল) সফলভাবে অ্যাপ্রুভ হয়েছে এবং আপনার ব্যালেন্স থেকে মোট ৳${safeOrderTotal} কেটে নেওয়া হয়েছে। My Orders থেকে জিমেইল ও পাসওয়ার্ড দেখে নিন।`,
              type: "order_delivered",
              amount: safeOrderTotal,
              orderId: orderId,
              timestamp: now,
              read: false
           };
        }

        await update(ref(db), updates);

      setIsProcessing(false);
      setActiveOrder(null);
      
      Swal.fire({
        icon: 'success',
        title: 'ডেলিভারি সম্পন্ন! 🚀',
        text: `অর্ডার #${activeOrder.id} সফলভাবে ডেলিভারি করা হয়েছে এবং ক্রেতার Reserved Balance থেকে টাকা কেটে নেওয়া হয়েছে।`,
        confirmButtonColor: '#10b981'
      });
    } catch (e: any) {
      console.error('Delivery Error:', e);
      setIsProcessing(false);
      Swal.fire('Error', e.message || 'ডেলিভারি করার সময় একটি সমস্যা হয়েছে।', 'error');
    }
  };

  // ==========================================
  // 2. REJECT & REFUND ORDER (With Anti-Double-Refund Protection)
  // ==========================================
  const handleRejectOrder = async () => {
    if (!activeOrder) return;
    if (isProcessing) return;

    // Strict Rule: Delivered/Completed/Replaced orders can NEVER be cancelled or refunded!
    if (activeOrder.status === 'delivered' || activeOrder.status === 'completed' || activeOrder.status === 'replaced') {
      Swal.fire('নিষিদ্ধ!', 'এই অর্ডারটি ইতোমধ্যে সফলভাবে এপ্রুভ ও ডেলিভারি করা হয়েছে। এপ্রুভ হওয়া অর্ডারের টাকা কখনোই ব্যাক বা রিফান্ড হবে না।', 'error');
      return;
    }

    if (activeOrder.status === 'cancelled' || activeOrder.status === 'refunded' || (activeOrder as any).isRefunded) {
      Swal.fire('তথ্য', 'এই অর্ডারটি ইতোমধ্যে বাতিল বা রিফান্ড করা হয়েছে। ডাবল রিফান্ড প্রতিরোধ করা হয়েছে।', 'info');
      return;
    }

    // Strict exact order total calculation (strictly the exact amount the user paid for this order)
    const rawQty = Math.max(1, Number(activeOrder.quantity || 1));
    const explicitTotal = Number(activeOrder.totalAmount ?? (activeOrder as any).total_amount ?? (activeOrder as any).total ?? 0);
    const explicitAmt = Number((activeOrder as any).amount ?? 0);
    const unitPrice = Number(activeOrder.unitPrice ?? (activeOrder as any).unit_price ?? 0);
    const rawPrice = Number((activeOrder as any).price ?? 0);

    let calculatedTotal = 0;
    if (explicitTotal > 0) {
      calculatedTotal = explicitTotal;
    } else if (explicitAmt > 0) {
      calculatedTotal = explicitAmt;
    } else if (unitPrice > 0) {
      calculatedTotal = Number((unitPrice * rawQty).toFixed(2));
    } else if (rawPrice > 0) {
      calculatedTotal = rawPrice;
    }
    calculatedTotal = isNaN(calculatedTotal) || calculatedTotal < 0 ? 0 : Number(calculatedTotal.toFixed(2));

    const { value: formValues } = await Swal.fire({
      title: `অর্ডার #${activeOrder.id} বাতিল ও রিফান্ড`,
      html: `
        <div class="text-left space-y-3 text-xs">
          <div class="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-950">
            <div>ক্রেতার নাম: <b>${activeOrder.userName || 'Buyer'}</b></div>
            <div>প্রোডাক্ট: <b>${activeOrder.productTitle || 'Gmail Accounts'}</b> (কোয়ান্টিটি: <b>${rawQty}</b> টি)</div>
            <div class="mt-1">অর্ডার করার জন্য কাটা হয়েছিল: <b class="text-sm font-black text-rose-700">৳ ${calculatedTotal}</b></div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">ডিপোজিটে রিফান্ড হবে (ফিক্সড):</label>
            <div class="w-full px-3 py-2 border rounded-lg font-mono font-black text-base text-emerald-600 bg-emerald-50/50 border-emerald-200">
              ৳ ${calculatedTotal}
            </div>
            <span class="text-[10px] text-slate-500 mt-1 block">ইউজার যেই টাকা দিয়ে অর্ডার করেছে ঠিক সেই ৳${calculatedTotal} টাকাই তার ডিপোজিট ব্যালেন্সে ফেরত যাবে। কোনো অতিরিক্ত বা কম টাকা রিফান্ড হবে না।</span>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">বাতিলের কারণ (Reason) *:</label>
            <textarea id="swal-cancel-reason" class="w-full px-3 py-2 border rounded-lg text-slate-700 bg-white" rows="2" placeholder="যেমন: Stock Out, সাময়িক ত্রুটি...">Stock Out / সাময়িক স্টক স্বল্পতা</textarea>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ, বাতিল ও ডিপোজিটে রিফান্ড করুন',
      cancelButtonText: 'না, ফিরে যান',
      confirmButtonColor: '#ef4444',
      preConfirm: () => {
        const reasonInput = (document.getElementById('swal-cancel-reason') as HTMLTextAreaElement)?.value || '';
        if (!reasonInput.trim()) {
          Swal.showValidationMessage('বাতিলের কারণ লেখা আবশ্যক!');
          return false;
        }
        return {
          reason: reasonInput.trim(),
          refundAmt: calculatedTotal
        };
      }
    });

    if (!formValues) return;

    const { reason, refundAmt: safeOrderAmt } = formValues;

    setIsProcessing(true);
    try {
        const orderId = activeOrder.id;
        const now = Date.now();

        // 1. Anti-Double-Refund Database Check: Verify if already refunded or delivered in RTDB
        const [checkOrderSnap1, checkOrderSnap2] = await Promise.all([
          get(ref(db, `buyer_orders/${orderId}`)),
          get(ref(db, `orders/${orderId}`))
        ]);
        const oVal1 = checkOrderSnap1.val() || {};
        const oVal2 = checkOrderSnap2.val() || {};

        if (oVal1.status === 'delivered' || oVal1.status === 'completed' || oVal1.status === 'replaced' ||
            oVal2.status === 'delivered' || oVal2.status === 'completed' || oVal2.status === 'replaced') {
          setIsProcessing(false);
          setActiveOrder(null);
          Swal.fire('নিষিদ্ধ!', 'এই অর্ডারটি ইতোমধ্যে ডেলিভারি/এপ্রুভ করা হয়েছে। এপ্রুভ অর্ডারের টাকা কখনোই ব্যাক হবে না।', 'error');
          return;
        }

        if (oVal1.status === 'cancelled' || oVal1.status === 'refunded' || oVal1.isRefunded ||
            oVal2.status === 'cancelled' || oVal2.status === 'refunded' || oVal2.isRefunded) {
          setIsProcessing(false);
          setActiveOrder(null);
          Swal.fire('সতর্কতা', 'এই অর্ডারটি ইতোমধ্যে বাতিল বা রিফান্ড সম্পন্ন হয়ে গেছে। ডাবল রিফান্ড প্রতিরোধ করা হয়েছে।', 'warning');
          return;
        }

        const updates: Record<string, any> = {};

        // Robustly resolve the real target user UID
        let targetUserId = (activeOrder.userId || activeOrder.user_id || activeOrder.uid || activeOrder.userUid || '').trim();
        if (!targetUserId || !userMap.has(targetUserId)) {
          const emailToMatch = (activeOrder.userEmail || activeOrder.email || targetUserId).toLowerCase().trim();
          const nameToMatch = (activeOrder.userName || '').toLowerCase().trim();
          const phoneToMatch = (activeOrder.userPhone || activeOrder.phone || '').trim();

          for (const [uKey, uVal] of userMap.entries()) {
            const uEmail = (uVal.email || uVal.userEmail || '').toLowerCase().trim();
            const uName = (uVal.username || uVal.name || uVal.displayName || '').toLowerCase().trim();
            const uPhone = (uVal.phone || uVal.userPhone || '').trim();

            if (
              (emailToMatch && uEmail && emailToMatch === uEmail) ||
              (phoneToMatch && uPhone && phoneToMatch === uPhone) ||
              (nameToMatch && uName && nameToMatch === uName) ||
              uKey === targetUserId
            ) {
              targetUserId = uKey;
              break;
            }
          }
        }

        // Cancel the order across all root nodes with isRefunded flag
        updates[`buyer_orders/${orderId}/status`] = "cancelled";
        updates[`buyer_orders/${orderId}/warrantyStatus`] = "cancelled";
        updates[`buyer_orders/${orderId}/adminNote`] = reason;
        updates[`buyer_orders/${orderId}/isRefunded`] = true;
        updates[`buyer_orders/${orderId}/refundedAt`] = now;
        updates[`buyer_orders/${orderId}/refundAmount`] = safeOrderAmt;
        updates[`buyer_orders/${orderId}/updatedAt`] = now;

        updates[`orders/${orderId}/status`] = "cancelled";
        updates[`orders/${orderId}/warrantyStatus`] = "cancelled";
        updates[`orders/${orderId}/adminNote`] = reason;
        updates[`orders/${orderId}/isRefunded`] = true;
        updates[`orders/${orderId}/refundedAt`] = now;
        updates[`orders/${orderId}/refundAmount`] = safeOrderAmt;
        updates[`orders/${orderId}/updatedAt`] = now;

        const uIdsToUpdate = Array.from(new Set([targetUserId, activeOrder.userId, (activeOrder as any).user_id].filter(Boolean)));
        uIdsToUpdate.forEach(uId => {
          updates[`users/${uId}/orders/${orderId}/status`] = "cancelled";
          updates[`users/${uId}/orders/${orderId}/warrantyStatus`] = "cancelled";
          updates[`users/${uId}/orders/${orderId}/adminNote`] = reason;
          updates[`users/${uId}/orders/${orderId}/isRefunded`] = true;
          updates[`users/${uId}/orders/${orderId}/refundedAt`] = now;
          updates[`users/${uId}/orders/${orderId}/refundAmount`] = safeOrderAmt;
          updates[`users/${uId}/orders/${orderId}/updatedAt`] = now;

          updates[`users/${uId}/buyer_orders/${orderId}/status`] = "cancelled";
          updates[`users/${uId}/buyer_orders/${orderId}/warrantyStatus`] = "cancelled";
          updates[`users/${uId}/buyer_orders/${orderId}/adminNote`] = reason;
          updates[`users/${uId}/buyer_orders/${orderId}/isRefunded`] = true;
          updates[`users/${uId}/buyer_orders/${orderId}/refundedAt`] = now;
          updates[`users/${uId}/buyer_orders/${orderId}/refundAmount`] = safeOrderAmt;
          updates[`users/${uId}/buyer_orders/${orderId}/updatedAt`] = now;
          
          updates[`users/${uId}/buyerOrders/${orderId}/status`] = "cancelled";
          updates[`users/${uId}/buyerOrders/${orderId}/warrantyStatus`] = "cancelled";
          updates[`users/${uId}/buyerOrders/${orderId}/adminNote`] = reason;
          updates[`users/${uId}/buyerOrders/${orderId}/isRefunded`] = true;
          updates[`users/${uId}/buyerOrders/${orderId}/refundedAt`] = now;
          updates[`users/${uId}/buyerOrders/${orderId}/refundAmount`] = safeOrderAmt;
          updates[`users/${uId}/buyerOrders/${orderId}/updatedAt`] = now;
        });

        if (targetUserId && safeOrderAmt > 0) {
           let uData: any = {};
           let wData: any = {};
           try {
             const [userSnap, walletSnap] = await Promise.all([
               get(ref(db, `users/${targetUserId}`)),
               get(ref(db, `buyer_wallets/${targetUserId}`))
             ]);
             uData = userSnap.val() || userMap.get(targetUserId) || {};
             wData = walletSnap.val() || {};
           } catch (err) {
             console.warn("Direct RTDB fetch warning, falling back to state:", err);
             uData = userMap.get(targetUserId) || {};
           }

           // Get current buyer deposit balance
           let curBuyerBal = 0;
           if (uData.buyerWalletBalance !== undefined && uData.buyerWalletBalance !== null) {
             curBuyerBal = Number(uData.buyerWalletBalance);
           } else if (wData.balance !== undefined && wData.balance !== null) {
             curBuyerBal = Number(wData.balance);
           } else if (uData.deposit_balance !== undefined && uData.deposit_balance !== null) {
             curBuyerBal = Number(uData.deposit_balance);
           } else if (uData.depositBalance !== undefined && uData.depositBalance !== null) {
             curBuyerBal = Number(uData.depositBalance);
           } else if (uData.buyingBalance !== undefined && uData.buyingBalance !== null) {
             curBuyerBal = Number(uData.buyingBalance);
           } else if (wData.buyerWalletBalance !== undefined && wData.buyerWalletBalance !== null) {
             curBuyerBal = Number(wData.buyerWalletBalance);
           }
           if (isNaN(curBuyerBal)) curBuyerBal = 0;

           let curReserved = Number(wData.reserved_balance ?? uData.reserved_balance ?? uData.deposit_reserved ?? 0);
           if (isNaN(curReserved)) curReserved = 0;

           const newBuyerBal = Number((curBuyerBal + safeOrderAmt).toFixed(2));
           const newReserved = Math.max(0, Number((curReserved - safeOrderAmt).toFixed(2)));

           // Update Buying Gmail deposit balance across all compatible fields
           updates[`users/${targetUserId}/buyerWalletBalance`] = newBuyerBal;
           updates[`users/${targetUserId}/deposit_balance`] = newBuyerBal;
           updates[`users/${targetUserId}/depositBalance`] = newBuyerBal;
           updates[`users/${targetUserId}/buyingBalance`] = newBuyerBal;
           updates[`users/${targetUserId}/buying_balance`] = newBuyerBal;

           updates[`buyer_wallets/${targetUserId}/balance`] = newBuyerBal;
           updates[`buyer_wallets/${targetUserId}/buyerWalletBalance`] = newBuyerBal;
           updates[`buyer_wallets/${targetUserId}/deposit_balance`] = newBuyerBal;
           updates[`buyer_wallets/${targetUserId}/depositBalance`] = newBuyerBal;
           updates[`buyer_wallets/${targetUserId}/lastRefundAt`] = now;
           
           updates[`users/${targetUserId}/reserved_balance`] = newReserved;
           updates[`users/${targetUserId}/deposit_reserved`] = newReserved;
           updates[`buyer_wallets/${targetUserId}/reserved_balance`] = newReserved;

           const txId = `tx_ref_${now}`;
           updates[`transactions/${txId}`] = {
              id: txId,
              userId: targetUserId,
              type: "refund",
              amount: safeOrderAmt,
              balanceAfter: newBuyerBal,
              description: `Refund for Order #${orderId.slice(-6)}: ${reason} (Buying deposit refunded)`,
              timestamp: now,
              status: "completed"
           };

           const notifId = `notif_ref_${now}`;
           updates[`users/${targetUserId}/notifications/${notifId}`] = {
              id: notifId,
              title: "অর্ডার বাতিল ও ডিপোজিট রিফান্ড! 💸",
              message: `আপনার অর্ডার #${orderId.slice(-6) || orderId} বাতিল করা হয়েছে এবং মোট ৳${safeOrderAmt} টাকা আপনার Buying Gmail ডিপোজিট ব্যালেন্সে রিফান্ড যোগ করা হয়েছে।${reason ? ` (কারণ: ${reason})` : ''}`,
              type: "order_refunded",
              amount: safeOrderAmt,
              orderId: orderId,
              timestamp: now,
              read: false
           };
        }

        // Restore stock
        if (activeOrder.productId) {
           const pSnap = await get(ref(db, `buyer_products/${activeOrder.productId}`));
           const prod = pSnap.val();
           if (prod) {
             const newStock = (prod.stock || 0) + (activeOrder.quantity || 1);
             updates[`buyer_products/${activeOrder.productId}/stock`] = newStock;
             updates[`products/${activeOrder.productId}/stock`] = newStock;
           }
        }

        await update(ref(db), updates);

      setIsProcessing(false);
      setActiveOrder(null);

      Swal.fire({
        icon: 'success',
        title: 'অর্ডার বাতিল ও রিফান্ড সম্পন্ন!',
        text: `অর্ডার #${activeOrder.id} বাতিল হয়েছে এবং ৳${safeOrderAmt} ক্রেতার ডিপোজিট ব্যালেন্সে রিফান্ড করা হয়েছে।`,
        confirmButtonColor: '#4f46e5'
      });
    } catch (e: any) {
      setIsProcessing(false);
      console.error(e);
      Swal.fire('Error', e.message || 'Failed to reject order', 'error');
    }
  };

  // Download TXT file helper
  const handleDownloadOrderText = (order: BuyerOrder) => {
    const text = order.downloadText || (order.deliveredAccounts || []).map(a => `${a.email}:${a.password}${a.recovery ? `:${a.recovery}` : ''}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Order_${order.id}_${order.quantity}pcs_${order.productTitle.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Orders Metric */}
        <div 
          onClick={() => setFilterTab('pending')}
          className={`rounded-3xl p-5 border cursor-pointer transition-all ${
            filterTab === 'pending'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-[1.02]'
              : 'bg-white text-slate-800 border-slate-200 shadow-xs hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className={`text-[10px] font-black uppercase tracking-wider ${filterTab === 'pending' ? 'text-amber-100' : 'text-slate-400'}`}>
                পেন্ডিং ডেলিভারি (Pending)
              </div>
              <div className="text-2xl font-black flex items-center gap-2">
                <span>{pendingCount} টি</span>
                {pendingCount > 0 && (
                  <span className={`w-2.5 h-2.5 rounded-full ${filterTab === 'pending' ? 'bg-white' : 'bg-amber-500'} animate-ping`}></span>
                )}
              </div>
              <div className={`text-[11px] font-bold ${filterTab === 'pending' ? 'text-amber-100' : 'text-amber-600'}`}>
                হোল্ডে আছে: ৳ {totalPendingAmount.toLocaleString()}
              </div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filterTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'}`}>
              <Clock size={24} />
            </div>
          </div>
        </div>

        {/* Delivered Orders Metric */}
        <div 
          onClick={() => setFilterTab('delivered')}
          className={`rounded-3xl p-5 border cursor-pointer transition-all ${
            filterTab === 'delivered'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[1.02]'
              : 'bg-white text-slate-800 border-slate-200 shadow-xs hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className={`text-[10px] font-black uppercase tracking-wider ${filterTab === 'delivered' ? 'text-emerald-100' : 'text-slate-400'}`}>
                ডেলিভার্ড সম্পন্ন (Delivered)
              </div>
              <div className="text-2xl font-black">{deliveredCount} টি</div>
              <div className={`text-[11px] font-bold ${filterTab === 'delivered' ? 'text-emerald-100' : 'text-emerald-600'}`}>
                মোট বিক্রয়: ৳ {totalDeliveredRevenue.toLocaleString()}
              </div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filterTab === 'delivered' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        {/* Cancelled / Refunded */}
        <div 
          onClick={() => setFilterTab('cancelled')}
          className={`rounded-3xl p-5 border cursor-pointer transition-all ${
            filterTab === 'cancelled'
              ? 'bg-rose-600 text-white border-rose-700 shadow-md scale-[1.02]'
              : 'bg-white text-slate-800 border-slate-200 shadow-xs hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className={`text-[10px] font-black uppercase tracking-wider ${filterTab === 'cancelled' ? 'text-rose-100' : 'text-slate-400'}`}>
                বাতিল ও রিফান্ডেড
              </div>
              <div className="text-2xl font-black">{cancelledCount} টি</div>
              <div className={`text-[11px] font-bold ${filterTab === 'cancelled' ? 'text-rose-100' : 'text-rose-600'}`}>
                স্টক রিস্টোর ও রিফান্ডকৃত
              </div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filterTab === 'cancelled' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'}`}>
              <XCircle size={24} />
            </div>
          </div>
        </div>

        {/* Warranty Claim Issues */}
        <div 
          onClick={() => setFilterTab('claimed')}
          className={`rounded-3xl p-5 border cursor-pointer transition-all ${
            filterTab === 'claimed'
              ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-[1.02]'
              : 'bg-white text-slate-800 border-slate-200 shadow-xs hover:border-purple-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className={`text-[10px] font-black uppercase tracking-wider ${filterTab === 'claimed' ? 'text-purple-100' : 'text-slate-400'}`}>
                ওয়ারেন্টি ইস্যু ও ক্লেইম
              </div>
              <div className="text-2xl font-black">{claimedCount} টি</div>
              <div className={`text-[11px] font-bold ${filterTab === 'claimed' ? 'text-purple-100' : 'text-purple-600'}`}>
                রিপ্লেসমেন্ট রিকোয়েস্ট
              </div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filterTab === 'claimed' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'}`}>
              <ShieldCheck size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Order Delivery Ledger Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setFilterTab('pending')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-600'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>পেন্ডিং ডেলিভারি</span>
              {pendingCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${filterTab === 'pending' ? 'bg-white text-amber-700' : 'bg-amber-500 text-white'}`}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterTab('delivered')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterTab === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              ডেলিভার্ড ({deliveredCount})
            </button>

            <button
              onClick={() => setFilterTab('cancelled')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterTab === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-700'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              বাতিল/রিফান্ড ({cancelledCount})
            </button>

            <button
              onClick={() => setFilterTab('claimed')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterTab === 'claimed'
                  ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-700'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              ক্লেইম ({claimedCount})
            </button>

            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              সবগুলো ({orders.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="অর্ডার আইডি, ক্রেতা, প্রোডাক্ট..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <ShoppingBag size={40} className="mx-auto text-slate-300" />
            <div className="text-sm font-bold text-slate-700">কোনো অর্ডার পাওয়া যায়নি</div>
            <p className="text-xs text-slate-400">এই ফিল্টারে কোনো অর্ডারের রেকর্ড নেই।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 rounded-l-xl">Order ID</th>
                  <th className="py-3.5 px-4">Buyer (ক্রেতা)</th>
                  <th className="py-3.5 px-4">Product & Qty</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Order Time</th>
                  <th className="py-3.5 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const isPending = order.status === 'pending' || order.status === 'processing';
                  const isDelivered = order.status === 'delivered' || order.status === 'completed';
                  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
                  const isClaimed = order.status === 'warranty_claimed' || order.warrantyStatus === 'claimed';

                  const buyerUser = userMap.get(order.userId) || {};
                  const buyerBalance = Number(buyerUser.buyerWalletBalance ?? 0);
                  const buyerReserved = Number(buyerUser.reserved_balance ?? 0);

                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isPending ? 'bg-amber-50/30 font-medium' : ''
                      }`}
                    >
                      {/* Order ID */}
                      <td className="py-4 px-4 font-mono font-black text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-xl border text-xs ${
                            isPending 
                              ? 'bg-amber-100 text-amber-900 border-amber-300 font-black' 
                              : isDelivered 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            #{order.id}
                          </span>
                        </div>
                      </td>

                      {/* Buyer */}
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-900">
                          {buyerUser.username || buyerUser.name || buyerUser.full_name || order.userName || 'Buyer'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {buyerUser.email || buyerUser.phone || order.userEmail || order.userId}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2 pt-0.5">
                          <span>Balance: <strong className="text-slate-700">৳{buyerBalance}</strong></span>
                          <span>•</span>
                          <span>Reserved: <strong className="text-amber-700">৳{buyerReserved}</strong></span>
                        </div>
                      </td>

                      {/* Product & Qty */}
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-900">{order.productTitle}</div>
                        <div className="text-[11px] font-bold text-indigo-700 flex items-center gap-1.5">
                          <span className="bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            Qty: <b>{order.quantity} টি</b>
                          </span>
                          <span className="text-slate-400">(@ ৳{order.unitPrice})</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <div className="text-sm font-black text-emerald-700 font-mono">৳ {order.totalAmount}</div>
                        <div className="text-[10px] font-bold text-slate-400">
                          {isPending ? '🔒 Reserved' : isDelivered ? '✅ Debited' : '🔄 Refunded'}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black animate-pulse">
                            <Clock size={12} />
                            <span>Pending</span>
                          </span>
                        )}
                        {isDelivered && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black">
                            <CheckCircle size={12} className="text-emerald-600" />
                            <span>Delivered</span>
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-black">
                            <XCircle size={12} className="text-rose-600" />
                            <span>Cancelled</span>
                          </span>
                        )}
                        {isClaimed && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-black">
                            <AlertTriangle size={12} className="text-purple-600" />
                            <span>Claimed</span>
                          </span>
                        )}
                      </td>

                      {/* Order Time */}
                      <td className="py-4 px-4 text-slate-600 text-[11px] font-medium">
                        <div className="font-bold text-slate-800">{new Date(order.createdAt).toLocaleDateString('en-GB')}</div>
                        <div className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleTimeString('en-US')}</div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending ? (
                            <button
                              onClick={() => handleOpenOrder(order)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                            >
                              <Send size={13} />
                              <span>ডেলিভারি দিন</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenOrder(order)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Eye size={13} />
                              <span>বিস্তারিত</span>
                            </button>
                          )}

                          {isDelivered && (
                            <button
                              onClick={() => handleDownloadOrderText(order)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition-all"
                              title="Download .txt"
                            >
                              <Download size={13} />
                            </button>
                          )}
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

      {/* ========================================== */}
      {/* ORDER DETAILS & DELIVERY MODAL (FLOW UI)   */}
      {/* ========================================== */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 my-auto">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
              <div className="space-y-0.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                  <span>Order Details & Delivery System</span>
                  <span className="font-mono bg-indigo-900/80 px-2 py-0.5 rounded text-white font-bold">
                    #{activeOrder.id}
                  </span>
                </div>
                <h3 className="text-base font-black text-white">
                  {activeOrder.productTitle} <span className="text-emerald-400">x{activeOrder.quantity}</span>
                </h3>
              </div>

              <button
                onClick={() => setActiveOrder(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50">
              {/* Buyer & Financial Info Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400">Buyer Information</div>
                    <div className="font-black text-slate-900 text-sm mt-0.5">
                      {userMap.get(activeOrder.userId)?.username || userMap.get(activeOrder.userId)?.name || userMap.get(activeOrder.userId)?.full_name || activeOrder.userName || 'Buyer'}
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {userMap.get(activeOrder.userId)?.email || userMap.get(activeOrder.userId)?.phone || activeOrder.userEmail || activeOrder.userId}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Deposit Balance:</span>
                      <strong className="text-slate-900 font-mono">
                        ৳ {userMap.get(activeOrder.userId)?.buyerWalletBalance ?? 0}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-amber-700 font-bold">Reserved Balance:</span>
                      <strong className="text-amber-700 font-black font-mono">
                        ৳ {userMap.get(activeOrder.userId)?.reserved_balance ?? 0}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400">Order Time: </span>
                    <strong className="text-slate-700">{new Date(activeOrder.createdAt).toLocaleString('en-GB')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Payable: </span>
                    <strong className="text-emerald-700 font-black font-mono text-sm">৳ {activeOrder.totalAmount}</strong>
                  </div>
                </div>
              </div>

              {/* IF STATUS IS PENDING: SHOW GMAIL INPUTS DELIVERY FLOW */}
              {(activeOrder.status === 'pending' || activeOrder.status === 'processing') ? (
                <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-xs space-y-4">
                  {/* Delivery Flow Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <span>--- Deliver Gmail ({activeOrder.quantity} Sets) ---</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        ক্রেতার কোয়ান্টিটি <b>{activeOrder.quantity} টি</b>। {activeOrder.quantity} সেট জিমেইল ও পাসওয়ার্ড প্রদান করুন।
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAutoFillFromStockBank}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Sparkles size={12} />
                        <span>স্টক ব্যাংক অটো-ফিল</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowBulkPaste(prev => !prev)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Copy size={12} />
                        <span>বাল্ক পেস্ট</span>
                      </button>
                    </div>
                  </div>

                  {/* Bulk Paste Box (Collapsible) */}
                  {showBulkPaste && (
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                        <span>বাল্ক পেস্ট করুন (ঠিক {activeOrder.quantity} লাইন হতে হবে):</span>
                        <span className="text-[10px] text-indigo-700 font-mono">Format: email:pass</span>
                      </div>
                      <textarea
                        value={bulkPasteText}
                        onChange={(e) => setBulkPasteText(e.target.value)}
                        placeholder={`test1@gmail.com:pass123\ntest2@gmail.com:pass456\n(ঠিক ${activeOrder.quantity} লাইন দিন)`}
                        className="w-full h-24 p-3 bg-white border border-indigo-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowBulkPaste(false)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                        >
                          বাতিল
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyBulkPaste}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs"
                        >
                          ইনপুট বক্সে বসান
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Sets of Gmail + Password Inputs */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {deliveryInputs.map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="text-[10px] font-black text-indigo-700 uppercase tracking-wider flex items-center justify-between">
                          <span>Gmail Set #{idx + 1}</span>
                          <span className="text-slate-400 font-normal">Required</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Gmail / Email *</label>
                            <input
                              type="text"
                              placeholder="name@gmail.com"
                              value={item.email}
                              onChange={(e) => handleInputChange(idx, 'email', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Password *</label>
                            <input
                              type="text"
                              placeholder="Password"
                              value={item.password}
                              onChange={(e) => handleInputChange(idx, 'password', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* IF STATUS IS DELIVERED OR CANCELLED: SHOW PREVIEW */
                (() => {
                  const activeAccountsList = extractDeliveredAccounts(activeOrder);
                  const activeDownloadText = extractDownloadText(activeOrder, activeAccountsList);

                  return (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                          <FileText size={16} className="text-indigo-600" />
                          <span>ডেলিভারকৃত অ্যাকাউন্ট তালিকা ({activeAccountsList.length || 1} টি)</span>
                        </h4>

                        {activeOrder.status === 'delivered' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                copyToClipboardFallback(activeDownloadText);
                                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'সব কপি হয়েছে!', showConfirmButton: false, timer: 1000 });
                              }}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Copy size={12} />
                              <span>Copy All</span>
                            </button>

                            <button
                              onClick={() => handleDownloadOrderText(activeOrder)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Download size={12} />
                              <span>Download TXT</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {activeOrder.status === 'cancelled' && (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-950 space-y-1 text-xs">
                          <div className="font-black text-rose-800 flex items-center gap-1.5">
                            <XCircle size={14} />
                            <span>অর্ডারটি বাতিল ও রিফান্ড করা হয়েছে</span>
                          </div>
                          <div>বাতিলের কারণ: <b>{activeOrder.cancelReason || activeOrder.adminNote || 'Stock Out'}</b></div>
                          <div className="text-[11px] text-rose-700">
                            টাকা ক্রেতার মূল ওয়ালেট ব্যালেন্সে স্বয়ংক্রিয়ভাবে জমা দেওয়া হয়েছে।
                          </div>
                        </div>
                      )}

                      {/* Delivered Accounts List */}
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {activeAccountsList.length > 0 ? (
                          activeAccountsList.map((acc, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono flex items-center justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-900 select-all">{acc.email}</div>
                                <div className="text-slate-600 flex items-center gap-2">
                                  <span>Pass: <b className="text-slate-900 select-all">{acc.password}</b></span>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  copyToClipboardFallback(`${acc.email}:${acc.password}`);
                                  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'কপি হয়েছে!', showConfirmButton: false, timer: 800 });
                                }}
                                className="p-1.5 bg-white hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 cursor-pointer"
                                title="Copy"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap select-all">
                            {activeDownloadText || 'কোনো অ্যাকাউন্ট বিবরণ নেই'}
                          </pre>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all"
              >
                বন্ধ করুন (Close)
              </button>

              {/* Action Buttons for Pending Order */}
              {(activeOrder.status === 'pending' || activeOrder.status === 'processing') && (
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleRejectOrder}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle size={14} />
                    <span>Reject Order (বাতিল)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleApproveOrder}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-600/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Approve & Deduct ৳{activeOrder.totalAmount}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
