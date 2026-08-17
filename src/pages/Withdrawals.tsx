import React from 'react';
import { ref, update, get, push } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { Wallet, ClipboardCopy, CheckCircle, XCircle } from 'lucide-react';

export default function Withdrawals({ data }: any) {
  const list = data.withdraws.filter((w: any) => w.status === 'pending').sort((a:any, b:any) => (a.requestedAt||0) - (b.requestedAt||0));

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const approveWithdraw = async (w: any) => {
    const { value: trxId } = await Swal.fire({
      title: 'Confirm Payment Approval',
      html: `<b>User:</b> ${w.username}<br><b>Amount:</b> ৳${w.amount}<br><b>Number:</b> ${w.paymentNumber}`,
      input: 'text',
      inputPlaceholder: 'Enter TrxID (Optional)',
      showCancelButton: true,
      confirmButtonText: 'Mark Paid'
    });

    if (trxId !== undefined) {
      await update(ref(db, `withdraw_requests/${w.key}`), {
        status: 'approved',
        trxId: trxId || 'PAID_DIRECT',
        approvedAt: Date.now()
      });

      await push(ref(db, `users/${w.userId}/notifications`), {
        title: 'উইথড্র সফল হয়েছে!',
        message: `আপনার ৳${w.amount} উইথড্র সফলভাবে প্রদান করা হয়েছে। ${trxId ? `TrxID: ${trxId}` : ''}`,
        type: 'success',
        timestamp: Date.now()
      });

      Swal.fire('Approved', 'Withdrawal marked as paid', 'success');
    }
  };

  const rejectWithdraw = async (w: any) => {
    const { value: reason } = await Swal.fire({
      title: 'Reject & Refund?',
      input: 'text',
      inputPlaceholder: 'Reason for rejection',
      showCancelButton: true,
      confirmButtonText: 'Yes, Refund',
      confirmButtonColor: '#ef4444'
    });

    if (reason !== undefined) {
      const userRef = ref(db, `users/${w.userId}`);
      const uSnap = await get(userRef);
      if (uSnap.exists()) {
        const u = uSnap.val();
        await update(userRef, { balance: (u.balance || 0) + Number(w.amount) });
      }

      await update(ref(db, `withdraw_requests/${w.key}`), {
        status: 'rejected',
        rejectReason: reason || 'Invalid payment number',
        rejectedAt: Date.now()
      });

      await push(ref(db, `users/${w.userId}/notifications`), {
        title: 'উইথড্র বাতিল ও রিফান্ড',
        message: `আপনার ৳${w.amount} উইথড্র বাতিল করে মূল ব্যালেন্সে রিফান্ড করা হয়েছে। কারণ: ${reason || 'ভুল তথ্য'}`,
        type: 'danger',
        timestamp: Date.now()
      });

      Swal.fire('Refunded', 'Amount returned to user balance', 'info');
    }
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Wallet className="text-red-500" />
          Withdrawal Requests
        </h2>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
          {list.length} Requests
        </span>
      </div>
      
      <div className="p-4 space-y-4">
        {list.length === 0 && <div className="text-center text-slate-500 py-10">No pending withdrawals</div>}
        
        {list.map((w: any) => (
          <div key={w.key} className="border rounded-xl bg-white shadow-sm overflow-hidden p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <div className="text-3xl font-black text-indigo-600">৳{w.amount}</div>
                <span className="inline-block mt-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold uppercase tracking-wider">
                  {w.paymentMethod || w.method || 'bkash'}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <div className="font-bold text-slate-800">{w.username || 'User'}</div>
                <div className="text-xs text-slate-500">{new Date(w.requestedAt || 0).toLocaleString()}</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-start sm:items-center gap-3 flex-col sm:flex-row mb-4">
              <div className="text-sm w-full sm:w-auto truncate">Account Number: <span className="font-bold text-slate-800 text-lg ml-2">{w.paymentNumber}</span></div>
              <button onClick={() => copyText(w.paymentNumber)} className="bg-white border rounded-lg w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300">
                <ClipboardCopy size={18} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => approveWithdraw(w)} className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors border border-emerald-200">
                <CheckCircle size={18} /> Mark Paid
              </button>
              <button onClick={() => rejectWithdraw(w)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors border border-red-200">
                <XCircle size={18} /> Reject & Refund
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
