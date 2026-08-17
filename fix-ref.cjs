const fs = require('fs');
const content = fs.readFileSync('src/pages/Referrals.tsx', 'utf-8');

const targetStr = `{/* Referred Users Dropdown (Nested List) */}
                    {isExpanded && (
                      <div className="bg-white border-t border-slate-100 p-5 px-6 pb-6 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-indigo-500"></div>
                        <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <Network size={16} className="text-slate-400"/> 
                          Referred Members ({referrer.referredUsers.length})
                        </div>
                        
                        {referrer.referredUsers.length === 0 ? (
                          <div className="text-sm text-slate-500 italic bg-white p-4 rounded-xl border border-slate-200">
                            No users have registered with this referral yet (Earnings might be from legacy records).
                          </div>
                        ) : (
                          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-100">
                            <div className="divide-y divide-slate-100">
                              {referrer.referredUsers.map((ru: any, idx: number) => {`;

const startIdx = content.indexOf('{/* Referred Users Dropdown (Nested List) */}');
const endMarker = '                              {referrer.referredUsers.map((ru: any, idx: number) => {';
const endIdx = content.indexOf(endMarker, startIdx) + endMarker.length;

const replacement = `{/* Referred Users Dropdown (Nested List) */}
                    {isExpanded && (
                      <div className="bg-slate-50/50 border-t border-slate-200 p-4 sm:p-6 shadow-inner relative">
                        {/* Premium Header matching the demo */}
                        <div className="mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-indigo-500"></div>
                          <div className="font-bold text-slate-800 text-lg mb-4">{referrer.username || 'User'}'s Referral Earnings</div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-10">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Referral Earnings</div>
                              <div className="text-3xl font-black text-emerald-600">৳ {earnAmount.toFixed(2)}</div>
                            </div>
                            
                            <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
                            
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Referrals</div>
                              <div className="text-2xl font-black text-indigo-600 flex items-center gap-2">
                                {referrer.referredUsers.length} <span className="text-sm font-bold text-slate-400">Users</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {referrer.referredUsers.length === 0 ? (
                          <div className="text-sm font-medium text-slate-500 italic bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                            No users have registered with this referral yet.
                          </div>
                        ) : (
                          <div className="space-y-3">
                              {referrer.referredUsers.map((ru: any, idx: number) => {`;

if (startIdx !== -1 && endIdx > startIdx) {
  const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  fs.writeFileSync('src/pages/Referrals.tsx', newContent);
  console.log('Replaced header and wrapper successfully.');
} else {
  console.log('Could not find the target string bounds.', {startIdx, endIdx});
}
