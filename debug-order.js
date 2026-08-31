const fs = require('fs');
async function run() {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch("https://exchanger-pro-default-rtdb.firebaseio.com/buyer_orders.json?limitToLast=1");
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
