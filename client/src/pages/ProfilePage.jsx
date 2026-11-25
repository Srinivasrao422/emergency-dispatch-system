import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  UserCheck,
  Shield,
  Camera,
  Upload,
  Check,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Building2,
  Layers,
  Compass,
  Save,
  CheckCircle2,
  Sparkles,
  Sliders,
  ShieldCheck,
  Radio,
  Image as ImageIcon
} from 'lucide-react';

const PRESET_AVATARS = [
  { id: 'av1', label: 'Jane (Default)', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250' },
  { id: 'av2', label: 'Professional Executive', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=250' },
  { id: 'av3', label: 'Robert (Homeowner)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250' },
  { id: 'av4', label: 'Field Specialist', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250' },
  { id: 'av5', label: 'Technical Engineer', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=250' }
];

export default function ProfilePage() {
  const { currentUser, updateUserProfile, showToast } = useApp();

  const fileInputRef = useRef(null);

  // Form State
  const [name, setName] = useState(currentUser.name || 'Jane Doe');
  const [email, setEmail] = useState(currentUser.email || 'customer@resqdispatch.com');
  const [phone, setPhone] = useState(currentUser.phone || '+1 (555) 234-5678');
  const [address, setAddress] = useState(
    currentUser.address || '452 Broadway, SoHo, New York, NY 10013'
  );
  const [emergencyContact, setEmergencyContact] = useState(
    '+1 (555) 911-0022 (Building Management)'
  );
  const [avatar, setAvatar] = useState(
    currentUser.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250'
  );

  // Dispatch Policy State
  const [policyPreset, setPolicyPreset] = useState('balanced');
  const [distanceWeight, setDistanceWeight] = useState(50);
  const [ratingWeight, setRatingWeight] = useState(30);
  const [ttlWindow, setTtlWindow] = useState(30);
  const [maxRadius, setMaxRadius] = useState(15);
  const [isSaved, setIsSaved] = useState(false);

  // Sync with live Dispatch Engine Policy on mount
  useEffect(() => {
    fetch('/api/dispatch/policy')
      .then((res) => res.json())
      .then((pol) => {
        if (pol.preset) setPolicyPreset(pol.preset);
        if (pol.weights?.distance) setDistanceWeight(Math.round(pol.weights.distance * 100));
        if (pol.weights?.rating) setRatingWeight(Math.round(pol.weights.rating * 100));
        if (pol.timeouts?.HIGH) setTtlWindow(pol.timeouts.HIGH);
        if (pol.maxRadiusKm) setMaxRadius(pol.maxRadiusKm);
      })
      .catch((err) => console.warn('[Profile] Could not fetch policy:', err));
  }, []);

  // Handle Custom Profile Picture Upload with Canvas Downsampling
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          setAvatar(compressedDataUrl);
          updateUserProfile({ avatar: compressedDataUrl });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyPreset = async (presetKey) => {
    setPolicyPreset(presetKey);
    let policyPayload = null;

    if (presetKey === 'dense_urban') {
      setDistanceWeight(60);
      setRatingWeight(20);
      setTtlWindow(20);
      setMaxRadius(10);
      policyPayload = {
        preset: 'dense_urban',
        weights: { distance: 0.60, rating: 0.20, workload: 0.10, experience: 0.05, prioritySla: 0.05 },
        timeouts: { CRITICAL: 15, HIGH: 20, MEDIUM: 30, STANDARD: 30 },
        maxRadiusKm: 10
      };
      showToast('Selected "Dense Urban High-SLA" policy profile', 'info');
    } else if (presetKey === 'balanced') {
      setDistanceWeight(50);
      setRatingWeight(30);
      setTtlWindow(30);
      setMaxRadius(15);
      policyPayload = {
        preset: 'balanced',
        weights: { distance: 0.45, rating: 0.25, workload: 0.15, experience: 0.10, prioritySla: 0.05 },
        timeouts: { CRITICAL: 20, HIGH: 30, MEDIUM: 45, STANDARD: 45 },
        maxRadiusKm: 15
      };
      showToast('Selected "Balanced Quality" standard policy profile', 'info');
    } else if (presetKey === 'regional') {
      setDistanceWeight(40);
      setRatingWeight(35);
      setTtlWindow(45);
      setMaxRadius(25);
      policyPayload = {
        preset: 'regional',
        weights: { distance: 0.35, rating: 0.35, workload: 0.15, experience: 0.10, prioritySla: 0.05 },
        timeouts: { CRITICAL: 30, HIGH: 45, MEDIUM: 60, STANDARD: 60 },
        maxRadiusKm: 25
      };
      showToast('Selected "Regional Wide-Coverage" policy profile', 'info');
    }

    if (policyPayload) {
      try {
        await fetch('/api/dispatch/policy', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policyPayload)
        });
      } catch (e) {
        console.warn('[Profile] Failed to update policy on server:', e);
      }
    }
  };

  const handleSubmitProfile = (e) => {
    e.preventDefault();
    updateUserProfile({
      name,
      email,
      phone,
      address,
      avatar
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs tracking-wide uppercase mb-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Account & System Settings</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Profile Management & Dispatch Policies
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your personal profile, custom avatar photo, and autonomous dispatch routing configuration.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300">
            Active Role: <strong className="text-white capitalize">{currentUser.role}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Profile Card & Custom Photo (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Avatar & Identity Box */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="text-center space-y-3">
              {/* Interactive Customizable Avatar */}
              <div className="relative inline-block group">
                <img
                  src={avatar}
                  alt={name}
                  className="w-24 h-24 rounded-2xl object-cover mx-auto border-2 border-slate-700 group-hover:border-rose-500 shadow-md transition-all"
                />

                {/* Upload Photo Overlay Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer"
                  title="Upload Custom Profile Picture"
                >
                  <Camera className="w-6 h-6 mb-1 text-rose-400" />
                  <span className="text-[10px] font-semibold">Change Photo</span>
                </button>

                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
                  ✓
                </span>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <div>
                <h2 className="text-base font-bold text-white">{name}</h2>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5 uppercase">
                  {currentUser.role === 'customer'
                    ? 'Verified Customer Account'
                    : currentUser.role === 'technician'
                    ? (currentUser.categoryName || 'Field Specialist')
                    : 'Operations Admin'}
                </div>
              </div>

              {/* Photo Upload Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-rose-400" />
                  <span>Upload Custom Picture</span>
                </button>
              </div>
            </div>

            {/* Quick Preset Avatars Picker */}
            <div className="pt-3 border-t border-slate-800/80">
              <label className="text-[11px] font-medium text-slate-400 block mb-2">
                Or Choose an Executive Preset:
              </label>
              <div className="flex items-center justify-center gap-2">
                {PRESET_AVATARS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setAvatar(p.url);
                      updateUserProfile({ avatar: p.url });
                    }}
                    className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all ${
                      avatar === p.url
                        ? 'border-rose-500 ring-2 ring-rose-500/30 scale-105'
                        : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                    }`}
                    title={p.label}
                  >
                    <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Account Profile Form */}
          <form onSubmit={handleSubmitProfile} className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-3.5 text-xs">
            <div className="font-semibold text-slate-200 text-xs uppercase tracking-wide pb-1 border-b border-slate-800/80">
              Personal Information
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Full Name:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-slate-700"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Email Address:
              </label>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300 font-mono text-[11px]">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-transparent border-none text-slate-200 focus:outline-none w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Direct Phone Line:
              </label>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-transparent border-none text-slate-200 focus:outline-none w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Saved Primary Service Address:
              </label>
              <div className="flex items-start gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-transparent border-none text-slate-200 focus:outline-none w-full"
                />
              </div>

              {/* Saved Locations Quick Selector (Phase 7) */}
              {currentUser.savedAddresses && currentUser.savedAddresses.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] text-slate-500">Quick Select Saved Location:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentUser.savedAddresses.map((sa) => (
                      <button
                        key={sa.id}
                        type="button"
                        onClick={() => setAddress(sa.address)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          address === sa.address
                            ? 'bg-rose-950/60 border-rose-500/60 text-rose-300 font-medium'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {sa.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Emergency Contingency Contact:
              </label>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="bg-transparent border-none text-slate-200 focus:outline-none w-full"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Profile Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-slate-400" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Dispatch Policy Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Dispatch Policy Card */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs tracking-wide uppercase mb-1">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Engine Optimization</span>
              </div>
              <h3 className="text-base font-bold text-white">
                Autonomous Dispatch Routing Policy
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Standardized multi-criteria weighting policy presets based on urban density and response requirements.
              </p>
            </div>

            {/* Segmented Preset Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Dense Urban */}
              <button
                type="button"
                onClick={() => handleApplyPreset('dense_urban')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  policyPreset === 'dense_urban'
                    ? 'bg-slate-800 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/40'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Building2 className={`w-4 h-4 ${policyPreset === 'dense_urban' ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-blue-400 border border-slate-800">
                    &lt;10m SLA
                  </span>
                </div>
                <div className="font-semibold text-xs text-white">Dense Urban</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Distance-first priority (60% weight, 10km radius).
                </div>
              </button>

              {/* Balanced Quality */}
              <button
                type="button"
                onClick={() => handleApplyPreset('balanced')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  policyPreset === 'balanced'
                    ? 'bg-slate-800 border-rose-500 text-white shadow-sm ring-1 ring-rose-500/40'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Layers className={`w-4 h-4 ${policyPreset === 'balanced' ? 'text-rose-400' : 'text-slate-500'}`} />
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-rose-400 border border-slate-800">
                    Standard
                  </span>
                </div>
                <div className="font-semibold text-xs text-white">Balanced Quality</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Urban Company standard: 50% distance, 30% rating.
                </div>
              </button>

              {/* Regional Coverage */}
              <button
                type="button"
                onClick={() => handleApplyPreset('regional')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  policyPreset === 'regional'
                    ? 'bg-slate-800 border-purple-500 text-white shadow-sm ring-1 ring-purple-500/40'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Compass className={`w-4 h-4 ${policyPreset === 'regional' ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-purple-400 border border-slate-800">
                    25km Radius
                  </span>
                </div>
                <div className="font-semibold text-xs text-white">Regional Coverage</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Extended perimeter search with 45s acceptance.
                </div>
              </button>
            </div>

            {/* Visual Parameter Summary Bars (Classy & Minimalist - NO CLUNKY STEPPERS) */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <div className="text-xs font-semibold text-slate-300">
                Active Policy Weights:
              </div>

              <div className="space-y-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                {/* Distance Priority */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Haversine Distance Factor (w_d)</span>
                    <span className="font-mono text-blue-400 font-semibold">{distanceWeight}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${distanceWeight}%` }}
                    ></div>
                  </div>
                </div>

                {/* Rating Priority */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Technician Star Rating Weight (w_r)</span>
                    <span className="font-mono text-amber-400 font-semibold">{ratingWeight}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${ratingWeight * 2}%` }}
                    ></div>
                  </div>
                </div>

                {/* Acceptance Window */}
                <div className="pt-2 border-t border-slate-900 flex justify-between text-slate-400">
                  <span>Acceptance Cascade TTL:</span>
                  <span className="font-mono text-slate-200 font-medium">{ttlWindow} Seconds</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Max Candidate Search Radius:</span>
                  <span className="font-mono text-slate-200 font-medium">{maxRadius} Kilometers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Safeguards & Automation Card */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
            <div className="font-semibold text-slate-200 text-xs uppercase tracking-wide">
              Telemetry & Demo Automation Controls
            </div>

            <div className="space-y-2 text-slate-300">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Real-time WebSocket GPS Telemetry Broadcasting</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">ENABLED</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Autonomous Lifecycle Progression (Demo Auto-Pilot)</span>
                </div>
                <span className="text-[10px] text-purple-400 font-mono font-semibold">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
