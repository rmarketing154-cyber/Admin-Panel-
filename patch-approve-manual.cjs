const fs = require('fs');

const file = 'src/pages/buying/BuyerOrdersManager.tsx';
let content = fs.readFileSync(file, 'utf8');

const startMarker = "// 1. Call Backend Server API for guaranteed order approval & escrow settlement";
const endMarker = "} catch (apiErr: any) {";

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.log("Start marker not found");
  process.exit(1);
}

// Find the end of the catch block
const catchBlockStart = content.indexOf(endMarker, startIndex);
if (catchBlockStart === -1) {
  console.log("Catch block start not found");
  process.exit(1);
}

const catchBlockEndStr = "throw apiErr;\n      }";
const catchBlockEnd = content.indexOf(catchBlockEndStr, catchBlockStart);
if (catchBlockEnd === -1) {
  console.log("Catch block end not found");
  process.exit(1);
}

const endIndex = catchBlockEnd + catchBlockEndStr.length;

const before = content.slice(0, startIndex);
const after = content.slice(endIndex);

const approveLogic = `
      try {
        const orderId = activeOrder.id;
        const targetUserId = activeOrder.userId || activeOrder.user_id || activeOrder.uid || activeOrder.userUid;
        const now = Date.now();
        const updates: Record<string, any> = {};

        const warrantyHours = activeOrder.warrantyHours || 12;
        const warrantyExpiresAt = now + (Number(warrantyHours) * 60 * 60 * 1000);
        const downloadText = deliveredAccounts
          .map(acc => \`\${acc.email}:\${acc.password}\${acc.recovery ? \`:\${acc.recovery}\` : ''}\${acc.ip ? \`:\${acc.ip}\` : ''}\`)
          .join('\\n');

        const orderUpdate = {
          status: "delivered",
          deliveredAccounts: deliveredAccounts,
          downloadText: downloadText,
          warrantyExpiresAt: warrantyExpiresAt,
          adminNote: finalAdminNote,
          deliveredAt: now,
          delivered_at: now,
          updatedAt: now
        };

        Object.entries(orderUpdate).forEach(([k, v]) => {
          updates[\`buyer_orders/\${orderId}/\${k}\`] = v;
          updates[\`orders/\${orderId}/\${k}\`] = v;
          if (targetUserId) {
            updates[\`users/\${targetUserId}/orders/\${orderId}/\${k}\`] = v;
            updates[\`users/\${targetUserId}/buyer_orders/\${orderId}/\${k}\`] = v;
            updates[\`users/\${targetUserId}/buyerOrders/\${orderId}/\${k}\`] = v;
          }
        });

        const logId = \`log_\${now}\`;
        updates[\`admin_logs/\${logId}\`] = {
          id: logId,
          action: "approve_order",
          orderId,
          userId: targetUserId,
          amount: safeOrderTotal || 0,
          quantity: activeOrder.quantity || 1,
          timestamp: now,
          adminNote: finalAdminNote
        };

        if (targetUserId && safeOrderTotal > 0) {
           const userSnap = await get(ref(db, \`users/\${targetUserId}\`));
           const walletSnap = await get(ref(db, \`buyer_wallets/\${targetUserId}\`));
           const uData = userSnap.val() || {};
           const wData = walletSnap.val() || {};

           let curReserved = Number(wData.reserved_balance ?? uData.reserved_balance ?? 0);
           const newReserved = Math.max(0, Number((curReserved - safeOrderTotal).toFixed(2)));

           updates[\`users/\${targetUserId}/reserved_balance\`] = newReserved;
           updates[\`buyer_wallets/\${targetUserId}/reserved_balance\`] = newReserved;

           const txId = \`tx_buy_\${now}\`;
           updates[\`transactions/\${txId}\`] = {
              id: txId,
              userId: targetUserId,
              userName: activeOrder.userName || "Buyer",
              type: "buyer_purchase",
              amount: safeOrderTotal,
              orderId: orderId,
              productTitle: activeOrder.productTitle || "Gmail Accounts",
              quantity: activeOrder.quantity || 1,
              status: "completed",
              timestamp: now,
              note: \`Order #\${orderId} Delivered & Escrow Settled\`
           };
        }

        if (activeOrder.productId && deliveredAccounts.length > 0) {
           const bankSnap = await get(ref(db, \`buyer_credentials_bank/\${activeOrder.productId}\`));
           const bankNode = bankSnap.val();
           if (bankNode) {
              Object.entries(bankNode).forEach(([k, v]: [string, any]) => {
                 if (v && deliveredAccounts.some(d => d.email.toLowerCase() === (v.email || "").toLowerCase())) {
                    updates[\`buyer_credentials_bank/\${activeOrder.productId}/\${k}/status\`] = "sold";
                    updates[\`buyer_credentials_bank/\${activeOrder.productId}/\${k}/soldAt\`] = now;
                    updates[\`buyer_credentials_bank/\${activeOrder.productId}/\${k}/soldToOrderId\`] = orderId;
                 }
              });
           }
        }

        if (targetUserId) {
           const notifId = \`notif_ord_\${now}\`;
           updates[\`users/\${targetUserId}/notifications/\${notifId}\`] = {
              id: notifId,
              title: "✅ অর্ডার ডেলিভারি সম্পন্ন!",
              message: \`আপনার অর্ডার #\${orderId} সফলভাবে ডেলিভারি করা হয়েছে। My Orders থেকে জিমেইল ও পাসওয়ার্ড দেখে নিন।\`,
              type: "order_delivered",
              orderId: orderId,
              timestamp: now,
              read: false
           };
        }

        await update(ref(db), updates);
`;

fs.writeFileSync(file, before + approveLogic.trim() + after);
console.log('Successfully patched manual!');
