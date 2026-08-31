const fs = require('fs');
let content = fs.readFileSync('src/hooks/useAdminData.ts', 'utf8');

const parseCode = (varName) => `        ${varName} = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            // check if it's a direct deposit object (has amount or status)
            if (val.amount !== undefined || val.status || val.trxId) {
              ${varName}.push({ id: c.key, ...val });
            } else if (typeof val === 'object') {
              // probably nested by uid: parent -> uid -> {depId: dep}
              Object.entries(val).forEach(([depId, depVal]) => {
                if (depVal && typeof depVal === 'object') {
                   ${varName}.push({ id: depId, userId: c.key, ...depVal });
                }
              });
            }
          });
        }`;

content = content.replace(/userDepositsRaw = \[\];[\s\S]*?mergeAndSetDeposits\(\);/, parseCode('userDepositsRaw') + '\n        mergeAndSetDeposits();');
content = content.replace(/paymentRequestsRaw = \[\];[\s\S]*?mergeAndSetDeposits\(\);/, parseCode('paymentRequestsRaw') + '\n        mergeAndSetDeposits();');
content = content.replace(/depositRequestsRaw = \[\];[\s\S]*?mergeAndSetDeposits\(\);/, parseCode('depositRequestsRaw') + '\n        mergeAndSetDeposits();');
content = content.replace(/buyerDepositsRaw = \[\];[\s\S]*?mergeAndSetDeposits\(\);/, parseCode('buyerDepositsRaw') + '\n        mergeAndSetDeposits();');
content = content.replace(/depositsRaw = \[\];[\s\S]*?mergeAndSetDeposits\(\);/, parseCode('depositsRaw') + '\n        mergeAndSetDeposits();');

fs.writeFileSync('src/hooks/useAdminData.ts', content);
console.log("Patched all deposit listeners to handle nested uid objects.");
