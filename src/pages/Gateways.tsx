import React, { useState, useEffect } from 'react';
import { ref, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import Swal from 'sweetalert2';
import { CreditCard, Plus, Save, Trash2, Image as ImageIcon, CheckCircle2, X, UploadCloud } from 'lucide-react';

const PREDEFINED_GATEWAYS = [
  { name: 'bKash', color: '#D12053', logo: 'https://images.seeklogo.com/logo-png/27/1/bkash-logo-png_seeklogo-273684.png' },
  { name: 'Nagad', color: '#ED1C24', logo: 'https://images.seeklogo.com/logo-png/35/1/nagad-logo-png_seeklogo-355240.png' },
  { name: 'Rocket', color: '#8C3494', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Rocket_mobile_banking_logo.svg/500px-Rocket_mobile_banking_logo.svg.png' },
  { name: 'USDT (BEP20)', color: '#26A17B', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
];

export default function Gateways({ data }: any) {
  const [payments, setPayments] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data.settings?.payment_methods) {
      const loaded = { ...data.settings.payment_methods };
      
      const OLD_URLS: Record<string, string> = {
        'https://raw.githubusercontent.com/shuvohabib/bd-payment-gateways-icons/master/bkash.png': 'https://images.seeklogo.com/logo-png/27/1/bkash-logo-png_seeklogo-273684.png',
        'https://raw.githubusercontent.com/shuvohabib/bd-payment-gateways-icons/master/nagad.png': 'https://images.seeklogo.com/logo-png/35/1/nagad-logo-png_seeklogo-355240.png',
        'https://raw.githubusercontent.com/shuvohabib/bd-payment-gateways-icons/master/rocket.png': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Rocket_mobile_banking_logo.svg/500px-Rocket_mobile_banking_logo.svg.png'
      };

      Object.keys(loaded).forEach(k => {
        if (loaded[k] && loaded[k].logo && OLD_URLS[loaded[k].logo]) {
          loaded[k] = { ...loaded[k], logo: OLD_URLS[loaded[k].logo] };
        }
      });

      setPayments(loaded);
    }
  }, [data.settings]);

  const addGateway = () => {
    Swal.fire({
      title: 'Add Payment Gateway',
      html: `
        <div class="text-left space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 mb-1">Quick Select</label>
            <select id="quickSelect" class="swal2-select w-full mx-0 mb-3" style="margin: 0; width: 100%;">
              <option value="">-- Custom --</option>
              ${PREDEFINED_GATEWAYS.map(g => `<option value="${g.name}">${g.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 mb-1">Gateway Name</label>
            <input type="text" id="gName" class="swal2-input w-full mx-0 mb-3" style="margin: 0; width: 100%;" placeholder="e.g. Upay">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 mb-1">Logo URL (Optional)</label>
            <input type="text" id="gLogo" class="swal2-input w-full mx-0 mb-3" style="margin: 0; width: 100%;" placeholder="https://...">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 mb-1">Brand Color</label>
            <input type="color" id="gCol" class="swal2-input w-full mx-0 h-12 p-1" style="margin: 0; width: 100%;" value="#4F46E5">
          </div>
        </div>
      `,
      didOpen: () => {
        const select = document.getElementById('quickSelect') as HTMLSelectElement;
        const nameInput = document.getElementById('gName') as HTMLInputElement;
        const logoInput = document.getElementById('gLogo') as HTMLInputElement;
        const colorInput = document.getElementById('gCol') as HTMLInputElement;

        select.addEventListener('change', () => {
          const selected = PREDEFINED_GATEWAYS.find(g => g.name === select.value);
          if (selected) {
            nameInput.value = selected.name;
            logoInput.value = selected.logo;
            colorInput.value = selected.color;
          }
        });
      },
      showCancelButton: true,
      confirmButtonText: 'Add Gateway',
      customClass: {
        confirmButton: 'bg-indigo-600',
      }
    }).then(r => {
      if (r.isConfirmed) {
        const name = (document.getElementById('gName') as HTMLInputElement).value;
        const logo = (document.getElementById('gLogo') as HTMLInputElement).value;
        const color = (document.getElementById('gCol') as HTMLInputElement).value;
        if (name) {
          setPayments(prev => ({
            ...prev,
            [`method_${Date.now()}`]: { name, logo, color, active: true }
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

  const deleteGateway = (k: string) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "This payment method will be removed.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        const newPayments = { ...payments };
        delete newPayments[k];
        setPayments(newPayments);
      }
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      Swal.fire({
        title: 'Uploading...',
        text: 'Please wait while the logo is uploaded',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const base64Url = canvas.toDataURL('image/png');
            
            updateGateway(key, 'logo', base64Url);

            Swal.fire({
              icon: 'success',
              title: 'Uploaded!',
              text: 'Logo has been updated successfully.',
              timer: 1500,
              showConfirmButton: false
            });
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      Swal.fire('Error', 'Failed to upload image. Please try again.', 'error');
    }
  };

  const saveGateways = async () => {
    try {
      const paths = [
        "settings/payment_methods",
        "settings/withdraw_methods",
        "settings/withdrawal_methods",
        "payment_methods",
        "withdraw_methods",
        "withdrawal_methods"
      ];
      
      const results = await Promise.allSettled(paths.map(path => set(ref(db, path), payments)));
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      if (successCount === 0) {
        throw new Error("Could not save to any database node. Permission denied.");
      }
      
      Swal.fire('Saved', 'Payment gateways updated successfully!', 'success');
    } catch (e: any) {
      console.error(e);
      Swal.fire('Error', e.message || 'Failed to save settings', 'error');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
            <CreditCard size={24} />
          </div>
          <div>
            <h2 className="font-black text-slate-800 text-lg">Payment Gateways</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configure withdrawal methods</p>
          </div>
        </div>
        <button onClick={addGateway} className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
          <Plus size={18} /> Add New Gateway
        </button>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
        {Object.keys(payments).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CreditCard size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-700 mb-1">No Gateways Configured</h3>
            <p className="text-sm text-slate-500 font-medium">Add a payment method to allow user withdrawals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Object.keys(payments).map(k => {
              const p = payments[k];
              return (
                <div key={k} className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${p.active === false ? 'border-slate-200 opacity-75 grayscale-[0.5]' : 'border-slate-200 shadow-xl shadow-slate-200/40 hover:-translate-y-1'}`}>
                  {/* Card Top / Cover */}
                  <div className="h-28 p-5 relative overflow-hidden flex flex-col justify-between" style={{ backgroundColor: p.color || '#4F46E5' }}>
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                    <div className="relative z-10 flex justify-between items-start w-full">
                      <label className="relative inline-flex items-center cursor-pointer group" title={p.active !== false ? "Active" : "Inactive"}>
                        <input 
                          type="checkbox" 
                          checked={p.active !== false} 
                          onChange={e => updateGateway(k, 'active', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-black/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-transparent after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/30 backdrop-blur-md shadow-inner"></div>
                      </label>
                      <button 
                        onClick={() => deleteGateway(k)}
                        className="w-8 h-8 rounded-full bg-black/10 hover:bg-red-500 flex items-center justify-center text-white transition-all backdrop-blur-md opacity-70 hover:opacity-100"
                        title="Delete Gateway"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-6 pt-0">
                    <div className="flex items-end justify-between mb-5">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center -mt-8 relative z-10 overflow-hidden p-2">
                        {p.logo ? (
                          <img src={p.logo} alt={p.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="text-slate-300" size={28} />
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Gateway Name</label>
                        <input 
                          type="text" 
                          value={p.name || ''} 
                          onChange={e => updateGateway(k, 'name', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={p.logo || ''} 
                            onChange={e => updateGateway(k, 'logo', e.target.value)}
                            placeholder="https://..."
                            className="flex-1 min-w-0 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                          <label className="cursor-pointer bg-slate-100 border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-xl w-11 flex-shrink-0 flex items-center justify-center transition-all" title="Upload Logo">
                            <UploadCloud size={18} />
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleLogoUpload(e, k)} 
                            />
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand Color</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            value={p.color || '#4F46E5'} 
                            onChange={e => updateGateway(k, 'color', e.target.value)}
                            className="w-10 h-10 p-0.5 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer"
                          />
                          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">{p.color}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-5 border-t border-slate-100 bg-white shrink-0">
        <button onClick={saveGateways} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.99]">
          <Save size={22} /> Update All Gateways
        </button>
      </div>
    </div>
  );
}
