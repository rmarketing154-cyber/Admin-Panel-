const fs = require('fs');
let content = fs.readFileSync('src/pages/Referrals.tsx', 'utf-8');

// Replace the top header part of the inner drop-down
const regexDropdownWrapper = /<div className="bg-slate-50\/50 border-t border-slate-100 p-4 px-6 pb-6 shadow-inner">/s;
const dropdownReplacement = `<div className="bg-white border-t border-slate-100 p-5 px-6 pb-6 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-indigo-500"></div>`;
                        
content = content.replace(regexDropdownWrapper, dropdownReplacement);

// Make the list wrapper borderless
const regexListWrapper = /<div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">/s;
const listWrapperReplacement = `<div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-100">`;
content = content.replace(regexListWrapper, listWrapperReplacement);

fs.writeFileSync('src/pages/Referrals.tsx', content);
console.log('Styled');
