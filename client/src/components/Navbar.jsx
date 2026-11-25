import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import RoleAuthModal from './RoleAuthModal';
import AdminAuthModal from './AdminAuthModal';
import {
  Siren,
  MapPin,
  Wrench,
  BarChart3,
  History,
  UserCheck,
  Radio,
  ChevronDown,
  Shield,
  ShieldCheck,
  Lock,
  LogOut,
  Navigation
} from 'lucide-react';

export default function Navbar() {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    isConnected,
    requests,
    exitAdminMode
  } = useApp();

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);

  const activeEmergenciesCount = requests.filter(
    (r) => ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(r.status)
  ).length;

  const isAdmin = currentUser.role === 'admin';
  const isTechnician = currentUser.role === 'technician';
  const isCustomer = currentUser.role === 'customer';

  const handleAdminClick = () => {
    if (isAdmin) {
      setActiveTab('admin_tower');
    } else {
      setShowAdminAuthModal(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 text-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Operational Status */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-rose-600/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <Siren className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-white">
                    ResQ<span className="text-rose-500 font-extrabold">Dispatch</span>
                  </span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                    Auto-Dispatch
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Unified Mentor & Urban Company Logistics</span>
                </div>
              </div>
            </div>

            {/* Role-Aware Navigation Tabs (Classy & Simple Segmented Bar) */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80">
              {/* Customer View Tabs */}
              {isCustomer && (
                <>
                  <button
                    onClick={() => setActiveTab('request')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'request'
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Siren className="w-3.5 h-3.5 text-rose-400" />
                    <span>Raise Emergency</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('tracking')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                      activeTab === 'tracking'
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>Live Tracking</span>
                    {activeEmergenciesCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'history'
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Service History</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'profile'
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Profile</span>
                  </button>
                </>
              )}

              {/* Technician View Tabs */}
              {isTechnician && (
                <>
                  <button
                    onClick={() => setActiveTab('tech_console')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'tech_console'
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span>Field Console</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('tracking')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'tracking'
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-400" />
                    <span>Active Route & Map</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'history'
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Job History</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'profile'
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Profile & Vehicle</span>
                  </button>
                </>
              )}

              {/* Admin View Tabs */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab('admin_tower')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'admin_tower'
                        ? 'bg-purple-900/60 text-white font-semibold border border-purple-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Fleet Command Tower</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('tracking')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'tracking'
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>Distress Map</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'history'
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit Logs</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'profile'
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dispatch Engine Config</span>
                  </button>
                </>
              )}
            </nav>

            {/* Actions: Admin Security Gate Button & Persona Profile Switcher */}
            <div className="flex items-center gap-3">
              {/* Admin Portal Challenge / Exit Button */}
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <span className="hidden lg:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/80 text-purple-300 font-medium">
                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                    <span>Admin Mode</span>
                  </span>
                  <button
                    onClick={exitAdminMode}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-800 transition-colors"
                    title="Exit Admin Mode"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Exit Admin</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAdminClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-medium transition-all group"
                  title="Requires Administrator Credentials"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300" />
                  <span>Admin Tower</span>
                </button>
              )}

              {/* Persona / Account Selector */}
              <button
                onClick={() => setShowRoleModal(true)}
                className="flex items-center gap-2.5 bg-slate-900 hover:bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all text-xs"
              >
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-700"
                />
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-slate-200 leading-tight flex items-center gap-1">
                    <span>{currentUser.name}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {currentUser.role === 'customer'
                      ? 'Customer'
                      : currentUser.role === 'technician'
                      ? (currentUser.categoryName || 'Technician')
                      : 'Administrator'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Bottom Bar */}
          <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800/80 text-xs text-slate-400">
            {isCustomer && (
              <>
                <button
                  onClick={() => setActiveTab('request')}
                  className={activeTab === 'request' ? 'text-rose-400 font-semibold' : ''}
                >
                  Request
                </button>
                <button
                  onClick={() => setActiveTab('tracking')}
                  className={activeTab === 'tracking' ? 'text-blue-400 font-semibold' : ''}
                >
                  Tracking
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={activeTab === 'history' ? 'text-slate-200 font-semibold' : ''}
                >
                  History
                </button>
                <button
                  onClick={handleAdminClick}
                  className="flex items-center gap-1 text-amber-400 font-medium"
                >
                  <Lock className="w-3 h-3" />
                  <span>Admin</span>
                </button>
              </>
            )}

            {isTechnician && (
              <>
                <button
                  onClick={() => setActiveTab('tech_console')}
                  className={activeTab === 'tech_console' ? 'text-amber-400 font-semibold' : ''}
                >
                  Console
                </button>
                <button
                  onClick={() => setActiveTab('tracking')}
                  className={activeTab === 'tracking' ? 'text-blue-400 font-semibold' : ''}
                >
                  Map
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={activeTab === 'history' ? 'text-slate-200 font-semibold' : ''}
                >
                  History
                </button>
                <button
                  onClick={handleAdminClick}
                  className="flex items-center gap-1 text-amber-400 font-medium"
                >
                  <Lock className="w-3 h-3" />
                  <span>Admin</span>
                </button>
              </>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('admin_tower')}
                  className={activeTab === 'admin_tower' ? 'text-purple-400 font-semibold' : ''}
                >
                  Tower
                </button>
                <button
                  onClick={() => setActiveTab('tracking')}
                  className={activeTab === 'tracking' ? 'text-blue-400 font-semibold' : ''}
                >
                  Map
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={activeTab === 'history' ? 'text-slate-200 font-semibold' : ''}
                >
                  Audit
                </button>
                <button
                  onClick={exitAdminMode}
                  className="text-slate-400"
                >
                  Exit
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Role Authentication & Persona Switcher Console Modal */}
      <RoleAuthModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onRequireAdmin={() => {
          setShowRoleModal(false);
          setShowAdminAuthModal(true);
        }}
      />

      {/* Admin Security Challenge Modal */}
      <AdminAuthModal
        isOpen={showAdminAuthModal}
        onClose={() => setShowAdminAuthModal(false)}
        onSuccess={() => setActiveTab('admin_tower')}
      />
    </>
  );
}
