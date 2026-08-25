import React, { useState, useEffect } from 'react';
import { ref, update } from 'firebase/database';
import { db, getFirebaseFunctions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import Swal from 'sweetalert2';
import { Coins, Save, Plus, X, Layers, Percent, DollarSign, Award, CheckCircle2, Bell, Send, ShieldCheck, Camera } from 'lucide-react';
import FaceLockModal from '../components/FaceLockModal';

export default function Settings({ data }: any) {
  if (!data) return <div className="p-8 text-center text-slate-500 font-bold">Loading Settings...</div>;
  const s = data.settings || {};
  
  const [activeTab, setActiveTab] = useState<'financial' | 'levels' | 'notifications' | 'security'>('financial');
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [hasFaceId, setHasFaceId] = useState(false);

  useEffect(() => {
    setHasFaceId(Boolean(localStorage.getItem('admin_face_id')));
  }, []);

  const [rates, setRates] = useState({
    newRate: s.newRate ?? s.new_rate ?? 10.5,
    oldRate: s.oldRate ?? s.old_rate ?? 7.5,
    userBonus: s.signup_bonus_user ?? s.userBonus ?? s.user_bonus ?? 2,
    refBonus: s.signup_bonus_referrer ?? s.refBonus ?? s.ref_bonus ?? 1,
    commRate: s.commissionPercent ?? s.commission_percent ?? s.commRate ?? s.comm_rate ?? 5,
    minWd: s.minWithdraw ?? s.min_withdraw ?? s.minWd ?? s.min_wd ?? 50,
    fee: s.withdraw_fee_percent ?? s.fee ?? 2,
  });

  const [levels, setLevels] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (s) {
      setRates({
        newRate: s.newRate ?? s.new_rate ?? 10.5,
        oldRate: s.oldRate ?? s.old_rate ?? 7.5,
        userBonus: s.signup_bonus_user ?? s.userBonus ?? s.user_bonus ?? 2,
        refBonus: s.signup_bonus_referrer ?? s.refBonus ?? s.ref_bonus ?? 1,
        commRate: s.commissionPercent ?? s.commission_percent ?? s.commRate ?? s.comm_rate ?? 5,
        minWd: s.minWithdraw ?? s.min_withdraw ?? s.minWd ?? s.min_wd ?? 50,
        fee: s.withdraw_fee_percent ?? s.fee ?? 2,
      });
      if (s.levels) {
        setLevels(s.levels);
      }
    }
  }, [s]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await update(ref(db, "settings"), {
        newRate: Number(rates.newRate),
        new_rate: Number(rates.newRate),
        oldRate: Number(rates.oldRate),
        old_rate: Number(rates.oldRate),
        commissionPercent: Number(rates.commRate),
        commission_percent: Number(rates.commRate),
        minWithdraw: Number(rates.minWd),
        min_withdraw: Number(rates.minWd),
        signup_bonus_user: Number(rates.userBonus),
        signup_bonus_referrer: Number(rates.refBonus),
        withdraw_fee_percent: Number(rates.fee),
        levels: levels
      });
      Swal.fire('Saved!', 'Financial rates & settings updated successfully in real-time.', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addLevel = () => {
    const next = Object.keys(levels).length + 1;
    setLevels(prev => ({
      ...prev,
      [next]: { new_rate: 10, old_rate: 8, req: next * 50 }
    }));
  };

  const deleteLevel = (k: string) => {
    const newL = { ...levels };
    delete newL[k];
    setLevels(newL);
  };

  const updateLevel = (k: string, field: string, val: string) => {
    setLevels(prev => ({
      ...prev,
      [k]: { ...prev[k], [field]: Number(val) }
    }));
  };

  const sendTestReminder = async () => {
    try {
      setSaving(true);
      // Trigger the local notification reminder function attached to window
      if ((window as any).triggerGmailReminder) {
        (window as any).triggerGmailReminder();
      } else {
        // Fallback notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        Swal.fire({
          title: "⚠️ রিমাইন্ডার: জিমেইল চেক করুন",
          text: "ডিয়ার এডমিন, অনুগ্রহ করে আপনার জিমেইল ইনবক্স চেক করুন।",
          icon: 'info',
          timer: 15000,
          timerProgressBar: true
        });
      }
      Swal.fire('Success', 'Test push notification triggered successfully on your device!', 'success');
    } catch (e: any) {
      console.error(e);
      Swal.fire('Error', 'Failed to send test push: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Coins size={14} /> Platform Economics & Security
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Financial Rates & Security</h1>
            <p className="text-indigo-200 text-xs sm:text-sm max-w-xl">
              Configure signup bonuses, referral commission percentages, withdrawal thresholds, and biometric Face Lock security.
            </p>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all shrink-0 disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('financial')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'financial'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Percent size={16} /> Financial & Bonus Rates
        </button>
        <button
          onClick={() => setActiveTab('levels')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'levels'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers size={16} /> User Level Tiers ({Object.keys(levels).length})
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'notifications'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Bell size={16} /> Notifications
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'security'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck size={16} /> Face Lock & Security
        </button>
      </div>

      {/* TAB 1: FINANCIAL & BONUS RATES */}
      {activeTab === 'financial' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          
          {/* Group 2: Affiliate & Bonuses */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Award size={16} />
              </div>
              <div>
                <h3 className="font-black text-slate-800">Affiliate & Bonuses</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signup and referral rewards</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* User Bonus */}
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Signup Bonus</label>
                 <div className="relative flex items-center">
                   <div className="absolute left-4 text-slate-400 font-bold">৳</div>
                   <input type="number" value={rates.userBonus} onChange={e => setRates({...rates, userBonus: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black text-lg rounded-xl pl-8 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                 </div>
              </div>
              {/* Referrer Bonus */}
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referrer Bonus</label>
                 <div className="relative flex items-center">
                   <div className="absolute left-4 text-slate-400 font-bold">৳</div>
                   <input type="number" value={rates.refBonus} onChange={e => setRates({...rates, refBonus: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black text-lg rounded-xl pl-8 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                 </div>
              </div>
              {/* Commission */}
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referral Commission</label>
                 <div className="relative flex items-center">
                   <input type="number" value={rates.commRate} onChange={e => setRates({...rates, commRate: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black text-lg rounded-xl pl-4 pr-8 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                   <div className="absolute right-4 text-slate-400 font-bold">%</div>
                 </div>
              </div>
            </div>
          </div>

          {/* Group 3: Withdrawals */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <DollarSign size={16} />
              </div>
              <div>
                <h3 className="font-black text-slate-800">Withdrawal Rules</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cashout constraints and fees</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Min Withdraw */}
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Minimum Withdrawal</label>
                 <div className="relative flex items-center">
                   <div className="absolute left-4 text-slate-400 font-bold">৳</div>
                   <input type="number" value={rates.minWd} onChange={e => setRates({...rates, minWd: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black text-lg rounded-xl pl-8 pr-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                 </div>
              </div>
              {/* Withdraw Fee */}
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Withdrawal Fee</label>
                 <div className="relative flex items-center">
                   <input type="number" value={rates.fee} onChange={e => setRates({...rates, fee: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black text-lg rounded-xl pl-4 pr-8 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                   <div className="absolute right-4 text-slate-400 font-bold">%</div>
                 </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: LEVEL CONFIGURATIONS */}
      {activeTab === 'levels' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800">Progressive User Tiers</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configure task rates based on completed submissions</p>
              </div>
            </div>
            <button 
              onClick={addLevel} 
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
            >
              <Plus size={16} /> Add New Level
            </button>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            {Object.keys(levels).length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Layers size={32} />
                </div>
                <div className="font-black text-slate-700 text-lg">No Tiers Configured</div>
                <div className="text-sm text-slate-500 mt-1">Users will always receive the base task rates.</div>
                <button onClick={addLevel} className="mt-6 px-6 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-full hover:bg-indigo-100 transition-colors">Setup First Level</button>
              </div>
            ) : (
              Object.keys(levels).sort((a,b)=>Number(a)-Number(b)).map(k => {
                const l = levels[k];
                return (
                  <div key={k} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col xl:flex-row gap-6 xl:items-center relative hover:border-indigo-300 hover:shadow-md transition-all group">
                    <div className="absolute top-4 right-4 xl:static xl:order-last">
                      <button onClick={()=>deleteLevel(k)} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all"><X size={18}/></button>
                    </div>
                    
                    <div className="flex items-center gap-4 xl:w-48">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex flex-col items-center justify-center border border-indigo-100 text-indigo-600 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Level</span>
                        <span className="text-xl font-black">{k}</span>
                      </div>
                      <div className="hidden xl:block w-px h-10 bg-slate-200"></div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">New Task Rate</label>
                        <div className="relative flex items-center">
                          <div className="absolute left-3 text-slate-400 font-bold">৳</div>
                          <input type="number" value={l.new_rate} onChange={e=>updateLevel(k, 'new_rate', e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl pl-7 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Old Task Rate</label>
                        <div className="relative flex items-center">
                          <div className="absolute left-3 text-slate-400 font-bold">৳</div>
                          <input type="number" value={l.old_rate} onChange={e=>updateLevel(k, 'old_rate', e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl pl-7 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Requirement (Tasks)</label>
                        <div className="relative flex items-center">
                          <div className="absolute left-3 text-slate-400 font-bold"><CheckCircle2 size={14}/></div>
                          <input type="number" value={l.req} onChange={e=>updateLevel(k, 'req', e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS CONFIG */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Bell size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Admin Reminders (অটোমেটিক রিমাইন্ডার)</h3>
                <p className="text-sm text-slate-500">এখন থেকে প্রতি ৩ ঘন্টা পর পর পেন্ডিং জিমেইল রিভিউ করার জন্য আপনার ফোনে অটোমেটিক পুশ নোটিফিকেশন আসবে।</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={14} />
                </div>
                <div className="text-sm text-slate-700">
                  <span className="font-bold">Active Schedule:</span> Every 3 hours (00:00, 03:00, 06:00, etc.)
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={14} />
                </div>
                <div className="text-sm text-slate-700">
                  <span className="font-bold">Content:</span> Randomly selected beautiful Bengali messages.
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={sendTestReminder}
                disabled={saving}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Sending...' : <><Send size={18} /> Send Test Push Reminder Now</>}
              </button>
              <p className="text-[11px] text-slate-400 mt-3 text-center sm:text-left">Click to verify if your device is successfully receiving push notifications from the server.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FACE LOCK & SECURITY */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Biometric Face Lock (ফেস লক সিকিউরিটি)</h3>
                  <p className="text-sm text-slate-500">Protect your admin panel with cutting-edge camera facial recognition.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${hasFaceId ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {hasFaceId ? 'Face ID Configured' : 'Not Configured'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={14} />
                </div>
                <div className="text-sm text-slate-700">
                  <span className="font-bold">Secure Biometrics:</span> Your face signature is securely encrypted and stored locally on your trusted device.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={14} />
                </div>
                <div className="text-sm text-slate-700">
                  <span className="font-bold">Instant Login:</span> Skip typing passwords by scanning your face during login.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={() => setFaceModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
              >
                <Camera size={18} /> {hasFaceId ? 'Re-Register / Update Face ID' : 'Register Admin Face ID Now'}
              </button>
              {hasFaceId && (
                <button
                  onClick={() => {
                    localStorage.removeItem('admin_face_id');
                    setHasFaceId(false);
                    Swal.fire('Removed', 'Face ID configuration cleared.', 'info');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 px-6 rounded-xl transition-all"
                >
                  Clear Face ID Data
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <FaceLockModal
        isOpen={faceModalOpen}
        onClose={() => setFaceModalOpen(false)}
        onSuccess={() => setHasFaceId(true)}
        mode="register"
      />
    </div>
  );
}

