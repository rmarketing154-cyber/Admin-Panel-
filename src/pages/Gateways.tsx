import React, { useState, useEffect } from 'react';
import { ref, set } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { CreditCard, Plus, Save } from 'lucide-react';

export default function Gateways({ data }: any) {
  const [payments, setPayments] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data.settings?.payment_methods) {
      setPayments(data.settings.payment_methods);
    }
  }, [data.settings]);

  const addGateway = () => {
    Swal.fire({
      title: 'Add Gateway',
      html: `
        <input type="text" id="gName" class="swal2-input w-full mx-0 mb-3" placeholder="e.g. Upay">
        <input type="color" id="gCol" class="swal2-input w-full mx-0 h-12 p-1" value="#00A651">
      `,
      showCancelButton: true
    }).then(r => {
      if (r.isConfirmed) {
        const name = (document.getElementById('gName') as HTMLInputElement).value;
        const color = (document.getElementById('gCol') as HTMLInputElement).value;
        if (name) {
          setPayments(prev => ({
            ...prev,
            [`method_${Date.now()}`]: { name, color, active: true }
          }));
        }
      }
    });
  };

  const updateGateway = (k: string, field: string, value: any) => {
    setPayments(prev => ({
      ...prev,
      [k]: { ...prev[k], [field]: value }
    }));
  };

  const saveGateways = async () => {
    await set(ref(db, "settings/payment_methods"), payments);
    Swal.fire('Saved', 'Payment gateways updated', 'success');
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="text-indigo-500" />
          Payment Gateways
        </h2>
        <button onClick={addGateway} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors">
          <Plus size={16} /> Add Gateway
        </button>
      </div>
      
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {Object.keys(payments).map(k => {
          const p = payments[k];
          return (
            <div key={k} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ backgroundColor: p.color || '#4F46E5' }}></div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Gateway Name</label>
                  <input 
                    type="text" 
                    value={p.name || ''} 
                    onChange={e => updateGateway(k, 'name', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Brand Color</label>
                    <input 
                      type="color" 
                      value={p.color || '#4F46E5'} 
                      onChange={e => updateGateway(k, 'color', e.target.value)}
                      className="w-full h-10 p-1 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col items-center pt-5">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={p.active !== false} 
                        onChange={e => updateGateway(k, 'active', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Active</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <button onClick={saveGateways} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
          <Save size={18} /> Save Settings
        </button>
      </div>
    </div>
  );
}
