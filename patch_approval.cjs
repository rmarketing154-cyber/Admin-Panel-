const fs = require('fs');
let content = fs.readFileSync('src/pages/buying/BuyerDepositsManager.tsx', 'utf8');

content = content.replace(
  "updates[`user_deposits/${dep.id}/approvedBy`] = adminEmail || 'Admin';",
  "updates[`user_deposits/${dep.id}/approvedBy`] = adminEmail || 'Admin';\n          updates[`payment_requests/${dep.id}/status`] = 'approved';\n          updates[`payment_requests/${dep.id}/approvedAt`] = now;\n          updates[`payment_requests/${dep.id}/approvedBy`] = adminEmail || 'Admin';"
);

content = content.replace(
  "updates[`user_deposits/${dep.id}/rejectedBy`] = adminEmail || 'Admin';",
  "updates[`user_deposits/${dep.id}/rejectedBy`] = adminEmail || 'Admin';\n          updates[`payment_requests/${dep.id}/status`] = 'rejected';\n          updates[`payment_requests/${dep.id}/rejectReason`] = reason;\n          updates[`payment_requests/${dep.id}/rejectedAt`] = now;\n          updates[`payment_requests/${dep.id}/rejectedBy`] = adminEmail || 'Admin';"
);

fs.writeFileSync('src/pages/buying/BuyerDepositsManager.tsx', content);
console.log("Patched deposits manager.");
