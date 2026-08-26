import React, { useState, useEffect, useMemo } from 'react';
import { ref, set } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { 
  Trophy, 
  Plus, 
  Trash2, 
  Save, 
  Sparkles, 
  TrendingUp, 
  Coins, 
  Mail, 
  Users, 
  RefreshCw,
  Award,
  Crown,
  Network
} from 'lucide-react';

export default function TopSellers({ data }: any) {
  // Leaderboard Type State: 'sellers' or 'referrals'
  const [boardType, setBoardType] = useState<'sellers' | 'referrals'>('sellers');
  const [activeTab, setActiveTab] = useState<'config' | 'live_metrics'>('config');

  // Config States
  const [sellers, setSellers] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  // Sync with Firebase Database Realtime State
  useEffect(() => {
    if (data.topSellers) {
      setSellers(data.topSellers);
    }
    if (data.topReferrals) {
      setReferrals(data.topReferrals);
    }
  }, [data.topSellers, data.topReferrals]);

  const userOptions = useMemo(() => {
    return (data.users || []).map((u: any) => ({
      uid: u.uid,
      username: u.username || 'No Username',
      email: u.email || 'No Email'
    })).sort((a: any, b: any) => a.username.localeCompare(b.username));
  }, [data.users]);

  // ==================== TOP SELLERS CALCULATION ====================
  const liveTopEarners = useMemo(() => {
    const allUsers = data.users || [];
    const subs = data.submissions || [];
    const withs = data.withdraws || [];

    const userStats = allUsers.map((u: any) => {
      const userSubs = subs.filter((s: any) => s.userId === u.uid && s.status === 'approved');
      const approvedEmails = userSubs.reduce((sum: number, s: any) => sum + Number(s.approvedCount || s.gmails?.length || 0), 0) + Number(u.manual_approved_count || 0);
      const userWiths = withs.filter((w: any) => w.userId === u.uid && w.status === 'approved');
      const totalWithdrawn = userWiths.reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);
      const lifetimeEarned = Number(u.balance || 0) + totalWithdrawn;

      return {
        uid: u.uid,
        name: u.username || 'User',
        email: u.email || 'N/A',
        approvedEmails,
        balance: u.balance || 0,
        totalWithdrawn,
        lifetimeEarned,
        level: u.level || 1,
        earnedFormatted: `৳${lifetimeEarned.toFixed(0)} (${approvedEmails} Mails)`
      };
    });

    return [...userStats].sort((a, b) => b.lifetimeEarned - a.lifetimeEarned).slice(0, 10);
  }, [data.users, data.submissions, data.withdraws]);

  // ==================== TOP REFERRERS CALCULATION ====================
  const liveTopReferrers = useMemo(() => {
    const allUsers = data.users || [];
    const codeLookup = new Map(allUsers.filter((u: any) => u.referralCode).map((u: any) => [u.referralCode, u.uid]));
    const referredList: Record<string, any[]> = {};

    allUsers.forEach((u: any) => {
      if (u.referredBy) {
        let refUid = u.referredBy;
        if (codeLookup.has(u.referredBy)) refUid = codeLookup.get(u.referredBy);
        if (!referredList[refUid]) referredList[refUid] = [];
        referredList[refUid].push(u);
      }
    });

    const referrers = allUsers
      .filter((u: any) => referredList[u.uid] && referredList[u.uid].length > 0)
      .map((u: any) => {
        const earnings = Number(u.referralEarnings || 0);
        const refCount = referredList[u.uid].length;
        return {
          uid: u.uid,
          name: u.username || 'User',
          email: u.email || 'N/A',
          referredCount: refCount,
          earnings,
          formatted: `${refCount} Refs (৳${earnings.toFixed(0)})`
        };
      });

    return [...referrers].sort((a, b) => b.referredCount - a.referredCount).slice(0, 10);
  }, [data.users]);

  // ==================== ACTIONS FOR TOP SELLERS ====================
  const addSeller = () => {
    setSellers([...sellers, { name: 'Top Earner', earned: '৳15,000' }]);
  };

  const removeSeller = (index: number) => {
    setSellers(sellers.filter((_, i) => i !== index));
  };

  const updateSeller = (index: number, field: string, value: string) => {
    const newSellers = [...sellers];
    newSellers[index] = { ...newSellers[index], [field]: value };
    setSellers(newSellers);
  };

  const saveSellers = async () => {
    const formatted = sellers.map((s, idx) => ({ ...s, rank: idx + 1 }));
    
    // Paths to write to for maximum compatibility with all user app versions
    const paths = [
      "top_sellers",
      "top_seller",
      "topSellers",
      "settings/top_sellers",
      "settings/topSellers",
      "settings/top_seller"
    ];

    try {
      await Promise.all(paths.map(path => set(ref(db, path), formatted)));
      Swal.fire('Leaderboard Saved', 'Top Sellers leaderboard published live across all user app platforms!', 'success');
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Failed to save leaderboard', 'error');
    }
  };

  const syncSellersFromLive = () => {
    const synced = liveTopEarners.map((u, idx) => ({
      rank: idx + 1,
      name: u.name,
      earned: u.earnedFormatted
    }));
    setSellers(synced);
    setActiveTab('config');
    Swal.fire('Synced', 'Top live sellers imported into editing pane! Don\'t forget to click "Save & Publish".', 'info');
  };

  // ==================== ACTIONS FOR TOP REFERRALS ====================
  const addReferral = () => {
    setReferrals([...referrals, { name: 'Top Referrer', earned: '20 Refs (৳1,000)' }]);
  };

  const removeReferral = (index: number) => {
    setReferrals(referrals.filter((_, i) => i !== index));
  };

  const updateReferral = (index: number, field: string, value: string) => {
    const newRefs = [...referrals];
    newRefs[index] = { ...newRefs[index], [field]: value };
    setReferrals(newRefs);
  };

  const saveReferrals = async () => {
    const formatted = referrals.map((r, idx) => ({ ...r, rank: idx + 1 }));
    
    // Paths to write to for maximum compatibility with all user app versions
    const paths = [
      "top_referrals",
      "top_referral",
      "topReferrals",
      "settings/top_referrals",
      "settings/top_referral",
      "settings/topReferrals"
    ];

    try {
      await Promise.all(paths.map(path => set(ref(db, path), formatted)));
      Swal.fire('Leaderboard Saved', 'Top Referrers leaderboard published live across all user app platforms!', 'success');
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Failed to save leaderboard', 'error');
    }
  };

  const syncReferralsFromLive = () => {
    const synced = liveTopReferrers.map((u, idx) => ({
      rank: idx + 1,
      name: u.name,
      earned: u.formatted
    }));
    setReferrals(synced);
    setActiveTab('config');
    Swal.fire('Synced', 'Top live referrers imported into editing pane! Don\'t forget to click "Save & Publish".', 'info');
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      {/* Segmented Control Header */}
      <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="font-extrabold text-lg flex items-center gap-2">
            <Crown className="text-amber-400 animate-bounce" size={22} />
            Leaderboards Config Console
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Instantly manage and synchronize Top Seller and Top Referral leaderboards for the user mobile applications.
          </p>
        </div>

        {/* Board Switcher */}
        <div className="bg-slate-800 p-1 rounded-xl flex border border-slate-700/60">
          <button
            onClick={() => { setBoardType('sellers'); setActiveTab('config'); }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              boardType === 'sellers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={14} /> Top Sellers
          </button>
          <button
            onClick={() => { setBoardType('referrals'); setActiveTab('config'); }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              boardType === 'referrals' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network size={14} /> Top Referrals
          </button>
        </div>
      </div>

      {/* Editor & Metrics Sub-Tabs */}
      <div className="px-6 py-3 border-b border-slate-100 bg-white flex justify-between items-center shrink-0 flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'config' ? 'bg-slate-850 text-slate-900 border border-slate-300' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Leaderboard Editor ({boardType === 'sellers' ? sellers.length : referrals.length} entries)
          </button>

          <button
            onClick={() => setActiveTab('live_metrics')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'live_metrics' ? 'bg-slate-850 text-slate-900 border border-slate-300' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Live Database Analytics (Calculated)
          </button>
        </div>

        {/* Add Row Button */}
        {activeTab === 'config' && (
          <button
            onClick={boardType === 'sellers' ? addSeller : addReferral}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors"
          >
            <Plus size={14} /> Add Ranking Row
          </button>
        )}
      </div>

      {/* Main Form Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40">
        
        {/* TAB 1: EDIT CONFIG */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            
            {/* Context Notice */}
            <div className="text-xs text-slate-600 bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 flex items-start gap-2.5">
              <Sparkles size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-indigo-900 block font-bold mb-0.5">Dual-Path Realtime Synchronization Enabled</strong>
                Changes will be saved and automatically duplicated across all alternative database nodes (e.g. <code>top_sellers</code>, <code>top_referrals</code>, <code>settings/top_sellers</code>, etc.) to ensure complete compatibility with your Android / User Web App.
              </div>
            </div>

            {/* Empty States */}
            {((boardType === 'sellers' && sellers.length === 0) || (boardType === 'referrals' && referrals.length === 0)) && (
              <div className="text-center text-slate-400 py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <Crown size={32} className="mx-auto text-slate-300 mb-2 animate-pulse" />
                <div className="font-bold text-slate-700">No Leaderboard Items Loaded</div>
                <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Click "Auto-Sync" to populate from actual user activity or click "Add Ranking Row" to customize entries manually.
                </div>
                <button
                  onClick={boardType === 'sellers' ? syncSellersFromLive : syncReferralsFromLive}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Sparkles size={12} /> Auto-Sync from Real Data
                </button>
              </div>
            )}

            {/* Config Fields List */}
            {boardType === 'sellers' ? (
              <div className="space-y-3">
                {sellers.map((s, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-start gap-4 hover:border-indigo-100 transition-all">
                    <div className="bg-gradient-to-br from-amber-400 to-amber-500 text-white font-black text-xs w-8 h-8 flex items-center justify-center rounded-xl shrink-0 shadow-sm mt-1">
                      #{idx + 1}
                    </div>

                    <div className="flex flex-col gap-3 flex-1">
                      {/* Select User Dropdown */}
                      {userOptions.length > 0 && (
                        <div>
                          <label className="block text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Link to System Account (Optional)</label>
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const matched = (data.users || []).find((u: any) => u.uid === val);
                                if (matched) {
                                  updateSeller(idx, 'name', matched.username || matched.email || 'User');
                                  const liveStat = liveTopEarners.find(l => l.uid === matched.uid);
                                  if (liveStat) {
                                    updateSeller(idx, 'earned', liveStat.earnedFormatted);
                                  } else {
                                    updateSeller(idx, 'earned', `৳${(matched.balance || 0).toFixed(0)}`);
                                  }
                                }
                              }
                            }}
                            className="w-full bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/80 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-950 outline-none focus:border-indigo-400 transition-colors"
                            defaultValue=""
                          >
                            <option value="">-- Choose Registered Member to Auto-fill --</option>
                            {userOptions.map((opt: any) => (
                              <option key={opt.uid} value={opt.uid}>
                                {opt.username} ({opt.email})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Seller Name</label>
                          <input
                            type="text"
                            value={s.name || ''}
                            onChange={(e) => updateSeller(idx, 'name', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                            placeholder="Display name"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Earnings Milestone</label>
                          <input
                            type="text"
                            value={s.earned || s.count || ''}
                            onChange={(e) => updateSeller(idx, 'earned', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                            placeholder="e.g. ৳15,000"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeSeller(idx)}
                      className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0 mt-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((r, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-start gap-4 hover:border-indigo-100 transition-all">
                    <div className="bg-gradient-to-br from-indigo-400 to-indigo-500 text-white font-black text-xs w-8 h-8 flex items-center justify-center rounded-xl shrink-0 shadow-sm mt-1">
                      #{idx + 1}
                    </div>

                    <div className="flex flex-col gap-3 flex-1">
                      {/* Select User Dropdown */}
                      {userOptions.length > 0 && (
                        <div>
                          <label className="block text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Link to System Account (Optional)</label>
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const matched = (data.users || []).find((u: any) => u.uid === val);
                                if (matched) {
                                  updateReferral(idx, 'name', matched.username || matched.email || 'User');
                                  const liveStat = liveTopReferrers.find(l => l.uid === matched.uid);
                                  if (liveStat) {
                                    updateReferral(idx, 'earned', liveStat.formatted);
                                  } else {
                                    updateReferral(idx, 'earned', `0 Refs (৳0)`);
                                  }
                                }
                              }
                            }}
                            className="w-full bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/80 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-950 outline-none focus:border-indigo-400 transition-colors"
                            defaultValue=""
                          >
                            <option value="">-- Choose Registered Member to Auto-fill --</option>
                            {userOptions.map((opt: any) => (
                              <option key={opt.uid} value={opt.uid}>
                                {opt.username} ({opt.email})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Referrer Name</label>
                          <input
                            type="text"
                            value={r.name || ''}
                            onChange={(e) => updateReferral(idx, 'name', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                            placeholder="Display name"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Referral / Commission Label</label>
                          <input
                            type="text"
                            value={r.earned || r.count || ''}
                            onChange={(e) => updateReferral(idx, 'earned', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                            placeholder="e.g. 20 Refs (৳1,000)"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeReferral(idx)}
                      className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0 mt-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE ANALYTICS */}
        {activeTab === 'live_metrics' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">
                  {boardType === 'sellers' ? 'Calculated Top Sellers (Live Data)' : 'Calculated Top Referrers (Live Data)'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  These rankings are computed instantly by analyzing actual user actions inside your Firebase Database.
                </div>
              </div>
              <button
                onClick={boardType === 'sellers' ? syncSellersFromLive : syncReferralsFromLive}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5"
              >
                <Save size={13} /> Import to Config Editor
              </button>
            </div>

            {boardType === 'sellers' ? (
              <div className="space-y-2.5">
                {liveTopEarners.map((u, idx) => (
                  <div key={u.uid} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                        idx === 0 ? 'bg-amber-500 text-white' :
                        idx === 1 ? 'bg-slate-300 text-slate-850' :
                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase">Mails Approved</div>
                        <div className="font-extrabold text-indigo-600 text-xs">{u.approvedEmails} Mails</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase">Lifetime Income</div>
                        <div className="font-black text-emerald-600 text-sm">৳{u.lifetimeEarned.toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {liveTopReferrers.map((u, idx) => (
                  <div key={u.uid} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                        idx === 0 ? 'bg-amber-500 text-white' :
                        idx === 1 ? 'bg-slate-300 text-slate-850' :
                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase">Total Referrals</div>
                        <div className="font-extrabold text-indigo-600 text-xs">{u.referredCount} Members</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase">Ref Earnings</div>
                        <div className="font-black text-emerald-600 text-sm">৳{u.earnings.toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persistent Footer to Save Leaderboard */}
      {activeTab === 'config' && (
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={boardType === 'sellers' ? saveSellers : saveReferrals}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
          >
            <Save size={16} /> Save & Publish {boardType === 'sellers' ? 'Top Sellers' : 'Top Referrals'} Leaderboard
          </button>
        </div>
      )}
    </div>
  );
}
