const fs = require('fs');
let content = fs.readFileSync('src/hooks/useAdminData.ts', 'utf8');

content = content.replace(/\}\),\;/g, '}),');

fs.writeFileSync('src/hooks/useAdminData.ts', content);
console.log("Fixed typo.");
