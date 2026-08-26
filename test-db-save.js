import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
const app = initializeApp({
  databaseURL: "https://exchanger-pro-default-rtdb.firebaseio.com"
});
const db = getDatabase(app);
const payments = { "test": { name: "test", logo: "test", color: "#000", active: true } };
const paths = [
  "settings/payment_methods",
  "settings/withdraw_methods",
  "settings/withdrawal_methods",
  "payment_methods",
  "withdraw_methods",
  "withdrawal_methods"
];
Promise.all(paths.map(path => set(ref(db, path), payments)))
  .then(() => { console.log("SUCCESS"); process.exit(0); })
  .catch(e => { console.log("ERROR", e.message); process.exit(1); });
