const fs = require('fs');
let content = fs.readFileSync('src/pages/buying/BuyerOrdersManager.tsx', 'utf8');
content = content.replace(
  "const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'delivered' | 'cancelled' | 'claimed'>('pending');",
  "const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'delivered' | 'cancelled' | 'claimed'>('all');"
);
fs.writeFileSync('src/pages/buying/BuyerOrdersManager.tsx', content);
console.log("Patched orders manager.");
