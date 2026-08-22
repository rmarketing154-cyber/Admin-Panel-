const fs = require('fs');
let content = fs.readFileSync('src/pages/Submissions.tsx', 'utf8');
const search = `<div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl cursor-pointer select-none"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw size={14} className={autoRefresh ? "text-indigo-600 animate-spin" : "text-slate-400"} />
            <span className="text-xs font-bold text-slate-700">Auto Refresh</span>
            {autoRefresh ? <ToggleRight size={24} className="text-indigo-600" /> : <ToggleLeft size={24} className="text-slate-300" />}
          </div>
          <button `;
content = content.split(search).join('<button ');
fs.writeFileSync('src/pages/Submissions.tsx', content);
