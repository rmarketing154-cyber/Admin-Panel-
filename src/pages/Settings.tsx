import React, { useState, useEffect } from 'react';
import { ref, update, set, push } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { Coins, Save, Plus, X, BellRing, Smartphone, Send, ShieldCheck } from 'lucide-react';

export default function Settings({ data }: any) {
  const s = data.settings || {};
  
  const [rates, setRates] = useState({
    userBonus: s.signup_bonus_user || 5,
    refBonus: s.signup_bonus_referrer || 5,
    commRate: s.commission_percent || 10,
    minWd: s.min_withdraw || 100,
    fee: s.withdraw_fee_percent || 6,
    mntMode: s.maintenance_mode || false,
    wdDisabled: s.withdraw_disabled || false
  });

  const [notifSettings, setNotifSettings] = useState({
    pushMaster: s.push_master ?? true,
    gmailNotif: s.notif_gmail ?? true,
    withdrawalNotif: s.notif_withdrawal ?? true,
    newUserNotif: s.notif_new_user ?? true,
    reportNotif: s.notif_report ?? true,
  });

  const [levels, setLevels] = useState<Record<string, any>>({});

  useEffect(() => {
    if (s.levels) {
      setLevels(s.levels);
    }
  }, [s.levels]);

  const saveSettings = async () => {
    await update(ref(db, "settings"), {
      signup_bonus_user: Number(rates.userBonus),
      signup_bonus_referrer: Number(rates.refBonus),
      commission_percent: Number(rates.commRate),
      min_withdraw: Number(rates.minWd),
      withdraw_fee_percent: Number(rates.fee),
      maintenance_mode: rates.mntMode,
      withdraw_disabled: rates.wdDisabled,
      push_master: notifSettings.pushMaster,
      notif_gmail: notifSettings.gmailNotif,
      notif_withdrawal: notifSettings.withdrawalNotif,
      notif_new_user: notifSettings.newUserNotif,
      notif_report: notifSettings.reportNotif,
      levels: levels
    });
    Swal.fire('Saved', 'All system & notification settings updated successfully!', 'success');
  };

  const testAdminPush = async (type: string, title: string, body: string) => {
    await push(ref(db, "admin_notifications"), {
      title,
      body,
      type,
      timestamp: Date.now()
    });
    Swal.fire('Dispatched', `Test ${type} push notification trigger created!`, 'success');
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

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 font-bold text-slate-800">
        <Coins className="text-amber-500" size={20} /> Financial Rates & Levels
      </div>
      
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Signup Bonus (User)</label>
            <input type="number" value={rates.userBonus} onChange={e=>setRates({...rates, userBonus: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Signup Bonus (Ref)</label>
            <input type="number" value={rates.refBonus} onChange={e=>setRates({...rates, refBonus: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Commission %</label>
            <input type="number" value={rates.commRate} onChange={e=>setRates({...rates, commRate: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Min Withdraw (৳)</label>
            <input type="number" value={rates.minWd} onChange={e=>setRates({...rates, minWd: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Withdraw Fee %</label>
            <input type="number" value={rates.fee} onChange={e=>setRates({...rates, fee: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 pt-2 border-t border-slate-100">
          <label className="flex items-center gap-4 cursor-pointer bg-slate-50 border border-slate-200 p-4 rounded-xl flex-1 hover:border-indigo-300 transition-colors">
            <div className="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                checked={rates.mntMode} 
                onChange={e => setRates({...rates, mntMode: e.target.checked})} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <div>
              <div className="font-bold text-slate-800">Maintenance Mode</div>
              <div className="text-xs text-slate-500 mt-0.5">Turn on to block user access temporarily</div>
            </div>
          </label>

          <label className="flex items-center gap-4 cursor-pointer bg-slate-50 border border-slate-200 p-4 rounded-xl flex-1 hover:border-indigo-300 transition-colors">
            <div className="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                checked={rates.wdDisabled} 
                onChange={e => setRates({...rates, wdDisabled: e.target.checked})} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </div>
            <div>
              <div className="font-bold text-slate-800">Disable Withdrawals</div>
              <div className="text-xs text-slate-500 mt-0.5">Pause all new cashout requests</div>
            </div>
          </label>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Level Configurations</h3>
            <button onClick={addLevel} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors">
              <Plus size={14} /> Add Level
            </button>
          </div>
          <div className="space-y-3">
            {Object.keys(levels).sort((a,b)=>Number(a)-Number(b)).map(k => {
              const l = levels[k];
              return (
                <div key={k} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center relative">
                  <div className="absolute top-2 right-2 md:static md:order-last">
                    <button onClick={()=>deleteLevel(k)} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><X size={18}/></button>
                  </div>
                  <div className="w-full md:w-auto font-black text-slate-400 text-lg mr-4">LVL {k}</div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">New Rate (৳)</label>
                      <input type="number" value={l.new_rate} onChange={e=>updateLevel(k, 'new_rate', e.target.value)} className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Old Rate (৳)</label>
                      <input type="number" value={l.old_rate} onChange={e=>updateLevel(k, 'old_rate', e.target.value)} className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Req Mails</label>
                      <input type="number" value={l.req} onChange={e=>updateLevel(k, 'req', e.target.value)} className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 text-sm font-bold" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Admin Mobile & Push Notification Settings */}
        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="text-indigo-600" size={20} />
            <h3 className="font-bold text-slate-800 text-base">Android Admin App &amp; Push Notifications</h3>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div>
                <div className="font-bold text-slate-800 text-sm">Master Push Notification</div>
                <div className="text-xs text-slate-500">Enable or disable all real-time FCM admin notifications</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={notifSettings.pushMaster} 
                  onChange={e => setNotifSettings({...notifSettings, pushMaster: e.target.checked})} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 text-xs">📧 Gmail Submissions</div>
                  <div className="text-[11px] text-slate-500">Alert on new inbox submission</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifSettings.gmailNotif} 
                  onChange={e => setNotifSettings({...notifSettings, gmailNotif: e.target.checked})} 
                  disabled={!notifSettings.pushMaster}
                  className="w-4 h-4 text-indigo-600 rounded" 
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 text-xs">💰 Withdrawal Requests</div>
                  <div className="text-[11px] text-slate-500">Alert on new cashout request</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifSettings.withdrawalNotif} 
                  onChange={e => setNotifSettings({...notifSettings, withdrawalNotif: e.target.checked})} 
                  disabled={!notifSettings.pushMaster}
                  className="w-4 h-4 text-indigo-600 rounded" 
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 text-xs">👤 New User Registration</div>
                  <div className="text-[11px] text-slate-500">Alert when new user signs up</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifSettings.newUserNotif} 
                  onChange={e => setNotifSettings({...notifSettings, newUserNotif: e.target.checked})} 
                  disabled={!notifSettings.pushMaster}
                  className="w-4 h-4 text-indigo-600 rounded" 
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 text-xs">⚠️ Reports &amp; Disputes</div>
                  <div className="text-[11px] text-slate-500">Alert on user report submission</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifSettings.reportNotif} 
                  onChange={e => setNotifSettings({...notifSettings, reportNotif: e.target.checked})} 
                  disabled={!notifSettings.pushMaster}
                  className="w-4 h-4 text-indigo-600 rounded" 
                />
              </label>
            </div>

            {/* Test Triggers */}
            <div className="pt-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Test Notification Dispatches</div>
              <div className="flex flex-wrap gap-2">
                <button 
                  type="button"
                  onClick={() => testAdminPush('gmail', '📧 নতুন Gmail এসেছে', 'নতুন Gmail এসেছে। Admin Panel থেকে ইনবক্স চেক করুন।')} 
                  className="px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-xs font-bold transition-colors"
                >
                  Test Gmail Alert
                </button>
                <button 
                  type="button"
                  onClick={() => testAdminPush('withdrawal', '💰 নতুন উত্তোলন রিকোয়েস্ট', 'একজন ইউজার নতুন উত্তোলন রিকোয়েস্ট করেছে।')} 
                  className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors"
                >
                  Test Withdrawal Alert
                </button>
                <button 
                  type="button"
                  onClick={() => testAdminPush('user', '👤 নতুন সদস্য রেজিস্ট্রেশন', 'নতুন একজন সদস্য রেজিস্ট্রেশন করেছে।')} 
                  className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors"
                >
                  Test User Alert
                </button>
                <button 
                  type="button"
                  onClick={() => testAdminPush('report', '⚠️ নতুন রিপোর্ট', 'একজন ইউজার নতুন রিপোর্ট জমা দিয়েছে।')} 
                  className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-xs font-bold transition-colors"
                >
                  Test Report Alert
                </button>
              </div>
            </div>
          </div>
        </div>

        <button onClick={saveSettings} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
          <Save size={18} /> Save System &amp; Notification Settings
        </button>
      </div>
    </div>
  );
}
