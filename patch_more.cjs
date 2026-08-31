const fs = require('fs');
let content = fs.readFileSync('src/hooks/useAdminData.ts', 'utf8');

// Add variables
content = content.replace("    let addMoneyRaws: any[] = [];", "    let addMoneyRaws: any[] = [];\n    let pendingDepositsRaw: any[] = [];\n    let pendingDepositsRaw2: any[] = [];");

// Add to allRaws
content = content.replace("...rechargeReqRaws", "...rechargeReqRaws,\n        ...pendingDepositsRaw,\n        ...pendingDepositsRaw2");

// Add listeners
content = content.replace("// Extra fallback listeners for Android Apps", `// Extra fallback listeners for Android Apps
      onValue(ref(db, "Pending_Deposits"), (snap) => { pendingDepositsRaw = []; if(snap.exists()) { snap.forEach(c => { const v=c.val(); if(v.amount!==undefined||v.trxId){ pendingDepositsRaw.push({id:c.key,...v});}else if(typeof v==='object'){ Object.entries(v).forEach(([k,vv])=>{ if(vv&&typeof vv==='object')pendingDepositsRaw.push({id:k,userId:c.key,...vv}); });} }); } mergeAndSetDeposits(); });
      onValue(ref(db, "pending_deposits"), (snap) => { pendingDepositsRaw2 = []; if(snap.exists()) { snap.forEach(c => { const v=c.val(); if(v.amount!==undefined||v.trxId){ pendingDepositsRaw2.push({id:c.key,...v});}else if(typeof v==='object'){ Object.entries(v).forEach(([k,vv])=>{ if(vv&&typeof vv==='object')pendingDepositsRaw2.push({id:k,userId:c.key,...vv}); });} }); } mergeAndSetDeposits(); });
`);

fs.writeFileSync('src/hooks/useAdminData.ts', content);
console.log("Patched more.");
