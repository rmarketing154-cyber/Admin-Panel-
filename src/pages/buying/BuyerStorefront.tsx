import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Users, 
  Wallet, 
  ShoppingBag, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ShieldCheck, 
  Layers, 
  Tag, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Sparkles, 
  TrendingUp, 
  UserCheck, 
  FileText,
  BadgeCheck,
  ChevronRight,
  User,
  Hash,
  ArrowRight
} from 'lucide-react';
import { BuyerProduct, BuyerOrder, BuyerDepositRequest } from '../../types';

interface BuyerStorefrontProps {
  data: any;
  currentUser?: any;
}

export default function BuyerStorefront({ data }: BuyerStorefrontProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'buyers' | 'deposits'>('products');
  
  // Search and Filter states
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  
  const [buyerSearch, setBuyerSearch] = useState('');
  const [buyerStatusFilter, setBuyerStatusFilter] = useState('all');
  const [buyerGroupView, setBuyerGroupView] = useState(false);

  const [depositSearch, setDepositSearch] = useState('');
  const [depositStatusFilter, setDepositStatusFilter] = useState('all');
  const [depositorGroupView, setDepositorGroupView] = useState(false);

  // Raw data from props with fallbacks
  const rawProducts: BuyerProduct[] = useMemo(() => data.buyerProducts || [], [data.buyerProducts]);
  const rawOrders: BuyerOrder[] = useMemo(() => data.buyerOrders || [], [data.buyerOrders]);
  const rawDeposits: BuyerDepositRequest[] = useMemo(() => data.buyerDeposits || [], [data.buyerDeposits]);

  // Calculations for total statistics
  const stats = useMemo(() => {
    // Unique buyers from orders
    const buyerSet = new Set<string>();
    rawOrders.forEach(o => {
      const uKey = (o.userId || o.userEmail || o.userName || '').trim().toLowerCase();
      if (uKey) buyerSet.add(uKey);
    });

    // Unique depositors
    const depositorSet = new Set<string>();
    let totalApprovedDepositSum = 0;
    rawDeposits.forEach(d => {
      const uKey = (d.userId || d.userEmail || d.userName || '').trim().toLowerCase();
      if (uKey) depositorSet.add(uKey);
      if (d.status === 'approved') {
        totalApprovedDepositSum += Number(d.amount) || 0;
      }
    });

    let totalOrderSalesSum = 0;
    rawOrders.forEach(o => {
      if (o.status !== 'cancelled' && o.status !== 'refunded') {
        totalOrderSalesSum += Number(o.totalAmount) || 0;
      }
    });

    return {
      totalProducts: rawProducts.length,
      totalBuyersCount: buyerSet.size,
      totalOrdersCount: rawOrders.length,
      totalOrderSalesSum,
      totalDepositorsCount: depositorSet.size,
      totalDepositsCount: rawDeposits.length,
      totalApprovedDepositSum
    };
  }, [rawProducts, rawOrders, rawDeposits]);

  // Product sales breakdown (how many items of each product were bought)
  const productSalesMap = useMemo(() => {
    const map = new Map<string, { count: number; qty: number; totalAmount: number }>();
    rawOrders.forEach(o => {
      if (o.status !== 'cancelled' && o.status !== 'refunded') {
        const pId = o.productId;
        const current = map.get(pId) || { count: 0, qty: 0, totalAmount: 0 };
        map.set(pId, {
          count: current.count + 1,
          qty: current.qty + (Number(o.quantity) || 1),
          totalAmount: current.totalAmount + (Number(o.totalAmount) || 0)
        });
      }
    });
    return map;
  }, [rawOrders]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return rawProducts.filter(p => {
      const matchesSearch = 
        (p.title || '').toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.banglaTitle || '').toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = productCategory === 'all' || p.category === productCategory;
      return matchesSearch && matchesCategory;
    });
  }, [rawProducts, productSearch, productCategory]);

  // Filtered Buyers & Purchase Orders List
  const filteredOrders = useMemo(() => {
    return rawOrders.filter(o => {
      const searchLower = buyerSearch.toLowerCase();
      const matchesSearch = 
        (o.userName || '').toLowerCase().includes(searchLower) ||
        (o.userEmail || '').toLowerCase().includes(searchLower) ||
        (o.userId || '').toLowerCase().includes(searchLower) ||
        (o.productTitle || '').toLowerCase().includes(searchLower) ||
        (o.id || '').toLowerCase().includes(searchLower);
      
      const matchesStatus = buyerStatusFilter === 'all' || o.status === buyerStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rawOrders, buyerSearch, buyerStatusFilter]);

  // Grouped Buyers Summary (Unique User purchases aggregation)
  const groupedBuyers = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      userName: string;
      userEmail: string;
      totalOrders: number;
      totalQty: number;
      totalSpent: number;
      lastOrderAt: number;
      purchasedProducts: Set<string>;
    }>();

    filteredOrders.forEach(o => {
      const key = (o.userId || o.userEmail || o.userName || 'unknown').trim();
      const existing = map.get(key) || {
        userId: o.userId || 'N/A',
        userName: o.userName || 'User',
        userEmail: o.userEmail || 'N/A',
        totalOrders: 0,
        totalQty: 0,
        totalSpent: 0,
        lastOrderAt: 0,
        purchasedProducts: new Set<string>()
      };

      existing.totalOrders += 1;
      existing.totalQty += (Number(o.quantity) || 1);
      existing.totalSpent += (Number(o.totalAmount) || 0);
      if (o.createdAt > existing.lastOrderAt) existing.lastOrderAt = o.createdAt;
      if (o.productTitle) existing.purchasedProducts.add(o.productTitle);

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredOrders]);

  // Filtered Deposits List
  const filteredDeposits = useMemo(() => {
    return rawDeposits.filter(d => {
      const searchLower = depositSearch.toLowerCase();
      const matchesSearch = 
        (d.userName || '').toLowerCase().includes(searchLower) ||
        (d.userEmail || '').toLowerCase().includes(searchLower) ||
        (d.userId || '').toLowerCase().includes(searchLower) ||
        (d.trxId || '').toLowerCase().includes(searchLower) ||
        (d.senderNumber || '').toLowerCase().includes(searchLower) ||
        (d.paymentMethod || '').toLowerCase().includes(searchLower);

      const matchesStatus = depositStatusFilter === 'all' || d.status === depositStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rawDeposits, depositSearch, depositStatusFilter]);

  // Grouped Depositors Summary
  const groupedDepositors = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      userName: string;
      userEmail: string;
      approvedAmount: number;
      pendingAmount: number;
      totalCount: number;
      lastDepositAt: number;
    }>();

    filteredDeposits.forEach(d => {
      const key = (d.userId || d.userEmail || d.userName || 'unknown').trim();
      const existing = map.get(key) || {
        userId: d.userId || 'N/A',
        userName: d.userName || 'User',
        userEmail: d.userEmail || 'N/A',
        approvedAmount: 0,
        pendingAmount: 0,
        totalCount: 0,
        lastDepositAt: 0
      };

      existing.totalCount += 1;
      if (d.status === 'approved') {
        existing.approvedAmount += Number(d.amount) || 0;
      } else if (d.status === 'pending') {
        existing.pendingAmount += Number(d.amount) || 0;
      }
      if (d.createdAt > existing.lastDepositAt) existing.lastDepositAt = d.createdAt;

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.approvedAmount - a.approvedAmount);
  }, [filteredDeposits]);

  // Unique categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    rawProducts.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [rawProducts]);

  return (
    <div className="space-y-6">
      {/* Top Title & Directory Overview Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl text-white">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wide">
            <BadgeCheck size={16} className="text-indigo-400" />
            <span>প্রোডাক্ট ও ইউজার একটিভিটি ডিরেক্টরি</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            বায়ার প্রোডাক্ট ও ইউজার লেনদেন সামারি
          </h2>

          <p className="text-slate-400 text-xs sm:text-sm max-w-3xl leading-relaxed">
            এখানে সরবরাহকৃত সকল প্রোডাক্টের বিস্তারিত তালিকা, প্রোডাক্ট বিক্রি হওয়ার পরিমাণ, কোন কোন ইউজার কেনাকাটা করেছেন এবং কোন কোন ইউজার ডিপোজিট সম্পন্ন করেছেন তার বিবরণ এক নজরে পর্যবেক্ষণ করুন।
          </p>

          {/* Key Stat Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <Package size={16} className="text-indigo-400" />
                <span>মোট প্রোডাক্ট</span>
              </div>
              <div className="text-2xl font-black text-white">{stats.totalProducts} টি</div>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <Users size={16} className="text-emerald-400" />
                <span>ক্রয়কারী ইউজার</span>
              </div>
              <div className="text-2xl font-black text-emerald-400">{stats.totalBuyersCount} জন</div>
              <div className="text-[11px] text-slate-400 mt-0.5">মোট অর্ডার: {stats.totalOrdersCount} টি</div>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <Wallet size={16} className="text-cyan-400" />
                <span>ডিপোজিটকারী ইউজার</span>
              </div>
              <div className="text-2xl font-black text-cyan-400">{stats.totalDepositorsCount} জন</div>
              <div className="text-[11px] text-slate-400 mt-0.5">মোট রিকোয়েস্ট: {stats.totalDepositsCount} টি</div>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <TrendingUp size={16} className="text-amber-400" />
                <span>মোট ডিপোজিট ভলিউম</span>
              </div>
              <div className="text-2xl font-black text-amber-400">৳ {stats.totalApprovedDepositSum.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'products'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package size={18} className={activeTab === 'products' ? 'text-indigo-400' : 'text-slate-400'} />
          <span>প্রোডাক্ট এর লিস্ট ({filteredProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('buyers')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'buyers'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck size={18} className={activeTab === 'buyers' ? 'text-emerald-400' : 'text-slate-400'} />
          <span>ক্রয়কারী ইউজার লিস্ট ({stats.totalBuyersCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('deposits')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'deposits'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard size={18} className={activeTab === 'deposits' ? 'text-cyan-400' : 'text-slate-400'} />
          <span>ডিপোজিটকারী ইউজার লিস্ট ({stats.totalDepositorsCount})</span>
        </button>
      </div>

      {/* TAB 1: PRODUCTS LIST */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="প্রোডাক্টের নাম বা বিবরণ খুঁজুন..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={16} className="text-slate-400" />
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">সকল ক্যাটাগরি ({rawProducts.length})</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Package size={48} className="mx-auto text-slate-300" />
              <h3 className="text-lg font-bold text-slate-700">কোনো প্রোডাক্ট পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                কোনো প্রোডাক্ট যোগ করা হয়ে না থাকলে অথবা আপনার সার্চ ফিল্টারের সাথে না মিললে এখানে প্রোডাক্ট দেখাবে না।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => {
                const sales = productSalesMap.get(product.id) || { count: 0, qty: 0, totalAmount: 0 };
                const availableStock = product.stock !== undefined ? product.stock : (product.liveStock || 0);

                return (
                  <div 
                    key={product.id} 
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-4">
                      {/* Product Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                            {product.category || 'General'}
                          </span>
                          <h3 className="font-bold text-slate-900 text-base leading-snug">
                            {product.banglaTitle || product.title}
                          </h3>
                          {product.banglaTitle && product.title !== product.banglaTitle && (
                            <p className="text-xs text-slate-500">{product.title}</p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xl font-black text-slate-900">৳{product.price}</div>
                          <div className="text-[11px] text-slate-500 font-medium">প্রতি পিস</div>
                        </div>
                      </div>

                      {/* Description */}
                      {product.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {product.description}
                        </p>
                      )}

                      {/* Stats Badges */}
                      <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                        <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-100 font-semibold flex items-center justify-between">
                          <span className="text-[11px] text-emerald-600">স্টক আছে:</span>
                          <span className="font-black text-emerald-700">{availableStock} পিস</span>
                        </div>

                        <div className="bg-indigo-50 text-indigo-800 p-2.5 rounded-xl border border-indigo-100 font-semibold flex items-center justify-between">
                          <span className="text-[11px] text-indigo-600">বিক্রি হয়েছে:</span>
                          <span className="font-black text-indigo-700">{sales.qty} পিস</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Info (Non-Buyable Indicator) */}
                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <span>ওয়ারেন্টি: {product.warrantyHours || 24} ঘণ্টা</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                        প্রোডাক্ট ইনফো
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BUYERS & PURCHASE HISTORY */}
      {activeTab === 'buyers' && (
        <div className="space-y-6">
          {/* Controls & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={buyerSearch}
                onChange={(e) => setBuyerSearch(e.target.value)}
                placeholder="ইউজার নাম, ইমেইল বা অর্ডার আইডি দিয়ে খুঁজুন..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={buyerStatusFilter}
                onChange={(e) => setBuyerStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">সকল অর্ডার স্ট্যাটাস ({rawOrders.length})</option>
                <option value="delivered">ডেলিভার্ড (Delivered)</option>
                <option value="completed">কমপ্লিট (Completed)</option>
                <option value="pending">পেন্ডিং (Pending)</option>
                <option value="cancelled">ক্যান্সেল (Cancelled)</option>
              </select>

              <button
                onClick={() => setBuyerGroupView(!buyerGroupView)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                  buyerGroupView 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {buyerGroupView ? 'সকল অর্ডার তালিকা' : 'ইউজারভিত্তিক সামারি'}
              </button>
            </div>
          </div>

          {/* Grouped View vs Orders Table */}
          {buyerGroupView ? (
            /* User Summary Aggregated Cards */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Users size={16} className="text-emerald-500" />
                  <span>ক্রয়কারী ইউজারদের ইউনিক তালিকা ({groupedBuyers.length} জন)</span>
                </h3>
              </div>

              {groupedBuyers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">কোনো ইউজার পারচেজ ডেটা পাওয়া যায়নি</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {groupedBuyers.map((b, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-slate-400" />
                          <span className="font-bold text-slate-900 text-sm">{b.userName}</span>
                          <span className="text-xs text-slate-400">({b.userEmail})</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          <span>ক্রয়কৃত প্রোডাক্ট: <strong className="text-slate-700">{Array.from(b.purchasedProducts).join(', ') || 'N/A'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-xs text-right">
                        <div>
                          <div className="text-slate-400">মোট অর্ডার</div>
                          <div className="font-bold text-slate-800">{b.totalOrders} টি ({b.totalQty} পিস)</div>
                        </div>
                        <div>
                          <div className="text-slate-400">মোট খরচ</div>
                          <div className="font-black text-emerald-600 text-sm">৳{b.totalSpent.toLocaleString()}</div>
                        </div>
                        <div className="hidden sm:block">
                          <div className="text-slate-400">সর্বশেষ অর্ডার</div>
                          <div className="font-medium text-slate-600">
                            {b.lastOrderAt ? new Date(b.lastOrderAt).toLocaleDateString('bn-BD') : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Orders Table */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <ShoppingBag size={16} className="text-indigo-500" />
                  <span>সকল ক্রয়ের বিস্তারিত ইতিহাস ({filteredOrders.length} টি)</span>
                </h3>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">কোনো পারচেজ অর্ডার পাওয়া যায়নি</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">ইউজার তথ্য</th>
                        <th className="p-3.5">প্রোডাক্ট এর নাম</th>
                        <th className="p-3.5">পরিমাণ</th>
                        <th className="p-3.5">মোট মূল্য</th>
                        <th className="p-3.5">স্ট্যাটাস</th>
                        <th className="p-3.5">তারিখ ও সময়</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{order.userName || 'User'}</div>
                            <div className="text-[11px] text-slate-400">{order.userEmail || order.userId}</div>
                          </td>

                          <td className="p-3.5 font-bold text-slate-800">
                            {order.productTitle || 'Gmail Account'}
                          </td>

                          <td className="p-3.5 font-black text-slate-900">
                            {order.quantity} পিস
                          </td>

                          <td className="p-3.5 font-black text-emerald-600">
                            ৳{order.totalAmount}
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              order.status === 'delivered' || order.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : order.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {order.status === 'delivered' || order.status === 'completed' ? (
                                <>
                                  <CheckCircle2 size={12} />
                                  <span>ডেলিভার্ড</span>
                                </>
                              ) : order.status === 'pending' ? (
                                <>
                                  <Clock size={12} />
                                  <span>পেন্ডিং</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} />
                                  <span>{order.status}</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString('bn-BD') : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DEPOSITORS & DEPOSIT HISTORY */}
      {activeTab === 'deposits' && (
        <div className="space-y-6">
          {/* Controls & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={depositSearch}
                onChange={(e) => setDepositSearch(e.target.value)}
                placeholder="ইউজার নাম, TrxID বা ফোন দিয়ে খুঁজুন..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={depositStatusFilter}
                onChange={(e) => setDepositStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">সকল ডিপোজিট স্ট্যাটাস ({rawDeposits.length})</option>
                <option value="approved">এপ্রুভড (Approved)</option>
                <option value="pending">পেন্ডিং (Pending)</option>
                <option value="rejected">রিজেক্টেড (Rejected)</option>
              </select>

              <button
                onClick={() => setDepositorGroupView(!depositorGroupView)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                  depositorGroupView 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {depositorGroupView ? 'সকল ডিপোজিট লিস্ট' : 'ইউজার সামারি'}
              </button>
            </div>
          </div>

          {/* Grouped Depositors vs Deposits Table */}
          {depositorGroupView ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Wallet size={16} className="text-cyan-500" />
                  <span>ডিপোজিটকারী ইউজার সামারি ({groupedDepositors.length} জন)</span>
                </h3>
              </div>

              {groupedDepositors.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">কোনো ডিপোজিটকারী ইউজার ডেটা পাওয়া যায়নি</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {groupedDepositors.map((d, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-slate-400" />
                          <span className="font-bold text-slate-900 text-sm">{d.userName}</span>
                          <span className="text-xs text-slate-400">({d.userEmail})</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          মোট ডিপোজিট চেষ্টা: <strong className="text-slate-700">{d.totalCount} বার</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-xs text-right">
                        <div>
                          <div className="text-slate-400">এপ্রুভড অ্যামাউন্ট</div>
                          <div className="font-black text-cyan-600 text-sm">৳{d.approvedAmount.toLocaleString()}</div>
                        </div>
                        {d.pendingAmount > 0 && (
                          <div>
                            <div className="text-slate-400">পেন্ডিং অ্যামাউন্ট</div>
                            <div className="font-bold text-amber-600">৳{d.pendingAmount.toLocaleString()}</div>
                          </div>
                        )}
                        <div className="hidden sm:block">
                          <div className="text-slate-400">সর্বশেষ ডিপোজিট</div>
                          <div className="font-medium text-slate-600">
                            {d.lastDepositAt ? new Date(d.lastDepositAt).toLocaleDateString('bn-BD') : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <CreditCard size={16} className="text-cyan-500" />
                  <span>সকল ডিপোজিট রিকোয়েস্টের তালিকা ({filteredDeposits.length} টি)</span>
                </h3>
              </div>

              {filteredDeposits.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">কোনো ডিপোজিট রিকোয়েস্ট পাওয়া যায়নি</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">ইউজার</th>
                        <th className="p-3.5">মেথড</th>
                        <th className="p-3.5">অ্যামাউন্ট</th>
                        <th className="p-3.5">TrxID / নম্বর</th>
                        <th className="p-3.5">স্ট্যাটাস</th>
                        <th className="p-3.5">তারিখ ও সময়</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredDeposits.map((dep) => (
                        <tr key={dep.id} className="hover:bg-slate-50">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{dep.userName || 'User'}</div>
                            <div className="text-[11px] text-slate-400">{dep.userEmail || dep.userId}</div>
                          </td>

                          <td className="p-3.5 uppercase font-bold text-indigo-700">
                            {dep.paymentMethod || 'bKash'}
                          </td>

                          <td className="p-3.5 font-black text-slate-900">
                            ৳{dep.amount}
                          </td>

                          <td className="p-3.5">
                            <div className="font-mono font-bold text-slate-800">{dep.trxId || 'N/A'}</div>
                            <div className="text-[11px] text-slate-400">{dep.senderNumber}</div>
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              dep.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : dep.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {dep.status === 'approved' ? (
                                <>
                                  <CheckCircle2 size={12} />
                                  <span>এপ্রুভড</span>
                                </>
                              ) : dep.status === 'pending' ? (
                                <>
                                  <Clock size={12} />
                                  <span>পেন্ডিং</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} />
                                  <span>রিজেক্টেড</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {dep.createdAt ? new Date(dep.createdAt).toLocaleString('bn-BD') : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
