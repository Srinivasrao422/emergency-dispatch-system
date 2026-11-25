import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Shield,
  ShieldCheck,
  Wrench,
  User,
  KeyRound,
  CheckCircle2,
  X,
  Phone,
  Mail,
  MapPin,
  Car,
  Star,
  Check,
  Lock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function RoleAuthModal({ isOpen, onClose, onRequireAdmin }) {
  const { currentUser, switchUser, technicians, showToast, authenticateAdmin } = useApp();

  const [activeTab, setActiveTab] = useState(currentUser.role || 'customer');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('customer');

  if (!isOpen) return null;

  const handleAdminVerify = (e) => {
    e.preventDefault();
    setAdminError('');

    const res = authenticateAdmin('admin@resqdispatch.com', adminPassword);
    if (res.success) {
      showToast('Admin clearance verified. Switched to Operations Admin.', 'success');
      onClose();
    } else {
      setAdminError('Invalid administrator password. Access restricted.');
    }
  };

  const handleCustomAuth = async (e) => {
    e.preventDefault();
    if (!customEmail) return;

    if (customRole === 'admin') {
      const res = authenticateAdmin(customEmail, customPassword);
      if (res.success) {
        showToast('Admin authenticated successfully.', 'success');
        onClose();
      } else {
        showToast(res.error || 'Admin credentials invalid', 'error');
      }
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customEmail,
          password: customPassword,
          name: customName || customEmail.split('@')[0],
          role: customRole
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        switchUser(data.user);
        onClose();
      }
    } catch (err) {
      console.error(err);
      showToast('Authentication failed', 'error');
    }
  };

  const customersList = [
    {
      id: 'u_cust_1',
      name: 'Jane Doe',
      email: 'customer@resqdispatch.com',
      role: 'customer',
      phone: '+1 (555) 234-5678',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      address: '452 Broadway, SoHo, New York, NY 10013',
      coordinates: { lat: 40.7208, lng: -74.0007 },
      activeTier: 'Homeowner'
    },
    {
      id: 'u_cust_2',
      name: 'Robert Chen',
      email: 'robert@resqdispatch.com',
      role: 'customer',
      phone: '+1 (555) 345-6789',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      address: '120 W 23rd St, Chelsea, New York, NY 10011',
      coordinates: { lat: 40.7431, lng: -73.9938 },
      activeTier: 'Resident'
    }
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[88vh]">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Role & Account Management
              </h2>
              <p className="text-xs text-slate-400">
                Switch role personas to evaluate Customer, Technician, or Admin workflows.
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

        {/* Current Active Session Bar */}
        <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Active Account:</span>
            <span className="font-semibold text-white">{currentUser.name}</span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {currentUser.role}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            {currentUser.email}
          </div>
        </div>

        {/* Segmented Role Tabs */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800">
          <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('customer')}
              className={`py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'customer'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>

            <button
              onClick={() => setActiveTab('technician')}
              className={`py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'technician'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Technician</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-purple-900/60 text-white font-semibold border border-purple-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin (Secure)</span>
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'custom'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Custom Login</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {/* Customer Tab */}
          {activeTab === 'customer' && (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-400 font-medium">
                Verified Customer Profiles:
              </div>

              {customersList.map((cust) => {
                const isActive = currentUser.id === cust.id;

                return (
                  <div
                    key={cust.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-slate-800/60 border-rose-500/60 shadow-sm'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={cust.avatar}
                        alt={cust.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs text-white">{cust.name}</h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {cust.activeTier}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                          <span>{cust.address}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isActive ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/15 text-rose-400 text-xs font-medium border border-rose-500/20">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            switchUser(cust);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
                        >
                          Sign In
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Technician Tab */}
          {activeTab === 'technician' && (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-400 font-medium">
                Active Field Specialists:
              </div>

              {technicians.map((tech) => {
                const isActive = currentUser.id === tech.id;

                return (
                  <div
                    key={tech.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-slate-800/60 border-amber-500/60 shadow-sm'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={tech.avatar}
                          alt={tech.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                            tech.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                        ></span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs text-white">{tech.name}</h4>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                            {tech.categoryName}
                          </span>
                          <span className="flex items-center gap-0.5 text-[11px] text-amber-400 font-medium">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {tech.rating}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {tech.vehicle?.type} • Base: {tech.currentLocation?.address}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isActive ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600/15 text-amber-400 text-xs font-medium border border-amber-500/20">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            switchUser(tech);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
                        >
                          Sign In
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Admin Tab (Requires Password Authentication) */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
                    alt="Sarah Connor"
                    className="w-12 h-12 rounded-xl object-cover border border-purple-500/40"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">Sarah Connor</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-900 text-purple-200">
                        Admin Clearance
                      </span>
                    </div>
                    <div className="text-xs text-purple-300 mt-0.5">
                      Director of Emergency Logistics & Dispatch Operations
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      admin@resqdispatch.com
                    </div>
                  </div>
                </div>

                {currentUser.role === 'admin' ? (
                  <div className="p-3 bg-slate-950 rounded-lg border border-purple-900/60 text-xs text-purple-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Currently Authenticated as Administrator</span>
                    </span>
                    <button
                      onClick={onClose}
                      className="px-3 py-1 rounded bg-slate-800 text-xs text-white"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAdminVerify} className="space-y-3 pt-2 border-t border-purple-900/40">
                    <div className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Enter administrator password to unlock Command Tower:</span>
                    </div>

                    {adminError && (
                      <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{adminError}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter admin password (admin123)"
                        required
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white shadow-md shadow-purple-600/30 transition-all shrink-0"
                      >
                        Verify & Enter
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                      <span>Password hint: admin123</span>
                      <button
                        type="button"
                        onClick={() => setAdminPassword('admin123')}
                        className="text-purple-400 hover:text-purple-300 underline"
                      >
                        Auto-fill
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Custom Login Tab */}
          {activeTab === 'custom' && (
            <form onSubmit={handleCustomAuth} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Select Role:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['customer', 'technician', 'admin'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCustomRole(r)}
                      className={`py-1.5 px-3 rounded-lg capitalize font-medium border transition-colors ${
                        customRole === r
                          ? 'bg-slate-800 text-white border-slate-600 font-semibold'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Email Address:
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  required
                  placeholder="user@resqdispatch.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Password:
                </label>
                <input
                  type="password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 font-medium text-xs text-white transition-all mt-2"
              >
                Authenticate & Switch Session
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between px-5">
          <span>Enterprise Role-Based Access Control</span>
          <span>Instant Session Switch</span>
        </div>
      </div>
    </div>
  );
}
