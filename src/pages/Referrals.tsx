import React, { useState, useMemo } from 'react';
import { Network, Search, Users, Coins, ChevronDown, ChevronUp, Link as LinkIcon, UserX, Mail, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Referrals({ data }: any) {
  const [search, setSearch] = useState('');
  const [selectedReferrer, setSelectedReferrer] = useState<any | null>(null);

  // Process Referral Data
  const { referrersData, stats } = useMemo(() => {
    const allUsers = data.users || [];
    let totalRefEarnings = 0;
    let totalReferredMembers = 0;
    let totalOrganicMembers = 0;

    // Build lookups to match 'referredBy' to a user's uid
    const codeLookup = new Map(allUsers.filter((u: any) => u.referralCode).map((u: any) => [u.referralCode, u.uid]));

    // Group referred users by their referrer's UID
    const referredList: Record<string, any[]> = {};

    allUsers.forEach((u: any) => {
      totalRefEarnings += Number(u.referralEarnings || 0);

      if (u.referredBy) {
        totalReferredMembers++;
        // Determine the actual UID of the referrer
        let refUid = u.referredBy;
        if (codeLookup.has(u.referredBy)) refUid = codeLookup.get(u.referredBy);

        if (!referredList[refUid]) referredList[refUid] = [];
        referredList[refUid].push(u);
      } else {
        totalOrganicMembers++;
      }
    });

    // Create array of referrers (users who have referred someone OR have referral earnings)
    const referrers = allUsers
      .filter((u: any) => referredList[u.uid] && referredList[u.uid].length > 0)
      .map((u: any) => ({
        ...u,
        referredUsers: referredList[u.uid] || []
      }))
      .sort((a: any, b: any) => {
        // Sort by number of referred users first, then by earnings
        if (b.referredUsers.length !== a.referredUsers.length) {
          return b.referredUsers.length - a.referredUsers.length;
        }
        
        return (Number(b.referralEarnings) || 0) - (Number(a.referralEarnings) || 0);
      });

    return {
      referrersData: referrers,
      stats: {
        totalRefEarnings,
        totalReferredMembers,
        totalOrganicMembers
      }
    };
  }, [data.users]);

  // Filter referrers based on search
  const filteredReferrers = referrersData.filter((u: any) => 
    (u.username || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    u.referredUsers.some((ru: any) => 
      (ru.username || '').toLowerCase().includes(search.toLowerCase()) || 
      (ru.email || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleViewReferrer = (referrer: any) => {
    setSelectedReferrer(referrer);
  };

  const formatDate = (ts: any) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  };

  if (selectedReferrer) {
    const earnAmount = Number(selectedReferrer.referralEarnings) || 0;
    return (
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center shrink-0">
          <button 
            onClick={() => setSelectedReferrer(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors"
          >
            <ChevronLeft size={20} />
            Back to Referrals
          </button>
        </div>
        
        <div className="flex-1 p-4 sm:p-6 bg-slate-50/50">
          {/* Premium Header */}
          <div className="mb-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-indigo-500"></div>
            <div className="font-bold text-slate-800 text-xl sm:text-2xl mb-6">{selectedReferrer.username || 'User'}'s Referral Earnings</div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Referral Earnings</div>
                <div className="text-4xl font-black text-emerald-600">৳ {earnAmount.toFixed(2)}</div>
              </div>
              
              <div className="h-16 w-px bg-slate-200 hidden sm:block"></div>
              
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Referrals</div>
                <div className="text-3xl font-black text-indigo-600 flex items-center gap-2">
                  {selectedReferrer.referredUsers.length} <span className="text-base font-bold text-slate-400">Users</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 px-2">
            <Network size={18} className="text-slate-400"/> 
            Referred Members List
          </div>

          {selectedReferrer.referredUsers.length === 0 ? (
            <div className="text-sm font-medium text-slate-500 italic bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
              No users have registered with this referral yet.
            </div>
          ) : (
            <div className="space-y-4">
                {selectedReferrer.referredUsers.map((ru: any, idx: number) => {
                  const isActive = !ru.is_blocked;
                  const statusText = isActive ? "Active" : "Blocked";
                  const statusColor = isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
                  
                  const totalApprovedByAll = selectedReferrer.referredUsers.reduce((sum: number, u: any) => sum + (Number(u.manual_approved_count) || 0), 0);
                  let calculatedCommission = 0;
                  if (totalApprovedByAll > 0) {
                    calculatedCommission = ((Number(ru.manual_approved_count) || 0) / totalApprovedByAll) * earnAmount;
                  } else {
                    calculatedCommission = earnAmount / selectedReferrer.referredUsers.length;
                  }

                  const userSubs = data.submissions?.filter((s: any) => s.userId === ru.uid) || [];
                  const totalEmails = userSubs.reduce((acc: number, s: any) => acc + (s.gmails?.length || 0), 0);
                  
                  return (
                    <div key={ru.uid} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group/item">
                      <div className="font-black text-emerald-500 text-xl sm:text-2xl mb-4">+{calculatedCommission.toFixed(2)} TK</div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-slate-800 text-lg sm:text-xl mb-2 flex items-center gap-3">
                            {idx + 1}. {ru.username || 'Unknown'} 
                            <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${statusColor}`}>{statusText}</span>
                          </div>
                          <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Mail size={16} className="text-slate-400" />
                            {ru.email || 'N/A'}
                          </div>
                        </div>
                        
                        <div className="text-left sm:text-right mt-2 sm:mt-0">
                          <div className="flex items-center sm:justify-end gap-2 text-sm font-bold text-slate-700 mb-2">
                            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">{ru.manual_approved_count || 0} Approved</span>
                            <span className="text-slate-300">|</span>
                            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">{totalEmails} Emails</span>
                          </div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center sm:justify-end gap-1.5">
                            <CalendarDays size={14} /> {formatDate(ru.createdAt)} Joined
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Network className="text-indigo-500" />
          Referral Analytics
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search referrers or members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64"
          />
        </div>
      </div>
      
      <div className="flex-1 p-4 sm:p-6 space-y-6">
        
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
              <Coins size={24} />
            </div>
            <div>
              <div className="text-sm font-bold text-indigo-600/80 uppercase tracking-wider mb-1">Total Ref Income</div>
              <div className="text-2xl font-black text-indigo-900">৳{stats.totalRefEarnings.toFixed(2)}</div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
              <LinkIcon size={24} />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-600/80 uppercase tracking-wider mb-1">Referred Members</div>
              <div className="text-2xl font-black text-emerald-900">{stats.totalReferredMembers} <span className="text-sm font-normal">users</span></div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center shrink-0">
              <UserX size={24} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Non-Referral (Organic)</div>
              <div className="text-2xl font-black text-slate-800">{stats.totalOrganicMembers} <span className="text-sm font-normal">users</span></div>
            </div>
          </div>
        </div>

        {/* Referrers List */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="font-bold text-slate-800">Top Referrers List</div>
            <div className="text-sm text-slate-500 font-medium">Showing {filteredReferrers.length} referrers</div>
          </div>
          {filteredReferrers.length === 0 ? (
            <div className="text-center text-slate-500 py-10">No referral activity found matching your search.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReferrers.map((referrer: any, index: number) => {
                const earnAmount = Number(referrer.referralEarnings) || 0;
                
                return (
                  <div key={referrer.uid} className="group">
                    {/* Referrer Row */}
                    <div 
                      onClick={() => handleViewReferrer(referrer)}
                      className="flex items-center justify-between p-4 px-6 cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">
                          #{index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">{referrer.username || 'User'}</div>
                          <div className="text-xs text-slate-500 truncate">{referrer.email || 'No email'}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 sm:gap-10 shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="font-bold text-slate-800 flex items-center justify-end gap-1">
                            <Users size={14} className="text-slate-400"/> {referrer.referredUsers.length}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referred</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-emerald-600 text-lg leading-tight">৳{earnAmount.toFixed(2)}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commissions</div>
                        </div>
                        <div className="text-slate-300 group-hover:text-indigo-500 transition-colors">
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </div>
                    
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}