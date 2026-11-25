import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, ShieldCheck, X } from 'lucide-react';

export default function DirectCallModal({ isOpen, onClose, technician }) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callStatus, setCallStatus] = useState('Dialing...');

  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      setCallStatus('Dialing...');
      return;
    }

    const connectTimeout = setTimeout(() => {
      setCallStatus('Connected (Encrypted Audio)');
    }, 2000);

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(connectTimeout);
      clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-100 text-center space-y-6">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure VoIP Direct Line</span>
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Technician Avatar & Details */}
        <div className="space-y-3">
          <div className="relative inline-block">
            <img
              src={technician?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
              alt={technician?.name || 'Technician'}
              className="w-24 h-24 rounded-3xl object-cover border-4 border-slate-700 shadow-2xl mx-auto"
            />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-xs text-white">
              <Phone className="w-3 h-3" />
            </span>
          </div>

          <div>
            <h3 className="font-extrabold text-lg text-white">{technician?.name || 'Field Technician'}</h3>
            <p className="text-xs text-amber-400 font-semibold">{technician?.categoryName || 'Emergency Specialist'}</p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{technician?.phone || '+1 (555) 101-2001'}</p>
          </div>

          {/* Call Status & Timer */}
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-400">{callStatus}</div>
            <div className="text-2xl font-mono font-black text-white mt-1">
              {formatTime(callDuration)}
            </div>
          </div>
        </div>

        {/* Audio Action Buttons */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
              isMuted
                ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[10px]">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 flex flex-col items-center justify-center gap-1 text-xs transition-all active:scale-95"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-[10px] font-bold">End Call</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
              isSpeaker
                ? 'bg-blue-950/60 border-blue-600 text-blue-300'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Volume2 className="w-5 h-5" />
            <span className="text-[10px]">{isSpeaker ? 'Speaker On' : 'Speaker'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
