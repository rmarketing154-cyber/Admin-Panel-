const fs = require('fs');
let content = fs.readFileSync('src/pages/Users.tsx', 'utf-8');

// Replace large avatar
content = content.replace(
  /<div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-4xl shadow-inner border border-indigo-200 shrink-0">\s*\{selectedUser\.username\?\.charAt\(0\)\?\.toUpperCase\(\) \|\| 'U'\}\s*<\/div>/,
  '<div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-4xl shadow-inner border border-indigo-200 shrink-0 overflow-hidden relative">' +
  '{selectedUser.photoURL ? (' +
  '  <img src={selectedUser.photoURL} alt={selectedUser.username} className="w-full h-full object-cover absolute inset-0" onError={(e: any) => { e.currentTarget.style.display = \'none\'; }} />' +
  ') : null}' +
  '<span className={selectedUser.photoURL ? \'opacity-0\' : \'\'}>{selectedUser.username?.charAt(0)?.toUpperCase() || \'U\'}</span>' +
  '</div>'
);

// Replace small avatar
content = content.replace(
  /<div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition-transform">\s*\{u\.username\?\.charAt\(0\)\?\.toUpperCase\(\) \|\| 'U'\}\s*<\/div>/,
  '<div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition-transform overflow-hidden relative">' +
  '{u.photoURL ? (' +
  '  <img src={u.photoURL} alt={u.username} className="w-full h-full object-cover absolute inset-0" onError={(e: any) => { e.currentTarget.style.display = \'none\'; }} />' +
  ') : null}' +
  '<span className={u.photoURL ? \'opacity-0\' : \'\'}>{u.username?.charAt(0)?.toUpperCase() || \'U\'}</span>' +
  '</div>'
);

fs.writeFileSync('src/pages/Users.tsx', content);
console.log('Avatars updated');
