const fs = require('fs');
let content = fs.readFileSync('src/pages/Users.tsx', 'utf-8');

// The issue starts here: 
// <butt  if (selectedUser) {
// It broke the `<button onClick={exportCSV} ...> Export CSV </button>`
// Let's replace the whole section starting from `<h2 className="font-bold text-slate-800 ...` down to `if (selectedUser) {`

content = content.replace(
  /<butt  if \(selectedUser\) \{/,
  `        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="p-4 border-b border-slate-100 shrink-0 space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search Name, Email, or UID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={()=>setFilter('all')} className={\`px-4 py-1.5 rounded-lg text-sm font-bold shrink-0 \${filter==='all'?'bg-indigo-100 text-indigo-700':'bg-slate-50 text-slate-600 hover:bg-slate-100'}\`}>All</button>
          <button onClick={()=>setFilter('active')} className={\`px-4 py-1.5 rounded-lg text-sm font-bold shrink-0 \${filter==='active'?'bg-emerald-100 text-emerald-700':'bg-slate-50 text-slate-600 hover:bg-slate-100'}\`}>Active Today</button>
          <button onClick={()=>setFilter('blocked')} className={\`px-4 py-1.5 rounded-lg text-sm font-bold shrink-0 \${filter==='blocked'?'bg-red-100 text-red-700':'bg-slate-50 text-slate-600 hover:bg-slate-100'}\`}>Blocked</button>
          <button onClick={()=>setFilter('top')} className={\`px-4 py-1.5 rounded-lg text-sm font-bold shrink-0 \${filter==='top'?'bg-amber-100 text-amber-700':'bg-slate-50 text-slate-600 hover:bg-slate-100'}\`}>Top Sellers</button>
        </div>
      </div>
      <div className="flex-1">
        {list.length === 0 && <div className="text-center text-slate-500 py-10">No users found</div>}
        {list.map((u: any) => (
          <div key={u.uid} onClick={() => setSelectedUser(u)} className="flex items-center justify-between p-4 px-6 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group">
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
        ))}
      </div>
    </div>
  );
}

// We need to move the selectedUser block BEFORE the main return.
// Let's just rebuild the whole return correctly.
`
);

// We need to extract the selectedUser block from where it got injected.
// Looking at the current file, it seems the selectedUser logic got shoved inside the main `return (` just after `<h2 ... All Registered Users </h2>`.
