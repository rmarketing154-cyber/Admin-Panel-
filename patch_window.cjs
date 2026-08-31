const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

if (!content.includes('window.firebaseDb')) {
  content += `\n\n// Expose for debugging\nif (typeof window !== 'undefined') {\n  (window as any).firebaseDb = db;\n  (window as any).firebaseAuth = auth;\n}\n`;
  fs.writeFileSync('src/lib/firebase.ts', content);
  console.log("Patched firebase.ts for debugging.");
}
