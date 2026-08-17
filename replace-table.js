const fs = require('fs');

const content = fs.readFileSync('src/pages/Referrals.tsx', 'utf-8');

const regex = /<div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">.*?<\/table>\s*<\/div>/s;

const replacement = `<div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="divide-y divide-slate-100">
                              {referrer.referredUsers.map((ru: any, idx: number) => {
                                const isActive = !ru.is_blocked;
                                const statusText = isActive ? "Active" : "Blocked";
                                const statusColor = isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
                                
                                const totalApprovedByAll = referrer.referredUsers.reduce((sum: number, u: any) => sum + (Number(u.manual_approved_count) || 0), 0);
                                let calculatedCommission = 0;
                                if (totalApprovedByAll > 0) {
                                  calculatedCommission = ((Number(ru.manual_approved_count) || 0) / totalApprovedByAll) * earnAmount;
                                } else {
                                  calculatedCommission = earnAmount / referrer.referredUsers.length;
                                }

                                const userSubs = data.submissions?.filter((s: any) => s.userId === ru.uid) || [];
                                const totalEmails = userSubs.reduce((acc: number, s: any) => acc + (s.gmails?.length || 0), 0);
                                
                                return (
                                  <div key={ru.uid} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="font-bold text-emerald-600 text-base mb-1">+{calculatedCommission.toFixed(2)} TK</div>
                                    <div className="font-bold text-slate-800 text-base mb-0.5 flex items-center gap-2">
                                      {idx + 1}. {ru.username || 'Unknown'} 
                                      <span className={\`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider \${statusColor}\`}>{statusText}</span>
                                    </div>
                                    <div className="text-sm text-slate-500 mb-2">{ru.email || 'N/A'}</div>
                                    
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-1">
                                      <span>{ru.manual_approved_count || 0} Approved</span>
                                      <span className="text-slate-300">|</span>
                                      <span>{totalEmails} Emails</span>
                                    </div>
                                    
                                    <div className="text-xs text-slate-400 font-medium">
                                      {formatDate(ru.createdAt)} Joined
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>`;

const newContent = content.replace(regex, replacement);
fs.writeFileSync('src/pages/Referrals.tsx', newContent);
console.log('Replaced table with vertical list');
