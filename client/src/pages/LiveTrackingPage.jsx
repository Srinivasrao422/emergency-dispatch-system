import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import LeafletMap from '../components/LeafletMap';
import SupportChatModal from '../components/SupportChatModal';
import DirectCallModal from '../components/DirectCallModal';
import PaymentModal from '../components/PaymentModal';
import InvoiceReceiptModal from '../components/InvoiceReceiptModal';
import {
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  Star,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Truck,
  Wrench,
  Siren,
  ThumbsUp,
  MessageSquare,
  Receipt,
  FileCheck2,
  AlertOctagon,
  X,
  CreditCard,
  FastForward,
  Sparkles,
  Check,
  KeyRound,
  Download,
  Image as ImageIcon,
  Copy
} from 'lucide-react';

export default function LiveTrackingPage() {
  const {
    activeRequest,
    technicians,
    rateJob,
    payInvoice,
    advanceDemoStep,
    cancelRequest,
    setActiveTab
  } = useApp();

  const [ratingVal, setRatingVal] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showDirectCall, setShowDirectCall] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState('Punctual & Fast');
  const [customerOtp, setCustomerOtp] = useState(activeRequest?.otp || '');
  const [routeInfo, setRouteInfo] = useState(null);

  // Phase 8: Real Road Routing Telemetry
  useEffect(() => {
    if (activeRequest?.id && assignedTech?.currentLocation?.lat) {
      fetch(`/api/requests/${activeRequest.id}/route`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setRouteInfo(data);
        })
        .catch(() => {});
    }
  }, [activeRequest?.id, assignedTech?.currentLocation?.lat, assignedTech?.currentLocation?.lng]);

  useEffect(() => {
    if (activeRequest?.otp) {
      setCustomerOtp(activeRequest.otp);
    } else if (activeRequest?.id && activeRequest.status !== 'completed' && activeRequest.status !== 'cancelled') {
      fetch(`/api/requests/${activeRequest.id}/customer-otp`, {
        headers: {
          'x-user-id': activeRequest.customerId,
          'x-user-role': 'customer'
        }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.otp) setCustomerOtp(data.otp);
        })
        .catch(() => {});
    }
  }, [activeRequest?.id, activeRequest?.otp]);

  if (!activeRequest) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
          <MapPin className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">No Active Emergency Request</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          You currently have no emergency dispatch in progress. Raise a request to test autonomous multi-criteria technician matching.
        </p>
        <button
          onClick={() => setActiveTab('request')}
          className="mt-5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold text-xs text-white shadow-sm transition-all"
        >
          Raise Emergency Request
        </button>
      </div>
    );
  }

  const assignedTech = technicians.find((t) => t.id === activeRequest.assignedTechnicianId);

  // Status Progress Indicator
  const steps = [
    { key: 'assigned', label: 'Assigned', sub: '< 15s Match' },
    { key: 'accepted', label: 'Confirmed', sub: 'Tech Confirmed' },
    { key: 'en_route', label: 'En Route', sub: 'GPS Tracking' },
    { key: 'arrived', label: 'Arrived', sub: 'On Site' },
    { key: 'in_progress', label: 'Working', sub: 'Active Repair' },
    { key: 'completed', label: 'Completed', sub: 'Resolved' }
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'assigned':
        return 0;
      case 'accepted':
        return 1;
      case 'en_route':
        return 2;
      case 'arrived':
        return 3;
      case 'in_progress':
        return 4;
      case 'completed':
        return 5;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(activeRequest.status);

  const handleRateSubmit = (e) => {
    e.preventDefault();
    rateJob(activeRequest.id, ratingVal, `${selectedTag}: ${feedbackText}`);
    setHasRated(true);
  };

  const handlePaymentSuccess = (paymentMethod) => {
    payInvoice(activeRequest.id, paymentMethod);
  };

  const isPaid = activeRequest.invoice?.isPaid || false;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Demo Auto-Pilot Lifecycle Simulation Banner */}
      {activeRequest.status !== 'completed' && activeRequest.status !== 'cancelled' && (
        <div className="bg-slate-900/90 border border-purple-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2 text-purple-300 font-medium">
            <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
            <span>
              <strong>Demo Auto-Pilot Active:</strong> Automated lifecycle progression in progress.
            </span>
          </div>

          <button
            onClick={() => advanceDemoStep(activeRequest.id)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 font-semibold transition-all"
            title="Fast-forward to next lifecycle milestone"
          >
            <FastForward className="w-3.5 h-3.5 text-purple-300" />
            <span>Fast-Forward Stage</span>
          </button>
        </div>
      )}

      {/* Active Request Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <Siren className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-1.5 py-0.2 rounded bg-slate-950 text-slate-300 border border-slate-800">
                  {activeRequest.id}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                    activeRequest.priority === 'CRITICAL'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {activeRequest.priority}
                </span>
                <span className="text-[11px] text-slate-500">
                  {new Date(activeRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h1 className="text-lg font-bold text-white mt-0.5">
                {activeRequest.categoryName}
              </h1>
            </div>
          </div>

          {/* Dynamic ETA or Completion Status */}
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 self-start sm:self-auto">
            {activeRequest.status === 'completed' ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Status</div>
                  <div className="text-xs font-bold text-emerald-400">
                    {isPaid ? 'Resolved & Paid' : 'Resolved • Awaiting Payment'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    Estimated Arrival
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    {activeRequest.status === 'assigned'
                      ? 'Confirming...'
                      : activeRequest.status === 'arrived' || activeRequest.status === 'in_progress'
                      ? 'On Site'
                      : `${activeRequest.etaMinutes || 3} min`}
                    <span className="text-[11px] text-slate-400 font-normal ml-1.5 font-sans">
                      ({activeRequest.distanceKm || 0.8} km away)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Milestone Steps Timeline (Classy & Simple Segmented Bar) */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div
                  key={step.key}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-slate-800 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/30'
                      : isPast
                      ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                      : 'bg-slate-950/40 border-slate-850 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    )}
                  </div>
                  <div className="font-semibold text-xs">
                    {step.label}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{step.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Doorstep Verification OTP Security Badge */}
      {activeRequest.status !== 'completed' && activeRequest.status !== 'cancelled' && (
        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-blue-300 uppercase tracking-wider font-semibold">
                Doorstep Security Start Code
              </div>
              <div className="text-xs text-slate-300">
                Provide this 4-digit verification code to the specialist upon arrival to authorize service start:
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="font-mono text-xl font-black text-blue-400 bg-slate-950 px-4 py-1.5 rounded-lg border border-blue-500/40 tracking-widest shadow-inner">
              {customerOtp || activeRequest.otp || '----'}
            </div>
            <button
              onClick={() => {
                const codeToCopy = customerOtp || activeRequest.otp;
                if (codeToCopy) {
                  navigator.clipboard?.writeText(codeToCopy);
                  alert(`Security PIN ${codeToCopy} copied to clipboard!`);
                }
              }}
              title="Copy Security Code"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Live Map + Technician Details & Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Map (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Immediate Proximity Live Map</span>
                {routeInfo && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    🛣️ OSRM Road: {routeInfo.distanceKm} km • {routeInfo.durationMinutes}m ETA
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                {routeInfo?.provider === 'osrm' ? 'OSRM Street Routing Active' : 'OpenStreetMap Real-Time Telemetry'}
              </span>
            </div>

            <LeafletMap
              customerLocation={activeRequest.location}
              technicianLocation={
                assignedTech
                  ? {
                      ...assignedTech.currentLocation,
                      name: assignedTech.name,
                      categoryName: assignedTech.categoryName
                    }
                  : null
              }
              routeCoordinates={routeInfo?.coordinates}
              height="400px"
              zoom={15}
            />
          </div>

          {/* Issue Summary */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 text-xs text-slate-300 flex items-start justify-between gap-3">
            <div>
              <span className="font-semibold text-white block mb-0.5">Reported Issue:</span>
              <span>{activeRequest.issueDescription}</span>
              <div className="text-[11px] text-slate-400 mt-0.5">
                📍 {activeRequest.location?.address}
              </div>
            </div>

            <button
              onClick={() => setShowSosModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 shrink-0"
            >
              Safety Tips
            </button>
          </div>
        </div>

        {/* Right: Assigned Specialist, Settlement & Feedback (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {assignedTech ? (
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-5 shadow-sm space-y-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Assigned Local Specialist
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={assignedTech.avatar}
                  alt={assignedTech.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                    <span>{assignedTech.name}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="text-xs text-slate-400">{assignedTech.categoryName}</div>
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-medium mt-0.5">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{assignedTech.rating}</span>
                    <span className="text-slate-500 font-normal">
                      ({assignedTech.reviewCount} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle info */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Response Vehicle:</span>
                  <span>{assignedTech.vehicle?.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Local Station:</span>
                  <span>{assignedTech.currentLocation?.address || 'Downtown Station'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Background Clearance:</span>
                  <span className="text-emerald-400 font-medium">Verified Professional ✓</span>
                </div>
              </div>

              {/* Communication Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowDirectCall(true)}
                  className="py-2 px-3 rounded-lg font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Direct Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSupportChat(true)}
                  className="py-2 px-3 rounded-lg font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>Support Chat</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-6 text-center space-y-2">
              <Clock className="w-5 h-5 text-amber-400 mx-auto animate-spin" />
              <div className="font-semibold text-xs text-white">Matching Nearest Specialist...</div>
              <div className="text-[11px] text-slate-400">
                Auto-dispatch engine evaluating local proximity and availability.
              </div>
            </div>
          )}

          {/* Post-Completion Invoice, Payment & Verified Rating */}
          {activeRequest.status === 'completed' && (
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs uppercase">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Service Receipt & Invoice</span>
                </div>
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                    isPaid
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  {isPaid ? 'PAID ✓' : 'UNPAID'}
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Diagnostic Inspection:</span>
                  <span className="font-mono text-slate-200">$49.00</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Emergency Labor:</span>
                  <span className="font-mono text-slate-200">$75.00</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Emergency Dispatch Priority:</span>
                  <span className="font-mono text-slate-200">$25.00</span>
                </div>
                <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-emerald-400">
                  <span>Total Amount:</span>
                  <span className="font-mono">$149.00</span>
                </div>
              </div>

              {/* Before & After Photo Proof Verification */}
              {(activeRequest.beforePhoto || activeRequest.afterPhoto) && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>Verified Field Photo Proof</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">Urban Company QA Verified ✓</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400 mb-1 font-medium">Site Triage (Before)</div>
                      <img
                        src={activeRequest.beforePhoto || 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400'}
                        alt="Before Repair"
                        className="w-full h-24 object-cover rounded-lg border border-slate-800"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-400 mb-1 font-medium">Certified Repair (After)</div>
                      <img
                        src={activeRequest.afterPhoto || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400'}
                        alt="After Repair"
                        className="w-full h-24 object-cover rounded-lg border border-emerald-900/60"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Resolution Notes from Technician */}
              {activeRequest.resolutionNotes && (
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                    Technician Resolution Summary:
                  </span>
                  <p className="text-slate-200 text-[11px]">{activeRequest.resolutionNotes}</p>
                </div>
              )}

              {/* Download Official Receipt & Guarantee */}
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-blue-300 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Download Official Work Receipt & Guarantee</span>
              </button>

              {/* Payment Action Button */}
              {!isPaid ? (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay & Settle Invoice ($149.00)</span>
                </button>
              ) : (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-center text-xs text-emerald-300 font-medium flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Payment Completed via {activeRequest.paymentMethod || 'Apple Pay'}</span>
                </div>
              )}

              {/* Customer Rating Section */}
              <div className="pt-2 border-t border-slate-800/80">
                {hasRated || activeRequest.rating ? (
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>Rating: {activeRequest.rating || ratingVal} / 5 Stars</span>
                    </div>
                    <p className="text-slate-400 italic text-[11px]">
                      "{activeRequest.feedback || feedbackText || 'Service completed promptly and professionally.'}"
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleRateSubmit} className="space-y-2.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Rate Service Experience:
                    </label>

                    <div className="flex items-center justify-center gap-2 py-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingVal(star)}
                          className="text-lg transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= ratingVal
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1 justify-center">
                      {['Punctual & Fast', 'Expert Repair', 'Clean Workmanship', 'Courteous'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTag(t)}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            selectedTag === t
                              ? 'bg-amber-950 text-amber-300 border-amber-600'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Add brief feedback notes..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />

                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-750 font-semibold text-xs text-white border border-slate-700 transition-colors"
                    >
                      Submit Verified Rating
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {activeRequest.status !== 'completed' && activeRequest.status !== 'cancelled' && (
            <button
              onClick={() => {
                if (confirm('Cancel this emergency request?')) {
                  cancelRequest(activeRequest.id, 'Cancelled by user');
                }
              }}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 border border-rose-900/40 transition-colors flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Request</span>
            </button>
          )}
        </div>
      </div>

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPay={handlePaymentSuccess}
        invoice={activeRequest.invoice}
        request={activeRequest}
      />

      {/* Safety Tips Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-slate-100 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase">
                <AlertOctagon className="w-4 h-4" />
                <span>Emergency Safety Tips</span>
              </div>
              <button
                onClick={() => setShowSosModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <strong className="text-white block mb-0.5">💧 Water Leaks / Flooding:</strong>
                Shut off the main building water valve immediately. Keep clear of pooled water near outlets.
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <strong className="text-white block mb-0.5">⚡ Electrical Hazards:</strong>
                Do not touch live fixtures or exposed wires. Turn off the main electrical breaker if accessible safely.
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <strong className="text-white block mb-0.5">🔥 Gas Smells:</strong>
                Do not toggle light switches. Evacuate immediately and call your utility emergency hotline.
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowSosModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Chat Modal */}
      <SupportChatModal
        isOpen={showSupportChat}
        onClose={() => setShowSupportChat(false)}
        request={activeRequest}
        technician={assignedTech}
      />

      {/* Direct Calling Modal */}
      <DirectCallModal
        isOpen={showDirectCall}
        onClose={() => setShowDirectCall(false)}
        technician={assignedTech}
      />

      {/* Formal PDF/Print Invoice & Guarantee Certificate Modal */}
      <InvoiceReceiptModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        request={activeRequest}
        technician={assignedTech}
      />
    </div>
  );
}
