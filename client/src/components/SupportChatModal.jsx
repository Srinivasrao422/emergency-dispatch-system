import React, { useState } from 'react';
import { MessageSquare, X, Send, ShieldCheck, CheckCheck } from 'lucide-react';

export default function SupportChatModal({ isOpen, onClose, request, technician }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'dispatcher',
      name: 'Central Dispatch Command',
      text: `Hello, we have assigned ${technician?.name || 'our verified emergency technician'} to your emergency (${request?.categoryName || 'Home Service'}). They are currently en route.`,
      time: 'Just now'
    },
    {
      id: 2,
      sender: 'dispatcher',
      name: 'Central Dispatch Command',
      text: 'Please keep your phone line clear and ensure safe access to the building entrance.',
      time: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSend = (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'user',
      name: 'You',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Automated Contextual Dispatcher Reply
    setTimeout(() => {
      let reply = "Understood. We have relayed this update to your technician's mobile console immediately.";
      if (text.toLowerCase().includes('eta') || text.toLowerCase().includes('arrive') || text.toLowerCase().includes('when')) {
        reply = `Your technician is approximately ${request?.distanceKm || 1.2} km away with an estimated arrival of ~${request?.etaMinutes || 5} minutes.`;
      } else if (text.toLowerCase().includes('water') || text.toLowerCase().includes('leak') || text.toLowerCase().includes('shut')) {
        reply = 'Safety check: Main shutoff valve confirmed. Please avoid contact with standing water near electrical outlets.';
      } else if (text.toLowerCase().includes('park') || text.toLowerCase().includes('gate') || text.toLowerCase().includes('door')) {
        reply = 'Thank you for the access instructions! Relaying entrance and parking details to technician GPS.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'dispatcher',
          name: 'Central Dispatch Controller',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col h-[560px]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                <span>Central Emergency Dispatch</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                Incident Ref: <span className="font-mono text-slate-300">{request?.id || 'REQ-LIVE'}</span> • Priority Line
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/60 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="text-[10px] text-slate-500 mb-1 px-1">{m.name} • {m.time}</div>
              <div
                className={`max-w-[85%] p-3 rounded-2xl ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Canned Suggestions */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          {['What is the exact arrival ETA?', 'Where should the technician park?', 'Main valve/breaker is shut off'].map(
            (canned, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(canned)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                + {canned}
              </button>
            )
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message to emergency dispatch..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
