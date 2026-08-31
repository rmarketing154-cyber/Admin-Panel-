const admin = require('firebase-admin');
const fs = require('fs');

try {
  const serviceAccount = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
  });
  
  const db = admin.database();
  
  async function check() {
    const snap = await db.ref('deposit_requests').orderByChild('status').equalTo('pending').once('value');
    console.log("deposit_requests pending keys:", snap.exists() ? Object.keys(snap.val()) : "none");
    if(snap.exists()) {
       console.log("Sample pending deposit:", Object.values(snap.val())[0]);
    }
    
    const snap2 = await db.ref('deposits').orderByChild('status').equalTo('pending').once('value');
    console.log("deposits pending keys:", snap2.exists() ? Object.keys(snap2.val()) : "none");

    const snap3 = await db.ref('user_deposits').orderByChild('status').equalTo('pending').once('value');
    console.log("user_deposits pending keys:", snap3.exists() ? Object.keys(snap3.val()) : "none");

    process.exit(0);
  }
  
  check();
} catch (e) {
  console.error("Error", e);
  process.exit(1);
}
