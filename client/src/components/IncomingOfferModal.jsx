import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Siren, Clock, MapPin, AlertTriangle, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';

export default function IncomingOfferModal() {
  const { incomingOffer, acceptJob, rejectJob, requests } = useApp();
  const [showDeclineReason, setShowDeclineReason] = useState(false);
  const [declineReason, setDeclineReason] = useState('Outside active perimeter');

  if (!incomingOffer) return null;

  const currentReq = requests.find((r) => r.id === incomingOffer.requestId);
  const remainingSeconds = incomingOffer.timeoutSeconds ?? 30;
  const progressPercent = Math.max(0, (remainingSeconds / 30) * 100);

  const handleDecline = () => {
    rejectJob(incomingOffer.requestId, declineReason);
    setShowDeclineReason(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden p-5 text-slate-100">
        {/* Top subtle bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-rose-600"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <Siren className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  {currentReq?.priority || 'CRITICAL'} DISPATCH
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {incomingOffer.requestId}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                Incoming Emergency Dispatch
              </h2>
            </div>
          </div>
        </div>

        {/* 30-Second TTL Countdown Gauge */}
        <div className="my-4 p-3 bg-slate-950 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Acceptance Window:</span>
            </span>
            <span
              className={`font-mono text-xs font-bold ${
                remainingSeconds <= 10 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
              }`}
            >
              {remainingSeconds}s remaining
            </span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                remainingSeconds <= 10 ? 'bg-rose-500' : 'bg-amber-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            Auto-cascades to next available specialist upon expiry.
          </p>
        </div>

        {/* Job Details Card */}
        <div className="space-y-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] text-slate-400">Category:</span>
              <div className="font-semibold text-white">
                {currentReq?.categoryName || 'Service Request'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400">Distance & ETA:</span>
              <div className="font-mono font-semibold text-emerald-400">
                {incomingOffer.distanceKm} km (~{incomingOffer.etaMinutes} min)
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-900 flex items-center gap-1.5 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{currentReq?.location?.address || 'Customer Location'}</span>
          </div>

          <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-400 block mb-0.5">Issue Note:</span>
            <p className="text-slate-200">
              "{currentReq?.issueDescription || 'Urgent repair required immediately.'}"
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {showDeclineReason ? (
          <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
            <label className="text-[11px] text-slate-400 font-medium block">
              Reason for Declining:
            </label>
            <select
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
            >
              <option value="Outside active perimeter">Outside active perimeter</option>
              <option value="Vehicle / equipment issue">Vehicle / equipment issue</option>
              <option value="Occupied on site inspection">Occupied on site inspection</option>
              <option value="Off-shift rest period">Off-shift rest period</option>
            </select>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDeclineReason(false)}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-medium text-xs"
              >
                Back
              </button>
              <button
                onClick={handleDecline}
                className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <button
              onClick={() => setShowDeclineReason(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Decline</span>
            </button>

            <button
              onClick={() => acceptJob(incomingOffer.requestId)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Accept Dispatch</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
