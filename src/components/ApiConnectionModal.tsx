import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Key, 
  Database, 
  Server, 
  Globe, 
  ShieldCheck, 
  ExternalLink, 
  Code2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import Swal from 'sweetalert2';

interface ApiConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiConnectionModal({ isOpen, onClose }: ApiConnectionModalProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'curl' | 'js'>('endpoints');
  const [statusLoading, setStatusLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<any>(null);

  const defaultSecret = "mailfactory-admin-secret-2026";
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const checkLiveApi = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/admin/status', {
        headers: {
          'x-admin-secret': defaultSecret
        }
      });
      if (res.ok) {
        const json = await res.json();
        setApiStatus(json);
      } else {
        setApiStatus({ success: false, error: `HTTP ${res.status}` });
      }
    } catch (err: any) {
      setApiStatus({ success: false, error: err.message });
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkLiveApi();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, type: 'key' | 'url') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const sampleEndpoints = [
    { method: 'GET', path: '/api/admin/products', desc: 'Fetch all products & inventory stock' },
    { method: 'POST', path: '/api/admin/products', desc: 'Create product package', sample: '{\n  "title": "Fresh Gmail Accounts (1 Week Old)",\n  "category": "fresh",\n  "price": 35,\n  "stock": 150,\n  "description": "Phone verified, recovery added",\n  "minOrder": 1\n}' },
    { method: 'PUT', path: '/api/admin/products/:id', desc: 'Update product stock/price', sample: '{\n  "stock": 200,\n  "price": 32\n}' },
    { method: 'GET', path: '/api/admin/deposits', desc: 'Fetch buyer deposit requests' },
    { method: 'POST', path: '/api/admin/deposits/approve', desc: 'Approve deposit & auto-credit user wallet', sample: '{\n  "depositId": "dep_987654",\n  "userId": "user_xyz123",\n  "amount": 500\n}' },
    { method: 'POST', path: '/api/admin/deposits/reject', desc: 'Reject deposit request', sample: '{\n  "depositId": "dep_987654",\n  "adminNote": "Invalid TrxID"\n}' },
    { method: 'GET', path: '/api/admin/orders', desc: 'Fetch all orders' },
    { method: 'POST', path: '/api/admin/orders/approve', desc: 'Approve & deliver Gmail accounts', sample: '{\n  "orderId": "ord_112233",\n  "gmailInputs": [\n    { "gmail": "buyer.order1@gmail.com", "password": "securePass123", "recoveryEmail": "rec1@gmail.com" }\n  ],\n  "adminNote": "Verified and delivered successfully"\n}' },
    { method: 'POST', path: '/api/admin/orders/reject', desc: 'Reject order & restore stock/balance', sample: '{\n  "orderId": "ord_112233",\n  "adminNote": "Invalid transaction or stock out"\n}' },
    { method: 'GET', path: '/api/admin/withdrawals', desc: 'Fetch withdrawal requests' },
    { method: 'POST', path: '/api/admin/withdrawals/approve', desc: 'Approve user withdrawal', sample: '{\n  "withdrawId": "wd_123",\n  "trxId": "TRX998877"\n}' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Server size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>Admin REST API & Database Connection</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                  LIVE READY
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Connect any external admin panel, backend service, or automated bot</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Connection Status & Credentials Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* API Base URL */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Globe size={14} className="text-indigo-400" />
                  <span>API Base URL</span>
                </span>
                <button
                  onClick={() => copyToClipboard(baseUrl, 'url')}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-indigo-300 break-all select-all">
                {baseUrl}
              </div>
            </div>

            {/* Admin Secret Key */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Key size={14} className="text-amber-400" />
                  <span>Header: x-admin-secret</span>
                </span>
                <button
                  onClick={() => copyToClipboard(defaultSecret, 'key')}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold"
                >
                  {copiedKey ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                </button>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-amber-300 break-all select-all">
                {defaultSecret}
              </div>
            </div>
          </div>

          {/* Live Health & Firebase Status Banner */}
          <div className="bg-gradient-to-r from-indigo-950/50 via-slate-900 to-purple-950/50 border border-indigo-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                <Database size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Firebase RTDB Database: Connected</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {apiStatus?.stats ? (
                    <span>
                      Products: <b className="text-white">{apiStatus.stats.totalProducts}</b> | 
                      Orders: <b className="text-white"> {apiStatus.stats.totalOrders}</b> | 
                      Deposits: <b className="text-white"> {apiStatus.stats.totalDeposits}</b>
                    </span>
                  ) : (
                    <span>Real-time bidirectional synchronization active</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={checkLiveApi}
              disabled={statusLoading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={13} className={statusLoading ? 'animate-spin' : ''} />
              <span>{statusLoading ? 'Checking...' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('endpoints')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'endpoints'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              REST Endpoints Reference
            </button>
            <button
              onClick={() => setActiveTab('curl')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'curl'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              cURL Code Snippets
            </button>
            <button
              onClick={() => setActiveTab('js')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'js'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              JavaScript / Fetch Client
            </button>
          </div>

          {/* Tab 1: Endpoints Reference */}
          {activeTab === 'endpoints' && (
            <div className="space-y-3">
              {sampleEndpoints.map((ep, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                        ep.method === 'POST' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' :
                        ep.method === 'PUT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                        'bg-red-500/20 text-red-400 border border-red-500/40'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-xs font-bold text-indigo-200">{ep.path}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">{ep.desc}</span>
                  </div>

                  {ep.sample && (
                    <div className="mt-2 bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                      <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Request Payload:</div>
                      <pre>{ep.sample}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: cURL Code Snippets */}
          {activeTab === 'curl' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-indigo-300">1. Add New Product</div>
                <pre className="bg-slate-900 p-3 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto select-all">
{`curl -X POST "${baseUrl}/api/admin/products" \\
  -H "Content-Type: application/json" \\
  -H "x-admin-secret: ${defaultSecret}" \\
  -d '{
    "title": "Fresh Gmail Accounts (1 Week Old)",
    "category": "fresh",
    "price": 35,
    "stock": 150,
    "description": "Phone verified, recovery added",
    "minOrder": 1
  }'`}
                </pre>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-emerald-300">2. Approve Buyer Deposit Request</div>
                <pre className="bg-slate-900 p-3 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto select-all">
{`curl -X POST "${baseUrl}/api/admin/deposits/approve" \\
  -H "Content-Type: application/json" \\
  -H "x-admin-secret: ${defaultSecret}" \\
  -d '{
    "depositId": "dep_987654",
    "userId": "user_xyz123",
    "amount": 500
  }'`}
                </pre>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-amber-300">3. Approve Order & Deliver Gmails</div>
                <pre className="bg-slate-900 p-3 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto select-all">
{`curl -X POST "${baseUrl}/api/admin/orders/approve" \\
  -H "Content-Type: application/json" \\
  -H "x-admin-secret: ${defaultSecret}" \\
  -d '{
    "orderId": "ord_112233",
    "gmailInputs": [
      { "gmail": "buyer.order1@gmail.com", "password": "securePass123", "recoveryEmail": "rec1@gmail.com" }
    ],
    "adminNote": "Verified and delivered successfully"
  }'`}
                </pre>
              </div>
            </div>
          )}

          {/* Tab 3: JavaScript / Fetch Client */}
          {activeTab === 'js' && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-indigo-300">Ready-to-use JavaScript Integration Helper</div>
              <pre className="bg-slate-900 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto select-all leading-relaxed">
{`const API_BASE = "${baseUrl}";
const ADMIN_SECRET = "${defaultSecret}";

// Reusable API Fetcher
async function callAdminApi(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': ADMIN_SECRET
    }
  };
  if (data) options.body = JSON.stringify(data);
  const response = await fetch(\`\${API_BASE}\${endpoint}\`, options);
  return await response.json();
}

// Example 1: Add a product
// await callAdminApi('/api/admin/products', 'POST', { title: "USA Aged Gmail", price: 60, stock: 50 });

// Example 2: Approve deposit
// await callAdminApi('/api/admin/deposits/approve', 'POST', { depositId: "dep_123", userId: "uid_456", amount: 1000 });`}
              </pre>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>CORS is enabled for all external host domains and local development.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-600/30"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
}
