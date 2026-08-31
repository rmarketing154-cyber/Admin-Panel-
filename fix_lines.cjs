const fs = require('fs');
const lines = fs.readFileSync('src/hooks/useAdminData.ts', 'utf8').split('\n');

const createListener = (path, varName) => `
      onValue(ref(db, "${path}"), (snap) => {
        ${varName} = [];
        if (snap.exists()) {
          snap.forEach(c => {
            const val = c.val();
            if (val.amount !== undefined || val.status || val.trxId) {
              ${varName}.push({ id: c.key, ...val });
            } else if (typeof val === 'object') {
              Object.entries(val).forEach(([k, vv]) => {
                if (vv && typeof vv === 'object') {
                  ${varName}.push({ id: k, userId: c.key, ...(vv as any) });
                }
              });
            }
          });
        }
        mergeAndSetDeposits();
      });
`;

let newContent = '';
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onValue(ref(db, "Pending_Deposits")') || lines[i].includes('onValue(ref(db, "pending_deposits")')) {
    // skip these lines
  } else {
    newContent += lines[i] + '\n';
  }
}

newContent = newContent.replace('// Extra fallback listeners for Android Apps', 
  '// Extra fallback listeners for Android Apps' + 
  createListener('Pending_Deposits', 'pendingDepositsRaw') +
  createListener('pending_deposits', 'pendingDepositsRaw2')
);

fs.writeFileSync('src/hooks/useAdminData.ts', newContent);
console.log("Fixed lines.");
