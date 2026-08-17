import React, { useState, useEffect } from 'react';
import { ref, set } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { Trophy, Plus, Trash2, Save } from 'lucide-react';

export default function TopSellers({ data }: any) {
  const [sellers, setSellers] = useState<any[]>([]);

  useEffect(() => {
    if (data.topSellers) {
      setSellers(data.topSellers);
    }
  }, [data.topSellers]);

  const addSeller = () => {
    setSellers([...sellers, { name: 'Top Earner', earned: '৳15,000' }]);
  };

  const removeSeller = (index: number) => {
    setSellers(sellers.filter((_, i) => i !== index));
  };

  const updateSeller = (index: number, field: string, value: string) => {
    const newSellers = [...sellers];
    newSellers[index] = { ...newSellers[index], [field]: value };
    setSellers(newSellers);
  };

  const saveSellers = async () => {
    const formatted = sellers.map((s, idx) => ({ ...s, rank: idx + 1 }));
    await set(ref(db, "top_sellers"), formatted);
    Swal.fire('Saved', 'Leaderboard updated successfully', 'success');
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="text-amber-500" />
          Top 10 Sellers Config
        </h2>
        <button onClick={addSeller} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors">
          <Plus size={16} /> Add Seller
        </button>
      </div>
      
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="text-sm text-slate-500 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          এখানে কনফিগার করা সেরা ১০ জন ইউজার অ্যাপের <b>"সেরা ১০ সেলার"</b> লিডারবোর্ডে সরাসরি দৃশ্যমান হবে।
        </div>
        
        {sellers.length === 0 && <div className="text-center text-slate-400 py-10">No top sellers configured. Click "Add Seller"</div>}
        
        {sellers.map((s, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative">
            <div className="absolute -top-3 -left-3 bg-amber-500 text-white font-black text-xs w-8 h-8 flex items-center justify-center rounded-full border-4 border-white shadow-sm">
              #{idx + 1}
            </div>
            
            <button onClick={() => removeSeller(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 size={18} />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Seller Name</label>
                <input 
                  type="text" 
                  value={s.name || ''} 
                  onChange={(e) => updateSeller(idx, 'name', e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Earned Amount / Mails</label>
                <input 
                  type="text" 
                  value={s.earned || s.count || ''} 
                  onChange={(e) => updateSeller(idx, 'earned', e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <button onClick={saveSellers} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
          <Save size={18} /> Save Leaderboard
        </button>
      </div>
    </div>
  );
}
