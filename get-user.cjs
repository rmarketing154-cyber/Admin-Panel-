async function run() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const res = await fetch("https://exchanger-pro-default-rtdb.firebaseio.com/users/3ZR7tfJLBMbgptSkqwRn0CF16rV2.json");
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
