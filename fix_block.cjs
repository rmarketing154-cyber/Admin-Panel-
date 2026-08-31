const fs = require('fs');
let content = fs.readFileSync('src/hooks/useAdminData.ts', 'utf8');

const startIndex = content.indexOf('// Extra fallback listeners for Android Apps');
const endIndex = content.indexOf('// Buyer Orders & Delivery Ledger Listener');

const before = content.slice(0, startIndex);
const after = content.slice(endIndex);

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

const block = '// Extra fallback listeners for Android Apps\n' + 
  createListener('Pending_Deposits', 'pendingDepositsRaw') +
  createListener('pending_deposits', 'pendingDepositsRaw2') +
  createListener('AddMoney', 'addMoneyRaws') +
  createListener('Payment_Requests', 'paymentReqRaws2') +
  createListener('Deposit_Requests', 'depReqRaws2') +
  createListener('recharges', 'rechargeReqRaws') + '\n      ';

fs.writeFileSync('src/hooks/useAdminData.ts', before + block + after);
console.log("Fixed block.");
