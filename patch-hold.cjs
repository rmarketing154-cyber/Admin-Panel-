const fs = require('fs');
const file = 'src/pages/buying/BuyerOrdersManager.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/if \(uData\.hold !== undefined\) \{\s*updates\[\`users\/\$\{targetUserId\}\/hold\`\] = newHold;\s*\}/g, "updates[`users/${targetUserId}/hold`] = newHold;");

fs.writeFileSync(file, content);
console.log('Fixed hold update!');
