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
async function test() {
  for (const path of paths) {
    try {
      await set(ref(db, path), payments);
      console.log(path, "SUCCESS");
    } catch (e) {
      console.log(path, "ERROR", e.message);
    }
  }
  process.exit(0);
}
test();
