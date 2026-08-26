import React from 'react';
import { ref, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { ScrollText, Trash2 } from 'lucide-react';

export default function AuditLogs({ data }: any) {
  const logs = data.history || [];

  const clearLogs = async () => {
    const { isConfirmed } = await Swal.fire({
      title: 'Clear Logs?',
      text: 'Are you sure you want to delete all audit logs?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (isConfirmed) {
      try {
        await remove(ref(db, "history"));
        Swal.fire('Cleared', 'Audit history cleared successfully', 'success');
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Permission denied or network error', 'error');
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <ScrollText className="text-slate-600" />
          Audit & Activity Logs
        </h2>
        <button onClick={clearLogs} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors">
          <Trash2 size={16} /> Clear Logs
        </button>
      </div>
      
      <div className="flex-1 p-0">
        {logs.length === 0 && <div className="text-center text-slate-400 py-10">No audit logs recorded</div>}
        
        <div className="divide-y divide-slate-100">
          {logs.map((l: any, i: number) => (
            <div key={l.key || i} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-3">
              <div className="mt-1 w-2 h-2 rounded-full bg-slate-300 shrink-0"></div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-800 text-sm">{l.user || 'Admin'}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{l.time || ''}</span>
                </div>
                <div className="text-slate-600 text-sm">
                  {l.desc || 'Performed an action'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
