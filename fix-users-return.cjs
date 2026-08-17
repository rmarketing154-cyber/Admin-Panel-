const fs = require('fs');
let content = fs.readFileSync('src/pages/Users.tsx', 'utf-8');

// The main return should start after `const handleTopSeller...`
const splitPoint = 'const handleTopSeller = async (u: any) => {\n    await update(ref(db, `users/${u.uid}`), { isTopSeller: !u.isTopSeller });\n  };\n';

const splitIdx = content.indexOf('const handleTopSeller');
if (splitIdx === -1) {
  console.log('Cannot find handleTopSeller');
  process.exit(1);
}

const beforeReturn = content.substring(0, content.indexOf('  return (', splitIdx));

const correctReturn = `
  if (selectedUser) {
    const totalWdAmount = data.withdraws.filter((w:any) => w.userId === selectedUser.uid && w.status === 'approved').reduce((a:number, b:any) => a + Number(b.amount), 0);
    const userSubsCount = data.submissions.filter((s:any) => s.userId === selectedUser.uid).length;
    const refsCount = data.users.filter((u:any) => u.referredBy === selectedUser.uid).length;
    
    return (
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center shrink-0">
          <button 
            onClick={() => setSelectedUser(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors"
          >
            <ChevronLeft size={20} />
            Back to Users
          </button>
        </div>
        
        <div className="flex-1 p-4 sm:p-6 bg-slate-50/50 overflow-y-auto">
          {/* Profile Header */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-4xl shadow-inner border border-indigo-200 shrink-0">
                {selectedUser.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="font-black text-slate-800 text-2xl flex items-center gap-2">
                  {selectedUser.username || 'User'}
                  {selectedUser.isTopSeller && <Trophy size={20} className="text-amber-500" title="Top Seller" />}
                  {selectedUser.is_blocked && <ShieldBan size={20} className="text-red-500" title="Blocked" />}
                </h2>
                <div className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-md inline-block mt-2 tracking-wider">UID: {selectedUser.uid}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Balance</div>
                <div className="font-black text-3xl text-indigo-600">৳{(selectedUser.balance || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
          
          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <InfoCard icon={<Mail size={20}/>} label="Email Address" value={selectedUser.email || 'N/A'} />
            <InfoCard icon={<Clock size={20}/>} label="Last Login" value={formatTime(selectedUser.last_login)} />
            <InfoCard icon={<Smartphone size={20}/>} label="Device Info" value={selectedUser.device || selectedUser.device_name || 'Unknown Device'} />
            <InfoCard icon={<Calendar size={20}/>} label="Join Date" value={formatTime(selectedUser.createdAt)} />
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<Coins size={24}/>} label="Main Balance" value={\`৳\${(selectedUser.balance || 0).toFixed(2)}\`} color="indigo" />
            <StatCard icon={<ShieldBan size={24}/>} label="Hold Balance" value={\`৳\${(selectedUser.hold || 0).toFixed(2)}\`} color="amber" />
            <StatCard icon={<ArrowUpCircle size={24}/>} label="Total Withdraw" value={\`৳\${totalWdAmount.toFixed(2)}\`} color="emerald" />
            <StatCard icon={<TrendingUp size={24}/>} label="Ref Earnings" value={\`৳\${(selectedUser.referralEarnings || 0).toFixed(2)}\`} color="blue" />
            
            <StatCard icon={<Mail size={24}/>} label="Emails Approved" value={selectedUser.manual_approved_count || 0} color="slate" />
            <StatCard icon={<List size={24}/>} label="Total Subs" value={userSubsCount} color="slate" />
            <StatCard icon={<Trophy size={24}/>} label="Level" value={\`Lv-\${selectedUser.level || 1}\`} color="purple" />
            <StatCard icon={<UsersIcon size={24}/>} label="Referrals" value={refsCount} color="slate" />
          </div>
          
          {/* Admin Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ShieldBan size={18} className="text-indigo-500" /> Administrative Actions
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <ActionBtn icon={<MessageSquare size={20}/>} label="Message User" onClick={()=>handleMessage(selectedUser)} color="blue" />
              <ActionBtn icon={<Coins size={20}/>} label="Add / Cut Bal" onClick={()=>handleAddBal(selectedUser)} color="indigo" />
              <ActionBtn icon={<ArrowUpCircle size={20}/>} label="Boost Level" onClick={()=>handleBoostLvl(selectedUser)} color="purple" />
              <ActionBtn icon={<TrendingUp size={20}/>} label="Edit Ref Earn" onClick={()=>handleRefEarn(selectedUser)} color="emerald" />
              
              <ActionBtn icon={<Key size={20}/>} label="Reset Password" onClick={()=>handleResetPass(selectedUser)} color="amber" />
              <ActionBtn icon={<List size={20}/>} label="View Subs" onClick={()=>handleViewSubs(selectedUser)} color="slate" />
              <ActionBtn icon={<ShieldBan size={20}/>} label={selectedUser.is_blocked ? "Unban User" : "Ban User"} onClick={()=>handleBlock(selectedUser)} color={selectedUser.is_blocked ? "slate" : "red"} />
              <ActionBtn icon={<Trophy size={20}/>} label={selectedUser.isTopSeller ? "Remove Top" : "Make Top Seller"} onClick={()=>handleTopSeller(selectedUser)} color={selectedUser.isTopSeller ? "slate" : "amber"} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col relative flex-1">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <UsersIcon className="text-indigo-500" />
          All Registered Users
        </h2>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>
      
      <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0 space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search Name, Email, or UID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={()=>setFilter('all')} className={\`px-4 py-1.5 rounded-lg text-sm font-bold shrink-0 transition-colors \${filter==='all'?'bg-indigo-100 text-indigo-700':'bg-slate-50 text-slate-600 hover:bg-slate-100'}\`}>All</button>
          <button onClick={()=>setFilter('active')} className={\`px-4 py-1.5 rounded-lg text-sm font-bold shrink-0 transition-colors \${filter==='active'?'bg-emerald-100 text-emerald-700':'bg-slate-50 text-slate-600 hover:bg-slate-100'}\`}>Active Today</button>
          <button onClick={()=>setFilter('blocked')} className={\`px-4 py-1.5 rounded-lg text-sm font-bold shrink-0 transition-colors \${filter==='blocked'?'bg-red-100 text-red-700':'bg-slate-50 text-slate-600 hover:bg-slate-100'}\`}>Blocked</button>
          <button onClick={()=>setFilter('top')} className={\`px-4 py-1.5 rounded-lg text-sm font-bold shrink-0 transition-colors \${filter==='top'?'bg-amber-100 text-amber-700':'bg-slate-50 text-slate-600 hover:bg-slate-100'}\`}>Top Sellers</button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        {list.length === 0 && <div className="text-center text-slate-500 py-10 font-medium">No users found matching your criteria.</div>}
        {list.map((u: any) => (
          <div key={u.uid} onClick={() => setSelectedUser(u)} className="flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-white hover:bg-slate-50 cursor-pointer transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition-transform">
                {u.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-base flex items-center gap-2 truncate">
                  <span className={u.is_blocked ? 'text-red-500 line-through opacity-80' : 'text-slate-800 group-hover:text-indigo-600 transition-colors'}>{u.username || 'User'}</span>
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
`;

fs.writeFileSync('src/pages/Users.tsx', beforeReturn + correctReturn);
console.log('Fixed Users.tsx return block completely');
