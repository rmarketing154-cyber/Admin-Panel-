const fs = require('fs');
let content = fs.readFileSync('src/pages/Users.tsx', 'utf-8');

const regexListRow = /<div key=\{u\.uid\} onClick=\{\(\) => setSelectedUser\(u\)\}.*?<\/div>\s*<\/div>\s*<\/div>\s*\)\)/s;

const replacementListRow = `<div key={u.uid} onClick={() => setSelectedUser(u)} className="flex items-center justify-between p-4 px-6 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl shrink-0">
                {u.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-base flex items-center gap-2 truncate">
                  <span className={u.is_blocked ? 'text-red-500 line-through opacity-80' : 'text-slate-800'}>{u.username || 'User'}</span>
                  {u.is_blocked && <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-red-100 text-red-700">Blocked</span>}
                  {u.isTopSeller && <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-700">Top Seller</span>}
                </div>
                <div className="text-sm text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                  <Mail size={14} className="text-slate-400"/>
                  {u.email || 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-right shrink-0">
              <div className="hidden sm:block">
                <div className="font-black text-emerald-600 text-lg leading-tight">৳{(u.balance || 0).toFixed(2)}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Balance</div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
            </div>
          </div>
        ))`;

content = content.replace(regexListRow, replacementListRow);

fs.writeFileSync('src/pages/Users.tsx', content);
console.log('Updated list row');
