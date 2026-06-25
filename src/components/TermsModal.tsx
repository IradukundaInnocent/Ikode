import React from "react";
import { X, Shield, FileText, Scale, Settings, CheckCircle2 } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-left" id="ikode-terms-modal">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-lg">Platform Terms of Service</h3>
              <p className="text-slate-400 text-xs">Agreement & covenants for the Ikode SaaS Property Workspace</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-2.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Contents */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-sm text-slate-600 leading-relaxed font-sans" id="terms-scrollable-body">
          <p className="text-xs text-slate-400 italic">Last Revised: June 23, 2026 &bull; Version 2.2.0-RwandaSaas</p>

          {/* Section 1: Landlord Scope */}
          <div className="space-y-2">
            <h4 className="font-display font-semibold text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wide">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block" />
              1. Landlord Subscription & Vacancy Licensing
            </h4>
            <p className="text-xs hover:text-slate-900 transition-colors">
              By deploying a property development inside Ikode, the Landlord represents that they own proper structural rights or management powers in Kigali City or respective provinces in Rwanda. Ikode grants a non-exclusive, revocable SaaS subscription to create units, manage leases, set billing models, and upload before-and-after maintenance proof imagery.
            </p>
          </div>

          {/* Section 2: Tenant Rent Pool & Flutterwave Ledger */}
          <div className="space-y-2">
            <h4 className="font-display font-semibold text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wide">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block" />
              2. Rent Ledger Pools & Secure Payment Gateways
            </h4>
            <p className="text-xs hover:text-slate-900 transition-colors">
              Tenants utilize integrated checkout channels powered by secure payment routing systems (such as Flutterwave & Mobile Money) to settle historical invoice lines or recurring service charges. All transactions recorded within the ledger are final and synced immediately for Landlord audit. Tenants agree to supply genuine payment details.
            </p>
          </div>

          {/* Section 3: Maintenance response & Technician SLAs */}
          <div className="space-y-2">
            <h4 className="font-display font-semibold text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wide">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              3. Maintenance SLA Response Commitments
            </h4>
            <p className="text-xs hover:text-slate-900 transition-colors">
              Technicians assigned to maintenance requests within Ikode agree to post honest actions and high-resolution repair logs. Response time guarantees are established solely between the building management and the resident, mapped to High, Medium, or Low priority states.
            </p>
          </div>

          {/* Section 4: Privacy, Data, and Cloud Protection */}
          <div className="space-y-2">
            <h4 className="font-display font-semibold text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wide">
              <span className="w-1.5 h-4 bg-slate-700 rounded-full inline-block" />
              4. Data Protection & Safe-Keeping
            </h4>
            <p className="text-xs hover:text-slate-900 transition-colors">
              All profile fields, active contract histories, photo reports, and transaction details are maintained securely under secure cloud-native schemas. Your data is restricted to authorized workspace developers and sandbox administrators only.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 rounded-b-2xl border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
