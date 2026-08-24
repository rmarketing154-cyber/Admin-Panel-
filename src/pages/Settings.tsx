import React, { useState, useEffect } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { Coins, Save, Plus, X, Layers, Percent, DollarSign, Award, CheckCircle2 } from 'lucide-react';

export default function Settings({ data }: any) {
  const s = data.settings || {};
  
  const [activeTab, setActiveTab] = useState<'financial' | 'levels'>('financial');

  const [rates, setRates] = useState({
    newRate: s.newRate ?? s.new_rate ?? 10.5,
    oldRate: s.oldRate ?? s.old_rate ?? 13.0,
    userBonus: s.signup_bonus_user ?? 5,
    refBonus: s.signup_bonus_referrer ?? 5,
    commRate: s.commissionPercent ?? s.commission_percent ?? 10,
    minWd: s.minWithdraw ?? s.min_withdraw ?? 50,
    fee: s.withdraw_fee_percent ?? 6,
  });

  const [levels, setLevels] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (s.signup_bonus_user !== undefined || s.newRate !== undefined || s.new_rate !== undefined) {
      setRates({
        newRate: s.newRate ?? s.new_rate ?? 10.5,
        oldRate: s.oldRate ?? s.old_rate ?? 13.0,
        userBonus: s.signup_bonus_user ?? 5,
        refBonus: s.signup_bonus_referrer ?? 5,
        commRate: s.commissionPercent ?? s.commission_percent ?? 10,
        minWd: s.minWithdraw ?? s.min_withdraw ?? 50,
        fee: s.withdraw_fee_percent ?? 6,
      });
    }
    if (s.levels) {
      setLevels(s.levels);
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

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Coins size={14} /> Platform Economics & Reward Structures
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Financial Rates & Tiers</h1>
            <p className="text-indigo-200 text-xs sm:text-sm max-w-xl">
              Configure signup bonuses, referral commission percentages, withdrawal thresholds, fees, and progressive user tier rates.
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
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('financial')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'financial'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Percent size={16} /> Financial & Bonus Rates
        </button>
        <button
          onClick={() => setActiveTab('levels')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'levels'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers size={16} /> User Level Tiers ({Object.keys(levels).length})
        </button>
      </div>

      {/* TAB 1: FINANCIAL & BONUS RATES */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* New Gmail Rate */}
            <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-sm space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">New Gmail Rate</span>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Coins size={20} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-400">৳</span>
                  <input 
                    type="number" 
                    step="0.1"
                    value={rates.newRate} 
                    onChange={e => setRates({...rates, newRate: Number(e.target.value)})}
                    className="w-full text-2xl font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-indigo-500 font-mono" 
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Default reward per verified fresh/new Gmail submission (settings/newRate).</p>
              </div>
            </div>

            {/* Old Gmail Rate */}
            <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-600 uppercase tracking-wider">Old Gmail Rate</span>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Coins size={20} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-400">৳</span>
                  <input 
                    type="number" 
                    step="0.1"
                    value={rates.oldRate} 
                    onChange={e => setRates({...rates, oldRate: Number(e.target.value)})}
                    className="w-full text-2xl font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-purple-500 font-mono" 
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Reward per verified aged/old Gmail submission (settings/oldRate).</p>
              </div>
            </div>

            {/* Signup Bonus (User) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">User Signup Bonus</span>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Award size={20} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-400">৳</span>
                  <input 
                    type="number" 
                    value={rates.userBonus} 
                    onChange={e => setRates({...rates, userBonus: Number(e.target.value)})}
                    className="w-full text-2xl font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-indigo-500" 
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Bonus amount credited instantly when a new user registers.</p>
              </div>
            </div>

            {/* Signup Bonus (Referrer) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Referrer Signup Bonus</span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award size={20} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-400">৳</span>
                  <input 
                    type="number" 
                    value={rates.refBonus} 
                    onChange={e => setRates({...rates, refBonus: Number(e.target.value)})}
                    className="w-full text-2xl font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-indigo-500" 
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Bonus credited to the referrer when someone uses their link.</p>
              </div>
            </div>

            {/* Commission Percent */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Referral Commission</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Percent size={20} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={rates.commRate} 
                    onChange={e => setRates({...rates, commRate: Number(e.target.value)})}
                    className="w-full text-2xl font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-indigo-500" 
                  />
                  <span className="text-xl font-bold text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Commission percentage earned from referred users' earnings.</p>
              </div>
            </div>

            {/* Minimum Withdraw */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Minimum Withdrawal</span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-400">৳</span>
                  <input 
                    type="number" 
                    value={rates.minWd} 
                    onChange={e => setRates({...rates, minWd: Number(e.target.value)})}
                    className="w-full text-2xl font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-indigo-500" 
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Minimum wallet balance required to request cashout.</p>
              </div>
            </div>

            {/* Withdraw Fee */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Withdrawal Fee</span>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Percent size={20} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={rates.fee} 
                    onChange={e => setRates({...rates, fee: Number(e.target.value)})}
                    className="w-full text-2xl font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-indigo-500" 
                  />
                  <span className="text-xl font-bold text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Deduction percentage applied on withdrawal requests.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LEVEL CONFIGURATIONS */}
      {activeTab === 'levels' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Progressive User Level Tiers</h3>
              <p className="text-xs text-slate-400 mt-0.5">Configure task rates and requirement thresholds for each user level.</p>
            </div>
            <button 
              onClick={addLevel} 
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors shrink-0"
            >
              <Plus size={16} /> Add New Level
            </button>
          </div>

          <div className="space-y-3">
            {Object.keys(levels).length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Layers size={36} className="mx-auto text-slate-300 mb-2" />
                <div className="font-bold text-slate-600">No level tiers configured yet</div>
                <div className="text-xs text-slate-400 mt-1">Click "Add New Level" to set up progressive task rates.</div>
              </div>
            ) : (
              Object.keys(levels).sort((a,b)=>Number(a)-Number(b)).map(k => {
                const l = levels[k];
                return (
                  <div key={k} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center relative hover:border-indigo-200 transition-all">
                    <div className="absolute top-3 right-3 md:static md:order-last">
                      <button onClick={()=>deleteLevel(k)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><X size={18}/></button>
                    </div>
                    <div className="w-full md:w-28 font-black text-indigo-600 text-base flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-xs">LVL</span>
                      {k}
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">New Task Rate (৳)</label>
                        <input type="number" value={l.new_rate} onChange={e=>updateLevel(k, 'new_rate', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 text-xs font-bold text-slate-800" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Old Task Rate (৳)</label>
                        <input type="number" value={l.old_rate} onChange={e=>updateLevel(k, 'old_rate', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 text-xs font-bold text-slate-800" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Requirement (Completed Tasks)</label>
                        <input type="number" value={l.req} onChange={e=>updateLevel(k, 'req', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 text-xs font-bold text-slate-800" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
