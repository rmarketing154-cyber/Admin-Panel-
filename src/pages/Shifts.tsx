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
    } else if (data.shifts) {
      setShifts(data.shifts);
    }
    if (data.settings) {
      setReportTimeEnabled(!!data.settings.report_time_enabled);
      setReceiveTimeEnabled(!!data.settings.receive_time_enabled);
    }
  }, [data.settings, data.shifts]);

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

  const updateShift = (k: string, field: string, value: any) => {
    setShifts(prev => ({
      ...prev,
      [k]: { ...prev[k], [field]: value }
    }));
  };

  const toggleReportTime = async () => {
    const newVal = !reportTimeEnabled;
    setReportTimeEnabled(newVal);
    try {
      await update(ref(db, "settings"), {
        report_time_enabled: newVal
      });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Report Time ${newVal ? 'Enabled' : 'Disabled'}`,
        showConfirmButton: false,
        timer: 1500
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const toggleReceiveTime = async () => {
    const newVal = !receiveTimeEnabled;
    setReceiveTimeEnabled(newVal);
    try {
      await update(ref(db, "settings"), {
        receive_time_enabled: newVal
      });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Receive Time ${newVal ? 'Enabled' : 'Disabled'}`,
        showConfirmButton: false,
        timer: 1500
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const toggleShiftActive = async (k: string, currentActive: boolean) => {
    const newVal = !currentActive;
    const newShifts = {
      ...shifts,
      [k]: { ...shifts[k], active: newVal }
    };
    setShifts(newShifts);
    try {
      await update(ref(db, `settings/review_shifts/${k}`), {
        active: newVal
      });
      await update(ref(db, "settings"), {
        review_shifts: newShifts
      });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Shift ${newVal ? 'Activated' : 'Deactivated'}`,
        showConfirmButton: false,
        timer: 1500
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const saveShifts = async () => {
    try {
      // Prepare normalized shift paths (shift1, shift2, etc.)
      const shiftKeys = Object.keys(shifts);
      const shiftUpdates: Record<string, any> = {};
      
      shiftKeys.forEach((k, idx) => {
        const sObj = shifts[k];
        shiftUpdates[`shift${idx + 1}`] = {
          title: sObj.title || `Shift ${idx + 1}`,
          time: sObj.time || '10:00 AM - 02:00 PM',
          active: sObj.active !== false
        };
      });

      await update(ref(db, "shifts"), shiftUpdates);

      await update(ref(db, "settings"), {
        review_shifts: shifts,
        report_time_enabled: reportTimeEnabled,
        receive_time_enabled: receiveTimeEnabled
      });

      Swal.fire('Saved', 'Review shifts & timetable settings saved successfully!', 'success');
    } catch (e: any) {
      console.error('Error saving shifts:', e);
      Swal.fire('Error', 'Failed to save shifts: ' + (e.message || ''), 'error');
    }
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Clock className="text-indigo-500" />
          Review Shifts Timetable & Status (রিভিউ শিফট অন/অফ)
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
            onClick={toggleReportTime}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all select-none ${reportTimeEnabled ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
          >
            <div>
              <div className={`font-bold ${reportTimeEnabled ? 'text-indigo-900' : 'text-slate-700'}`}>Report Time</div>
              <div className="text-xs text-slate-500">Enable or disable Report Time for users</div>
            </div>
            {reportTimeEnabled ? <ToggleRight size={32} className="text-indigo-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
          </div>

          <div 
            onClick={toggleReceiveTime}
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
        {Object.keys(shifts).length === 0 && <div className="text-center text-slate-400 py-10">No review shifts configured. Click 'Add Shift' to create one.</div>}
        
        {Object.keys(shifts).map(k => {
          const s = shifts[k];
          const isActive = s.active !== false;
          return (
            <div key={k} className={`bg-white border rounded-xl p-5 shadow-sm relative transition-all ${isActive ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-200 bg-slate-50/50 opacity-80'}`}>
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Shift Status:</span>
                  <button
                    onClick={() => toggleShiftActive(k, isActive)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {isActive ? 'Active (ON)' : 'Inactive (OFF)'}
                  </button>
                </div>
                <button onClick={() => deleteShift(k)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Shift Title</label>
                  <input 
                    type="text" 
                    value={s.title || ''} 
                    onChange={e => updateShift(k, 'title', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm font-bold text-slate-800"
                    placeholder="e.g. Morning Shift"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Time Range</label>
                  <input 
                    type="text" 
                    value={s.time || ''} 
                    onChange={e => updateShift(k, 'time', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm font-bold text-slate-800"
                    placeholder="e.g. 10:00 AM - 12:00 PM"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <button onClick={saveShifts} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-indigo-600/20">
          <Save size={18} /> Save Shifts & Settings
        </button>
      </div>
    </div>
  );
}
