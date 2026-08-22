import React, { useState, useEffect } from 'react';
import { ref, set, update } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { Clock, Plus, Trash2, Save, Send, Download, ToggleLeft, ToggleRight } from 'lucide-react';

export default function Shifts({ data }: any) {
  const [shifts, setShifts] = useState<Record<string, any>>({});
  const [reportTimeEnabled, setReportTimeEnabled] = useState(false);
  const [receiveTimeEnabled, setReceiveTimeEnabled] = useState(false);

  useEffect(() => {
    if (data.settings?.review_shifts) {
      setShifts(data.settings.review_shifts);
    }
    if (data.settings) {
      setReportTimeEnabled(!!data.settings.report_time_enabled);
      setReceiveTimeEnabled(!!data.settings.receive_time_enabled);
    }
  }, [data.settings]);

  const addShift = () => {
    const k = `shift_${Date.now()}`;
    setShifts(prev => ({
      ...prev,
      [k]: { title: 'New Shift', time: '10:00 AM - 12:00 PM', active: true }
    }));
  };

  const deleteShift = (k: string) => {
    const newShifts = { ...shifts };
    delete newShifts[k];
    setShifts(newShifts);
  };

  const updateShift = (k: string, field: string, value: string) => {
    setShifts(prev => ({
      ...prev,
      [k]: { ...prev[k], [field]: value }
    }));
  };

  const saveShifts = async () => {
    await update(ref(db, "settings"), {
      review_shifts: shifts,
      report_time_enabled: reportTimeEnabled,
      receive_time_enabled: receiveTimeEnabled
    });
    Swal.fire('Saved', 'Shifts timetable & settings saved', 'success');
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Clock className="text-indigo-500" />
          Review Shifts Timetable
        </h2>
        <button onClick={addShift} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors">
          <Plus size={16} /> Add Shift
        </button>
      </div>
      
      <div className="p-6 border-b border-slate-100 bg-white">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          Global Time Settings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div 
            onClick={() => setReportTimeEnabled(!reportTimeEnabled)}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all select-none ${reportTimeEnabled ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
          >
            <div>
              <div className={`font-bold ${reportTimeEnabled ? 'text-indigo-900' : 'text-slate-700'}`}>Report Time</div>
              <div className="text-xs text-slate-500">Enable or disable Report Time for users</div>
            </div>
            {reportTimeEnabled ? <ToggleRight size={32} className="text-indigo-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
          </div>

          <div 
            onClick={() => setReceiveTimeEnabled(!receiveTimeEnabled)}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all select-none ${receiveTimeEnabled ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
          >
            <div>
              <div className={`font-bold ${receiveTimeEnabled ? 'text-emerald-900' : 'text-slate-700'}`}>Receive Time</div>
              <div className="text-xs text-slate-500">Enable or disable Receive Time for users</div>
            </div>
            {receiveTimeEnabled ? <ToggleRight size={32} className="text-emerald-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {Object.keys(shifts).length === 0 && <div className="text-center text-slate-400 py-10">No shifts configured</div>}
        
        {Object.keys(shifts).map(k => {
          const s = shifts[k];
          return (
            <div key={k} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative">
              <button onClick={() => deleteShift(k)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Shift Title</label>
                  <input 
                    type="text" 
                    value={s.title || ''} 
                    onChange={e => updateShift(k, 'title', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Time Range</label>
                  <input 
                    type="text" 
                    value={s.time || ''} 
                    onChange={e => updateShift(k, 'time', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <button onClick={saveShifts} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
          <Save size={18} /> Save Shifts & Settings
        </button>
      </div>
    </div>
  );
}
