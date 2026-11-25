import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import LeafletMap from '../components/LeafletMap';
import {
  Wrench,
  Radio,
  Power,
  Navigation,
  CheckCircle,
  Clock,
  MapPin,
  FileText,
  DollarSign,
  Star,
  Award,
  AlertTriangle,
  Play,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Truck,
  Phone,
  MessageSquare,
  KeyRound,
  ShieldCheck,
  Wallet,
  ArrowUpRight,
  Camera,
  Check,
  AlertOctagon,
  Sliders,
  ExternalLink,
  Plus,
  Trash2,
  FileSignature,
  TrendingUp,
  History,
  Send,
  UserCheck,
  Wifi,
  WifiOff,
  Coffee,
  Package,
  RefreshCw
} from 'lucide-react';

export default function TechnicianDashboard() {
  const {
    currentUser,
    toggleTechnicianOnline,
    technicians,
    requests,
    acceptJob,
    rejectJob,
    startNavigation,
    startWork,
    completeJob,
    verifyServiceOTP,
    uploadJobPhotos,
    requestTechnicianPayout,
    updateTechnicianProfile,
    fetchTechnicianEarnings,
    showToast
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState('operations'); // 'operations' | 'earnings' | 'performance' | 'profile'
  const beforeFileInputRef = useRef(null);
  const afterFileInputRef = useRef(null);

  // Field Operation States
  const [enteredOtp, setEnteredOtp] = useState('');
  const [notes, setNotes] = useState('');
  const [partsList, setPartsList] = useState([
    { name: 'Commercial Brass Shutoff Valve (1/2")', cost: 38.50 },
    { name: 'High-Temperature Teflon Compression Gasket', cost: 12.00 }
  ]);
  const [newPartName, setNewPartName] = useState('');
  const [newPartCost, setNewPartCost] = useState('');

  const [beforePhoto, setBeforePhoto] = useState(
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400'
  );
  const [afterPhoto, setAfterPhoto] = useState(
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400'
  );

  // Field Safety Checklist
  const [safetyChecks, setSafetyChecks] = useState({
    valveShut: true,
    ppeEquipped: true,
    meterZeroed: true
  });

  // Customer Sign-Off / Acknowledgement
  const [customerSigned, setCustomerSigned] = useState(true);
  const [signerName, setSignerName] = useState('Jane Doe');

  // Decline Job Modal State
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState('Mechanical maintenance required');
  const [customDeclineText, setCustomDeclineText] = useState('');

  // Payout State
  const [isPayoutProcessing, setIsPayoutProcessing] = useState(false);
  const [latestPayout, setLatestPayout] = useState(null);

  // Technician Profile Form State
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [workingRadiusKm, setWorkingRadiusKm] = useState(15);
  const [vehicleType, setVehicleType] = useState('Emergency Response Van');
  const [vehiclePlate, setVehiclePlate] = useState('RES-7721');
  const [profileSaved, setProfileSaved] = useState(false);

  // Detailed Earnings Summary State
  const [earningsSummary, setEarningsSummary] = useState(null);

  // Phase 9: Connectivity, Shift & Inventory States
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [shiftStatus, setShiftStatus] = useState(currentTech?.shiftStatus || 'ON_DUTY');
  const [isOnBreak, setIsOnBreak] = useState(Boolean(currentTech?.isOnBreak));
  const [catalogItems, setCatalogItems] = useState([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [catalogQty, setCatalogQty] = useState(1);
  const [isSyncingDraft, setIsSyncingDraft] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch inventory catalog on mount
  useEffect(() => {
    fetch('/api/inventory')
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setCatalogItems(data.items);
      })
      .catch(() => {});
  }, []);

  // Shift & Break Actions
  const handleStartShift = async () => {
    try {
      const res = await fetch(`/api/technicians/${currentTech.id}/shift/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Started shift via Field Console' })
      });
      const data = await res.json();
      if (data.success) {
        setShiftStatus('ON_DUTY');
        setIsOnBreak(false);
        showToast('Shift commenced. You are now active for emergency dispatches.', 'success');
      } else {
        showToast(data.error || 'Failed to start shift', 'error');
      }
    } catch {
      showToast('Network error starting shift', 'error');
    }
  };

  const handleEndShift = async () => {
    try {
      const res = await fetch(`/api/technicians/${currentTech.id}/shift/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Ended shift via Field Console' })
      });
      const data = await res.json();
      if (data.success) {
        setShiftStatus('OFF_DUTY');
        setIsOnBreak(false);
        showToast('Shift ended successfully. You are now offline.', 'info');
      } else {
        showToast(data.error || 'Failed to end shift', 'error');
      }
    } catch {
      showToast('Network error ending shift', 'error');
    }
  };

  const handleStartBreak = async () => {
    try {
      const res = await fetch(`/api/technicians/${currentTech.id}/break/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        setShiftStatus('ON_BREAK');
        setIsOnBreak(true);
        showToast('Rest break started. Temporarily paused from new dispatches.', 'info');
      } else {
        showToast(data.error || 'Failed to take break', 'error');
      }
    } catch {
      showToast('Network error taking break', 'error');
    }
  };

  const handleEndBreak = async () => {
    try {
      const res = await fetch(`/api/technicians/${currentTech.id}/break/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        setShiftStatus('ON_DUTY');
        setIsOnBreak(false);
        showToast('Break ended. Returned to active duty.', 'success');
      } else {
        showToast(data.error || 'Failed to end break', 'error');
      }
    } catch {
      showToast('Network error ending break', 'error');
    }
  };

  const handleRecordCatalogMaterial = async () => {
    if (!activeJob || !selectedCatalogId) return;
    try {
      const res = await fetch(`/api/requests/${activeJob.id}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedCatalogId,
          quantity: catalogQty,
          technicianId: currentTech.id
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Added ${catalogQty}x ${data.material?.itemName} to job and invoice.`, 'success');
        setSelectedCatalogId('');
        setCatalogQty(1);
      } else {
        showToast(data.error || 'Failed to record material', 'error');
      }
    } catch {
      showToast('Offline: Material queued in local field draft.', 'info');
    }
  };

  const handleSyncOfflineDraft = async () => {
    if (!activeJob) return;
    setIsSyncingDraft(true);
    try {
      const res = await fetch(`/api/technicians/${currentTech.id}/sync-offline-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: activeJob.id,
          idempotencyKey: `sync_${activeJob.id}_${Date.now()}`,
          clientVersion: 1,
          draft: {
            resolutionNotes: notes,
            checklist: safetyChecks,
            beforePhoto,
            afterPhoto
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setLastSyncedTime(new Date().toLocaleTimeString());
        showToast('Field notes and checklist synchronized with central server.', 'success');
      } else {
        showToast(data.error || 'Synchronization conflict or error', 'error');
      }
    } catch {
      showToast('Sync failed: Network currently unreachable', 'error');
    } finally {
      setIsSyncingDraft(false);
    }
  };

  // Resolve current technician record
  const currentTech =
    technicians.find((t) => t.id === currentUser.id) ||
    technicians[0];

  // Initialize profile form values
  useEffect(() => {
    if (currentTech) {
      setProfileName(currentTech.name || '');
      setProfilePhone(currentTech.phone || '');
      setWorkingRadiusKm(currentTech.workingRadiusKm || 15);
      setVehicleType(currentTech.vehicle?.type || 'Emergency Response Van');
      setVehiclePlate(currentTech.vehicle?.plate || 'RES-7721');
    }
  }, [currentTech]);

  // Load detailed earnings when opening Earnings or Performance tab
  useEffect(() => {
    if (activeSubTab === 'earnings' || activeSubTab === 'performance') {
      fetchTechnicianEarnings(currentTech.id).then((data) => {
        if (data) setEarningsSummary(data);
      });
    }
  }, [activeSubTab, currentTech.id]);

  // Find active job assigned to this technician
  const activeJob = requests.find(
    (r) =>
      r.assignedTechnicianId === currentTech.id &&
      r.status !== 'completed' &&
      r.status !== 'cancelled'
  );

  // Completed jobs for this technician
  const completedJobsList = requests.filter(
    (r) => r.assignedTechnicianId === currentTech.id && r.status === 'completed'
  );

  // Handle Photo File Upload with Canvas Downsampling
  const handlePhotoUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 500;
          let width = img.width;
          let height = img.height;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);

          if (type === 'before') {
            setBeforePhoto(compressed);
            showToast('Before-service photo proof loaded', 'info');
          } else {
            setAfterPhoto(compressed);
            showToast('After-service photo proof loaded', 'info');
          }

          // Phase 8: Secure Cloud Storage Upload (service-evidence bucket)
          if (activeJob?.id) {
            fetch('/api/storage/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-technician-id': currentTech.id,
                'x-user-role': 'specialist'
              },
              body: JSON.stringify({
                bucket: 'service-evidence',
                fileName: `${type}_photo_${activeJob.id}_${Date.now()}.jpg`,
                fileData: compressed,
                requestId: activeJob.id,
                category: type
              })
            })
              .then((res) => res.json())
              .then((uploadData) => {
                if (uploadData.success) {
                  showToast(`Cloud Storage: ${type} proof synced to secure bucket`, 'success');
                }
              })
              .catch(() => {});
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPart = () => {
    if (!newPartName.trim()) return;
    const cost = parseFloat(newPartCost) || 0;
    setPartsList([...partsList, { name: newPartName.trim(), cost }]);
    setNewPartName('');
    setNewPartCost('');
  };

  const handleRemovePart = (index) => {
    setPartsList(partsList.filter((_, i) => i !== index));
  };

  const totalPartsCost = partsList.reduce((acc, p) => acc + p.cost, 0);

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (!activeJob) return;
    const success = await verifyServiceOTP(activeJob.id, enteredOtp);
    if (success) {
      setEnteredOtp('');
    }
  };

  const handleCompleteJobSubmit = (e) => {
    e.preventDefault();
    if (!activeJob) return;

    const partsString = partsList.length > 0
      ? partsList.map((p) => `${p.name} ($${p.cost.toFixed(2)})`).join(', ')
      : 'Diagnostic Inspection Kit';

    const signatureString = customerSigned
      ? `Signed by: ${signerName || activeJob.customerName || 'Customer'}`
      : 'Customer verbal acknowledgement';

    completeJob(
      activeJob.id,
      notes || 'Emergency diagnostic completed. System pressure tested, calibrated, and certified.',
      partsString,
      beforePhoto,
      afterPhoto,
      signatureString
    );
  };

  const handleConfirmDecline = () => {
    if (!activeJob) return;
    const finalReason = customDeclineText.trim() || selectedDeclineReason;
    rejectJob(activeJob.id, finalReason);
    setDeclineModalOpen(false);
    setCustomDeclineText('');
  };

  const handlePayout = async () => {
    setIsPayoutProcessing(true);
    const result = await requestTechnicianPayout(currentTech.id);
    if (result && result.success) {
      setLatestPayout(result.payoutRecord || {
        amount: result.payoutAmount,
        timestamp: new Date().toISOString(),
        destination: 'Direct Bank ACH (****4892)'
      });
      // Refresh earnings summary
      fetchTechnicianEarnings(currentTech.id).then((data) => {
        if (data) setEarningsSummary(data);
      });
    }
    setIsPayoutProcessing(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const updated = await updateTechnicianProfile(currentTech.id, {
      name: profileName,
      phone: profilePhone,
      workingRadiusKm: parseFloat(workingRadiusKm),
      vehicleType,
      vehiclePlate
    });
    if (updated) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  const allSafetyPassed =
    safetyChecks.valveShut && safetyChecks.ppeEquipped && safetyChecks.meterZeroed;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Specialist Identity & Duty Bar */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img
              src={currentTech.avatar}
              alt={currentTech.name}
              className="w-14 h-14 rounded-xl object-cover border-2 border-slate-700"
            />
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                currentTech.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            ></span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{currentTech.name}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-800/80">
                {currentTech.categoryName}
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-400 font-bold bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{currentTech.rating}</span>
                <span className="text-slate-500 font-normal">({currentTech.reviewCount || 42} reviews)</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
              <span>Vehicle: <strong className="text-slate-300">{currentTech.vehicle?.type}</strong> ({currentTech.vehicle?.plate})</span>
              <span>•</span>
              <span>Radius: <strong className="text-slate-300">{currentTech.workingRadiusKm || 15} km</strong></span>
              <span>•</span>
              <span>Today: <strong className="text-emerald-400">{currentTech.completedJobsToday || 0} jobs</strong></span>
            </p>
          </div>
        </div>

        {/* Phase 9: Connectivity & Shift Workforce Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Connectivity Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isOffline
                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                : isSyncingDraft
                ? 'bg-blue-950/60 border-blue-800 text-blue-300 animate-pulse'
                : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
            }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{isOffline ? 'Offline Mode (Drafting Safe)' : isSyncingDraft ? 'Syncing...' : 'Field Online'}</span>
          </div>

          {/* Shift & Break Duty Controls */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
            <span
              className={`px-2 py-1 rounded-lg font-bold text-[10px] tracking-wide uppercase ${
                shiftStatus === 'ON_DUTY'
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-600/40'
                  : shiftStatus === 'ON_BREAK'
                  ? 'bg-amber-600/30 text-amber-400 border border-amber-600/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {shiftStatus === 'ON_DUTY' ? '🟢 ON DUTY' : shiftStatus === 'ON_BREAK' ? '☕ ON BREAK' : '⚪ OFF DUTY'}
            </span>

            {shiftStatus === 'OFF_DUTY' ? (
              <button
                onClick={handleStartShift}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-sm"
              >
                Start Shift
              </button>
            ) : shiftStatus === 'ON_BREAK' ? (
              <button
                onClick={handleEndBreak}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 font-bold text-white shadow-sm"
              >
                Resume Duty
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleStartBreak}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px]"
                  title="Pause dispatches for operational rest break"
                >
                  Take Break
                </button>
                <button
                  onClick={handleEndShift}
                  className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-medium text-[11px]"
                  title="End duty shift (active jobs protected)"
                >
                  End Shift
                </button>
              </div>
            )}
          </div>

          {activeJob && (
            <button
              onClick={handleSyncOfflineDraft}
              disabled={isSyncingDraft}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 text-xs font-medium transition-colors"
              title="Synchronize offline field draft with central dispatch"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDraft ? 'animate-spin' : ''}`} />
              <span>Sync Draft</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('operations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeSubTab === 'operations'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Active Field Console</span>
          {activeJob && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('earnings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeSubTab === 'earnings'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Earnings & Payouts</span>
          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
            ${(currentTech.walletBalance || 350.0).toFixed(2)}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('performance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeSubTab === 'performance'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Performance & Reviews</span>
        </button>

        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeSubTab === 'profile'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Vehicle & Fleet Settings</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ACTIVE FIELD OPERATIONS CONSOLE                   */}
      {/* ======================================================== */}
      {activeSubTab === 'operations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Job Lifecycle Details (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {activeJob ? (
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
                {/* Job Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">{activeJob.id}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                      {activeJob.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                      {activeJob.priority}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono">
                    ETA: <strong className="text-emerald-400">{activeJob.etaMinutes || 3} min</strong> ({activeJob.distanceKm || 0.8} km)
                  </div>
                </div>

                {/* Issue Description */}
                <div className="space-y-1.5">
                  <div className="font-bold text-sm text-white flex items-center justify-between">
                    <span>{activeJob.categoryName}</span>
                    <span className="text-xs text-slate-400 font-normal">
                      Created: {new Date(activeJob.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    "{activeJob.issueDescription}"
                  </p>
                </div>

                {/* Customer Contact & Navigation Box */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-400 text-[11px]">Customer:</div>
                      <div className="font-bold text-white text-sm">{activeJob.customerName}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${activeJob.customerPhone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono text-xs border border-slate-700 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{activeJob.customerPhone}</span>
                      </a>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{activeJob.location?.address}</span>
                    </div>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeJob.location?.lat},${activeJob.location?.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open in Maps</span>
                    </a>
                  </div>
                </div>

                {/* Lifecycle Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                    <span>Workflow Lifecycle Progress</span>
                    <span className="capitalize text-emerald-400">{activeJob.status.replace('_', ' ')}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['accepted', 'en_route', 'arrived', 'in_progress', 'completed'].map((stage, idx) => {
                      const stages = ['accepted', 'en_route', 'arrived', 'in_progress', 'completed'];
                      const currentIdx = stages.indexOf(activeJob.status);
                      const isComplete = currentIdx >= idx;
                      const isCurrent = currentIdx === idx;
                      return (
                        <div
                          key={stage}
                          className={`h-2 rounded-full transition-all ${
                            isComplete ? 'bg-emerald-500' : 'bg-slate-800'
                          } ${isCurrent ? 'ring-2 ring-emerald-400/40' : ''}`}
                        ></div>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic Milestone Action Stages */}
                <div className="pt-2 space-y-3">
                  {/* 1. ASSIGNED: Accept or Decline Offer */}
                  {activeJob.status === 'assigned' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setDeclineModalOpen(true)}
                        className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-slate-300 border border-slate-700 flex items-center justify-center gap-2 transition-all"
                      >
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Decline / Reassign</span>
                      </button>

                      <button
                        onClick={() => acceptJob(activeJob.id)}
                        className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept Emergency Job</span>
                      </button>
                    </div>
                  )}

                  {/* 2. ACCEPTED: Start Driving */}
                  {activeJob.status === 'accepted' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => startNavigation(activeJob.id)}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Start Driving & Broadcast GPS Telemetry</span>
                      </button>

                      <button
                        onClick={() => setDeclineModalOpen(true)}
                        className="w-full py-2 rounded-xl text-slate-400 hover:text-rose-400 text-[11px] font-medium transition-colors"
                      >
                        Unable to attend? Reassign to next candidate
                      </button>
                    </div>
                  )}

                  {/* 3. EN ROUTE: Live Navigation Simulation */}
                  {activeJob.status === 'en_route' && (
                    <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs text-blue-200">
                        <span className="flex items-center gap-2 font-semibold">
                          <Truck className="w-4 h-4 text-blue-400 animate-pulse" />
                          <span>Navigating to Incident Site... Telemetry Syncing</span>
                        </span>
                        <button
                          onClick={() => startWork(activeJob.id)}
                          className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500"
                        >
                          Fast Arrive
                        </button>
                      </div>

                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, Math.max(15, 100 - (activeJob.distanceKm || 1) * 25))}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* 4. ARRIVED: Customer 4-Digit Security OTP Verification */}
                  {activeJob.status === 'arrived' && (
                    <form onSubmit={handleVerifyOtpSubmit} className="space-y-3 p-4 rounded-xl bg-amber-950/30 border border-amber-600/40">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <KeyRound className="w-4 h-4" />
                        <span>Step 1 of 2: Customer Security OTP Gate</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Ask the customer for their 4-digit physical arrival PIN to verify presence and commence work.
                      </p>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value)}
                          placeholder="4-digit OTP"
                          required
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-xs text-white shadow-sm"
                        >
                          Verify OTP & Start Work
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1.5 text-amber-400/90 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Confidential Customer Doorstep PIN</span>
                        </span>
                        <span className="text-[10px] text-slate-500 italic">
                          Obtain verbally from customer
                        </span>
                      </div>
                    </form>
                  )}

                  {/* 5. IN PROGRESS: Complete Service Form */}
                  {activeJob.status === 'in_progress' && (
                    <form onSubmit={handleCompleteJobSubmit} className="space-y-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      {/* Safety Checklist */}
                      <div className="space-y-2 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                          <AlertOctagon className="w-4 h-4 text-amber-400" />
                          <span>Mandatory Field Safety Checklist</span>
                        </div>

                        <div className="space-y-1.5 text-[11px] text-slate-300">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={safetyChecks.valveShut}
                              onChange={(e) => setSafetyChecks((s) => ({ ...s, valveShut: e.target.checked }))}
                              className="rounded bg-slate-900 border-slate-700 text-emerald-600"
                            />
                            <span>Primary isolation valve / main electrical circuit breaker shut</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={safetyChecks.ppeEquipped}
                              onChange={(e) => setSafetyChecks((s) => ({ ...s, ppeEquipped: e.target.checked }))}
                              className="rounded bg-slate-900 border-slate-700 text-emerald-600"
                            />
                            <span>Certified PPE gear & safety eye protection equipped</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={safetyChecks.meterZeroed}
                              onChange={(e) => setSafetyChecks((s) => ({ ...s, meterZeroed: e.target.checked }))}
                              className="rounded bg-slate-900 border-slate-700 text-emerald-600"
                            />
                            <span>Digital calibration pressure meter zeroed and calibrated</span>
                          </label>
                        </div>
                      </div>

                      {/* Before & After Photo Proof Upload */}
                      <div className="space-y-2 pb-3 border-b border-slate-800">
                        <div className="flex items-center justify-between text-slate-200 font-bold text-xs">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-blue-400" />
                            <span>Before & After Photo Proofs (Audit Trail)</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal">Click image to upload</span>
                        </div>

                        <input
                          type="file"
                          ref={beforeFileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, 'before')}
                        />
                        <input
                          type="file"
                          ref={afterFileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, 'after')}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 block font-medium">1. Pre-Repair State:</span>
                            <div
                              onClick={() => beforeFileInputRef.current?.click()}
                              className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-700 hover:border-blue-500 transition-all"
                            >
                              <img
                                src={beforePhoto}
                                alt="Before repair"
                                className="w-full h-24 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-semibold text-white transition-opacity">
                                Change Photo
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 block font-medium">2. Post-Repair Verified:</span>
                            <div
                              onClick={() => afterFileInputRef.current?.click()}
                              className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-700 hover:border-emerald-500 transition-all"
                            >
                              <img
                                src={afterPhoto}
                                alt="After repair"
                                className="w-full h-24 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-semibold text-white transition-opacity">
                                Change Photo
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Phase 9: Parts & Official Inventory Catalog Picker */}
                      <div className="space-y-2 pb-3 border-b border-slate-800">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-amber-400" />
                            <span>Emergency Parts & Inventory:</span>
                          </div>
                          <span className="text-emerald-400 font-mono text-[11px]">Total: ₹{totalPartsCost.toFixed(2)}</span>
                        </div>

                        {/* Official Inventory Catalog Dropdown */}
                        {catalogItems.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 space-y-2">
                            <div className="text-[10px] text-slate-400 font-medium">Select Verified Part from Central Warehouse:</div>
                            <div className="flex gap-2">
                              <select
                                value={selectedCatalogId}
                                onChange={(e) => setSelectedCatalogId(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                              >
                                <option value="">-- Choose part from catalog --</option>
                                {catalogItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    [{item.sku}] {item.name} — ₹{item.unitPrice} ({item.stockQuantity} in stock)
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={catalogQty}
                                onChange={(e) => setCatalogQty(parseInt(e.target.value) || 1)}
                                className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center text-white"
                              />
                              <button
                                type="button"
                                onClick={handleRecordCatalogMaterial}
                                disabled={!selectedCatalogId}
                                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold shrink-0 shadow-sm"
                              >
                                Record & Deduct
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                          {partsList.map((part, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                            >
                              <span className="text-slate-300">{part.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-400">₹{part.cost.toFixed(2)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePart(idx)}
                                  className="text-slate-500 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Custom Component Add Line */}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Custom component name..."
                            value={newPartName}
                            onChange={(e) => setNewPartName(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                          <input
                            type="number"
                            placeholder="Price (₹)"
                            value={newPartCost}
                            onChange={(e) => setNewPartCost(e.target.value)}
                            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddPart}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Resolution Notes */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-300 block">
                          Technician Resolution Notes:
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                          placeholder="e.g. Replaced faulty component, verified system pressure, tested safety shutoff, customer briefed on usage."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Customer Digital Sign-Off / Acknowledgement */}
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                          <span className="flex items-center gap-1.5">
                            <FileSignature className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Customer Sign-Off & Acknowledgement</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                            <input
                              type="checkbox"
                              checked={customerSigned}
                              onChange={(e) => setCustomerSigned(e.target.checked)}
                              className="rounded bg-slate-950 border-slate-700 text-emerald-600"
                            />
                            <span>Physical customer presence & work verification acknowledged</span>
                          </label>
                        </div>

                        <input
                          type="text"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          placeholder="Customer Signer Full Name"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!allSafetyPassed}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold text-xs text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Complete Service & Issue $149.00 Invoice (Credit 85% to Wallet)</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
                  <Radio className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Technician Radar Active</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Continuous real-time GPS telemetry is broadcasting. You are ready to accept emergencies matching <strong>{currentTech.categoryName}</strong> within your configured {currentTech.workingRadiusKm || 15} km working radius.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-full border border-slate-800 text-xs font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Status: {currentTech.isOnline ? 'Available for Immediate Dispatch' : 'Offline'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Map Telemetry & Quick Wallet Overview (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Quick Wallet Overview */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                  <Wallet className="w-4 h-4" />
                  <span>Specialist Payout Wallet</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">85/15 Revenue Split</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Today's Earnings:</span>
                  <div className="text-xl font-bold text-white font-mono mt-0.5">
                    ${(currentTech.earningsToday || 0.0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">85% Net Take-Home</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Available Balance:</span>
                  <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                    ${(currentTech.walletBalance || 350.0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold">Ready for Transfer</div>
                </div>
              </div>

              <button
                onClick={handlePayout}
                disabled={isPayoutProcessing || (currentTech.walletBalance || 0) <= 0}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isPayoutProcessing ? 'Transferring...' : 'Instant Payout to Bank (ACH)'}</span>
              </button>
            </div>

            {/* GPS Telemetry & Map Card */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-white px-1">
                <span>Incident Geospatial Route</span>
                <span className="text-emerald-400 text-[11px] font-mono">GPS Telemetry Synced</span>
              </div>

              <LeafletMap
                activeRequest={activeJob}
                technicianLocation={currentTech.currentLocation}
                customerLocation={activeJob ? activeJob.location : currentTech.currentLocation}
                height="300px"
                zoom={14}
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: EARNINGS & PAYOUT WALLET                          */}
      {/* ======================================================== */}
      {activeSubTab === 'earnings' && (
        <div className="space-y-6">
          {/* Earnings Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 font-medium">Available Wallet Balance</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                ${(currentTech.walletBalance || 350.0).toFixed(2)}
              </div>
              <div className="text-[11px] text-emerald-500 mt-1">Ready for instant ACH payout</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 font-medium">Today's Net Take-Home</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                ${(currentTech.earningsToday || 0.0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">85% after 15% platform cut</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 font-medium">Jobs Completed Today</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {currentTech.completedJobsToday || 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">First-responder throughput</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 font-medium">Lifetime Gross Billed</div>
              <div className="text-2xl font-bold text-blue-400 font-mono mt-1">
                ${(earningsSummary?.lifetimeGross || (completedJobsList.length * 149.0)).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {completedJobsList.length} verified incident completions
              </div>
            </div>
          </div>

          {/* Instant Transfer Banner */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/60 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Instant Bank Direct Deposit</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Transfers execute instantly via Federal ACH to Chase Business Checking (****4892) with zero transfer fees.
              </p>
            </div>

            <button
              onClick={handlePayout}
              disabled={isPayoutProcessing || (currentTech.walletBalance || 0) <= 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all whitespace-nowrap self-start sm:self-auto"
            >
              {isPayoutProcessing ? 'Processing Transfer...' : `Transfer $${(currentTech.walletBalance || 350.0).toFixed(2)} Now`}
            </button>
          </div>

          {/* Completed Jobs History Table */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <History className="w-4 h-4 text-blue-400" />
                <span>Completed Job Ledger & Revenue Breakdown</span>
              </div>
              <span className="text-xs text-slate-400">Showing {completedJobsList.length} incidents</span>
            </div>

            {completedJobsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Request ID</th>
                      <th className="py-2.5 px-3">Customer & Issue</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Completed At</th>
                      <th className="py-2.5 px-3">Gross Invoice</th>
                      <th className="py-2.5 px-3">Platform Fee (15%)</th>
                      <th className="py-2.5 px-3 text-right">Net Payout (85%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {completedJobsList.map((job) => {
                      const gross = job.invoice?.totalAmount || 149.0;
                      const fee = gross * 0.15;
                      const net = gross * 0.85;
                      return (
                        <tr key={job.id} className="hover:bg-slate-950/60 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-white">{job.id}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-200">{job.customerName}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{job.issueDescription}</div>
                          </td>
                          <td className="py-3 px-3">{job.categoryName}</td>
                          <td className="py-3 px-3 text-slate-400">
                            {job.completedAt ? new Date(job.completedAt).toLocaleString() : 'Recent'}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">${gross.toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono text-slate-500">-${fee.toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-400 text-right">
                            +${net.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                No completed jobs recorded yet today. When you complete an emergency request, your 85% payout ledger appears here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PERFORMANCE & CUSTOMER REVIEWS                    */}
      {/* ======================================================== */}
      {activeSubTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 font-medium">Customer Satisfaction</div>
              <div className="flex items-center gap-1.5 text-2xl font-bold text-amber-400 font-mono mt-1">
                <Star className="w-6 h-6 fill-current" />
                <span>{currentTech.rating}</span>
                <span className="text-xs text-slate-500 font-normal">/ 5.0</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Based on {currentTech.reviewCount || 42} verified ratings</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 font-medium">Dispatch Acceptance Rate</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                98.4%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Target: &gt;95% within 30s TTL</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 font-medium">On-Time Arrival SLA</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                96.2%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Average ETA accuracy under 20 min</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 font-medium">OTP Verification Rate</div>
              <div className="text-2xl font-bold text-blue-400 font-mono mt-1">
                100%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Zero unverified site entries</div>
            </div>
          </div>

          {/* Customer Reviews Feed */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span>Verified Customer Ratings & Feedback Feed</span>
              </div>
              <span className="text-xs text-slate-400">Post-service survey audits</span>
            </div>

            <div className="space-y-3">
              {[
                {
                  customer: 'Jane Doe',
                  rating: 5,
                  date: 'Today, 2 hours ago',
                  category: currentTech.categoryName,
                  comment: 'Arrived in under 7 minutes! Resolved the main valve issue immediately and left the basement bone dry. Outstanding service.'
                },
                {
                  customer: 'Robert Chen',
                  rating: 5,
                  date: 'Yesterday',
                  category: currentTech.categoryName,
                  comment: 'Very professional. Explained every component replaced and certified the pressure gauge before departure.'
                },
                {
                  customer: 'Elena Rostova',
                  rating: 5,
                  date: '3 days ago',
                  category: currentTech.categoryName,
                  comment: 'Fast emergency dispatch. Highly recommend ResQDispatch specialists.'
                }
              ].map((rev, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{rev.customer}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {rev.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 italic">"{rev.comment}"</p>
                  <div className="text-[10px] text-slate-500">{rev.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: VEHICLE & FLEET SETTINGS                          */}
      {/* ======================================================== */}
      {activeSubTab === 'profile' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Workforce Fleet & Operational Profile</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your dispatch operational perimeter, vehicle telemetry, and contact credentials.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Working Radius Slider */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-200">
                    Maximum Service Dispatch Radius:
                  </label>
                  <span className="font-mono text-blue-400 font-bold text-sm">
                    {workingRadiusKm} km
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={1}
                  value={workingRadiusKm}
                  onChange={(e) => setWorkingRadiusKm(e.target.value)}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5 km (Ultra-Local)</span>
                  <span>25 km (Standard Metro)</span>
                  <span>50 km (Regional Outer Belt)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  The autonomous dispatch engine will prioritize and match incidents within this perimeter.
                </p>
              </div>

              {/* Specialist Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300 block mb-1">
                    Specialist Full Name:
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-300 block mb-1">
                    Direct Operational Mobile Phone:
                  </label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Vehicle Type & Plate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300 block mb-1">
                    Fleet Response Vehicle Type:
                  </label>
                  <input
                    type="text"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-300 block mb-1">
                    Vehicle License Plate:
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {profileSaved ? (
                <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Profile saved to PostgreSQL database!</span>
                </span>
              ) : (
                <span className="text-slate-500 text-[11px]">Changes persist across reboots</span>
              )}

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-sm transition-all"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* DECLINE JOB MODAL WITH SPECIFIC REASON                   */}
      {/* ======================================================== */}
      {declineModalOpen && activeJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Decline Dispatch & Trigger Reassignment</span>
              </h3>
              <button
                onClick={() => setDeclineModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Please specify the operational reason for declining <strong>{activeJob.id}</strong>. The system will exclude your profile and instantly cascade to the next optimal candidate.
            </p>

            <div className="space-y-2 text-xs">
              {[
                'Mechanical maintenance required on response vehicle',
                'Outside current realistic service radius',
                'Hazardous / unsafe site access conditions',
                'Specialized component / tool not in vehicle inventory',
                'Personal emergency / break'
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedDeclineReason === reason
                      ? 'bg-amber-950/60 border-amber-600 text-white font-medium'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="declineReason"
                    checked={selectedDeclineReason === reason}
                    onChange={() => setSelectedDeclineReason(reason)}
                    className="accent-amber-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Or custom note:
                </label>
                <input
                  type="text"
                  placeholder="Specify other reason..."
                  value={customDeclineText}
                  onChange={(e) => setCustomDeclineText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeclineModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDecline}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              >
                Confirm Decline & Cascade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
