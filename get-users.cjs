async function run() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const res = await fetch("http://localhost:3000/api/admin/users", {
    headers: { "x-admin-secret": "mailfactory-admin-secret-2026" }
  });
  const data = await res.json();
  const u = data.users.find(u => u.uid === "3ZR7tfJLBMbgptSkqwRn0CF16rV2" || u.id === "3ZR7tfJLBMbgptSkqwRn0CF16rV2" || u.key === "3ZR7tfJLBMbgptSkqwRn0CF16rV2") || data.users[0];
  console.log(JSON.stringify(u, null, 2));
}
run();
