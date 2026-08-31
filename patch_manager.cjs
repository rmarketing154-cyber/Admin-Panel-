const fs = require('fs');
let content = fs.readFileSync('src/pages/buying/BuyerDepositsManager.tsx', 'utf8');
content = content.replace(
  "const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');",
  "const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('all');"
);
fs.writeFileSync('src/pages/buying/BuyerDepositsManager.tsx', content);
console.log("Patched manager.");
