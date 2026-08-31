const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.database();

async function check() {
  const snapshot = await db.ref('buyer_deposits').once('value');
  console.log("Buyer Deposits:", snapshot.val());
  process.exit(0);
}
check();
