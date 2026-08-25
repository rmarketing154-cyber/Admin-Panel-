import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import Swal from 'sweetalert2';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Cpu, Camera } from 'lucide-react';
import FaceLockModal from './FaceLockModal';

export default function LoginScreen() {
  const [email, setEmail] = useState('gmrony135@gmail.com');
  const [password, setPassword] = useState('@RonyX154');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [faceLockOpen, setFaceLockOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
          Swal.fire('Error', e.message, 'error');
        }
      } else {
        Swal.fire('Login Error', err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFaceLoginSuccess = async () => {
    // If successful face verification, also sign in with email/password automatically or custom token
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      // If auth fails, try to create user or bypass via custom session if allowed
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (err) {
        // Fallback
      }
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
      await sendPasswordResetEmail(auth, resEmail);
      Swal.fire('Sent', 'Password reset link sent', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        
        <div className="text-center mb-8">
          <img 
            src="https://files.catbox.moe/cqiv5k.png" 
            alt="Logo" 
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-xl shadow-indigo-500/40 border border-white/20 icon-3d hover:scale-105 transition-transform" 
            referrerPolicy="no-referrer" 
          />
          <h2 className="text-2xl font-bold text-white mb-1">Mail Factory Admin</h2>
          <p className="text-slate-400 text-sm">Enterprise Central Management Portal</p>
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

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase tracking-widest">Or Biometric</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button
            type="button"
            onClick={() => setFaceLockOpen(true)}
            className="w-full bg-slate-950 border border-indigo-500/40 hover:border-indigo-500 text-indigo-300 hover:text-indigo-200 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-inner"
          >
            <Camera size={18} className="group-hover:scale-110 transition-transform" /> Login with Face Lock (Face ID)
          </button>
        </form>

        <FaceLockModal
          isOpen={faceLockOpen}
          onClose={() => setFaceLockOpen(false)}
          onSuccess={handleFaceLoginSuccess}
          mode="login"
        />
      </div>
    </div>
  );
}
