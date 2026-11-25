import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Star,
  FileText,
  Download,
  ChevronRight,
  ShieldCheck,
  Calendar,
  X,
  RotateCcw,
  AlertCircle,
  MessageSquareText,
  ShieldAlert
} from 'lucide-react';

export default function ServiceHistoryPage() {
  const { requests, technicians, setActiveRequestId, setActiveTab } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAuditRequest, setSelectedAuditRequest] = useState(null);

  // Phase 9: Customer Support & Service Warranty States
  const [selectedComplaintRequest, setSelectedComplaintRequest] = useState(null);
  const [complaintCategory, setComplaintCategory] = useState('WORKMANSHIP');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  const [selectedWarrantyRequest, setSelectedWarrantyRequest] = useState(null);
  const [warrantyReason, setWarrantyReason] = useState('');
  const [isSubmittingWarranty, setIsSubmittingWarranty] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!selectedComplaintRequest || !complaintDescription.trim()) return;
    setIsSubmittingComplaint(true);
    try {
      const res = await fetch(`/api/requests/${selectedComplaintRequest.id}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedComplaintRequest.customerId || 'u_cust_1',
          category: complaintCategory,
          description: complaintDescription
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMessage({ type: 'success', text: 'Complaint registered successfully! Dispatch desk alerted.' });
        setSelectedComplaintRequest(null);
        setComplaintDescription('');
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Failed to submit complaint.' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error submitting complaint.' });
    } finally {
      setIsSubmittingComplaint(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleSubmitWarranty = async (e) => {
    e.preventDefault();
    if (!selectedWarrantyRequest || !warrantyReason.trim()) return;
    setIsSubmittingWarranty(true);
    try {
      const res = await fetch(`/api/requests/${selectedWarrantyRequest.id}/warranty-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedWarrantyRequest.customerId || 'u_cust_1',
          claimReason: warrantyReason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMessage({ type: 'success', text: 'Warranty claim submitted! Our admin team is reviewing for zero-cost follow-up dispatch.' });
        setSelectedWarrantyRequest(null);
        setWarrantyReason('');
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Failed to submit warranty claim.' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error submitting warranty claim.' });
    } finally {
      setIsSubmittingWarranty(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.issueDescription.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'COMPLETED'
        ? req.status === 'completed'
        : statusFilter === 'ACTIVE'
        ? ['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(req.status)
        : req.status === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(requests, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `emergency_dispatch_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs tracking-wide uppercase mb-1">
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>Audit Trail & Records</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Service History & Logs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete lifecycle audit records from algorithmic scoring to field resolution and customer rating.
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-800 hover:border-slate-700 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export Audit Log (JSON)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Request ID, customer, category, issue..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Dispatches</option>
            <option value="COMPLETED">Completed Jobs</option>
            <option value="ESCALATED">Escalated</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      {requests.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-white">Incident Archive Clear</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Zero dummy records. Once an emergency is raised and matched by the auto-dispatch engine, its end-to-end lifecycle telemetry will appear here.
          </p>
          <button
            onClick={() => setActiveTab('request')}
            className="mt-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
          >
            Raise Emergency Request
          </button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center text-xs text-slate-400">
          No records matching "{searchTerm}" under filter "{statusFilter}".
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const tech = technicians.find((t) => t.id === req.assignedTechnicianId);

            return (
              <div
                key={req.id}
                className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4 shadow-sm hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-xs text-slate-300">{req.id}</span>
                    <span
                      className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded border ${
                        req.status === 'completed'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : req.status === 'escalated'
                          ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {req.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {req.priority}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="font-semibold text-sm text-white">
                    {req.categoryName}
                    <span className="text-slate-400 font-normal text-xs ml-2">"{req.issueDescription}"</span>
                  </div>

                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                    <span>Customer: <strong className="text-slate-300 font-medium">{req.customerName}</strong></span>
                    <span>•</span>
                    <span>Technician: <strong className="text-slate-300 font-medium">{tech?.name || 'Unassigned'}</strong></span>
                    {req.finalRating && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-amber-400">
                          <Star className="w-3 h-3 fill-current" />
                          {req.finalRating}★
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => setSelectedAuditRequest(req)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>View Audit Trail</span>
                  </button>

                  {req.status === 'completed' && (
                    <>
                      <button
                        onClick={() => setSelectedWarrantyRequest(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-xs font-medium transition-colors"
                        title="Claim 30-Day Workmanship Warranty Support"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Warranty</span>
                      </button>

                      <button
                        onClick={() => setSelectedComplaintRequest(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-700/80 text-amber-300 text-xs font-medium transition-colors"
                        title="Report a service issue or complaint"
                      >
                        <MessageSquareText className="w-3.5 h-3.5 text-amber-400" />
                        <span>Report Issue</span>
                      </button>
                    </>
                  )}

                  {['completed', 'cancelled'].includes(req.status) && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/requests/${req.id}/repeat`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({})
                          });
                          const data = await res.json();
                          if (data.success && data.request) {
                            setActiveRequestId(data.request.id);
                            setActiveTab('tracking');
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-medium border border-blue-500/40 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Book Again</span>
                    </button>
                  )}

                  {['assigned', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(req.status) && (
                    <button
                      onClick={() => {
                        setActiveRequestId(req.id);
                        setActiveTab('tracking');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors"
                    >
                      Track Live
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Audit Trail Drawer Modal */}
      {selectedAuditRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-sm text-white">
                  Lifecycle Audit: {selectedAuditRequest.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAuditRequest(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-slate-300">
                <div><strong>Category:</strong> {selectedAuditRequest.categoryName} ({selectedAuditRequest.priority})</div>
                <div><strong>Customer:</strong> {selectedAuditRequest.customerName} ({selectedAuditRequest.customerPhone})</div>
                <div><strong>Location:</strong> {selectedAuditRequest.location?.address}</div>
                <div><strong>Issue:</strong> {selectedAuditRequest.issueDescription}</div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-300 mb-2">Event Timeline & Telemetry</h4>
                <div className="space-y-2 border-l-2 border-slate-800 pl-3 ml-1">
                  {(selectedAuditRequest.historyLogs || []).map((log, idx) => (
                    <div key={idx} className="relative">
                      <div className="w-2 h-2 rounded-full bg-blue-500 absolute -left-[17px] top-1"></div>
                      <div className="font-medium text-slate-200">{log.action || log.event}</div>
                      <div className="text-[11px] text-slate-400">{log.details || log.note}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedAuditRequest(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Complaint Submission Modal */}
      {selectedComplaintRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <MessageSquareText className="w-4 h-4" />
                <span>Report Service Issue: {selectedComplaintRequest.id}</span>
              </div>
              <button
                onClick={() => setSelectedComplaintRequest(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint} className="p-5 space-y-3.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                <div><strong>Category:</strong> {selectedComplaintRequest.categoryName}</div>
                <div><strong>Completed Date:</strong> {new Date(selectedComplaintRequest.completedAt || selectedComplaintRequest.createdAt).toLocaleDateString()}</div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Issue Category:</label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="WORKMANSHIP">Workmanship / Repair Quality</option>
                  <option value="BILLING_ISSUE">Billing or Surcharge Discrepancy</option>
                  <option value="TECHNICIAN_CONDUCT">Technician Punctuality / Conduct</option>
                  <option value="DAMAGE">Accidental Property Damage</option>
                  <option value="OTHER">Other Service Feedback</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Description of Issue:</label>
                <textarea
                  required
                  rows={3}
                  value={complaintDescription}
                  onChange={(e) => setComplaintDescription(e.target.value)}
                  placeholder="Describe what occurred, any leaks, malfunctions, or billing concerns..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedComplaintRequest(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplaint}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold shadow-sm"
                >
                  {isSubmittingComplaint ? 'Submitting...' : 'Register Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warranty Claim Modal */}
      {selectedWarrantyRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>30-Day Workmanship Warranty Claim</span>
              </div>
              <button
                onClick={() => setSelectedWarrantyRequest(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitWarranty} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-1">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>30-Day Workmanship Guarantee Active</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Original Incident: <strong className="text-white">{selectedWarrantyRequest.id}</strong> ({selectedWarrantyRequest.categoryName})
                </p>
                <p className="text-[10px] text-slate-400">
                  If approved by dispatch desk, an emergency warranty follow-up request will be created at <strong>₹0.00 zero cost</strong>.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">Why is warranty service required?</label>
                <textarea
                  required
                  rows={3}
                  value={warrantyReason}
                  onChange={(e) => setWarrantyReason(e.target.value)}
                  placeholder="Explain the recurrence of the issue, failed joint, or workmanship defect..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedWarrantyRequest(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWarranty}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold shadow-sm"
                >
                  {isSubmittingWarranty ? 'Claiming...' : 'Submit Warranty Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
