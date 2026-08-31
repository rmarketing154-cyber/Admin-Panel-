async function run() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  // Call the admin users endpoint
  const res = await fetch("http://localhost:3000/api/admin/users", {
    headers: { "x-admin-secret": "mailfactory-admin-secret-2026" }
  });
  const data = await res.json();
  if (data.users && data.users.length > 0) {
    console.log(JSON.stringify(data.users[0], null, 2));
  } else {
    console.log("No users found:", data);
  }
}
run();
