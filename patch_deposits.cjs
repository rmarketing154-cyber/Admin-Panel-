const fs = require('fs');
let content = fs.readFileSync('src/pages/buying/BuyerStorefront.tsx', 'utf8');

const search = `  const myDeposits = useMemo(() => {
    // Collect deposits from multiple possible keys in user profile
    const allDeposits: any[] = [];
    if (activeBuyer.deposits) Object.values(activeBuyer.deposits).forEach(d => allDeposits.push(d));
    if (activeBuyer.deposit_requests) Object.values(activeBuyer.deposit_requests).forEach(d => allDeposits.push(d));
    
    // Sort descending
    return allDeposits.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [activeBuyer]);`;

const replace = `  const myDeposits = useMemo(() => {
    // Collect from global aggregated deposits first
    const globalDeposits = (data.buyerDeposits || []).filter((d: any) => d.userId === activeBuyer.uid);
    
    // Also check embedded deposits just in case
    const embeddedDeposits: any[] = [];
    if (activeBuyer.deposits) Object.values(activeBuyer.deposits).forEach(d => embeddedDeposits.push(d));
    if (activeBuyer.deposit_requests) Object.values(activeBuyer.deposit_requests).forEach(d => embeddedDeposits.push(d));
    if (activeBuyer.user_deposits) Object.values(activeBuyer.user_deposits).forEach(d => embeddedDeposits.push(d));
    
    // Merge them uniquely by ID
    const mergedMap = new Map();
    [...embeddedDeposits, ...globalDeposits].forEach(d => {
      if (d && d.id) {
        if (!mergedMap.has(d.id)) {
           mergedMap.set(d.id, d);
        } else {
           // Prioritize non-pending status over pending status
           const existing = mergedMap.get(d.id);
           mergedMap.set(d.id, {
             ...existing,
             ...d,
             status: d.status !== 'pending' ? d.status : existing.status
           });
        }
      }
    });
    
    // Sort descending
    return Array.from(mergedMap.values()).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [activeBuyer, data.buyerDeposits]);`;

content = content.replace(search, replace);

fs.writeFileSync('src/pages/buying/BuyerStorefront.tsx', content);
console.log("Patched myDeposits logic.");
