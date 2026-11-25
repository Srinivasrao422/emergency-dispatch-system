import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Lock, KeyRound, AlertCircle, CheckCircle2, X, ArrowRight } from 'lucide-react';

export default function AdminAuthModal({ isOpen, onClose, onSuccess }) {
  const { authenticateAdmin, showToast } = useApp();
  const [email, setEmail] = useState('admin@resqdispatch.com');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsAuthenticating(true);

    setTimeout(() => {
      const result = authenticateAdmin(email, password);
      setIsAuthenticating(false);

      if (result.success) {
        showToast('Administrator clearance granted. Welcome to Command Tower.', 'success');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(result.error || 'Invalid administrator credentials. Access denied.');
      }
    }, 400);
  };

  const handleQuickFill = () => {
    setEmail('admin@resqdispatch.com');
    setPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Admin Authentication</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  Secure Sector
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Restricted Operations & Fleet Command Tower
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Restricted Operations Access:</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Customers and technicians require administrator credentials to enter the Command Tower and manual dispatch override console.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Administrator Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="admin@resqdispatch.com"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Security Password / Key:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Quick-fill helper for convenience */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-500 font-mono">Demo: admin@resqdispatch.com / admin123</span>
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-2"
              >
                Auto-Fill Credentials
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isAuthenticating ? 'Verifying Credentials...' : 'Authenticate & Enter Command Tower'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between px-5">
          <span>Operational Clearance Level 5</span>
          <span>ResQDispatch Security Gate</span>
        </div>
      </div>
    </div>
  );
}
