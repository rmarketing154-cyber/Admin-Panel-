const fs = require('fs');
let content = fs.readFileSync('src/pages/Referrals.tsx', 'utf-8');

// First, we need to change how the expanded state works to show a "full page/modal" view instead of a dropdown
// We'll replace the toggle logic and the mapping structure.

// 1. Change expandedRow to selectedReferrer (object instead of string ID)
content = content.replace(
  "const [expandedRow, setExpandedRow] = useState<string | null>(null);",
  "const [selectedReferrer, setSelectedReferrer] = useState<any | null>(null);"
);

// 2. Remove the toggleRow function
content = content.replace(
  /const toggleRow = \(uid: string\) => {[\s\S]*?};/,
  `const handleViewReferrer = (referrer: any) => {
    setSelectedReferrer(referrer);
  };`
);

// 3. Update the imports to include ChevronLeft
content = content.replace(
  "Link as LinkIcon, UserX, Mail, CalendarDays } from 'lucide-react';",
  "Link as LinkIcon, UserX, Mail, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';"
);

// 4. In the map function, we need to remove the dropdown part and just show the list item.
// Let's replace the whole list rendering block.

const listBlockRegex = /\{\/\* Referrers List \*\/\}[\s\S]*?\{\/\* Referred Users Dropdown \(Nested List\) \*\/\}/s;

const newListBlock = `{/* Referrers List */}
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
                    {/* Removed nested dropdown block */}`;

content = content.replace(listBlockRegex, newListBlock);

fs.writeFileSync('src/pages/Referrals.tsx', content);
console.log('Replaced list block');
