import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import IncomingOfferModal from './components/IncomingOfferModal';
import CustomerRequestPage from './pages/CustomerRequestPage';
import LiveTrackingPage from './pages/LiveTrackingPage';
import TechnicianDashboard from './pages/TechnicianDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ServiceHistoryPage from './pages/ServiceHistoryPage';
import ProfilePage from './pages/ProfilePage';
import { AlertCircle, CheckCircle, Info, ShieldAlert } from 'lucide-react';

function MainContent() {
  const { activeTab, toastNotification } = useApp();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      <Navbar />

      {/* Incoming Emergency Dispatch Offer Modal */}
      <IncomingOfferModal />

      {/* Floating Notification (Sleek & Minimalist) */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-[99999] animate-in fade-in duration-200">
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl shadow-xl border text-xs font-medium backdrop-blur-md ${
              toastNotification.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-800/80'
                : toastNotification.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-800/80'
                : toastNotification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80'
                : 'bg-slate-900/90 text-slate-200 border-slate-700/80'
            }`}
          >
            {toastNotification.type === 'error' ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : toastNotification.type === 'warning' ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : toastNotification.type === 'success' ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            )}
            <span>{toastNotification.message}</span>
          </div>
        </div>
      )}

      {/* Dynamic Page Router */}
      <main className="flex-1 pb-16">
        {activeTab === 'request' && <CustomerRequestPage />}
        {activeTab === 'tracking' && <LiveTrackingPage />}
        {activeTab === 'tech_console' && <TechnicianDashboard />}
        {activeTab === 'admin_tower' && <AdminDashboard />}
        {activeTab === 'history' && <ServiceHistoryPage />}
        {activeTab === 'profile' && <ProfilePage />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-slate-400 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong className="text-white">Emergency Home Services Auto-Dispatch System</strong>
            <span className="mx-2">•</span>
            <span>Collaborating Organization: Unified Mentor</span>
            <span className="mx-2">•</span>
            <span>Industry Benchmark: Urban Company</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span>Sub-15s Proximity Routing</span>
            <span>•</span>
            <span>30s TTL Cascade</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono">v1.0.0 Enterprise</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
