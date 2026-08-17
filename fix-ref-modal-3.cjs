const fs = require('fs');
let content = fs.readFileSync('src/pages/Referrals.tsx', 'utf-8');

// Now, we inject the selectedReferrer view at the top of the return statement.
// If selectedReferrer is not null, we render the details view, otherwise we render the list view.

const returnIdx = content.indexOf('return (');

const viewLogic = `
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
                            <span className={\`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider \${statusColor}\`}>{statusText}</span>
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

  return (`;

if (returnIdx !== -1) {
    content = content.substring(0, returnIdx) + viewLogic + content.substring(returnIdx + 'return ('.length);
    fs.writeFileSync('src/pages/Referrals.tsx', content);
    console.log('Added details view');
} else {
    console.log('Could not find return statement');
}
