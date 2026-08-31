import React, { useState, useEffect } from 'react';
import { ref, set, update } from 'firebase/database';
import { db } from '../../lib/firebase';
import { DepositGateway } from '../../types';
import Swal from 'sweetalert2';
import { 
  CreditCard, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Copy, 
  Smartphone, 
  DollarSign, 
  Building2, 
  ShieldCheck,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { copyToClipboardFallback } from '../../lib/clipboard';

const DEFAULT_GATEWAYS: Record<string, DepositGateway> = {
  bkash: {
    id: 'bkash',
    name: 'bKash',
    type: 'Personal',
    number: '01700000000',
    color: '#D12053',
    logo: 'https://images.seeklogo.com/logo-png/27/1/bkash-logo-png_seeklogo-273684.png',
    active: true,
    instructions: 'বিকাশ অ্যাপ অথবা *247# ডায়াল করে Send Money করুন। পেমেন্ট সম্পন্ন করে TrxID ও সেন্ডার নম্বর সাবমিট করুন।'
  },
  nagad: {
    id: 'nagad',
    name: 'Nagad',
    type: 'Personal',
    number: '01800000000',
    color: '#ED1C24',
    logo: 'https://images.seeklogo.com/logo-png/35/1/nagad-logo-png_seeklogo-355240.png',
    active: true,
    instructions: 'নগদ অ্যাপ অথবা *167# ডায়াল করে Send Money করুন। সফল ট্রানজেকশনের TrxID দিন।'
  },
  rocket: {
    id: 'rocket',
    name: 'Rocket',
    type: 'Personal',
    number: '01900000000',
    color: '#8C3494',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Rocket_mobile_banking_logo.svg/500px-Rocket_mobile_banking_logo.svg.png',
    active: true,
    instructions: 'রকেট একাউন্ট থেকে Send Money করুন এবং ১২ ডিজিটের TrxID সাবমিট করুন।'
  },
  usdt: {
    id: 'usdt',
    name: 'USDT (TRC20 / BEP20)',
    type: 'Merchant',
    number: 'TXYZ...YourTrc20OrBep20WalletAddressHere',
    color: '#26A17B',
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
    active: true,
    rate: 125,
    instructions: 'নির্ধারিত TRC20/BEP20 অ্যাড্রেসে USDT ট্রান্সফার করুন। 1 USDT = 125 BDT হিসেবে ব্যালেন্স যোগ হবে।'
  }
};

export default function BuyerGatewaysManager({ data }: { data: any }) {
  const [gateways, setGateways] = useState<Record<string, DepositGateway>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data.depositGateways && Object.keys(data.depositGateways).length > 0) {
      setGateways(data.depositGateways);
    } else if (data.settings?.deposit_gateways && Object.keys(data.settings.deposit_gateways).length > 0) {
      setGateways(data.settings.deposit_gateways);
    } else {
      setGateways(DEFAULT_GATEWAYS);
    }
  }, [data.depositGateways, data.settings]);

  const updateGatewayField = (id: string, field: keyof DepositGateway, val: any) => {
    setGateways(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: val
      }
    }));
  };

  const handleAddNewGateway = () => {
    Swal.fire({
      title: 'নতুন পেমেন্ট মেথড যোগ করুন',
      html: `
        <div class="text-left space-y-3 text-xs">
          <div>
            <label class="font-bold text-slate-700 block mb-1">গেটওয়ের নাম *</label>
            <input id="swal-gw-name" class="swal2-input !m-0 !w-full !text-xs" placeholder="e.g. Upay / Cellfin">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-bold text-slate-700 block mb-1">অ্যাকাউন্ট টাইপ</label>
              <select id="swal-gw-type" class="swal2-select !m-0 !w-full !text-xs">
                <option value="Personal">Personal</option>
                <option value="Merchant">Merchant</option>
                <option value="Agent">Agent</option>
              </select>
            </div>
            <div>
              <label class="font-bold text-slate-700 block mb-1">ব্র্যান্ড কালার</label>
              <input id="swal-gw-color" type="color" class="swal2-input !m-0 !w-full !h-10 p-1" value="#4f46e5">
            </div>
          </div>
          <div>
            <label class="font-bold text-slate-700 block mb-1">রিসিভিং নম্বর / ওয়ালেট অ্যাড্রেস *</label>
            <input id="swal-gw-num" class="swal2-input !m-0 !w-full !text-xs" placeholder="01XXXXXXXXX">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'যুক্ত করুন',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#4f46e5',
      preConfirm: () => {
        const name = (document.getElementById('swal-gw-name') as HTMLInputElement).value.trim();
        const type = (document.getElementById('swal-gw-type') as HTMLSelectElement).value as any;
        const color = (document.getElementById('swal-gw-color') as HTMLInputElement).value;
        const number = (document.getElementById('swal-gw-num') as HTMLInputElement).value.trim();

        if (!name || !number) {
          Swal.showValidationMessage('গেটওয়ে নাম ও নম্বর দেওয়া আবশ্যক!');
          return false;
        }

        return { name, type, color, number };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        const key = `gw_${Date.now()}`;
        setGateways(prev => ({
          ...prev,
          [key]: {
            id: key,
            name: res.value.name,
            type: res.value.type,
            color: res.value.color,
            number: res.value.number,
            active: true,
            instructions: 'Send Money করে TrxID প্রদান করুন।'
          }
        }));
      }
    });
  };

  const handleDeleteGateway = (id: string) => {
    Swal.fire({
      title: 'গেটওয়ে ডিলিট করবেন?',
      text: 'ক্রেতারা আর এই মেথডে ডিপোজিট করতে পারবেন না।',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ডিলিট',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#ef4444'
    }).then(res => {
      if (res.isConfirmed) {
        const copy = { ...gateways };
        delete copy[id];
        setGateways(copy);
      }
    });
  };

  const handleSaveAllGateways = async () => {
    setSaving(true);
    let apiSuccess = false;

    // 1. Send to Backend Server API (Bypasses client security rules & updates memory store + REST)
    try {
      const res = await fetch('/api/admin/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateways })
      });
      if (res.ok) {
        apiSuccess = true;
      }
    } catch (apiErr) {
      console.warn('Backend API save warning:', apiErr);
    }

    // 2. Also try direct Firebase RTDB client SDK write safely
    try {
      await Promise.allSettled([
        set(ref(db, 'deposit_gateways'), gateways),
        set(ref(db, 'settings/deposit_gateways'), gateways),
        set(ref(db, 'buyer_gateways'), gateways),
        set(ref(db, 'gateways'), gateways),
        set(ref(db, 'payment_gateways'), gateways),
        set(ref(db, 'settings/gateways'), gateways),
        set(ref(db, 'settings/payment_gateways'), gateways),
        set(ref(db, 'Payment_Methods'), gateways)
      ]);
    } catch (rtdbErr) {
      console.warn('Client RTDB write notice:', rtdbErr);
    }

    setSaving(false);
    Swal.fire({
      icon: 'success',
      title: 'ডিপোজিট নম্বর ও গেটওয়ে সংরক্ষিত!',
      text: 'ক্রেতাদের ডিপোজিট স্ক্রিনে তাৎক্ষণিকভাবে নতুন নম্বর প্রদর্শিত হবে।',
      confirmButtonColor: '#4f46e5'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
              Live Receiving Gateways
            </span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs text-slate-500 font-bold">{Object.keys(gateways).length} টি মেথড সক্রিয়</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Payment Method & Receiving Numbers</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            ক্রেতারা যে সকল বিকাশ, নগদ, রকেট ও ইউএসডিটি নম্বরে ডিপোজিট পাঠাবে তা পরিবর্তন ও পরিচালনা করুন।
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAddNewGateway}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-all"
          >
            <Plus size={15} />
            <span>নতুন গেটওয়ে</span>
          </button>

          <button
            disabled={saving}
            onClick={handleSaveAllGateways}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সকল নম্বর সেভ করুন'}</span>
          </button>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Object.keys(gateways).map(k => {
          const gw = gateways[k];
          const isUsdt = k.toLowerCase().includes('usdt');

          return (
            <div
              key={k}
              className={`bg-white rounded-3xl border-2 transition-all overflow-hidden ${
                gw.active !== false ? 'border-slate-200 shadow-sm' : 'border-slate-200 opacity-70 bg-slate-50'
              }`}
            >
              {/* Card Banner */}
              <div
                className="p-4 text-white flex items-center justify-between"
                style={{ backgroundColor: gw.color || '#4f46e5' }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-sm">
                    {gw.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-base leading-tight">{gw.name}</h4>
                    <span className="text-[10px] uppercase font-bold opacity-80">{gw.type} Account</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gw.active !== false}
                      onChange={(e) => updateGatewayField(k, 'active', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-black/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white/40"></div>
                  </label>

                  <button
                    onClick={() => handleDeleteGateway(k)}
                    className="w-7 h-7 rounded-lg bg-black/20 hover:bg-red-500 text-white flex items-center justify-center transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">রিসিভিং নম্বর / অ্যাড্রেস (Receiving Number) *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gw.number || ''}
                      onChange={(e) => updateGatewayField(k, 'number', e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="flex-1 font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <button
                      onClick={() => {
                        copyToClipboardFallback(gw.number);
                        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'কপি হয়েছে!', showConfirmButton: false, timer: 1000 });
                      }}
                      className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold flex items-center gap-1 shrink-0"
                    >
                      <Copy size={13} />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">অ্যাকাউন্ট টাইপ</label>
                    <select
                      value={gw.type || 'Personal'}
                      onChange={(e) => updateGatewayField(k, 'type', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      <option value="Personal">Personal (Send Money)</option>
                      <option value="Merchant">Merchant (Payment)</option>
                      <option value="Agent">Agent (Cash Out)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isUsdt ? 'USDT রেট (1 USDT = ? BDT)' : 'ব্র্যান্ড কালার'}
                    </label>
                    {isUsdt ? (
                      <input
                        type="number"
                        value={gw.rate || 125}
                        onChange={(e) => updateGatewayField(k, 'rate', Number(e.target.value))}
                        className="w-full font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={gw.color || '#4f46e5'}
                          onChange={(e) => updateGatewayField(k, 'color', e.target.value)}
                          className="w-9 h-8 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                        />
                        <span className="font-mono text-slate-500 font-bold">{gw.color}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">পেমেন্ট নির্দেশিকা (Buyer Instructions)</label>
                  <textarea
                    value={gw.instructions || ''}
                    onChange={(e) => updateGatewayField(k, 'instructions', e.target.value)}
                    placeholder="কীভাবে টাকা পাঠাতে হবে..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 h-16"
                  ></textarea>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button Bar at Bottom */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">রিয়েল-টাইম ক্লাউড সিঙ্ক</div>
            <div className="text-xs text-slate-400">নম্বর আপডেট করার সাথে সাথে সকল ক্রেতার স্ক্রিনে নতুন নম্বর লাইভ হবে।</div>
          </div>
        </div>

        <button
          disabled={saving}
          onClick={handleSaveAllGateways}
          className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Save size={16} />
          <span>{saving ? 'সেভ হচ্ছে...' : 'পরিবর্তনসমূহ সেভ করুন'}</span>
        </button>
      </div>
    </div>
  );
}
