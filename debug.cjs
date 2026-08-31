async function run() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const resUsers = await fetch("https://exchanger-pro-default-rtdb.firebaseio.com/users.json?shallow=true");
  console.log("Users:", await resUsers.json());
}
run();
