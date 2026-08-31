const fs = require('fs');
let content = fs.readFileSync('src/pages/buying/BuyerStorefront.tsx', 'utf8');

const tabContentSearch = `      {/* Orders Tab */}`;
const tabContentReplace = `      {/* Deposits Tab */}
      {activeTab === 'my_deposits' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Wallet size={20} className="text-indigo-600" />
              <span>Deposit History</span>
            </h2>
          </div>
          
          {myDeposits.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/60 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Wallet size={28} className="text-slate-400" />
              </div>
              <h3 className="text-slate-800 font-bold mb-1">কোনো ডিপোজিট নেই</h3>
              <p className="text-slate-500 text-xs">আপনি এখনো কোনো ডিপোজিট করেননি</p>
              <button 
                onClick={handleOpenDepositModal}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                ডিপোজিট করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myDeposits.map((dep: any) => {
                const isPending = dep.status === 'pending';
                const isApproved = dep.status === 'approved' || dep.status === 'accepted';
                const isRejected = dep.status === 'rejected' || dep.status === 'cancelled';
                
                return (
                  <div key={dep.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">ID: {dep.id.slice(-6)}</div>
                      <div className={\`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider \${
                        isApproved ? 'bg-emerald-100 text-emerald-700' :
                        isRejected ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }\`}>
                        {isApproved ? '✅ Approved' : isRejected ? '❌ Rejected' : '⏳ Pending'}
                      </div>
                    </div>
                    
                    <div className="text-2xl font-black text-slate-800 mb-1">
                      ৳ {dep.amount}
                    </div>
                    
                    <div className="text-xs text-slate-500 space-y-1">
                      <div>Method: <span className="font-bold text-slate-700">{dep.paymentMethod}</span></div>
                      <div>Sender: <span className="font-mono text-slate-700">{dep.senderNumber}</span></div>
                      <div>TrxID: <span className="font-mono text-slate-700">{dep.trxId}</span></div>
                      <div className="text-[10px] text-slate-400 mt-2">{new Date(dep.createdAt || Date.now()).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}`;

content = content.replace(tabContentSearch, tabContentReplace);

fs.writeFileSync('src/pages/buying/BuyerStorefront.tsx', content);
console.log("Patched tab content.");
