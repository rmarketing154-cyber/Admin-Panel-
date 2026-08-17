const fs = require('fs');
let content = fs.readFileSync('src/pages/Users.tsx', 'utf-8');

// 1. Add sorting and isNew check in list logic
const searchLogic = `  if (search) {
    const s = search.toLowerCase();
    list = list.filter((u:any) => 
      (u.username?.toLowerCase().includes(s)) ||
      (u.email?.toLowerCase().includes(s)) ||
      (u.uid?.toLowerCase().includes(s))
    );
  }`;

const sortedLogic = searchLogic + `\n\n  // Sort by newest first\n  list = [...list].sort((a: any, b: any) => {\n    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;\n    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;\n    return timeB - timeA;\n  });`;

content = content.replace(searchLogic, sortedLogic);

// 2. Add 'New' badge in list view
const listRowBadge = `{u.isTopSeller && <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-700">Top Seller</span>}`;
const listRowBadgeWithNew = listRowBadge + `\n                  {u.createdAt && (Date.now() - new Date(u.createdAt).getTime() < 24 * 60 * 60 * 1000) && <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-red-100 text-red-600 border border-red-200 animate-pulse shadow-sm">24h New</span>}`;

content = content.replace(listRowBadge, listRowBadgeWithNew);

// 3. Add 'New' badge in profile header view
const profileRowBadge = `{selectedUser.is_blocked && <ShieldBan size={20} className="text-red-500" title="Blocked" />}`;
const profileRowBadgeWithNew = profileRowBadge + `\n                  {selectedUser.createdAt && (Date.now() - new Date(selectedUser.createdAt).getTime() < 24 * 60 * 60 * 1000) && <span className="px-3 py-1 rounded-md text-xs uppercase font-black tracking-widest bg-red-100 text-red-600 border border-red-200 animate-pulse shadow-sm ml-2">NEW</span>}`;

content = content.replace(profileRowBadge, profileRowBadgeWithNew);

fs.writeFileSync('src/pages/Users.tsx', content);
console.log('Successfully updated Users.tsx with sort and New badge');
