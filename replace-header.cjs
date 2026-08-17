const fs = require('fs');

const content = fs.readFileSync('src/pages/Referrals.tsx', 'utf-8');

const regex = /<div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">\s*<Network size={16} className="text-slate-400"\/>\s*Referred Members \(\{referrer.referredUsers.length\}\)\s*<\/div>/s;

const replacement = `<div className="mb-4">
                          <div className="text-base font-bold text-slate-800 mb-1">{referrer.username || 'User'}'s Referral Earnings</div>
                          <div className="text-sm text-slate-500 mb-1">Total Referral Earnings</div>
                          <div className="text-2xl font-black text-emerald-600 mb-2">৳ {earnAmount.toFixed(2)}</div>
                          <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Network size={16} className="text-slate-400"/>
                            {referrer.referredUsers.length} Active Referrals
                          </div>
                        </div>`;

const newContent = content.replace(regex, replacement);
fs.writeFileSync('src/pages/Referrals.tsx', newContent);
console.log('Replaced header');
