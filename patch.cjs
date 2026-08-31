const fs = require('fs');
let content = fs.readFileSync('src/pages/buying/BuyerStorefront.tsx', 'utf8');

// 1. Update activeTab state
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'market' | 'my_orders'>('market');",
  "const [activeTab, setActiveTab] = useState<'market' | 'my_orders' | 'my_deposits'>('market');"
);

// 2. Extract myDeposits
content = content.replace(
  "const myOrders = useMemo(() => {",
  `const myDeposits = useMemo(() => {
    // Collect deposits from multiple possible keys in user profile
    const allDeposits: any[] = [];
    if (activeBuyer.deposits) Object.values(activeBuyer.deposits).forEach(d => allDeposits.push(d));
    if (activeBuyer.deposit_requests) Object.values(activeBuyer.deposit_requests).forEach(d => allDeposits.push(d));
    
    // Sort descending
    return allDeposits.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [activeBuyer]);

  const myOrders = useMemo(() => {`
);

// 3. Add Tab Button
const tabButtonSearch = `          <button
            onClick={() => setActiveTab('my_orders')}
            className={\`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all \${
              activeTab === 'my_orders'
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5'
                : 'text-slate-600 hover:text-slate-900'
            }\`}
          >
            <Clock size={15} />
            <span>My Orders ({myOrders.length})</span>
          </button>
        </div>`;

const tabButtonReplace = `          <button
            onClick={() => setActiveTab('my_orders')}
            className={\`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all \${
              activeTab === 'my_orders'
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5'
                : 'text-slate-600 hover:text-slate-900'
            }\`}
          >
            <Clock size={15} />
            <span>My Orders ({myOrders.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('my_deposits')}
            className={\`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all \${
              activeTab === 'my_deposits'
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5'
                : 'text-slate-600 hover:text-slate-900'
            }\`}
          >
            <Wallet size={15} />
            <span>My Deposits ({myDeposits.length})</span>
          </button>
        </div>`;

content = content.replace(tabButtonSearch, tabButtonReplace);

fs.writeFileSync('src/pages/buying/BuyerStorefront.tsx', content);
console.log("Patched tabs.");
