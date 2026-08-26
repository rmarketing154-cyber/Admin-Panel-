import React, { useState, useEffect } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { ShieldAlert, Wrench, Power, Ban, AlertTriangle, Save, CheckCircle2, Megaphone } from 'lucide-react';

export default function Maintenance({ data }: any) {
  const s = data.settings || {};
  const [mntMode, setMntMode] = useState(s.maintenance_mode || false);
  const [wdDisabled, setWdDisabled] = useState(s.withdraw_disabled || false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(s.maintenance_message || 'Our server is currently undergoing scheduled maintenance. Please check back soon.');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (s.maintenance_mode !== undefined) setMntMode(s.maintenance_mode);
    if (s.withdraw_disabled !== undefined) setWdDisabled(s.withdraw_disabled);
    if (s.maintenance_message) setMaintenanceMessage(s.maintenance_message);
  }, [s]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(ref(db, "settings"), {
        maintenance_mode: mntMode,
        withdraw_disabled: wdDisabled,
        maintenance_message: maintenanceMessage
      });
      Swal.fire('Updated', 'Maintenance & System Control settings updated successfully!', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Failed to update maintenance settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Wrench size={14} /> System Security & Emergency Controls
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Maintenance & Access Controls</h1>
          <p className="text-amber-100 text-xs sm:text-sm max-w-2xl">
            Control platform availability, activate maintenance locks, pause financial withdrawals instantly, and broadcast system alerts across the app.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Controls Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-600" /> Operational Lock Switches
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                mntMode ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {mntMode ? '● Maintenance Active' : '● System Online'}
              </span>
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-amber-300 transition-colors">
              <div className="space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Power size={16} className={mntMode ? "text-red-500" : "text-emerald-500"} /> Maintenance Mode
                </div>
                <p className="text-xs text-slate-500">
                  When enabled, users will see the maintenance screen and cannot access earning features or tasks.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  checked={mntMode} 
                  onChange={e => setMntMode(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600 shadow-inner"></div>
              </label>
            </div>

            {/* Withdrawals Disabled Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-amber-300 transition-colors">
              <div className="space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Ban size={16} className={wdDisabled ? "text-red-500" : "text-emerald-500"} /> Disable All Withdrawals
                </div>
                <p className="text-xs text-slate-500">
                  Instantly block users from submitting new cashout requests during payment audits or updates.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  checked={wdDisabled} 
                  onChange={e => setWdDisabled(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600 shadow-inner"></div>
              </label>
            </div>

            {/* Custom Maintenance Message */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Maintenance Notice Message for Users
              </label>
              <textarea
                rows={3}
                value={maintenanceMessage}
                onChange={e => setMaintenanceMessage(e.target.value)}
                placeholder="Enter maintenance notice message..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400">This message will be displayed on the user's screen when maintenance mode is active.</p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
              >
                <Save size={16} /> {saving ? 'Saving Changes...' : 'Save Maintenance Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Side Info Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" /> Emergency Protocols
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-medium">
                <span className="font-bold block mb-1">Maintenance Notice:</span>
                Enabling maintenance mode will instantly prevent all active app clients from submitting tasks or withdrawing funds until disabled.
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold block text-slate-800 mb-1">Withdrawal Freeze:</span>
                Disabling withdrawals keeps the user dashboard accessible for working and checking balances, but blocks new cashout submissions.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
