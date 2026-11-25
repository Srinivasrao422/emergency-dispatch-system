import React from 'react';
import {
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  X,
  MapPin,
  Calendar,
  Clock,
  User,
  Wrench,
  Award
} from 'lucide-react';

export default function InvoiceReceiptModal({ isOpen, onClose, request, technician }) {
  if (!isOpen || !request) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoice = request.invoice || {
    inspectionFee: 49.0,
    emergencyLabor: 75.0,
    prioritySurcharge: 25.0,
    totalAmount: 149.0,
    isPaid: true
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-300">
        {/* Modal Top Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-xs tracking-wide">
              Official Service Invoice & Guarantee Certificate
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Formal Invoice Area */}
        <div className="p-8 overflow-y-auto space-y-6 text-xs bg-white text-slate-900 font-sans print:p-4 print:text-black">
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  ResQ<span className="text-rose-600">Dispatch</span>
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                  Emergency Logistics
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Collaborating Organization: Unified Mentor • Benchmark: Urban Company
              </p>
              <p className="text-[11px] text-slate-500">
                24/7 Rapid Incident Command & Proximity Dispatch Network
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono font-bold text-slate-900">
                RECEIPT #{request.id}-SEC
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Date: {new Date(request.completedAt || request.createdAt).toLocaleDateString()}
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 mt-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>PAID IN FULL</span>
              </div>
            </div>
          </div>

          {/* Customer & Specialist Particulars */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Requesting Customer:
              </div>
              <div className="font-bold text-sm text-slate-900 mt-0.5">
                {request.customerName}
              </div>
              <div className="text-slate-600 text-[11px] mt-0.5">{request.customerPhone}</div>
              <div className="text-slate-600 text-[11px] mt-0.5">{request.location?.address}</div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Responding Specialist:
              </div>
              <div className="font-bold text-sm text-slate-900 mt-0.5">
                {technician?.name || 'Assigned Specialist'}
              </div>
              <div className="text-slate-600 text-[11px] mt-0.5">
                {technician?.categoryName || request.categoryName} • Rating: {technician?.rating || 4.9}★
              </div>
              <div className="text-slate-600 text-[11px] mt-0.5">
                Vehicle: {technician?.vehicle?.type} ({technician?.vehicle?.plate})
              </div>
              <div className="text-emerald-700 font-semibold text-[10px] mt-0.5">
                4-Digit Security OTP: Verified ✓
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-2">Description of Service & Labor</th>
                  <th className="py-2 text-center">Category</th>
                  <th className="py-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                <tr>
                  <td className="py-3">
                    <strong className="block text-slate-900">Emergency Diagnostic Inspection</strong>
                    <span className="text-slate-500 text-[11px]">
                      On-site rapid damage assessment and safety verification
                    </span>
                  </td>
                  <td className="py-3 text-center text-slate-600 font-medium">Standard</td>
                  <td className="py-3 text-right font-mono text-slate-900">
                    ${(invoice.inspectionFee || 49.0).toFixed(2)}
                  </td>
                </tr>

                <tr>
                  <td className="py-3">
                    <strong className="block text-slate-900">Emergency Remediation Labor</strong>
                    <span className="text-slate-500 text-[11px]">
                      {request.issueDescription || 'Certified corrective repair work and part replacement'}
                    </span>
                  </td>
                  <td className="py-3 text-center text-slate-600 font-medium">Labor</td>
                  <td className="py-3 text-right font-mono text-slate-900">
                    ${(invoice.emergencyLabor || 75.0).toFixed(2)}
                  </td>
                </tr>

                <tr>
                  <td className="py-3">
                    <strong className="block text-slate-900">Priority Auto-Dispatch Surcharge</strong>
                    <span className="text-slate-500 text-[11px]">
                      Sub-15s algorithm match & guaranteed proximity responder
                    </span>
                  </td>
                  <td className="py-3 text-center text-slate-600 font-medium">Priority SLA</td>
                  <td className="py-3 text-right font-mono text-slate-900">
                    ${(invoice.prioritySurcharge || 25.0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total & Settlement Breakdown */}
          <div className="flex justify-between items-start pt-4 border-t-2 border-slate-300">
            {/* Warranty Guarantee */}
            <div className="max-w-xs space-y-1 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>30-Day Urban Company Warranty</span>
              </div>
              <p className="text-[10px] text-emerald-700 leading-tight">
                All workmanship and components replaced under this emergency work order are protected by our 30-day comprehensive service guarantee.
              </p>
            </div>

            {/* Price Calculations */}
            <div className="w-64 space-y-1.5 text-right">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-900">${(invoice.totalAmount || 149.0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sales Tax / VAT (Included):</span>
                <span className="font-mono text-slate-900">$0.00</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment Method:</span>
                <span className="font-medium text-slate-900">{request.paymentMethod || 'Apple Pay'}</span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between font-bold text-base text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono text-emerald-700">${(invoice.totalAmount || 149.0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Resolution Summary & Digital Stamp */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 max-w-sm">
              <strong>Technician Resolution Notes:</strong>
              <p className="italic text-slate-700 mt-0.5">
                "{request.resolutionNotes || 'Emergency repair completed according to safety standards. System tested and fully functional.'}"
              </p>
            </div>

            {/* Formal Digital Stamp */}
            <div className="border-2 border-dashed border-emerald-600 rounded-xl p-2.5 text-center text-emerald-800 rotate-[-2deg] bg-emerald-50/50">
              <div className="font-black text-[10px] uppercase tracking-wider">RESQDISPATCH VERIFIED</div>
              <div className="text-[9px] font-mono">CODE: {request.id}</div>
              <div className="text-[8px] text-emerald-700">COMPLETED & AUDITED</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
