async function run() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const res = await fetch("https://exchanger-pro-default-rtdb.firebaseio.com/users.json?auth=FAKE_TOKEN");
  const data = await res.json();
  console.log(data);
}
run();
