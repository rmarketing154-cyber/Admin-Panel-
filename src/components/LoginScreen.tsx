import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import Swal from 'sweetalert2';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const ADMIN_ACCOUNTS = [
  { email: 'rmarketing154@gmail.com', label: 'R Marketing' },
  { email: 'gmrony135@gmail.com', label: 'GM Rony' },
  { email: 'iamronyofficial1@gmail.com', label: 'Rony Official' },
  { email: 'mailfactorybd@gmail.com', label: 'Mail Factory BD' }
];

export default function LoginScreen() {
  const [email, setEmail] = useState('rmarketing154@gmail.com');
  const [password, setPassword] = useState('@RonyX154');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        } catch (e: any) {
          Swal.fire({
            icon: 'error',
            title: 'Authentication Error',
            text: e.message || 'Failed to authenticate. Please check your credentials.'
          });
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Login Error',
          text: err.message || 'Failed to log in.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    const { value: resEmail } = await Swal.fire({
      title: 'Reset Password',
      input: 'email',
      inputValue: email,
      showCancelButton: true
    });
    if (resEmail) {
      try {
        await sendPasswordResetEmail(auth, resEmail.trim().toLowerCase());
        Swal.fire('Sent', 'Password reset link sent to your email', 'success');
      } catch (err: any) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        
        <div className="text-center mb-6">
          <img 
            src="https://files.catbox.moe/cqiv5k.png" 
            alt="Logo" 
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-xl shadow-indigo-500/40 border border-white/20 icon-3d hover:scale-105 transition-transform" 
            referrerPolicy="no-referrer" 
          />
          <h2 className="text-2xl font-bold text-white mb-1">Mail Factory Admin</h2>
          <p className="text-slate-400 text-sm">Enterprise Central Management Portal</p>
        </div>

        {/* Quick Admin Selector */}
        <div className="mb-5 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck size={12} className="text-indigo-400" />
            <span>Authorized Admin Accounts</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {ADMIN_ACCOUNTS.map((adm) => (
              <button
                key={adm.email}
                type="button"
                onClick={() => setEmail(adm.email)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-left transition-all truncate border ${
                  email.toLowerCase() === adm.email.toLowerCase()
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-xs'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {adm.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Admin Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-slate-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
              <button type="button" onClick={handleForgot} className="text-xs text-indigo-400 hover:text-indigo-300">Forgot?</button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-500" />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex justify-center items-center mt-6 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify & Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
