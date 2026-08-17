import React, { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { BellRing, Send } from 'lucide-react';

export default function PushNotification() {
  const [target, setTarget] = useState('all');
  const [uid, setUid] = useState('');
  const [notif, setNotif] = useState({ title: '', message: '', type: 'info' });

  const sendPushNotif = async () => {
    if (!notif.title || !notif.message) {
      Swal.fire('Error', 'Title and message are required', 'warning');
      return;
    }

    if (target === 'custom' && !uid.trim()) {
      Swal.fire('Error', 'Target User UID is required', 'error');
      return;
    }

    if (target === 'all') {
      await push(ref(db, "admin_notifications"), { 
        title: notif.title, 
        message: notif.message, 
        type: notif.type, 
        timestamp: Date.now() 
      });
    } else {
      await push(ref(db, `users/${uid.trim()}/notifications`), { 
        title: notif.title, 
        message: notif.message, 
        type: notif.type, 
        timestamp: Date.now() 
      });
    }
    
    setNotif({ title: '', message: '', type: 'info' });
    setUid('');
    Swal.fire('Dispatched', 'Push notification sent successfully', 'success');
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 font-bold text-slate-800">
        <BellRing className="text-emerald-500" size={20} /> Dispatch Push Notification
      </div>
      
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Audience</label>
          <select 
            value={target} 
            onChange={e => setTarget(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-semibold text-slate-800"
          >
            <option value="all">📢 All Users (Global Notice)</option>
            <option value="custom">👤 Specific User UID</option>
          </select>
        </div>

        {target === 'custom' && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Target User UID</label>
            <input 
              type="text" 
              value={uid} 
              onChange={e => setUid(e.target.value)} 
              placeholder="Enter exactly user UID string"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Notification Title</label>
          <input 
            type="text" 
            value={notif.title} 
            onChange={e => setNotif({...notif, title: e.target.value})} 
            placeholder="e.g. উইথড্র সফল হয়েছে / আপডেট বিজ্ঞপ্তি" 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Message Content</label>
          <textarea 
            value={notif.message} 
            onChange={e => setNotif({...notif, message: e.target.value})} 
            rows={4} 
            placeholder="Type your notification message here..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
          ></textarea>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Alert Type</label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {[
              { id: 'info', label: 'Info', color: 'bg-blue-100 text-blue-700 border-blue-200' },
              { id: 'success', label: 'Success', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
              { id: 'warning', label: 'Warning', color: 'bg-amber-100 text-amber-700 border-amber-200' },
              { id: 'danger', label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
            ].map(t => (
              <label key={t.id} className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${notif.type === t.id ? t.color + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                <input 
                  type="radio" 
                  name="type" 
                  value={t.id} 
                  checked={notif.type === t.id} 
                  onChange={() => setNotif({...notif, type: t.id})} 
                  className="sr-only" 
                />
                <span className="font-bold text-sm">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button onClick={sendPushNotif} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm mt-4">
          <Send size={18} /> Send Push Notification
        </button>
      </div>
    </div>
  );
}
