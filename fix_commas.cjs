const fs = require('fs');
let content = fs.readFileSync('src/hooks/useAdminData.ts', 'utf8');

// The listeners I added were missing commas!
content = content.replace(/mergeAndSetDeposits\(\);\n      \}\)/g, 'mergeAndSetDeposits();\n      }),');

fs.writeFileSync('src/hooks/useAdminData.ts', content);
console.log("Added commas.");
