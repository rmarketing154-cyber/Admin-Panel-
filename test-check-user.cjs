const http = require('http');

http.get('http://localhost:3000/api/admin/users', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const user = json.users ? json.users.find(u => u.uid === '3ZR7tfJLBMbgptSkqwRn0CF16rV2' || u.email?.includes('135')) : null;
      console.log('User found:', JSON.stringify(user, null, 2));
    } catch (e) {
      console.error('Error parsing:', e.message);
    }
  });
}).on('error', err => console.error('Request error:', err.message));
