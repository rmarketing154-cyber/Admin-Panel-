import React, { useState } from 'react';
import { ref, update, get } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { ClipboardCopy, ArrowRightCircle, CheckCircle, XCircle, Inbox } from 'lucide-react';

export default function Submissions({ data, type }: any) {
  const [selectedMails, setSelectedMails] = useState<Record<string, Record<number, boolean>>>({});

  const list = data.submissions.filter((s: any) => s.status === type).sort((a:any, b:any) => (b.submittedAt||0) - (a.submittedAt||0));

  const toggleMail = (subKey: string, mailIdx: number) => {
    setSelectedMails(prev => ({
      ...prev,
      [subKey]: {
        ...(prev[subKey] || {}),
        [mailIdx]: !(prev[subKey]?.[mailIdx] ?? true)
      }
    }));
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const moveToChecking = async (key: string) => {
    await update(ref(db, `submissions/${key}`), { status: 'checking' });
  };

  const approveSubmission = async (s: any) => {
    const checks = selectedMails[s.key] || {};
    let count = 0;
    s.gmails.forEach((_:any, i:number) => {
      if (checks[i] !== false) count++;
    });

    if (count === 0) {
      Swal.fire("Warning", "No mails selected for approval", "warning");
      return;
    }

    const rate = s.rate || (s.totalAmount / (s.gmails?.length || 1));
    const payout = Number((count * rate).toFixed(2));

    await update(ref(db, `submissions/${s.key}`), {
      status: 'approved',
      approvedCount: count,
      finalPayout: payout,
      processedAt: Date.now()
    });

    const userRef = ref(db, `users/${s.userId}`);
    const uSnap = await get(userRef);
    if (uSnap.exists()) {
      const u = uSnap.val();
      await update(userRef, {
        balance: (u.balance || 0) + payout,
        hold: (u.hold || 0) - Number(s.totalAmount || payout),
        manual_approved_count: (u.manual_approved_count || 0) + count
      });
    }
    Swal.fire('Approved!', `Credited ৳${payout} to ${s.username}`, 'success');
  };

  const rejectSubmission = async (s: any) => {
    const { value: reason } = await Swal.fire({
      title: 'Reject Submission?',
      input: 'text',
      inputPlaceholder: 'Reason (e.g. Wrong password)',
      showCancelButton: true
    });

    if (reason !== undefined) {
      await update(ref(db, `submissions/${s.key}`), {
        status: 'rejected',
        rejectReason: reason || 'Incorrect Credentials',
        processedAt: Date.now()
      });

      const userRef = ref(db, `users/${s.userId}`);
      const uSnap = await get(userRef);
      if (uSnap.exists()) {
        const u = uSnap.val();
        await update(userRef, { hold: (u.hold || 0) - Number(s.totalAmount || 0) });
      }
      Swal.fire('Rejected', 'Hold amount cleared', 'info');
    }
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          {type === 'pending' ? <Inbox className="text-amber-500" /> : <CheckCircle className="text-indigo-500" />}
          {type === 'pending' ? 'New Submissions' : 'Checking Queue'}
        </h2>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${type === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
          {list.length} {type}
        </span>
      </div>
      
      <div className="p-4 space-y-4">
        {list.length === 0 && <div className="text-center text-slate-500 py-10">No items found</div>}
        
        {list.map((s: any) => (
          <div key={s.key} className="border-l-4 border-indigo-500 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-800">{s.username || 'User'} <span className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded-full ml-2">{s.gmails?.length} Mails</span></div>
                <div className="text-xs text-slate-500 mt-1">{new Date(s.submittedAt || 0).toLocaleString()}</div>
              </div>
              <div className="text-lg font-black text-emerald-600">৳{s.totalAmount || 0}</div>
            </div>
            
            <div className="p-4 space-y-3">
              {s.gmails?.map((m: any, idx: number) => {
                const isChecked = selectedMails[s.key]?.[idx] ?? true;
                return (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-white bg-indigo-500 px-2 py-0.5 rounded-md">Gmail #{idx+1}</span>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => toggleMail(s.key, idx)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1 bg-white border rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center text-sm gap-1 sm:gap-0">
                          <span className="text-[10px] sm:text-xs font-bold text-slate-400 w-full sm:w-12">Email:</span>
                          <span className="font-semibold text-slate-800 break-all">{m.email}</span>
                        </div>
                        <button onClick={() => copyText(m.email)} className="bg-white border rounded-lg w-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300">
                          <ClipboardCopy size={16} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-white border rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center text-sm gap-1 sm:gap-0">
                          <span className="text-[10px] sm:text-xs font-bold text-slate-400 w-full sm:w-12">Pass:</span>
                          <span className="font-semibold text-slate-800 break-all">{m.password}</span>
                        </div>
                        <button onClick={() => copyText(m.password)} className="bg-white border rounded-lg w-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300">
                          <ClipboardCopy size={16} />
                        </button>
                      </div>
                      {m.recoveryEmail && (
                        <div className="flex gap-2">
                          <div className="flex-1 bg-white border rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center text-sm gap-1 sm:gap-0">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 w-full sm:w-12">Rec:</span>
                            <span className="font-semibold text-slate-800 break-all">{m.recoveryEmail}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-slate-100">
                {type === 'pending' ? (
                  <button onClick={() => moveToChecking(s.key)} className="flex-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                    <ArrowRightCircle size={18} /> Move to Checking Queue
                  </button>
                ) : (
                  <>
                    <button onClick={() => approveSubmission(s)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm">
                      <CheckCircle size={18} /> Approve Selected
                    </button>
                    <button onClick={() => rejectSubmission(s)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                      <XCircle size={18} /> Reject All
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
