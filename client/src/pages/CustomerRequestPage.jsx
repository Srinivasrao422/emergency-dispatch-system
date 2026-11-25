import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import LeafletMap from '../components/LeafletMap';
import {
  Droplets,
  Zap,
  Wind,
  Flame,
  Cpu,
  ShieldAlert,
  MapPin,
  Crosshair,
  Camera,
  CheckCircle,
  Siren,
  Clock,
  Upload,
  X,
  ShieldCheck
} from 'lucide-react';

const CATEGORY_ICONS = {
  plumbing: Droplets,
  electrical: Zap,
  hvac: Wind,
  gas: Flame,
  appliances: Cpu,
  carpentry: ShieldAlert
};

export default function CustomerRequestPage() {
  const { categories, createEmergencyRequest, currentUser, reclusterTechnicians } = useApp();

  const [selectedCategory, setSelectedCategory] = useState('plumbing');
  const [priority, setPriority] = useState('CRITICAL');
  const [issueDescription, setIssueDescription] = useState(
    'Main water supply pipe burst in bathroom ceiling. Rapid flooding.'
  );
  const [location, setLocation] = useState({
    lat: 40.7208,
    lng: -74.0007,
    address: '452 Broadway, SoHo, New York, NY 10013'
  });
  const [imagePreview, setImagePreview] = useState(
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const fileInputRef = useRef(null);

  // Real Image Upload Handler with Canvas Compression
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 900;
          const MAX_HEIGHT = 900;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setImagePreview(compressedDataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetectGPS = () => {
    setDetectingGps(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDetectingGps(false);
          const newLoc = {
            lat: parseFloat(pos.coords.latitude.toFixed(6)),
            lng: parseFloat(pos.coords.longitude.toFixed(6)),
            address: `Detected GPS Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
          };
          setLocation(newLoc);
          if (reclusterTechnicians) reclusterTechnicians(newLoc);
        },
        () => {
          setDetectingGps(false);
          const fallbackLoc = {
            lat: 40.7300,
            lng: -73.9950,
            address: 'Washington Square, New York, NY 10012'
          };
          setLocation(fallbackLoc);
          if (reclusterTechnicians) reclusterTechnicians(fallbackLoc);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setDetectingGps(false);
    }
  };

  const handleSelectPreset = (p) => {
    const newLoc = { lat: p.lat, lng: p.lng, address: p.address };
    setLocation(newLoc);
    if (reclusterTechnicians) reclusterTechnicians(newLoc);
  };

  const userSavedPresets = (currentUser?.savedAddresses || []).map((sa) => ({
    name: sa.label,
    lat: sa.lat || 40.7208,
    lng: sa.lng || -74.0007,
    address: sa.address
  }));

  const presets = userSavedPresets.length > 0 ? userSavedPresets : [
    { name: 'SoHo (Downtown)', lat: 40.7208, lng: -74.0007, address: '452 Broadway, SoHo, NY 10013' },
    { name: 'Chelsea', lat: 40.7431, lng: -73.9938, address: '120 W 23rd St, Chelsea, NY 10011' },
    { name: 'Gramercy Park', lat: 40.7350, lng: -73.9910, address: '22 Gramercy Park S, NY 10003' },
    { name: 'Midtown South', lat: 40.7484, lng: -73.9857, address: '350 5th Ave, Midtown, NY 10118' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await createEmergencyRequest({
      category: selectedCategory,
      priority,
      issueDescription,
      location,
      imageUrl: imagePreview
    });
    setIsSubmitting(false);
  };

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-rose-500 font-semibold text-xs tracking-wide uppercase mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Emergency Home Services Dispatch</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Raise Emergency Request
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-dispatch algorithm identifies and assigns the nearest available specialist within seconds.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300">
            Dispatch SLA: <strong className="text-emerald-400">&lt; 15 seconds</strong>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Category, Severity, Details (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Category Selection */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-5 shadow-sm">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              1. Service Category
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {categories.map((cat) => {
                const IconComponent = CATEGORY_ICONS[cat.id] || Droplets;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      if (cat.commonIssues && cat.commonIssues.length > 0) {
                        setIssueDescription(cat.commonIssues[0]);
                      }
                      setPriority(cat.defaultPriority || 'CRITICAL');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-800 border-rose-500/80 text-white shadow-sm ring-1 ring-rose-500/40'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        ~{cat.slaTargetMin}m
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">
                        {cat.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        {cat.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Priority Selection */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-5 shadow-sm">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              2. Urgency Level
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  id: 'CRITICAL',
                  label: 'Critical',
                  desc: 'Hazard / Active leak',
                  sla: 'Immediate'
                },
                {
                  id: 'HIGH',
                  label: 'High',
                  desc: 'Major disruption',
                  sla: '< 20m SLA'
                },
                {
                  id: 'STANDARD',
                  label: 'Standard',
                  desc: 'Urgent repair',
                  sla: '< 45m SLA'
                }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    priority === p.id
                      ? 'bg-slate-800 border-rose-500/80 text-white shadow-sm ring-1 ring-rose-500/30'
                      : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-white">{p.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                  <div className="text-[10px] font-mono font-medium text-slate-300 mt-1.5">
                    {p.sla}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Issue Description & Photo */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-5 shadow-sm space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                3. Issue Details
              </label>

              {/* Quick Presets */}
              {selectedCategoryObj?.commonIssues && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {selectedCategoryObj.commonIssues.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setIssueDescription(preset)}
                      className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-800 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                rows={3}
                required
                placeholder="Describe the failure, damage, or building access notes..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-700"
              />
            </div>

            {/* Photo Upload */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center justify-between">
                <span>Incident Photo (Optional)</span>
                <span className="text-[11px] text-slate-500">Shared with technician</span>
              </label>

              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                    <img
                      src={imagePreview}
                      alt="Incident photo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImagePreview('')}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/80 text-white flex items-center justify-center text-[10px]"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 rounded-lg border border-dashed border-slate-700 bg-slate-950 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:border-slate-500 transition-colors shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 mb-0.5" />
                    <span className="text-[9px]">Upload</span>
                  </div>
                )}

                <div className="flex-1 text-xs">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    {imagePreview ? 'Change Photo' : 'Upload Incident Photo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Location & Dispatch Action (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 4. Incident Location */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>4. Service Location</span>
              </label>

              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={detectingGps}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                <Crosshair className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
                <span>{detectingGps ? 'Acquiring...' : 'Detect GPS'}</span>
              </button>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
              <input
                type="text"
                value={location.address}
                onChange={(e) => setLocation((prev) => ({ ...prev, address: e.target.value }))}
                className="bg-transparent border-none text-slate-200 font-medium w-full focus:outline-none"
              />
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`text-[11px] p-2 rounded-lg border text-left transition-colors ${
                    location.address === p.address
                      ? 'border-blue-500/80 bg-blue-950/30 text-blue-300 font-medium'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Interactive Map */}
            <div>
              <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Interactive Pin</span>
                <span className="text-[10px] text-slate-500">Click map to move pin</span>
              </div>
              <LeafletMap
                customerLocation={location}
                interactivePinDrop={true}
                onLocationSelect={(newLoc) => setLocation(newLoc)}
                height="200px"
                zoom={14}
              />
            </div>
          </div>

          {/* 5. Dispatch Summary & Trigger */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <Siren className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">
                  Instant Auto-Dispatch
                </h3>
                <p className="text-[11px] text-slate-400">
                  Technician receives 30s acceptance timer.
                </p>
              </div>
            </div>

            <div className="text-xs space-y-1.5 text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-medium text-slate-200">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-medium text-slate-200">{selectedCategoryObj?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Priority:</span>
                <span className="font-semibold text-rose-400">{priority}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Diagnostic Inspection:</span>
                <span className="font-mono text-emerald-400 font-semibold">$69.00 Standard</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs tracking-wide bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Siren className="w-4 h-4" />
              <span>{isSubmitting ? 'Evaluating Available Units...' : 'Dispatch Nearest Technician'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
