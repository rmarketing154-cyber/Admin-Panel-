import React, { useState } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { Megaphone, Save } from 'lucide-react';

export default function Notices({ data }: any) {
  const s = data.settings || {};
  
  const [controls, setControls] = useState({
    broadcast: s.broadcast || '',
    maintenance: s.maintenance_msg || '',
    mntMode: s.maintenance_mode || false,
    wdDisabled: s.withdraw_disabled || false
  });

  const saveControls = async () => {
    await update(ref(db, "settings"), {
      broadcast: controls.broadcast,
      maintenance_msg: controls.maintenance,
      maintenance_mode: controls.mntMode,
      withdraw_disabled: controls.wdDisabled
    });
    Swal.fire('Saved', 'App controls & notices updated', 'success');
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 font-bold text-slate-800">
        <Megaphone className="text-amber-500" size={20} /> Notice & Maintenance Mode
      </div>
      
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Top Banner Marquee Text</label>
          <textarea 
            value={controls.broadcast} 
            onChange={e => setControls({...controls, broadcast: e.target.value})} 
            rows={2} 
            placeholder="Important announcement goes here..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
          ></textarea>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Maintenance Notice (Shows when Maintenance Mode is ON)</label>
          <input 
            type="text" 
            value={controls.maintenance} 
            onChange={e => setControls({...controls, maintenance: e.target.value})} 
            placeholder="Server upgrade in progress..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 pt-2">
          <label className="flex items-center gap-4 cursor-pointer bg-slate-50 border border-slate-200 p-4 rounded-xl flex-1 hover:border-indigo-300 transition-colors">
            <div className="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                checked={controls.mntMode} 
                onChange={e => setControls({...controls, mntMode: e.target.checked})} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <div>
              <div className="font-bold text-slate-800">Maintenance Mode</div>
              <div className="text-xs text-slate-500 mt-0.5">Turn on to block user access temporarily</div>
            </div>
          </label>

          <label className="flex items-center gap-4 cursor-pointer bg-slate-50 border border-slate-200 p-4 rounded-xl flex-1 hover:border-indigo-300 transition-colors">
            <div className="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                checked={controls.wdDisabled} 
                onChange={e => setControls({...controls, wdDisabled: e.target.checked})} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </div>
            <div>
              <div className="font-bold text-slate-800">Disable Withdrawals</div>
              <div className="text-xs text-slate-500 mt-0.5">Pause all new cashout requests</div>
            </div>
          </label>
        </div>

        <button onClick={saveControls} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors mt-6">
          <Save size={18} /> Save Notice & Controls
        </button>
      </div>
    </div>
  );
}
