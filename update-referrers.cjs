const fs = require('fs');
let content = fs.readFileSync('src/pages/Referrals.tsx', 'utf-8');

// Change the filter logic to strictly check if they have at least 1 referred user
const oldFilter = '.filter((u: any) => referredList[u.uid] || (Number(u.referralEarnings) > 0))';
const newFilter = '.filter((u: any) => referredList[u.uid] && referredList[u.uid].length > 0)';

content = content.replace(oldFilter, newFilter);

fs.writeFileSync('src/pages/Referrals.tsx', content);
console.log('Updated referrer filter');
