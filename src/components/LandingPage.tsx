import React, { useState } from "react";
import { 
  Building, Calendar, Wrench, MessageSquare, Shield, ShieldAlert,
  FileText, Check, Users, ArrowRight, X, Mail, Phone, ChevronRight,
  Sparkles, CheckCircle2, User, Key, Lock, LogIn, Eye, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LandingPageProps {
  onOpenPortal: () => void;
  onOpenSignUp: () => void;
}

export default function LandingPage({ onOpenPortal, onOpenSignUp }: LandingPageProps) {
  // Demo request form state
  const [demoName, setDemoName] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPhone, setDemoPhone] = useState("");
  const [portfolioSize, setPortfolioSize] = useState("1-10 units");
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // Quick stats state (interactive marketer feature)
  const [selectedPersona, setSelectedPersona] = useState<"admin" | "landlord" | "tenant" | "technician">("landlord");

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoName || !demoEmail) return;
    setDemoSubmitted(true);
  };

  const personas = {
    admin: {
      title: "Admins",
      tagline: "Total system authority and setup audit logs.",
      benefit: "Configure permissions, invite landlords and technicians, and audit all system activities in one unified command center.",
      metric: "99.9% uptime & complete oversight"
    },
    landlord: {
      title: "Landlords",
      tagline: "Calm cashflow and complete asset visibility.",
      benefit: "Track properties, execute digital leases with timelines, automate recurring rent collection, and dispatch maintenance with a tap.",
      metric: "Average 12 hours saved weekly"
    },
    tenant: {
      title: "Tenants",
      tagline: "Dignified resident portal at your fingertips.",
      benefit: "Submit rent payments safely via mobile, report broken appliances with photos, and receive broadcast notices from management.",
      metric: "94% resident satisfaction rate"
    },
    technician: {
      title: "Technicians",
      tagline: "Streamlined work orders and task resolution.",
      benefit: "Receive automated repair dispatches, view client instructions and photos, and update status in real-time with automatic invoice generation.",
      metric: "40% reduction in resolution times"
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans selection:bg-[#fca311]/20 selection:text-slate-950" id="landing-page-root">
      
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-slate-200/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer select-none">
            <div className="w-8 h-8 bg-[#fca311] rounded-xl flex items-center justify-center font-bold text-black text-base shadow-sm">
              i
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-[#111e2e] leading-none">
              iKode
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#request-demo" className="hover:text-slate-900 transition-colors">Request demo</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenPortal}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <button 
              onClick={onOpenSignUp}
              className="px-4 py-2 bg-[#111e2e] hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="px-6 pt-16 pb-20 md:py-28 max-w-7xl mx-auto text-center relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#fca311]/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200/60 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fca311]" />
            <span className="text-[10px] font-extrabold text-[#b26a06] uppercase tracking-wider">
              Property management platform
            </span>
          </div>

          {/* Major Title */}
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight text-[#111e2e] leading-[1.08] max-w-3xl mx-auto">
            Run your rentals with calm clarity.
          </h1>

          {/* Subtext */}
          <p className="text-slate-600 text-sm md:text-base leading-relaxed max-w-2xl mx-auto font-medium">
            iKode brings every property, lease, maintenance ticket, payment, and tenant conversation into one focused dashboard — built for landlords, tenants, and on-call technicians.
          </p>

          {/* Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button 
              onClick={onOpenSignUp}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#111e2e] hover:bg-black text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer group"
            >
              <span>Start here — open your portal</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a 
              href="#request-demo"
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-extrabold rounded-xl text-xs border border-slate-200/80 shadow-xs flex items-center justify-center cursor-pointer transition-all"
            >
              Request a demo
            </a>
          </div>

          {/* Caption */}
          <p className="text-[10px] text-slate-400 font-medium">
            First signup becomes admin &bull; Tenant, landlord & technicians supported
          </p>
        </div>
      </section>

      {/* Interactive Conversion Feature (Marketer Strategy) */}
      <section className="px-6 py-8 bg-[#f5f1e6]/40 border-y border-slate-200/40">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 space-y-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Interactive Walkthrough</span>
            <h3 className="text-xl font-bold font-display text-slate-900 tracking-tight">How will you use iKode?</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              We tailored the system to deliver an uncompromised user experience for every stakeholder involved in the property cycle. Select your perspective to see the benefit.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(personas) as Array<keyof typeof personas>).map(key => (
                <button
                  key={key}
                  onClick={() => setSelectedPersona(key)}
                  className={`px-3 py-2 text-[11px] font-bold rounded-lg border text-left transition-all cursor-pointer ${
                    selectedPersona === key 
                      ? "bg-[#111e2e] border-[#111e2e] text-white shadow-sm" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {personas[key].title}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 font-mono text-[9px] font-bold text-amber-600 bg-amber-50 rounded-bl-xl uppercase tracking-wider">
              {personas[selectedPersona].metric}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[#fca311] uppercase tracking-wider">ROLE PERSPECTIVE</span>
              <h4 className="text-base font-bold text-slate-800">{personas[selectedPersona].title} Dashboard</h4>
            </div>
            <p className="text-xs text-slate-500 italic">"{personas[selectedPersona].tagline}"</p>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {personas[selectedPersona].benefit}
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-[#111e2e] cursor-pointer hover:underline" onClick={onOpenSignUp}>
              <span>Launch {personas[selectedPersona].title} workspace</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section className="px-6 py-20 max-w-7xl mx-auto space-y-12" id="features">
        <div className="max-w-2xl text-left space-y-3">
          <span className="text-[10px] font-black text-[#fca311] uppercase tracking-wider">PLATFORM HIGHLIGHTS</span>
          <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-[#111e2e]">
            Everything you need, nothing you don't.
          </h2>
        </div>

        {/* 6-grid item from screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-xs hover:shadow-sm space-y-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
              <Building className="w-5 h-5 text-slate-800" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm">Properties & units</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Group buildings, track every unit's occupancy at a glance, and keep a photo gallery per space.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-xs hover:shadow-sm space-y-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
              <Calendar className="w-5 h-5 text-slate-800" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm">Leases with memory</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Every contract carries its own timeline — created, edited, ended — so you always know what happened and when.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-xs hover:shadow-sm space-y-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
              <Wrench className="w-5 h-5 text-slate-800" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm">Maintenance workflows</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Tenants file issues, you assign technicians, everyone updates progress with photos.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-xs hover:shadow-sm space-y-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
              <MessageSquare className="w-5 h-5 text-slate-800" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm">Tenant messaging</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Direct, friendly chat between landlord and tenant — no painful third-party messengers.
              </p>
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-xs hover:shadow-sm space-y-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
              <Shield className="w-5 h-5 text-slate-800" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm">Role-aware access</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Admins, landlords, tenants, and technicians: each see exactly what they need — nothing more.
              </p>
            </div>
          </div>

          {/* Card 6 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-xs hover:shadow-sm space-y-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
              <FileText className="w-5 h-5 text-slate-800" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm">Documents & receipts</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Upload invoices, leases, and notices once. Tenants on the lease can read theirs.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Built for everyone Section */}
      <section className="px-6 py-16 bg-[#f5f1e6]/30 border-y border-slate-200/30">
        <div className="max-w-7xl mx-auto space-y-8">
          <h2 className="text-2xl font-display font-black text-slate-900 text-center">
            Built for everyone on the lease.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Admins", desc: "Manage users and grant roles." },
              { title: "Landlords", desc: "Track portfolios, leases, and payments." },
              { title: "Tenants", desc: "Pay, file issues, message your landlord." },
              { title: "Technicians", desc: "See assigned jobs and log progress." }
            ].map(item => (
              <div key={item.title} className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-xs text-center space-y-1.5">
                <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                <p className="text-[11px] text-slate-500 leading-normal font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Pricing Section */}
      <section className="px-6 py-20 max-w-7xl mx-auto space-y-12" id="pricing">
        <div className="max-w-2xl text-center mx-auto space-y-2">
          <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-[#111e2e]">
            Simple pricing, per unit.
          </h2>
          <p className="text-slate-500 text-xs font-medium">
            Start free, scale as your portfolio grows. Switch or cancel any time.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          
          {/* Tier 1: Starter */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6 text-left">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-900 text-sm">Starter</h4>
                <p className="text-[11px] text-slate-500 font-medium">For owners with a handful of units.</p>
              </div>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-3xl font-black text-slate-950 font-display">Free</span>
                <span className="text-[11px] text-slate-400 font-medium">up to 3 units</span>
              </div>
              <ul className="space-y-2.5 text-[11px] text-slate-600 font-medium pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>3 units included</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Leases & Tenants</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Maintenance tickets</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Email support</span>
                </li>
              </ul>
            </div>
            <button 
              onClick={onOpenSignUp}
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold border border-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Start free
            </button>
          </div>

          {/* Tier 2: Growth (Most popular) */}
          <div className="bg-white p-8 rounded-3xl border-2 border-slate-900 shadow-md relative flex flex-col justify-between space-y-6 text-left transform md:scale-[1.03]">
            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#111e2e] text-white font-black text-[9px] uppercase px-3 py-1 rounded-full tracking-wider whitespace-nowrap">
              Most popular
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-900 text-sm">Growth</h4>
                <p className="text-[11px] text-slate-500 font-medium">For active landlords scaling up.</p>
              </div>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-3xl font-black text-slate-950 font-display">$2</span>
                <span className="text-[11px] text-slate-400 font-medium">/ unit / month</span>
              </div>
              <ul className="space-y-2.5 text-[11px] text-slate-600 font-medium pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Unlimited units & leases</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Payments ledger</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Document storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Tenant messaging</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>
            </div>
            <a 
              href="#request-demo"
              className="w-full py-2.5 bg-[#111e2e] hover:bg-black text-white text-center font-bold rounded-xl text-xs transition-colors cursor-pointer block"
            >
              Request a demo
            </a>
          </div>

          {/* Tier 3: Portfolio */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6 text-left">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-900 text-sm">Portfolio</h4>
                <p className="text-[11px] text-slate-500 font-medium">For agencies and multi-site teams.</p>
              </div>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-3xl font-black text-slate-950 font-display">Custom</span>
              </div>
              <ul className="space-y-2.5 text-[11px] text-slate-600 font-medium pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Everything in Growth</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Multiple landlords</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Technician dispatch</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>SSO & custom roles</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Dedicated CSM</span>
                </li>
              </ul>
            </div>
            <a 
              href="#request-demo"
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-center font-bold border border-slate-200 rounded-xl text-xs transition-colors cursor-pointer block"
            >
              Talk to sales
            </a>
          </div>

        </div>
      </section>

      {/* 6. Footer & Demo request form */}
      <footer className="px-6 py-20 bg-[#FAF9F6] border-t border-slate-200/60" id="request-demo">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          
          <div className="md:col-span-6 space-y-6 text-left">
            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-[#111e2e]">
              See iKode on your portfolio.
            </h2>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-medium">
              Tell us about your rentals. We'll get back within one business day to schedule a 20-minute walkthrough tailored to how you operate.
            </p>

            <ul className="space-y-3.5 text-xs font-semibold text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tailored walkthrough using your unit count & workflow</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Get a live, personalized staging database within 10 minutes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No credit card required. Cancel or switch anytime.</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-6 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-md">
            {demoSubmitted ? (
              <div className="text-center py-8 space-y-3 animate-fade-in text-left">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-lg font-bold text-slate-900">Request Received!</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  Thanks {demoName}! An onboarding specialist will contact you at <strong>{demoEmail}</strong> within 1 business day to prepare your staging dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => setDemoSubmitted(false)}
                  className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4 text-left">
                <h4 className="font-bold text-slate-900 text-sm">Request a demo</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Name *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Sarah Miller"
                      value={demoName}
                      onChange={(e) => setDemoName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Work email *</label>
                    <input 
                      type="email"
                      required
                      placeholder="sarah@millerrentals.com"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Phone number</label>
                    <input 
                      type="tel"
                      placeholder="+250 788 123 456"
                      value={demoPhone}
                      onChange={(e) => setDemoPhone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Portfolio size</label>
                    <select
                      value={portfolioSize}
                      onChange={(e) => setPortfolioSize(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none cursor-pointer font-sans"
                    >
                      <option>1-10 units</option>
                      <option>11-50 units</option>
                      <option>51-200 units</option>
                      <option>201+ units</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-[#111e2e] hover:bg-black text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Submit request
                </button>
              </form>
            )}
          </div>

        </div>
        
        <div className="max-w-5xl mx-auto pt-12 mt-12 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-semibold">
          <span>&copy; 2026 Ikode. Built with calm clarity.</span>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-slate-600">Privacy Policy</a>
            <a href="#pricing" className="hover:text-slate-600">Terms of Service</a>
            <button onClick={onOpenPortal} className="hover:text-slate-600 cursor-pointer">Resident & Owner Portals</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
