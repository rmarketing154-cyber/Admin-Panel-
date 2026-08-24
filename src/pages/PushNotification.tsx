import React, { useState, useEffect } from 'react';
import { ref, update, get, set, onValue, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { MessageSquareText, Save, Clock, MousePointerClick, Eye, Trash2, Plus, UserCheck, Search, AlertCircle } from 'lucide-react';

export default function PushNotification() {
  const [activeTab, setActiveTab] = useState<'popup' | 'history'>('popup');
  
  // Target State
  const [target, setTarget] = useState<'all' | 'custom'>('all');
  const [uid, setUid] = useState('');

  // Global Popup State
  const [popup, setPopup] = useState({
    message: '',
    timer: 5,
    active: false,
    updatedAt: 0
  });

  // History & Viewer Details State
  const [popupViewers, setPopupViewers] = useState<{ uid: string; name?: string; email?: string }[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch current popup settings
    const fetchPopup = async () => {
      try {
        const snap = await get(ref(db, 'settings/global_popup'));
        if (snap.exists()) {
          setPopup(snap.val());
        }
      } catch (err) {
        console.error('Error fetching popup:', err);
      }
    };
    fetchPopup();

    // Fetch user profile map once
    const fetchUsers = async () => {
      try {
        const snap = await get(ref(db, 'users'));
        if (snap.exists()) {
          setUsersMap(snap.val());
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();

    // Listen to views and viewer UIDs
    const viewsRef = ref(db, 'settings/global_popup_views');
    const unsubscribeViews = onValue(viewsRef, snap => {
      try {
        if (snap.exists()) {
          const val = snap.val();
          const viewersList: { uid: string; name?: string; email?: string }[] = [];
          
          Object.keys(val || {}).forEach(userUid => {
            viewersList.push({
              uid: userUid,
              name: 'User',
              email: userUid
            });
          });

          setPopupViewers(viewersList.reverse());
        } else {
          setPopupViewers([]);
        }
      } catch (err) {
        console.error('Error parsing popup views:', err);
      }
    });

    return () => {
      unsubscribeViews();
    };
  }, []);

  const savePopupSettings = async () => {
    if (popup.active && !popup.message) {
      Swal.fire('Error', 'Popup message is required if active', 'warning');
      return;
    }

    if (target === 'custom' && !uid.trim()) {
      Swal.fire('Error', 'Target User UID is required for specific user popup', 'error');
      return;
    }

    try {
      const payload = {
        ...popup,
        updatedAt: Date.now()
      };

      if (target === 'all') {
        await update(ref(db, 'settings/global_popup'), payload);
        // Reset view tracking for newly deployed popup
        await remove(ref(db, 'settings/global_popup_views'));
        Swal.fire('Saved & Deployed', 'Global popup updated and deployed to all users successfully.', 'success');
      } else {
        await set(ref(db, `users/${uid.trim()}/custom_popup`), payload);
        Swal.fire('Saved & Deployed', `Popup deployed specifically to user UID: ${uid}`, 'success');
      }
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Failed to deploy popup', 'error');
    }
  };

  const deletePopup = async () => {
    const result = await Swal.fire({
      title: 'Delete Popup?',
      text: 'This will disable and delete the currently active popup message from all user screens.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Popup'
    });

    if (result.isConfirmed) {
      try {
        if (target === 'all') {
          await set(ref(db, 'settings/global_popup'), {
            active: false,
            message: '',
            timer: 5,
            updatedAt: Date.now()
          });
          await remove(ref(db, 'settings/global_popup_views'));
        } else if (uid.trim()) {
          await remove(ref(db, `users/${uid.trim()}/custom_popup`));
        }

        setPopup({ active: false, message: '', timer: 5, updatedAt: 0 });
        Swal.fire('Deleted', 'Popup message has been deleted and disabled.', 'success');
      } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Failed to delete popup', 'error');
      }
    }
  };

  const handleCreateNew = () => {
    setPopup({
      active: true,
      message: '',
      timer: 5,
      updatedAt: 0
    });
    Swal.fire('New Form Ready', 'Enter your new HTML code/message below and click Save & Deploy.', 'info');
  };

  const clearViewsList = async () => {
    const result = await Swal.fire({
      title: 'Clear View Stats?',
      text: 'This will reset the viewer list count to 0.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Clear Stats',
      confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      await remove(ref(db, 'settings/global_popup_views'));
      Swal.fire('Reset', 'Viewer statistics cleared.', 'success');
    }
  };

  const filteredViewers = popupViewers.filter(v => 
    v.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/50">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex border-b border-slate-100 bg-slate-50">
          <button 
            onClick={() => setActiveTab('popup')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${activeTab === 'popup' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <MessageSquareText size={18} /> Website Popup (HTML)
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${activeTab === 'history' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Clock size={18} /> Views & Seen Users ({popupViewers.length})
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {activeTab === 'history' ? (
            // VIEWS & SEEN USERS TAB (কোন কোন ইউজার দেখছে)
            <div className="space-y-6 animate-in fade-in">
              {/* Popup Stats */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-indigo-900">Total Unique Views</h3>
                    <p className="text-sm text-indigo-700 mt-1">Number of unique users who have opened/seen the current popup.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-black text-indigo-600 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-indigo-100 flex items-center gap-2">
                      <Eye size={22} className="opacity-50" />
                      {popupViewers.length} <span className="text-sm font-bold text-indigo-400">users</span>
                    </div>
                    {popupViewers.length > 0 && (
                      <button 
                        onClick={clearViewsList} 
                        title="Clear Viewer Stats"
                        className="bg-white hover:bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl transition-colors shadow-sm"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Viewers Search & List */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <UserCheck size={16} className="text-emerald-600" />
                    List of Users Who Viewed the Popup (যারা পপআপ দেখেছে)
                  </h3>

                  {/* Search input */}
                  {popupViewers.length > 0 && (
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search user UID or name..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  )}
                </div>

                {filteredViewers.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-500">No user views recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">When users open your website and see the popup, their UIDs will appear here in real-time.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredViewers.map((viewer, idx) => (
                      <div key={viewer.uid || idx} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xs shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 text-sm truncate">{viewer.name}</div>
                            <div className="text-xs font-mono text-slate-500 truncate">{viewer.email}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">UID: {viewer.uid}</div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
                          <Eye size={12} /> Seen
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // POPUP TAB
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex items-start gap-3">
                <MousePointerClick size={20} className="shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <strong>How it works:</strong> Paste your custom HTML code, styled alert box, or raw <code>index.html</code> below. The user website renders it inside a forced modal popup. Users must wait for the timer to finish before closing.
                </div>
              </div>

              {/* Status Header & Action Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">Current Status:</span>
                    {popup.active ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                        ● LIVE & ACTIVE
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-200 text-slate-600">
                        OFF / INACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {popup.updatedAt ? `Last deployed: ${new Date(popup.updatedAt).toLocaleString()}` : 'No active popup deployed'}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={handleCreateNew}
                    className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-100 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} /> Send New Message
                  </button>

                  <button 
                    onClick={deletePopup}
                    className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={14} /> Delete Popup
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Audience</label>
                <select 
                  value={target} 
                  onChange={e => setTarget(e.target.value as 'all' | 'custom')} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-semibold text-slate-800"
                >
                  <option value="all">📢 All Users (Global Popup)</option>
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
                    placeholder="Enter exact user UID string"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <div className="font-bold text-slate-800">Enable Popup</div>
                  <div className="text-xs text-slate-500">Turn on to show the forced popup to {target === 'all' ? 'all users' : 'the specific user'}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    checked={popup.active} 
                    onChange={e => setPopup({...popup, active: e.target.checked})} 
                    className="sr-only peer" 
                  />
                  <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><MousePointerClick size={14} /> Raw HTML Code / Popup Content</label>
                <textarea 
                  value={popup.message} 
                  onChange={e => setPopup({...popup, message: e.target.value})} 
                  rows={10} 
                  placeholder="Paste your raw index.html code or HTML text here... e.g. <div style='color:red;'><b>Important Update:</b>...</div>" 
                  className="w-full font-mono text-[13px] bg-slate-900 text-emerald-400 border border-slate-700 rounded-xl px-4 py-4 outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              {popup.message && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                  <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
                    <span>📱 Live Popup Preview (লাইভ প্রিভিউ)</span>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">HTML Rendered</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 min-h-[120px] max-h-[300px] overflow-auto shadow-inner">
                    <iframe 
                      title="popup-preview"
                      srcDoc={popup.message}
                      className="w-full min-h-[200px] border-0"
                      sandbox="allow-same-origin allow-scripts"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Clock size={14} /> Countdown Timer Before Closing (Seconds)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[5, 10, 15, 20, 30].map(secs => (
                    <button
                      key={secs}
                      onClick={() => setPopup({...popup, timer: secs})}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${popup.timer === secs ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {secs} Seconds
                    </button>
                  ))}
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      value={popup.timer}
                      onChange={e => setPopup({...popup, timer: Number(e.target.value)})}
                      placeholder="Custom"
                      className="w-full py-3 px-3 rounded-xl border border-slate-200 text-sm font-bold focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button onClick={savePopupSettings} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md text-sm">
                  <Save size={18} /> Save & Deploy / Update Popup
                </button>

                {popup.active && (
                  <button 
                    onClick={deletePopup} 
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-4 px-5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                    title="Delete Popup"
                  >
                    <Trash2 size={18} /> Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


