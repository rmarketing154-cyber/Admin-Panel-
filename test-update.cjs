const updates = {};
const targetUserId = "3ZR7tfJLBMbgptSkqwRn0CF16rV2";
const newBal = 100;
const newReserved = 0;
updates[`users/${targetUserId}/buyerWalletBalance`] = newBal;
updates[`users/${targetUserId}/reserved_balance`] = newReserved;
updates[`buyer_wallets/${targetUserId}/balance`] = newBal;
updates[`buyer_wallets/${targetUserId}/reserved_balance`] = newReserved;

const pathGroups = {};
for (const [fullPath, value] of Object.entries(updates || {})) {
  const parts = fullPath.split('/');
  if (parts.length > 1) {
    const leafKey = parts.pop();
    const parentPath = parts.join('/');
    if (!pathGroups[parentPath]) {
      pathGroups[parentPath] = {};
    }
    pathGroups[parentPath][leafKey] = value;
  } else {
    if (!pathGroups[""]) {
      pathGroups[""] = {};
    }
    pathGroups[""][fullPath] = value;
  }
}
console.log(JSON.stringify(pathGroups, null, 2));
