const fs = require('fs');
let content = fs.readFileSync('src/hooks/useAdminData.ts', 'utf8');

const addListener = (dbPath, varName) => `
      onValue(ref(db, "${dbPath}"), (snap) => {
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            if (val.amount !== undefined || val.status || val.trxId) {
              ${varName}.push({ id: c.key, ...val });
            } else if (typeof val === 'object') {
              Object.entries(val).forEach(([depId, depVal]) => {
                if (depVal && typeof depVal === 'object') {
                   ${varName}.push({ id: depId, userId: c.key, ...depVal });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
      });
`;

content = content.replace("const allRaws = [", `
      // Additional fallback arrays
      let addMoneyRaws: any[] = [];
      let paymentReqRaws2: any[] = [];
      let depReqRaws2: any[] = [];
      let rechargeReqRaws: any[] = [];
      
      const allRaws = [
`);

content = content.replace("...transactionsDepositsRaw", `...transactionsDepositsRaw,
        ...addMoneyRaws,
        ...paymentReqRaws2,
        ...depReqRaws2,
        ...rechargeReqRaws`);

content = content.replace("// Buyer Orders & Delivery Ledger Listener", `
      // Extra fallback listeners for Android Apps
      onValue(ref(db, "AddMoney"), (snap) => { addMoneyRaws = []; if(snap.exists()) { snap.forEach(c => { const v=c.val(); if(v.amount!==undefined||v.trxId){ addMoneyRaws.push({id:c.key,...v});}else if(typeof v==='object'){ Object.entries(v).forEach(([k,vv])=>{ if(vv&&typeof vv==='object')addMoneyRaws.push({id:k,userId:c.key,...vv}); });} }); } mergeAndSetDeposits(); });
      onValue(ref(db, "Payment_Requests"), (snap) => { paymentReqRaws2 = []; if(snap.exists()) { snap.forEach(c => { const v=c.val(); if(v.amount!==undefined||v.trxId){ paymentReqRaws2.push({id:c.key,...v});}else if(typeof v==='object'){ Object.entries(v).forEach(([k,vv])=>{ if(vv&&typeof vv==='object')paymentReqRaws2.push({id:k,userId:c.key,...vv}); });} }); } mergeAndSetDeposits(); });
      onValue(ref(db, "Deposit_Requests"), (snap) => { depReqRaws2 = []; if(snap.exists()) { snap.forEach(c => { const v=c.val(); if(v.amount!==undefined||v.trxId){ depReqRaws2.push({id:c.key,...v});}else if(typeof v==='object'){ Object.entries(v).forEach(([k,vv])=>{ if(vv&&typeof vv==='object')depReqRaws2.push({id:k,userId:c.key,...vv}); });} }); } mergeAndSetDeposits(); });
      onValue(ref(db, "recharges"), (snap) => { rechargeReqRaws = []; if(snap.exists()) { snap.forEach(c => { const v=c.val(); if(v.amount!==undefined||v.trxId){ rechargeReqRaws.push({id:c.key,...v});}else if(typeof v==='object'){ Object.entries(v).forEach(([k,vv])=>{ if(vv&&typeof vv==='object')rechargeReqRaws.push({id:k,userId:c.key,...vv}); });} }); } mergeAndSetDeposits(); });

      // Buyer Orders & Delivery Ledger Listener`);

fs.writeFileSync('src/hooks/useAdminData.ts', content);
console.log("Patched more fallback paths.");
