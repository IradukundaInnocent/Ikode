import React, { useState } from "react";
import { UserProfile, UserRole } from "../types";
import { 
  Building, Shield, Briefcase, Users, CreditCard, Wrench, FileText, 
  HelpCircle, CheckCircle2, ArrowRight, Lock, ShieldAlert, Sparkles, 
  ChevronRight, Map, Check, Info, User, Layers, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { updateRole } from "../utils/api";

interface RoadmapViewProps {
  currentUser: UserProfile;
}

export default function RoadmapView({ currentUser }: RoadmapViewProps) {
  const [selectedScenario, setSelectedScenario] = useState<"scenario1" | "scenario2" | "scenario3" | "scenario4">("scenario1");
  const [selectedWorkflow, setSelectedWorkflow] = useState<"onboarding" | "rent" | "maintenance" | "termination">("onboarding");
  const [activeTab, setActiveTab] = useState<"blueprint" | "workflows" | "security" | "roadmap">("blueprint");
  
  // Simulated interactive role switcher for marketing demo
  const [demoRole, setDemoRole] = useState<UserRole>(currentUser.role || "landlord");
  const [isUpdatingDemoRole, setIsUpdatingDemoRole] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState("");

  const handleSwitchDemoRole = async (role: UserRole) => {
    setIsUpdatingDemoRole(true);
    setDemoSuccess("");
    try {
      await updateRole(currentUser.email, role);
      setDemoRole(role);
      setDemoSuccess(`Profile updated! Your account now has '${role.replace('_', ' ').toUpperCase()}' authority.`);
      // Dispatch custom event to notify App.tsx to reload session
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingDemoRole(false);
    }
  };

  const stakeholders = [
    {
      id: "admin",
      role: "Super Admin",
      desc: "Controls the entire platform.",
      can: ["Create companies", "Approve subscriptions", "Create Company Admins", "Suspend companies", "View platform-wide analytics"],
      cannot: ["Edit a tenant's rent payment directly", "Operate daily property activities unless acting as support"],
      color: "border-rose-200 bg-rose-50/40 text-rose-800",
      icon: Shield
    },
    {
      id: "landlord",
      role: "Company Admin",
      desc: "Controls a property management company / portfolio.",
      can: ["Create Property Managers", "Create Accountants", "Add Properties & Units", "Approve leases & assign owners", "View all comprehensive reports", "Manage subscriptions"],
      cannot: ["Manage other companies", "Change iKode global platform settings"],
      color: "border-indigo-200 bg-indigo-50/40 text-indigo-800",
      icon: Briefcase
    },
    {
      id: "property_manager",
      role: "Property Manager",
      desc: "Runs daily operations on properties.",
      can: ["Create leases & end leases", "Approve tenant applications", "Create and assign maintenance tickets", "Conduct move-in/move-out inspections", "Record rent payments (Inherited)"],
      cannot: ["Delete core financial ledgers", "Change company billing & subscription settings", "Create Company Admin profiles"],
      color: "border-cyan-200 bg-cyan-50/40 text-cyan-800",
      icon: Building
    },
    {
      id: "accountant",
      role: "Accountant",
      desc: "Controls all money movement and audits.",
      can: ["Record rent payments & generate receipts", "Track outstanding tenant balances", "Generate income & expense ledgers", "Export tax & financial statements"],
      cannot: ["Edit lease agreements", "Assign tenants to units", "Assign maintenance engineers"],
      color: "border-amber-200 bg-amber-50/40 text-amber-800",
      icon: CreditCard
    },
    {
      id: "property_owner",
      role: "Property Owner",
      desc: "Monitors real-time asset yields (Read Only).",
      can: ["View live occupancy rates", "View rental revenue streams", "Download financial statements", "View ongoing maintenance costs"],
      cannot: ["Edit leases", "Edit payments", "Assign technicians", "Delete company records"],
      color: "border-emerald-200 bg-emerald-50/40 text-emerald-800",
      icon: Users
    },
    {
      id: "tenant_applicant",
      role: "Tenant Applicant",
      desc: "Applies for vacant rental vacancies.",
      can: ["Submit digital application", "Upload identification and proof of income", "Provide references", "Track application review status"],
      cannot: ["Access the resident portal", "Submit rent payments", "Log maintenance tickets"],
      color: "border-violet-200 bg-violet-50/40 text-violet-800",
      icon: FileText
    },
    {
      id: "tenant",
      role: "Tenant",
      desc: "Resident residing in an occupied unit.",
      can: ["View active lease details", "Pay monthly rent & check balances", "Download automated payment receipts", "Submit maintenance tickets with photo uploads"],
      cannot: ["View other residents' files", "Modify lease contract rules", "Access property manager reports"],
      color: "border-blue-200 bg-blue-50/40 text-blue-800",
      icon: User
    },
    {
      id: "technician",
      role: "Technician",
      desc: "Performs repairs and files work completions.",
      can: ["View assigned maintenance tickets", "Log status updates", "Upload repair completion photos", "Submit service invoices"],
      cannot: ["View property financial reports", "View tenant files", "Draft lease agreements"],
      color: "border-orange-200 bg-orange-50/40 text-orange-800",
      icon: Wrench
    }
  ];

  const scenarios = {
    scenario1: {
      title: "Scenario 1: Individual Landlord",
      subtitle: "The Solo Entrepreneur",
      description: "Ideal for landlords managing 2-20 units independently. You don't need to juggle multiple logins or feel overwhelmed by separate dashboards.",
      setup: "A single login acts simultaneously as Company Admin + Property Manager + Accountant.",
      advantage: "Complete visual dashboard showing billing, maintenance dispatch, and occupancy all on one screen. Automated receipts run in the background.",
      inheritance: ["Full System Admin Privileges", "Operational Control", "Financial Record-Keeping"]
    },
    scenario2: {
      title: "Scenario 2: Small Team",
      subtitle: "The Lean Management Unit",
      description: "Perfect for growing management units (1-3 employees) where roles overlap frequently. Here, property managers double as financial recorders.",
      setup: "Company Admin manages settings, while a Property Manager runs both properties and rent ledger entries.",
      advantage: "Property Managers can directly record payments and generate receipts without needing a dedicated Accountant profile.",
      inheritance: ["Admin monitors high-level cashflow", "Property Manager acts as both Manager and Accountant", "Technicians resolve work orders"]
    },
    scenario3: {
      title: "Scenario 3: Growing Company",
      subtitle: "Structured Division of Labor",
      description: "For established agencies where operational staff and financial officers are separate, preventing cross-contamination of record-keeping.",
      setup: "Separate logins for Property Manager and Accountant. Clear audit logs track actions.",
      advantage: "Financial data is locked from daily operational editing. The Accountant focuses on rent auditing, while the Property Manager runs the field.",
      inheritance: ["Property Manager runs leases & maintenance", "Accountant secures the money ledger", "Owner monitors real-time yields"]
    },
    scenario4: {
      title: "Scenario 4: Large Enterprise",
      subtitle: "The Full Property Operating System",
      description: "A scale-ready enterprise ecosystem where every individual is specialized—from on-site compound security guards to front-desk receptionists.",
      setup: "Unrestricted staff expansion. Deep security levels isolate visitor logs, billing, and work orders.",
      advantage: "Maximum accountability. Security registers visitor logs, Reception monitors incoming mail, Accountants handle finance, and Admins supervise.",
      inheritance: ["Complete role isolation", "Strict 'Never Access' guidelines active", "Comprehensive audit trails active"]
    }
  };

  const workflows = {
    onboarding: {
      title: "Workflow A: New Tenant Onboarding",
      steps: [
        { role: "Company Admin", desc: "Creates a property and lists vacant units in the portfolio." },
        { role: "Property Manager", desc: "Marks the designated unit as vacant and ready for placement." },
        { role: "Tenant Applicant", desc: "Submits a rental application and uploads proof of ID." },
        { role: "Property Manager", desc: "Reviews the applicant's records and approves their profile." },
        { role: "Property Manager", desc: "Drafts the lease agreement, setting terms and service fees." },
        { role: "Tenant", desc: "Receives the digital invitation, signs, and logs into the resident portal." },
        { role: "Accountant", desc: "Records the deposit and first month's rent payment in the ledger." },
        { role: "System", desc: "Automatically transition unit status to 'Occupied' and starts the billing cycle." }
      ]
    },
    rent: {
      title: "Workflow B: Monthly Rent Collection",
      steps: [
        { role: "System", desc: "Generates the rent due balances automatically on the 1st of the month." },
        { role: "Tenant", desc: "Receives a modern email / push notification with the breakdown." },
        { role: "Tenant", desc: "Submits the payment via mobile money or bank transfer in their portal." },
        { role: "Accountant", desc: "Verifies the transfer reference and marks the payment as successful." },
        { role: "System", desc: "Generates a certified digital PDF receipt for the tenant." },
        { role: "Property Owner", desc: "Monitors updated revenue and occupancy yield metrics on their live dashboard." }
      ]
    },
    maintenance: {
      title: "Workflow C: Maintenance Request",
      steps: [
        { role: "Tenant", desc: "Files a maintenance concern in the portal, attaching defect photos." },
        { role: "Property Manager", desc: "Reviews the ticket, sets priority, and assigns an on-call technician." },
        { role: "Technician", desc: "Receives an SMS / system alert, views photos, and marks ticket as 'In Progress'." },
        { role: "Technician", desc: "Repairs the defect and uploads completion photos and invoices directly from the field." },
        { role: "Property Manager", desc: "Inspects the repair status and clicks 'Approve Work Order'." },
        { role: "Accountant", desc: "Logs the technician's invoice under the property's operational expenses." }
      ]
    },
    termination: {
      title: "Workflow D: Lease Lease Termination & Move-out",
      steps: [
        { role: "Property Manager", desc: "Initiates the move-out workflow, recording the reason." },
        { role: "Accountant", desc: "Checks for arrears or outstanding service charge balances." },
        { role: "Property Manager", desc: "Conducts the physical walk-through inspection with an upload log." },
        { role: "Accountant", desc: "Refunds the holding deposit less any repair damages." },
        { role: "System", desc: "Ends the lease, changes unit to 'Vacant', and updates active dashboard charts." }
      ]
    }
  };

  const restrictedData = [
    { role: "Tenant", restricted: "Other tenants' information, landlord financial logs, security registers" },
    { role: "Technician", restricted: "Rent ledger books, property lease documents, landlord messages" },
    { role: "Accountant", restricted: "Maintenance worker assignments, lease draft editing, tenant files" },
    { role: "Property Manager", restricted: "Company SaaS billing settings, external subscription configurations" },
    { role: "Property Owner", restricted: "Ability to edit operational records, delete transaction history" },
    { role: "Tenant Applicant", restricted: "Any data regarding occupied units or existing tenants" },
    { role: "Company Admin", restricted: "Access to separate real estate companies hosted on the platform" }
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 space-y-8 shadow-xs text-left" id="roadmap-root">
      
      {/* Header and Marketer Hook */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-[9px] font-bold text-indigo-700 uppercase tracking-widest rounded-full">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Interactive Platform OS Blueprint</span>
          </div>
          <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">
            iKode Operating System Architecture
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Explore permissions hierarchy, stakeholder workflows, and adaptive deployment models.
          </p>
        </div>

        {/* Dynamic Marketing Demo Switcher */}
        <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-2xl max-w-sm shrink-0 space-y-2">
          <div className="flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isUpdatingDemoRole ? "animate-spin" : ""}`} />
            <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Live Role-Switcher Sandbox</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium leading-normal">
            Think like a customer! Swap your active profile role on the fly to see how the sidebar links and permissions immediately adapt.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { id: "landlord", label: "Company Admin" },
              { id: "property_manager", label: "Property Manager" },
              { id: "accountant", label: "Accountant" },
              { id: "property_owner", label: "Property Owner" }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => handleSwitchDemoRole(r.id as UserRole)}
                disabled={isUpdatingDemoRole}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                  currentUser.role === r.id 
                    ? "bg-[#111e2e] border-[#111e2e] text-white shadow-xs" 
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {demoSuccess && (
            <p className="text-[10px] text-emerald-700 font-bold animate-pulse pt-0.5">
              {demoSuccess}
            </p>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 text-xs font-semibold overflow-x-auto gap-2 no-scrollbar">
        <button
          onClick={() => setActiveTab("blueprint")}
          className={`py-3 px-4 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "blueprint" ? "border-[#111e2e] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Stakeholders & Permission Hierarchy
        </button>
        <button
          onClick={() => setActiveTab("workflows")}
          className={`py-3 px-4 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "workflows" ? "border-[#111e2e] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Process Workflows
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`py-3 px-4 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "security" ? "border-[#111e2e] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Access Restrictions
        </button>
        <button
          onClick={() => setActiveTab("roadmap")}
          className={`py-3 px-4 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "roadmap" ? "border-[#111e2e] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Platform Roadmap Status
        </button>
      </div>

      {/* TABS CONTENT */}
      <AnimatePresence mode="wait">
        
        {/* Tab 1: Blueprint & Roles */}
        {activeTab === "blueprint" && (
          <motion.div
            key="blueprint"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* The Permission Cascade Explainer */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Layers className="w-48 h-48 text-white" />
              </div>

              <div className="max-w-3xl space-y-4">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block">Core Design Principle</span>
                <h4 className="text-xl md:text-2xl font-display font-black tracking-tight leading-tight">
                  Hierarchical Permission Model (Inherited Authority)
                </h4>
                <p className="text-xs md:text-sm text-indigo-100 leading-relaxed font-medium">
                  We engineered iKode with a downward-inheriting permission logic. Rather than rigid, siloed roles that lock users out, higher roles seamlessly inherit the abilities of lower roles. This means your platform instantly flexes from a single self-managed landlord to a multi-tiered corporate enterprise.
                </p>

                {/* Visual Cascade Chain */}
                <div className="pt-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
                  <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[9px] font-black text-rose-300 uppercase">LEVEL 5</span>
                    <h5 className="text-xs font-bold">Super Admin</h5>
                    <p className="text-[9px] text-indigo-200">Platform Command</p>
                  </div>
                  <div className="bg-white/15 backdrop-blur-xs p-3 rounded-xl border border-white/20 space-y-1">
                    <span className="text-[9px] font-black text-indigo-300 uppercase">LEVEL 4</span>
                    <h5 className="text-xs font-bold">Company Admin</h5>
                    <p className="text-[9px] text-indigo-200">Management + Operations</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[9px] font-black text-cyan-300 uppercase">LEVEL 3</span>
                    <h5 className="text-xs font-bold">Property Manager</h5>
                    <p className="text-[9px] text-indigo-200">Operations + Finance</p>
                  </div>
                  <div className="bg-white/15 backdrop-blur-xs p-3 rounded-xl border border-white/20 space-y-1">
                    <span className="text-[9px] font-black text-amber-300 uppercase">LEVEL 2</span>
                    <h5 className="text-xs font-bold">Accountant</h5>
                    <p className="text-[9px] text-indigo-200">Strictly Finance</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[9px] font-black text-slate-300 uppercase">LEVEL 1</span>
                    <h5 className="text-xs font-bold">Tenant/Technician</h5>
                    <p className="text-[9px] text-indigo-200">Consumes Services</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Deployment Scenarios (Marketer Tool) */}
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">CUSTOMER-MATCHED BLUEPRINTS</span>
                <h4 className="text-lg font-bold text-slate-900 tracking-tight">How does this adapt to your customer's portfolio size?</h4>
                <p className="text-xs text-slate-500 font-medium">Select a scenario below to see how our permission engine adapts dynamically to support small growing startups or large agencies.</p>
              </div>

              {/* Scenario Toggles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {(Object.keys(scenarios) as Array<keyof typeof scenarios>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelectedScenario(key)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedScenario === key 
                        ? "bg-[#111e2e] border-[#111e2e] text-white shadow-sm" 
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-[9px] font-extrabold opacity-60 uppercase block">
                      {key === "scenario1" ? "1-20 Units" : key === "scenario2" ? "21-100 Units" : key === "scenario3" ? "100-500 Units" : "500+ Units"}
                    </span>
                    <span className="text-xs font-bold block mt-0.5">{scenarios[key].title.split(": ")[1]}</span>
                  </button>
                ))}
              </div>

              {/* Display Scenario Details */}
              <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">
                <div className="md:col-span-8 space-y-3">
                  <span className="text-[10px] font-extrabold text-[#fca311] uppercase tracking-wider block">ACTIVE SYSTEM SETUP</span>
                  <h5 className="text-base font-bold text-slate-900">{scenarios[selectedScenario].title} &mdash; <span className="text-indigo-600 font-semibold">{scenarios[selectedScenario].subtitle}</span></h5>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {scenarios[selectedScenario].description}
                  </p>
                  <div className="flex items-start gap-2 pt-1">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-slate-700">
                      <span className="text-indigo-600">Onboarding Configuration:</span> {scenarios[selectedScenario].setup}
                    </p>
                  </div>
                </div>

                <div className="md:col-span-4 bg-white p-5 rounded-xl border border-slate-200/80 space-y-3 shadow-xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">INHERITED ABILITIES</span>
                  <ul className="space-y-2 text-xs">
                    {scenarios[selectedScenario].inheritance.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 font-semibold text-slate-700">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Comprehensive Stakeholder Grid */}
            <div className="space-y-4 pt-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">8 CORE STAKEHOLDERS DEEP-DIVE</span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stakeholders.map((person) => (
                  <div key={person.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-xs">
                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border ${person.color}`}>
                          <person.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{person.role}</h5>
                          <span className="text-[10px] font-semibold text-slate-400">{person.id === "landlord" ? "Company Admin" : person.id.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                        "{person.desc}"
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Permitted:</span>
                      <ul className="space-y-1 text-[10px] text-slate-600 font-medium">
                        {person.can.slice(0, 3).map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5 leading-normal">
                            <span className="text-emerald-500 font-bold shrink-0">&bull;</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        )}

        {/* Tab 2: Dynamic Process Workflows */}
        {activeTab === "workflows" && (
          <motion.div
            key="workflows"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">OPERATING SYSTEM PROCEDURES</span>
              <h4 className="text-lg font-bold text-slate-900 tracking-tight">The 4 Core Platform Lifecycle Workflows</h4>
              <p className="text-xs text-slate-500 font-medium">See how multi-user transactions propagate logically across multiple users, technicians, and financial accounts.</p>
            </div>

            {/* Workflow Selectors */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(Object.keys(workflows) as Array<keyof typeof workflows>).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedWorkflow(key)}
                  className={`px-4 py-3.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    selectedWorkflow === key 
                      ? "bg-[#111e2e] border-[#111e2e] text-white shadow-sm" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {workflows[key].title.split(": ")[0]}
                </button>
              ))}
            </div>

            {/* Workflow Steps Board */}
            <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-6">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-indigo-600" />
                <h5 className="font-bold text-slate-900 text-sm">
                  {workflows[selectedWorkflow].title}
                </h5>
              </div>

              <div className="relative border-l border-slate-200/80 ml-4 pl-6 space-y-6 text-left">
                {workflows[selectedWorkflow].steps.map((step, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle timeline index */}
                    <div className="absolute -left-[31px] top-0.5 w-[14px] h-[14px] rounded-full border-2 border-indigo-600 bg-white" />
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase tracking-wider rounded font-mono">
                          {step.role}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold font-mono">STEP {idx + 1}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Access Restrictions & "Never Access" */}
        {activeTab === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">DATA ISOLATION ENGINE</span>
              <h4 className="text-lg font-bold text-slate-900 tracking-tight">Security Boundaries & Restricted Zones</h4>
              <p className="text-xs text-slate-500 font-medium">To protect sensitive information, each user role is strictly restricted from certain zones. Higher roles can access their subset, but lower roles face strict visual and database walls.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Never Access Cards */}
              <div className="space-y-4">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Strict Privacy Guidelines (Database & UI Walls)
                </span>

                <div className="bg-rose-50/40 border border-rose-200/60 rounded-2xl p-6 space-y-4">
                  {restrictedData.map((data, i) => (
                    <div key={i} className="flex gap-3 text-left">
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0 mt-1.5" />
                      <div>
                        <h5 className="text-xs font-black text-slate-900">{data.role}</h5>
                        <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                          <span className="text-rose-600">Restricted from:</span> {data.restricted}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Integrity visual board */}
              <div className="bg-[#111e2e] text-white p-6 md:p-8 rounded-3xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Lock className="w-32 h-32" />
                </div>

                <div className="space-y-4">
                  <h4 className="text-base font-bold font-display">SaaS Multi-Tenant Isolation</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    iKode enforces standard tenant-to-tenant and company-to-company data isolation. Every query to our local/mock structures is dynamically scoped under user context.
                  </p>
                  
                  <div className="space-y-3.5 pt-2 text-xs">
                    <div className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <h6 className="font-bold text-slate-200">Anti-Leak Controls</h6>
                        <p className="text-[11px] text-slate-400 leading-normal font-medium">Technicians can never view property tenant lists, rental ledger sheets, or bank receipts.</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <h6 className="font-bold text-slate-200">Compliance Standards</h6>
                        <p className="text-[11px] text-slate-400 leading-normal font-medium">Compliant with regional real estate database privacy legislation and audit log standards.</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <h6 className="font-bold text-slate-200">Zero-Trust Staff Setup</h6>
                        <p className="text-[11px] text-slate-400 leading-normal font-medium">Individual landlords have total platform authority. Once they add a separate PM, Accountant, or Guard, specific sub-routes instantly activate restrictions.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* Tab 4: Platform Roadmap Status */}
        {activeTab === "roadmap" && (
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">PHASE-BY-PHASE STATUS</span>
              <h4 className="text-lg font-bold text-slate-900 tracking-tight">Platform Development Roadmap</h4>
              <p className="text-xs text-slate-500 font-medium">iKode has successfully achieved 100% execution across all 5 operational phases specified in the engineering roadmap.</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  phase: "Phase 1: Foundation",
                  status: "Completed",
                  desc: "Super Admin, Company Admin, Property Manager roles provisioned. Multi-tenant property and unit catalogs compiled.",
                  checked: true
                },
                {
                  phase: "Phase 2: Leasing & Onboarding",
                  status: "Completed",
                  desc: "Lease histories with memory timeline. Digital tenant invitations, move-in checklists, and vacant-to-occupied automata.",
                  checked: true
                },
                {
                  phase: "Phase 3: Finance Ledger",
                  status: "Completed",
                  desc: "Accountant rent logs, receipt generators, June rent auditing lists, and comprehensive multi-currency RWF/USD support.",
                  checked: true
                },
                {
                  phase: "Phase 4: Maintenance Workflows",
                  status: "Completed",
                  desc: "Technician work dispatch logs, status updates (Pending, Assigned, Completed), repair comments, and completion photos.",
                  checked: true
                },
                {
                  phase: "Phase 5: Owner Portals & Reception",
                  status: "Completed",
                  desc: "Front desk mail registers, security visitor logbooks, and live visual occupancy statistics for property owners.",
                  checked: true
                }
              ].map((p, index) => (
                <div key={index} className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-start gap-4 hover:border-slate-300 transition-all shadow-xs text-left">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <h5 className="text-xs font-bold text-slate-900">{p.phase}</h5>
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
