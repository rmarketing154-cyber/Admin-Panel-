const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/users',
  method: 'GET',
  headers: {
    'x-admin-secret': 'mailfactory-admin-secret-2026'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Success:', json.success, 'Count:', json.count);
      const user = json.users ? json.users.find(u => u.uid === '3ZR7tfJLBMbgptSkqwRn0CF16rV2' || u.email?.includes('135')) : null;
      console.log('Target user in DB:', JSON.stringify(user, null, 2));
    } catch (e) {
      console.error('Error parsing:', e.message, data);
    }
  });
});
req.on('error', e => console.error(e));
req.end();
