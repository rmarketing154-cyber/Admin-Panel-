const fs = require('fs');
let content = fs.readFileSync('src/pages/Submissions.tsx', 'utf8');

const target1 = `        <button 
          onClick={exportSubmissionsCSV}`;

const replace1 = `        <div className="flex flex-wrap items-center justify-end gap-3">
          <div 
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl cursor-pointer select-none"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw size={14} className={autoRefresh ? "text-indigo-600 animate-spin" : "text-slate-400"} />
            <span className="text-xs font-bold text-slate-700">Auto Refresh</span>
            {autoRefresh ? <ToggleRight size={24} className="text-indigo-600" /> : <ToggleLeft size={24} className="text-slate-300" />}
          </div>
          <button 
            onClick={exportSubmissionsCSV}`;

const target2 = `          <Download size={14} /> Export CSV
        </button>
      </div>`;

const replace2 = `          <Download size={14} /> Export CSV
        </button>
        </div>
      </div>`;

content = content.replace(target1, replace1).replace(target2, replace2);
fs.writeFileSync('src/pages/Submissions.tsx', content);
