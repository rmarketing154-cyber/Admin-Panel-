import React, { useState, useMemo } from 'react';
import { ref, update, remove, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { Star, Plus, Check, X, Trash2, Search, User, Calendar, MessageSquare, ThumbsUp } from 'lucide-react';

export default function Reviews({ data }: any) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

  const usersMap = useMemo(() => {
    const map = new Map<string, any>();
    (data.users || []).forEach((u: any) => {
      map.set(u.uid, u);
      if (u.username) map.set(u.username.toLowerCase(), u);
    });
    return map;
  }, [data.users]);

  const reviews = useMemo(() => {
    let list = (data.reviews || []).map((r: any) => {
      const matchedUser = usersMap.get(r.userId) || usersMap.get((r.userName || '').toLowerCase()) || {};
      return {
        ...r,
        matchedUser
      };
    }).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    if (filter === 'approved') list = list.filter((r: any) => r.approved);
    if (filter === 'pending') list = list.filter((r: any) => !r.approved);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((r: any) => 
        (r.userName || r.name || '').toLowerCase().includes(q) ||
        (r.comment || r.message || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [data.reviews, usersMap, filter, search]);

  const toggleApproval = async (key: string, curr: boolean) => {
    // Write to all possible review paths to guarantee compatibility with user apps
    const paths = [
      `reviews/${key}`,
      `review/${key}`,
      `testimonials/${key}`,
      `feedback/${key}`,
      `user_reviews/${key}`,
      `app_reviews/${key}`,
      `settings/reviews/${key}`
    ];
    
    try {
      await Promise.all(paths.map(path => update(ref(db, path), { approved: !curr })));
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: !curr ? 'Review Approved Live' : 'Review set to Pending',
        showConfirmButton: false,
        timer: 1500
      });
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Failed to update review status', 'error');
    }
  };

  const deleteReview = async (key: string) => {
    const confirm = await Swal.fire({
      title: 'Delete Review?',
      text: 'Are you sure you want to permanently delete this testimonial across all app pathways?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete Everywhere',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      const paths = [
        `reviews/${key}`,
        `review/${key}`,
        `testimonials/${key}`,
        `feedback/${key}`,
        `user_reviews/${key}`,
        `app_reviews/${key}`,
        `settings/reviews/${key}`
      ];
      try {
        await Promise.all(paths.map(path => remove(ref(db, path))));
        Swal.fire('Deleted', 'Review has been removed from all channels', 'success');
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Failed to delete review', 'error');
      }
    }
  };

  const addReview = () => {
    Swal.fire({
      title: 'Add User Testimonial',
      html: `
        <div class="space-y-3 text-left">
          <div>
            <label class="text-xs font-bold text-slate-600 block mb-1">User Full Name / Alias:</label>
            <input type="text" id="revName" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="e.g. Tanvir Hasan">
          </div>
          <div>
            <label class="text-xs font-bold text-slate-600 block mb-1">Review Feedback Text:</label>
            <textarea id="revComment" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm h-24" placeholder="Feedback message..."></textarea>
          </div>
          <div>
            <label class="text-xs font-bold text-slate-600 block mb-1">Rating Stars:</label>
            <select id="revRating" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-bold">
              <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
              <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
              <option value="3">⭐⭐⭐ (3 Stars)</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Publish Testimonial',
      confirmButtonColor: '#4f46e5'
    }).then(async r => {
      if (r.isConfirmed) {
        const name = (document.getElementById('revName') as HTMLInputElement).value;
        const comment = (document.getElementById('revComment') as HTMLTextAreaElement).value;
        const rating = Number((document.getElementById('revRating') as HTMLSelectElement).value);
        if (name && comment) {
          const revObj = {
            userName: name,
            comment,
            rating,
            approved: true,
            createdAt: Date.now()
          };
          
          try {
            // Get a unique key using push first
            const newRef = push(ref(db, "reviews"));
            const newKey = newRef.key;
            if (newKey) {
              const paths = [
                `reviews/${newKey}`,
                `review/${newKey}`,
                `testimonials/${newKey}`,
                `feedback/${newKey}`,
                `user_reviews/${newKey}`,
                `app_reviews/${newKey}`,
                `settings/reviews/${newKey}`
              ];
              await Promise.all(paths.map(path => set(ref(db, path), revObj)));
              Swal.fire('Added', 'Review published live across all channels', 'success');
            }
          } catch (err: any) {
            Swal.fire('Error', err.message || 'Failed to add review', 'error');
          }
        }
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h2 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Star className="text-amber-500 fill-amber-500" />
            User Reviews & Testimonials Intelligence
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit user satisfaction, moderate submitted feedback, and view reviewer profiles
          </p>
        </div>

        <button 
          onClick={addReview} 
          className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={14} /> Add Testimonial
        </button>
      </div>

      {/* Filter and Search */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-white space-y-3 shrink-0">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by reviewer name or comment keyword..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 text-sm font-medium"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Reviews ({(data.reviews || []).length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'approved' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Approved ({(data.reviews || []).filter((r: any) => r.approved).length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Pending ({(data.reviews || []).filter((r: any) => !r.approved).length})
          </button>
        </div>
      </div>
      
      {/* Reviews List */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40">
        {reviews.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
            <MessageSquare size={36} className="mx-auto text-slate-300" />
            <div className="font-bold text-slate-700 text-base">No reviews found</div>
            <div className="text-xs text-slate-400">No user testimonials match your search or filter.</div>
          </div>
        )}
        
        {reviews.map((r: any) => (
          <div key={r.key} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-indigo-200 transition-all">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-black text-base flex items-center justify-center shrink-0">
                  {r.userName?.charAt(0)?.toUpperCase() || 'U'}
                </div>

                <div>
                  <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                    {r.userName || r.name || 'User'}
                    {r.matchedUser?.uid && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        Verified Member (Bal: ৳{(r.matchedUser.balance || 0).toFixed(0)})
                      </span>
                    )}
                  </div>
                  <div className="text-amber-500 text-xs tracking-wider flex items-center gap-1 font-bold">
                    {'★'.repeat(r.rating || 5)}{'☆'.repeat(5 - (r.rating || 5))}
                    <span className="text-slate-400 font-normal ml-2">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                r.approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {r.approved ? 'Publicly Visible' : 'Pending Approval'}
              </span>
            </div>
            
            <p className="text-slate-700 text-sm bg-slate-50/70 p-4 rounded-xl border border-slate-200 leading-relaxed font-medium">
              "{r.comment || r.message || ''}"
            </p>
            
            <div className="flex gap-2 pt-1">
              <button 
                onClick={() => toggleApproval(r.key, r.approved)} 
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  r.approved 
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                }`}
              >
                {r.approved ? <X size={14} /> : <Check size={14} />}
                {r.approved ? 'Hide / Unapprove' : 'Approve & Display in App'}
              </button>

              <button 
                onClick={() => deleteReview(r.key)} 
                className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center"
                title="Delete Testimonial"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
