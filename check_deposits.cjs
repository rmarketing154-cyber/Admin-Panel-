const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com` // Adjust if needed
});
const db = admin.database();

async function check() {
  try {
    const snapshot = await db.ref('buyer_deposits').once('value');
    console.log("Buyer Deposits:", snapshot.val());
  } catch (e) {
    console.error("Error", e);
  }
  process.exit(0);
}
check();
