import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
const app = initializeApp({
  databaseURL: "https://exchanger-pro-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);
get(ref(db, 'settings/payment_methods')).then(s => {
  console.log(JSON.stringify(s.val(), null, 2));
  process.exit(0);
});
