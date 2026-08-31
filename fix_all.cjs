const fs = require('fs');
let content = fs.readFileSync('src/hooks/useAdminData.ts', 'utf8');

// I will just change all occurrences of `...depVal` to `...(depVal as any)`
content = content.replace(/\.\.\.depVal/g, '...(depVal as any)');
content = content.replace(/\.\.\.vv/g, '...(vv as any)');

fs.writeFileSync('src/hooks/useAdminData.ts', content);
console.log("Fixed spread operators.");
