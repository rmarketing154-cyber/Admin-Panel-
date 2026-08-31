const fs = require('fs');
const file = 'src/pages/buying/BuyerDepositsManager.tsx';
let content = fs.readFileSync(file, 'utf8');

// The logic gets freshBalance:
// let freshBalance = Number(uData.buyerWalletBalance || 0);

// I should replace it to get from balance as well.
const fetchRegex = /freshBalance = Number\(uData\.buyerWalletBalance \|\| 0\);/g;
content = content.replace(fetchRegex, "freshBalance = Number(uData.balance || uData.buyerWalletBalance || 0);");

// And updates:
const updatesRegex = /updates\[\`users\/\$\{targetUid\}\/buyerWalletBalance\`\] = newBalance;\s*updates\[\`buyer_wallets\/\$\{targetUid\}\/balance\`\] = newBalance;/g;
const newUpdates = `updates[\`users/\$\{targetUid\}/balance\`] = newBalance;
            updates[\`users/\$\{targetUid\}/buyerWalletBalance\`] = newBalance;
            updates[\`buyer_wallets/\$\{targetUid\}/balance\`] = newBalance;`;
content = content.replace(updatesRegex, newUpdates);

fs.writeFileSync(file, content);
console.log('Deposits logic updated!');
