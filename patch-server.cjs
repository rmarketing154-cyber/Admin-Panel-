const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /const buyerWalletData = await getDbNode\(`buyer_wallets\/\$\{userId\}`\);\s*const userBal = Number\(user\.buyerWalletBalance \?\? buyerWalletData\?\.balance \?\? 0\);/g;
const replacement = `const buyerWalletData = await getDbNode(\`buyer_wallets/\${userId}\`);
    const userBal = Number(user.balance ?? user.buyerWalletBalance ?? buyerWalletData?.balance ?? 0);`;
content = content.replace(regex, replacement);

const updateRegex = /updates\[\`users\/\$\{userId\}\/buyerWalletBalance\`\] = newBal;\s*updates\[\`buyer_wallets\/\$\{userId\}\/balance\`\] = newBal;\s*updates\[\`users\/\$\{userId\}\/reserved_balance\`\] = newReserved;\s*updates\[\`buyer_wallets\/\$\{userId\}\/reserved_balance\`\] = newReserved;/g;
const updateReplacement = `updates[\`users/\${userId}/balance\`] = newBal;
    updates[\`users/\${userId}/buyerWalletBalance\`] = newBal;
    updates[\`buyer_wallets/\${userId}/balance\`] = newBal;
    
    // Hold / Reserved
    const currentHold = Number(user.hold || 0);
    const newHold = Number((currentHold + totalCost).toFixed(2));
    updates[\`users/\${userId}/hold\`] = newHold;
    updates[\`users/\${userId}/reserved_balance\`] = newReserved;
    updates[\`buyer_wallets/\${userId}/reserved_balance\`] = newReserved;`;

content = content.replace(updateRegex, updateReplacement);

fs.writeFileSync(file, content);
console.log('Server Place Order updated!');
