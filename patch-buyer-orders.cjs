const fs = require('fs');

const file = 'src/pages/buying/BuyerOrdersManager.tsx';
let content = fs.readFileSync(file, 'utf8');

const rejectLogic = `
      try {
        const orderId = activeOrder.id;
        const targetUserId = activeOrder.userId || activeOrder.user_id || activeOrder.uid || activeOrder.userUid;
        const now = Date.now();
        const updates: Record<string, any> = {};

        // Cancel the order
        updates[\`buyer_orders/\${orderId}/status\`] = "cancelled";
        updates[\`buyer_orders/\${orderId}/warrantyStatus\`] = "cancelled";
        updates[\`buyer_orders/\${orderId}/adminNote\`] = reason;
        updates[\`buyer_orders/\${orderId}/updatedAt\`] = now;

        updates[\`orders/\${orderId}/status\`] = "cancelled";
        updates[\`orders/\${orderId}/warrantyStatus\`] = "cancelled";
        updates[\`orders/\${orderId}/adminNote\`] = reason;
        updates[\`orders/\${orderId}/updatedAt\`] = now;

        if (targetUserId) {
          updates[\`users/\${targetUserId}/orders/\${orderId}/status\`] = "cancelled";
          updates[\`users/\${targetUserId}/orders/\${orderId}/warrantyStatus\`] = "cancelled";
          updates[\`users/\${targetUserId}/orders/\${orderId}/adminNote\`] = reason;
          updates[\`users/\${targetUserId}/orders/\${orderId}/updatedAt\`] = now;

          updates[\`users/\${targetUserId}/buyer_orders/\${orderId}/status\`] = "cancelled";
          updates[\`users/\${targetUserId}/buyer_orders/\${orderId}/warrantyStatus\`] = "cancelled";
          updates[\`users/\${targetUserId}/buyer_orders/\${orderId}/adminNote\`] = reason;
          updates[\`users/\${targetUserId}/buyer_orders/\${orderId}/updatedAt\`] = now;
          
          updates[\`users/\${targetUserId}/buyerOrders/\${orderId}/status\`] = "cancelled";
          updates[\`users/\${targetUserId}/buyerOrders/\${orderId}/warrantyStatus\`] = "cancelled";
          updates[\`users/\${targetUserId}/buyerOrders/\${orderId}/adminNote\`] = reason;
          updates[\`users/\${targetUserId}/buyerOrders/\${orderId}/updatedAt\`] = now;
        }

        // Refund reserved balance
        const totalAmountVal = Number(
          activeOrder.totalAmount ?? 
          activeOrder.amount ?? 
          activeOrder.total_amount ?? 
          (Number(activeOrder.unitPrice || activeOrder.price || 0) * Number(activeOrder.quantity || 1))
        );
        const safeOrderAmt = isNaN(totalAmountVal) ? 0 : totalAmountVal;

        if (targetUserId && safeOrderAmt > 0) {
           // Fetch fresh user and wallet data directly from RTDB to ensure atomic accuracy
           const userSnap = await get(ref(db, \`users/\${targetUserId}\`));
           const walletSnap = await get(ref(db, \`buyer_wallets/\${targetUserId}\`));
           const uData = userSnap.val() || {};
           const wData = walletSnap.val() || {};

           let curBal = Number(wData.balance ?? uData.buyerWalletBalance ?? 0);
           let curReserved = Number(wData.reserved_balance ?? uData.reserved_balance ?? 0);

           const newBal = Number((curBal + safeOrderAmt).toFixed(2));
           const newReserved = Math.max(0, Number((curReserved - safeOrderAmt).toFixed(2)));

           updates[\`users/\${targetUserId}/buyerWalletBalance\`] = newBal;
           updates[\`users/\${targetUserId}/reserved_balance\`] = newReserved;
           updates[\`buyer_wallets/\${targetUserId}/balance\`] = newBal;
           updates[\`buyer_wallets/\${targetUserId}/reserved_balance\`] = newReserved;
           updates[\`buyer_wallets/\${targetUserId}/lastRefundAt\`] = now;

           const txId = \`tx_ref_\${now}\`;
           updates[\`transactions/\${txId}\`] = {
              id: txId,
              userId: targetUserId,
              type: "refund",
              amount: safeOrderAmt,
              balanceAfter: newBal,
              description: \`Refund for Order #\${orderId.slice(-6)}: \${reason} (Escrow released)\`,
              timestamp: now,
              status: "completed"
           };

           const notifId = \`notif_ref_\${now}\`;
           updates[\`users/\${targetUserId}/notifications/\${notifId}\`] = {
              id: notifId,
              title: "অর্ডার বাতিল ও রিফান্ড! 💸",
              message: \`আপনার অর্ডার #\${orderId.slice(-6)} বাতিল করা হয়েছে এবং এস্ক্রো হোল্ড ৳\${safeOrderAmt} রিফান্ড আপনার মেইন ওয়ালেটে ফেরত দেওয়া হয়েছে।\`,
              type: "order_refunded",
              timestamp: now,
              read: false
           };
        }

        // Restore stock
        if (activeOrder.productId) {
           const pSnap = await get(ref(db, \`buyer_products/\${activeOrder.productId}\`));
           const prod = pSnap.val();
           if (prod) {
             const newStock = (prod.stock || 0) + (activeOrder.quantity || 1);
             updates[\`buyer_products/\${activeOrder.productId}/stock\`] = newStock;
             updates[\`products/\${activeOrder.productId}/stock\`] = newStock;
           }
        }

        await update(ref(db), updates);
`;

const rejectRegex = /try \{\s*\/\/\ 1\.\ Backend Server API for guaranteed order refund & status cancellation[\s\S]*?const resData = await res\.json\(\);[\s\S]*?if \(!res\.ok \|\| !resData\.success\) \{[\s\S]*?throw new Error\(resData\.error \|\| 'Server error occurred during rejection\.'\);[\s\S]*?\}[\s\S]*?\} catch \(apiErr: any\) \{[\s\S]*?console\.error\('API reject order error:', apiErr\);[\s\S]*?throw apiErr;[\s\S]*?\}/;

content = content.replace(rejectRegex, rejectLogic.trim());

// Also replace the Approve logic!

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
          amount: activeOrder.totalAmount || 0,
          quantity: activeOrder.quantity || 1,
          timestamp: now,
          adminNote: finalAdminNote
        };

        const totalAmountVal = Number(
          activeOrder.totalAmount ?? 
          activeOrder.amount ?? 
          activeOrder.total_amount ?? 
          (Number(activeOrder.unitPrice || activeOrder.price || 0) * Number(activeOrder.quantity || 1))
        );
        const safeOrderAmt = isNaN(totalAmountVal) ? 0 : totalAmountVal;

        if (targetUserId && safeOrderAmt > 0) {
           const userSnap = await get(ref(db, \`users/\${targetUserId}\`));
           const walletSnap = await get(ref(db, \`buyer_wallets/\${targetUserId}\`));
           const uData = userSnap.val() || {};
           const wData = walletSnap.val() || {};

           let curReserved = Number(wData.reserved_balance ?? uData.reserved_balance ?? 0);
           const newReserved = Math.max(0, Number((curReserved - safeOrderAmt).toFixed(2)));

           updates[\`users/\${targetUserId}/reserved_balance\`] = newReserved;
           updates[\`buyer_wallets/\${targetUserId}/reserved_balance\`] = newReserved;

           const txId = \`tx_buy_\${now}\`;
           updates[\`transactions/\${txId}\`] = {
              id: txId,
              userId: targetUserId,
              userName: activeOrder.userName || "Buyer",
              type: "buyer_purchase",
              amount: safeOrderAmt,
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

const approveRegex = /try \{\s*\/\/\ 1\.\ Call Backend server for strong validation and atomic update[\s\S]*?const resData = await res\.json\(\);[\s\S]*?if \(!res\.ok \|\| !resData\.success\) \{[\s\S]*?throw new Error\(resData\.error \|\| 'Server error occurred during approval\.'\);[\s\S]*?\}[\s\S]*?\} catch \(apiErr: any\) \{[\s\S]*?console\.error\('API approve order error:', apiErr\);[\s\S]*?throw apiErr;[\s\S]*?\}/;

content = content.replace(approveRegex, approveLogic.trim());

fs.writeFileSync(file, content);
console.log('Patched correctly');
