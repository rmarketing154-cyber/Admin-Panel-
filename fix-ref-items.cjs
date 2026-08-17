const fs = require('fs');
let content = fs.readFileSync('src/pages/Referrals.tsx', 'utf-8');

if (!content.includes('CalendarDays')) {
  content = content.replace('UserX } from \'lucide-react\';', 'UserX, Mail, CalendarDays } from \'lucide-react\';');
}

const startStr = '                                return (';
const endStr = '                                );\n                              })}\n                            </div>\n                          </div>';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr, startIdx) + endStr.length;

const replacement = `                                return (
                                  <div key={ru.uid} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group/item">
                                    <div className="font-black text-emerald-500 text-lg sm:text-xl mb-3">+{calculatedCommission.toFixed(2)} TK</div>
                                    
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                      <div>
                                        <div className="font-bold text-slate-800 text-base sm:text-lg mb-1.5 flex items-center gap-2">
                                          {idx + 1}. {ru.username || 'Unknown'} 
                                          <span className={\`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider \${statusColor}\`}>{statusText}</span>
                                        </div>
                                        <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                          <Mail size={14} className="text-slate-400" />
                                          {ru.email || 'N/A'}
                                        </div>
                                      </div>
                                      
                                      <div className="text-left sm:text-right">
                                        <div className="flex items-center sm:justify-end gap-2 text-sm font-bold text-slate-700 mb-1.5">
                                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">{ru.manual_approved_count || 0} Approved</span>
                                          <span className="text-slate-300">|</span>
                                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">{totalEmails} Emails</span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center sm:justify-end gap-1.5">
                                          <CalendarDays size={12} /> {formatDate(ru.createdAt)} Joined
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>`; // removed the extra closing div since we removed it in the top wrapper

if (startIdx !== -1) {
  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  fs.writeFileSync('src/pages/Referrals.tsx', content);
  console.log('Successfully replaced list items.');
} else {
  console.log('Could not find boundaries.');
}
