import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Layers, 
  CheckCircle, 
  ArrowRight, 
  DollarSign, 
  Package, 
  RefreshCw, 
  Sliders, 
  Mail, 
  Bell, 
  Lock,
  Globe,
  Database,
  Award,
  TrendingUp,
  Cpu,
  Store,
  CreditCard,
  FileText,
  UserCheck,
  Plus,
  AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import BuyerProductsManager from './buying/BuyerProductsManager';
import BuyerDepositsManager from './buying/BuyerDepositsManager';
import BuyerOrdersManager from './buying/BuyerOrdersManager';
import BuyerGatewaysManager from './buying/BuyerGatewaysManager';
import BuyerStorefront from './buying/BuyerStorefront';

interface BuyingGmailProps {
  onSwitchToSelling: () => void;
  data: any;
  currentUser?: any;
  activeSubTab?: 'storefront' | 'products' | 'deposits' | 'orders' | 'gateways';
  setActiveSubTab?: (tab: 'storefront' | 'products' | 'deposits' | 'orders' | 'gateways') => void;
}

export default function BuyingGmail({ 
  onSwitchToSelling, 
  data, 
  currentUser,
  activeSubTab,
  setActiveSubTab 
}: BuyingGmailProps) {
  const [internalTab, setInternalTab] = useState<'storefront' | 'products' | 'deposits' | 'orders' | 'gateways'>('storefront');
  const buyingSubTab = activeSubTab || internalTab;
  const setBuyingSubTab = (tab: 'storefront' | 'products' | 'deposits' | 'orders' | 'gateways') => {
    if (setActiveSubTab) {
      setActiveSubTab(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const pendingDepositsCount = (data.buyerDeposits || []).filter((d: any) => d.status === 'pending').length;
  const claimedOrdersCount = (data.buyerOrders || []).filter((o: any) => o.status === 'warranty_claimed' || o.warrantyStatus === 'claimed').length;
  const totalProductsCount = (data.buyerProducts || []).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner - Hero Admin Control Center for Buying Gmail */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 p-5 sm:p-7 shadow-2xl text-white">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-wider backdrop-blur-md">
              <Sparkles size={14} className="text-amber-400" />
              <span>Buyer Marketplace & Admin Control Hub</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Buying Gmail <span className="text-indigo-300">Management System</span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Manage marketplace products, buyer deposit requests, orders, account stock banks, and payment gateways in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onSwitchToSelling}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <RefreshCw size={14} />
              <span>Switch to Selling Gmail</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Active Sub-panel directly controlled by Menu Icons */}
      {buyingSubTab === 'storefront' && (
        <BuyerStorefront data={data} currentUser={currentUser} />
      )}

      {buyingSubTab === 'products' && (
        <BuyerProductsManager data={data} adminEmail={currentUser?.email} />
      )}

      {buyingSubTab === 'deposits' && (
        <BuyerDepositsManager data={data} adminEmail={currentUser?.email} />
      )}

      {buyingSubTab === 'orders' && (
        <BuyerOrdersManager data={data} adminEmail={currentUser?.email} />
      )}

      {buyingSubTab === 'gateways' && (
        <BuyerGatewaysManager data={data} />
      )}
    </div>
  );
}
