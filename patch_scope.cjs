const fs = require('fs');
let content = fs.readFileSync('src/hooks/useAdminData.ts', 'utf8');

// Remove from mergeAndSetDeposits
content = content.replace(/      \/\/ Additional fallback arrays\n      let addMoneyRaws: any\[\] = \[\];\n      let paymentReqRaws2: any\[\] = \[\];\n      let depReqRaws2: any\[\] = \[\];\n      let rechargeReqRaws: any\[\] = \[\];\n/, '');

// Add to the top
content = content.replace("    let paymentRequestsRaw: any[] = [];", "    let paymentRequestsRaw: any[] = [];\n    let addMoneyRaws: any[] = [];\n    let paymentReqRaws2: any[] = [];\n    let depReqRaws2: any[] = [];\n    let rechargeReqRaws: any[] = [];");

fs.writeFileSync('src/hooks/useAdminData.ts', content);
console.log("Patched scope issues.");
