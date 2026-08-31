const http = require('http');

http.get('http://localhost:3000/api/admin/users', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Total users:', json.users?.length);
      console.log('Users sample:', json.users?.slice(0, 5));
    } catch (e) {
      console.error('Error:', e);
    }
  });
});
