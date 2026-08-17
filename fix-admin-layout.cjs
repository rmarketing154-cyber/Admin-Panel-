const fs = require('fs');
let content = fs.readFileSync('src/components/AdminLayout.tsx', 'utf-8');

const calcStr = `  const unreadChats = data.chats?.filter((c: any) => c.unread).length || 0;
  const pendingSubmissions = data.submissions?.filter((s: any) => s.status === 'pending').length || 0;
  const pendingWithdrawals = data.withdraws?.filter((w: any) => w.status === 'pending').length || 0;
  const totalAlerts = unreadChats + pendingSubmissions + pendingWithdrawals;

  const categories = [`;

content = content.replace('  const categories = [', calcStr);

const headerEnd = `          <button onClick={onLogout} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>`;

const newHeaderEnd = `          {/* Real-time System Alerts Counter */}
          <div className="relative flex items-center justify-center p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white mr-2">
            <BellRing size={20} className={totalAlerts > 0 ? "animate-[ring_2s_ease-in-out_infinite]" : ""} />
            {totalAlerts > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-sm animate-pulse">
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </div>
            )}
          </div>

          <button onClick={onLogout} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>`;

content = content.replace(headerEnd, newHeaderEnd);

// Make sure BellRing is imported if it isn't (it is already imported)

fs.writeFileSync('src/components/AdminLayout.tsx', content);
console.log('Modified AdminLayout.tsx');
