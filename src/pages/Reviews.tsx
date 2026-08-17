import React from 'react';
import { ref, update, remove, push } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { Star, Plus, Check, X, Trash2 } from 'lucide-react';

export default function Reviews({ data }: any) {
  const reviews = data.reviews.sort((a:any, b:any) => (b.createdAt||0) - (a.createdAt||0));

  const toggleApproval = async (key: string, curr: boolean) => {
    await update(ref(db, `reviews/${key}`), { approved: !curr });
  };

  const deleteReview = async (key: string) => {
    await remove(ref(db, `reviews/${key}`));
  };

  const addReview = () => {
    Swal.fire({
      title: 'Add Testimonial',
      html: `
        <input type="text" id="revName" class="swal2-input w-full mx-0 mb-3" placeholder="User Name">
        <textarea id="revComment" class="swal2-textarea w-full mx-0 mb-3" placeholder="Review Comment"></textarea>
        <select id="revRating" class="swal2-select w-full mx-0">
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Add Review'
    }).then(async r => {
      if (r.isConfirmed) {
        const name = (document.getElementById('revName') as HTMLInputElement).value;
        const comment = (document.getElementById('revComment') as HTMLTextAreaElement).value;
        const rating = Number((document.getElementById('revRating') as HTMLSelectElement).value);
        if (name && comment) {
          await push(ref(db, "reviews"), {
            userName: name,
            comment,
            rating,
            approved: true,
            createdAt: Date.now()
          });
          Swal.fire('Added', 'Review published', 'success');
        }
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Star className="text-amber-500" />
          Reviews Moderation
        </h2>
        <button onClick={addReview} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors">
          <Plus size={16} /> Add Review
        </button>
      </div>
      
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {reviews.length === 0 && <div className="text-center text-slate-400 py-10">No reviews submitted yet</div>}
        
        {reviews.map((r: any) => (
          <div key={r.key} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-slate-800">{r.userName || r.name || 'User'}</div>
                <div className="text-amber-400 text-sm tracking-widest mt-0.5">
                  {'★'.repeat(r.rating || 5)}{'☆'.repeat(5 - (r.rating || 5))}
                </div>
              </div>
              <span className={`px-2 py-1 rounded-md text-xs font-bold ${r.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {r.approved ? 'Approved' : 'Pending'}
              </span>
            </div>
            
            <p className="text-slate-600 text-sm mt-3 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              "{r.comment || r.message || ''}"
            </p>
            
            <div className="flex gap-2">
              <button onClick={() => toggleApproval(r.key, r.approved)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${r.approved ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'}`}>
                {r.approved ? <X size={16} /> : <Check size={16} />}
                {r.approved ? 'Unapprove' : 'Approve'}
              </button>
              <button onClick={() => deleteReview(r.key)} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors flex items-center justify-center">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
