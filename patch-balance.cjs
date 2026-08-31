const fs = require('fs');
const file = 'src/pages/buying/BuyerOrdersManager.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the Approve balance deduction
const approveRegex = /if \(targetUserId && safeOrderTotal > 0\) \{[\s\S]*?const txId = `tx_buy_\$\{now\}`;/g;

// Replace the Reject balance refund
const rejectRegex = /if \(targetUserId && safeOrderAmt > 0\) \{[\s\S]*?const txId = `tx_ref_\$\{now\}`;/g;

const newApproveLogic = `if (targetUserId && safeOrderTotal > 0) {
           const userSnap = await get(ref(db, \`users/\${targetUserId}\`));
           const walletSnap = await get(ref(db, \`buyer_wallets/\${targetUserId}\`));
           const uData = userSnap.val() || {};
           const wData = walletSnap.val() || {};

           let curReserved = Number(wData.reserved_balance ?? uData.reserved_balance ?? 0);
           let curHold = Number(uData.hold ?? 0);
           const newReserved = Math.max(0, Number((curReserved - safeOrderTotal).toFixed(2)));
           const newHold = Math.max(0, Number((curHold - safeOrderTotal).toFixed(2)));

           updates[\`users/\${targetUserId}/reserved_balance\`] = newReserved;
           updates[\`buyer_wallets/\${targetUserId}/reserved_balance\`] = newReserved;
           if (uData.hold !== undefined) {
             updates[\`users/\${targetUserId}/hold\`] = newHold;
           }

           const txId = \`tx_buy_\${now}\`;`;

const newRejectLogic = `if (targetUserId && safeOrderAmt > 0) {
           const userSnap = await get(ref(db, \`users/\${targetUserId}\`));
           const walletSnap = await get(ref(db, \`buyer_wallets/\${targetUserId}\`));
           const uData = userSnap.val() || {};
           const wData = walletSnap.val() || {};

           // Get current main balance
           let curBal = Number(uData.balance ?? uData.buyerWalletBalance ?? wData.balance ?? 0);
           let curReserved = Number(wData.reserved_balance ?? uData.reserved_balance ?? 0);
           let curHold = Number(uData.hold ?? 0);

           const newBal = Number((curBal + safeOrderAmt).toFixed(2));
           const newReserved = Math.max(0, Number((curReserved - safeOrderAmt).toFixed(2)));
           const newHold = Math.max(0, Number((curHold - safeOrderAmt).toFixed(2)));

           updates[\`users/\${targetUserId}/balance\`] = newBal;
           updates[\`users/\${targetUserId}/buyerWalletBalance\`] = newBal;
           updates[\`buyer_wallets/\${targetUserId}/balance\`] = newBal;
           
           updates[\`users/\${targetUserId}/reserved_balance\`] = newReserved;
           updates[\`buyer_wallets/\${targetUserId}/reserved_balance\`] = newReserved;
           if (uData.hold !== undefined) {
             updates[\`users/\${targetUserId}/hold\`] = newHold;
           }
           updates[\`buyer_wallets/\${targetUserId}/lastRefundAt\`] = now;

           const txId = \`tx_ref_\${now}\`;`;

content = content.replace(approveRegex, newApproveLogic);
content = content.replace(rejectRegex, newRejectLogic);

fs.writeFileSync(file, content);
console.log('Balance logic updated!');
