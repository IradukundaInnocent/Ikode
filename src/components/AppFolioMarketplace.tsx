import React, { useState } from "react";
import { 
  Compass, Sliders, Cpu, Layers, Activity, Sparkles, TrendingUp, 
  Coins, Workflow, Percent, ShieldCheck, Check, Info, AlertCircle, 
  User, CheckCircle2, Lock, Unlock, Database, RefreshCw, BarChart2,
  Trash2, Plus, Sparkle, Search, Zap, Droplet, Key, Shield, MessageSquare
} from "lucide-react";
import { motion } from "motion/react";
import { formatPrice } from "../utils/currency";

interface AppFolioMarketplaceProps {
  currentUser: { email: string; name: string; role?: string };
}

// Simulated active integrations in localStorage
interface Integration {
  id: string;
  name: string;
  category: "screening" | "utilities" | "smarthome" | "financials" | "marketing";
  tagline: string;
  description: string;
  cost: string;
  logoColor: string;
  icon: any;
  active: boolean;
}

export default function AppFolioMarketplace({ currentUser }: AppFolioMarketplaceProps) {
  // ----------------------------------------------------
  // Part 1: Interactive Scale Simulator (AppFolio Hierarchy)
  // ----------------------------------------------------
  const [landlordsCount, setLandlordsCount] = useState<number>(100);
  const [tenantsPerLandlord, setTenantsPerLandlord] = useState<number>(20);
  const [managersCount, setManagersCount] = useState<number>(3);
  
  // Computed values
  const totalTenants = landlordsCount * tenantsPerLandlord;
  const totalRentals = landlordsCount * 4; // Assume average of 4 apartment units/rentals per landlord
  const rentalsPerManager = Math.round(totalRentals / managersCount);
  
  // Presets
  const applyPreset = (presetName: "standard" | "compact" | "enterprise") => {
    if (presetName === "standard") {
      setLandlordsCount(100);
      setTenantsPerLandlord(20);
      setManagersCount(3);
    } else if (presetName === "compact") {
      setLandlordsCount(25);
      setTenantsPerLandlord(16);
      setManagersCount(1);
    } else if (presetName === "enterprise") {
      setLandlordsCount(150);
      setTenantsPerLandlord(30);
      setManagersCount(5);
    }
  };

  // ----------------------------------------------------
  // Part 2: AppFolio Integration Marketplace
  // ----------------------------------------------------
  const [integrations, setIntegrations] = useState<Integration[]>(() => {
    const saved = localStorage.getItem("ikode_market_integrations");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Map icons back
        return parsed.map((item: any) => {
          let icon = Compass;
          if (item.id === "screening") icon = ShieldCheck;
          if (item.id === "rubs") icon = Droplet;
          if (item.id === "smarthome") icon = Key;
          if (item.id === "insurance") icon = Shield;
          if (item.id === "ai_leasing") icon = MessageSquare;
          return { ...item, icon };
        });
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: "screening",
        name: "AppFolio Tenant SmartScreener Plus",
        category: "screening",
        tagline: "Instant credit, eviction, and criminal records screening.",
        description: "Pull background checks directly during application. AI generates automated recommendations based on custom risk criteria.",
        cost: "2,500 FRW / report",
        logoColor: "bg-teal-500",
        icon: ShieldCheck,
        active: false
      },
      {
        id: "rubs",
        name: "RUBS Utility Cost Allocator Pro",
        category: "utilities",
        tagline: "Ratio Utility Billing System for multi-tenant assets.",
        description: "Split master water, electricity, and trash bills across residents proportionally based on occupancy, bedrooms, or area size.",
        cost: "15,000 FRW / month",
        logoColor: "bg-blue-500",
        icon: Droplet,
        active: false
      },
      {
        id: "smarthome",
        name: "Yale & Nest Smart Home IoT Gateway",
        category: "smarthome",
        tagline: "Remote smart locks, thermostats, and water leak sensors.",
        description: "Provide automated check-in PIN codes to incoming tenants and technicians. Monitor vacant unit energy usage from one console.",
        cost: "35,000 FRW / property",
        logoColor: "bg-amber-500",
        icon: Key,
        active: false
      },
      {
        id: "insurance",
        name: "Assurant Master Liability Insurance Hub",
        category: "financials",
        tagline: "Automated renters insurance compliance checking.",
        description: "Enforce and track lease-mandated liability policies. Auto-enroll residents in default landlord-purchased policies if lapses occur.",
        cost: "Free (Resident paid)",
        logoColor: "bg-purple-500",
        icon: Shield,
        active: false
      },
      {
        id: "ai_leasing",
        name: "Lisa AI Virtual Leasing Agent",
        category: "marketing",
        tagline: "Midnight auto-replies, tour bookings, and prospect alerts.",
        description: "An AI-powered concierge that chats with inbound guests on listing sites 24/7, schedules property visits, and updates managers.",
        cost: "45,000 FRW / month",
        logoColor: "bg-rose-500",
        icon: MessageSquare,
        active: false
      }
    ];
  });

  const saveIntegrations = (list: Integration[]) => {
    const serialized = list.map(({ icon, ...rest }) => rest);
    localStorage.setItem("ikode_market_integrations", JSON.stringify(serialized));
  };

  const toggleIntegration = (id: string) => {
    const updated = integrations.map(item => {
      if (item.id === id) {
        return { ...item, active: !item.active };
      }
      return item;
    });
    setIntegrations(updated);
    saveIntegrations(updated);
  };

  // Screening Simulation state
  const [screenEmail, setScreenEmail] = useState("applicant_murigo@gmail.com");
  const [screenName, setScreenName] = useState("Murigo Fabrice");
  const [screeningResult, setScreeningResult] = useState<any | null>(null);
  const [screeningLoading, setScreeningLoading] = useState(false);

  const triggerScreening = (e: React.FormEvent) => {
    e.preventDefault();
    setScreeningLoading(true);
    setScreeningResult(null);
    setTimeout(() => {
      const creditScore = Math.floor(Math.random() * (850 - 580) + 580);
      const riskStatus = creditScore > 720 ? "low" : creditScore > 640 ? "medium" : "high";
      setScreeningResult({
        creditScore,
        riskStatus,
        evictions: creditScore > 640 ? "0 Recorded" : "1 Case (Settled in 2024)",
        criminal: "No match found in Rwanda Prosecution database",
        employment: "Verified (Senior Developer at Bank of Kigali, 2,800,000 FRW/mo)",
        recommendation: creditScore > 720 ? "Highly Approve" : creditScore > 640 ? "Approve with Double Deposit" : "Decline Applicant"
      });
      setScreeningLoading(false);
    }, 1500);
  };

  // RUBS simulation state
  const [rubsTotalBill, setRubsTotalBill] = useState<number>(450000); // 450,000 RWF water bill
  const [rubsMethod, setRubsMethod] = useState<"occupants" | "bedrooms">("occupants");
  const [rubsCalculated, setRubsCalculated] = useState<boolean>(false);
  const [rubsSuccessMsg, setRubsSuccessMsg] = useState("");

  const handleCalculateRUBS = () => {
    setRubsCalculated(true);
    setRubsSuccessMsg("");
  };

  const handleApplyRubsCharges = () => {
    setRubsSuccessMsg("Proportional water utility charges successfully dispatched as service charge entries to all active tenant accounts!");
    setTimeout(() => {
      setRubsSuccessMsg("");
    }, 4500);
  };

  // IoT lock simulation state
  const [lockStates, setLockStates] = useState<Record<string, "locked" | "unlocked">>({
    "101": "locked",
    "102": "locked",
    "103": "unlocked",
    "201": "locked",
    "202": "unlocked"
  });
  const [lockLoading, setLockLoading] = useState<string | null>(null);

  const toggleLock = (unit: string) => {
    setLockLoading(unit);
    setTimeout(() => {
      setLockStates(prev => ({
        ...prev,
        [unit]: prev[unit] === "locked" ? "unlocked" : "locked"
      }));
      setLockLoading(null);
    }, 1000);
  };

  // AI Lisa Simulation State
  const [lisaChatHistory, setLisaChatHistory] = useState<any[]>([
    { sender: "user", text: "Hello, is the 2 Bedroom Penthouse A101 still vacant?" },
    { sender: "lisa", text: "Hi! Yes, A101 is available. Rent is 3,200 USD per month, featuring luxury finishes and balcony. Would you like to schedule a virtual tour this Saturday?" },
    { sender: "user", text: "Yes! 10:00 AM on Saturday works. Do you run background screening?" },
    { sender: "lisa", text: "Perfect! I have scheduled you for Saturday at 10:00 AM. And yes, we use AppFolio SmartScreener Plus to verify credit and references automatically." }
  ]);
  const [lisaInput, setLisaInput] = useState("");
  const [lisaTyping, setLisaTyping] = useState(false);

  const sendLisaMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lisaInput.trim()) return;

    const newMsgs = [...lisaChatHistory, { sender: "user", text: lisaInput }];
    setLisaChatHistory(newMsgs);
    const textSent = lisaInput;
    setLisaInput("");
    setLisaTyping(true);

    setTimeout(() => {
      let reply = "Thanks for the message! I'm coordinating with James Karemo to get you finalized. Let us know if you want to complete the application form online.";
      if (textSent.toLowerCase().includes("pet") || textSent.toLowerCase().includes("dog")) {
        reply = "AppFolio records show Oakridge Heights is pet-friendly for pets under 15kg with a minor refundable safety deposit! Would you like me to send you the pet policy agreement?";
      } else if (textSent.toLowerCase().includes("price") || textSent.toLowerCase().includes("rent") || textSent.toLowerCase().includes("cost")) {
        reply = "Our leasing rates range from 1,600 USD to 4,200 USD depending on the bedrooms. We accept automated mobile payments (MTN MoMo & Airtel Money) directly inside the resident portal!";
      } else if (textSent.toLowerCase().includes("apply") || textSent.toLowerCase().includes("application")) {
        reply = "I've sent an instant application link to your inbox. You can upload your identification and generate an AI-powered screening report in 5 minutes!";
      }

      setLisaChatHistory(prev => [...prev, { sender: "lisa", text: reply }]);
      setLisaTyping(false);
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="appfolio-market-root">
      
      {/* Top Hero Card mimicking professional AppFolio branding */}
      <div className="bg-gradient-to-br from-[#0a2342] to-[#16425b] text-white p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-lg border border-slate-700/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl -z-10" />
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="bg-cyan-400 text-[#0a2342] font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              APPFOLIO STACK™
            </span>
            <span className="text-slate-300 text-xs font-mono">&bull; Premium Marketplace Integration Hub</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight mt-2">
            Scale and Automate Your Real Estate Empire
          </h1>
          <p className="text-slate-200 text-xs md:text-sm leading-relaxed font-medium">
            Representing the high-density scale models of national property developers. 
            Activate professional integrations from AppFolio's system to handle utilities (RUBS), 
            background screeners, smart home gateways, and automated AI leasing.
          </p>
        </div>
      </div>

      {/* TABS DESIGN - 2 COLS: SIMULATOR & MARKETPLACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (Lg: 5cols): Scale & Densities Simulator */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 text-sm">Portfolio Scale Simulator</h3>
                <p className="text-[10px] text-slate-400 font-medium">Calibrate densities to model AppFolio-level volumes.</p>
              </div>
            </div>

            {/* Presets Button Row */}
            <div className="space-y-2">
              <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Scale Presets</span>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => applyPreset("compact")}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    landlordsCount === 25 ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Compact
                </button>
                <button 
                  onClick={() => applyPreset("standard")}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    landlordsCount === 100 && tenantsPerLandlord === 20 ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  AppFolio Standard
                </button>
                <button 
                  onClick={() => applyPreset("enterprise")}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    landlordsCount === 150 ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Enterprise Max
                </button>
              </div>
            </div>

            {/* Range Sliders */}
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">Registered Landlords (Owners)</label>
                  <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{landlordsCount} Companies</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="150" 
                  step="5"
                  value={landlordsCount} 
                  onChange={(e) => setLandlordsCount(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-[10px] text-slate-400 block font-medium">Each landlord is "The Boss" representing unique billing ledgers.</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">Avg. Tenants per Landlord</label>
                  <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{tenantsPerLandlord} Residents</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="40" 
                  step="1"
                  value={tenantsPerLandlord} 
                  onChange={(e) => setTenantsPerLandlord(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-[10px] text-slate-400 block font-medium">Represents apartment unit occupant densities.</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">Active Property Managers</label>
                  <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{managersCount} Managers</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  step="1"
                  value={managersCount} 
                  onChange={(e) => setManagersCount(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-[10px] text-slate-400 block font-medium">Managers are the "Center of Operations" handling leasings & maintenance.</span>
              </div>
            </div>

            {/* Density Results & Calculations */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3.5">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Calculated Density Tree</span>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-100/80">
                  <span className="text-[10px] text-slate-400 block">Managed Rentals</span>
                  <div className="text-lg font-black text-slate-800 mt-0.5">{totalRentals} Units</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100/80">
                  <span className="text-[10px] text-slate-400 block">Total Tenants</span>
                  <div className="text-lg font-black text-slate-800 mt-0.5">{totalTenants.toLocaleString()} Renters</div>
                </div>
                <div className="col-span-2 p-3 bg-white rounded-xl border border-slate-100/80 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rentals Per Property Manager</span>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">~{rentalsPerManager} Rentals / PM</div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-full tracking-wider">
                    High Volume Capable
                  </span>
                </div>
              </div>

              {/* Graphic Flow Chart */}
              <div className="space-y-2 pt-1 border-t border-slate-150">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 font-mono">
                  <span>ADMIN (1)</span>
                  <span>MANAGERS ({managersCount})</span>
                  <span>LANDLORDS ({landlordsCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 flex-1 bg-rose-500 rounded-full" title="1 Admin" />
                  <div className="h-2 flex-[2] bg-cyan-500 rounded-full" title={`${managersCount} Managers`} />
                  <div className="h-2 flex-[4] bg-indigo-500 rounded-full" title={`${landlordsCount} Landlords`} />
                  <div className="h-2 flex-[8] bg-emerald-500 rounded-full" title={`${totalTenants} Tenants`} />
                </div>
                <div className="text-[10px] text-slate-400 text-center italic font-medium">
                  Scaling securely up to {totalTenants.toLocaleString()} residents under {landlordsCount} Company Bosses.
                </div>
              </div>
            </div>

            {/* Simulating Database Inject */}
            <button 
              onClick={() => {
                alert(`AppFolio Scale Simulator Calibrated! Successfully seeded metadata models matching ${totalTenants.toLocaleString()} residents, ${totalRentals} rentals, and ${managersCount} active property managers.`);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Database className="w-4 h-4" />
              <span>Apply Scaled Hierarchy Seed</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN (Lg: 7cols): Integration Cards & Active Simulators */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main List of Integrations */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-slate-800 text-base">AppFolio Core Marketplace Add-ons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map(item => (
                <div 
                  key={item.id} 
                  className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    item.active ? "border-emerald-500/50 shadow-md ring-1 ring-emerald-500/10" : "border-slate-200/60 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className={`p-2 rounded-xl text-white ${item.logoColor} shrink-0`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {item.cost}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-xs mt-1">{item.name}</h4>
                      <p className="text-[10px] text-indigo-600 font-extrabold tracking-wider uppercase">{item.category}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{item.tagline}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {item.active ? "● Configured & Live" : "Offline"}
                    </span>
                    <button 
                      onClick={() => toggleIntegration(item.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                        item.active 
                          ? "bg-rose-50 text-rose-600 hover:bg-rose-100" 
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {item.active ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Deactivate</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DYNAMIC SIMULATOR PANELS FOR ACTIVATED SERVICES */}
          <div className="space-y-6">
            <h3 className="font-display font-bold text-slate-800 text-base">Active Marketplace Playgrounds</h3>

            {/* Check if none active */}
            {!integrations.some(i => i.active) && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 space-y-2">
                <Compass className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold">No Marketplace Integrations Activated Yet</p>
                <p className="text-[11px] max-w-sm mx-auto">
                  Click "Activate" on any AppFolio integration above (such as the Tenant SmartScreener or RUBS Utility Allocator) to open its functional demo console right here!
                </p>
              </div>
            )}

            {/* SmartScreener Simulator */}
            {integrations.find(i => i.id === "screening")?.active && (
              <div className="bg-white p-6 rounded-2xl border border-emerald-500/30 shadow-md space-y-4 animate-slide-up">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <h4 className="font-bold text-slate-800 text-xs">Playground: AppFolio SmartScreener Plus</h4>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">SERVICE LEVEL: PLATINUM</span>
                </div>

                <form onSubmit={triggerScreening} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">Applicant Full Name</label>
                    <input 
                      type="text" 
                      value={screenName}
                      onChange={(e) => setScreenName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">Applicant Email</label>
                    <input 
                      type="email" 
                      value={screenEmail}
                      onChange={(e) => setScreenEmail(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="sm:col-span-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                  >
                    {screeningLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Extracting Public Records...</span>
                      </>
                    ) : (
                      <>
                        <Sparkle className="w-3.5 h-3.5" />
                        <span>Generate Tenant Background Report</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Screening Output Result */}
                {screeningResult && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3.5 animate-fade-in text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">Background Screener Report Result</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        screeningResult.riskStatus === "low" ? "bg-emerald-50 text-emerald-700" :
                        screeningResult.riskStatus === "medium" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        RECOMMENDATION: {screeningResult.recommendation}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px] leading-relaxed">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-mono">CREDIT RATING SCORE</span>
                        <span className="font-extrabold text-slate-800 text-sm font-mono">{screeningResult.creditScore} / 850</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-mono">EVICTIONS RECORD CHECK</span>
                        <span className="font-bold text-slate-800">{screeningResult.evictions}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-mono">CRIMINAL BACKGROUND</span>
                        <span className="font-bold text-slate-800">{screeningResult.criminal}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-mono">EMPLOYMENT VERIFICATION</span>
                        <span className="font-bold text-[#16425b]">{screeningResult.employment}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RUBS Allocator Playground */}
            {integrations.find(i => i.id === "rubs")?.active && (
              <div className="bg-white p-6 rounded-2xl border border-blue-500/30 shadow-md space-y-4 animate-slide-up">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                    <h4 className="font-bold text-slate-800 text-xs">Playground: RUBS Utility Allocator Pro</h4>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">RATIO UTILITY BILLING SYSTEM</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">Total Building Water Invoice (RWF)</label>
                    <input 
                      type="number" 
                      value={rubsTotalBill}
                      onChange={(e) => setRubsTotalBill(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">Allocation Formula Basis</label>
                    <select 
                      value={rubsMethod}
                      onChange={(e) => setRubsMethod(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none cursor-pointer"
                    >
                      <option value="occupants">By Number of Occupants (Density ratio)</option>
                      <option value="bedrooms">By Apartment Bedrooms count (Asset ratio)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={handleCalculateRUBS}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
                  >
                    Calculate Proportional Ratios
                  </button>
                  {rubsCalculated && (
                    <button 
                      onClick={handleApplyRubsCharges}
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                    >
                      Apply Ledger Charges
                    </button>
                  )}
                </div>

                {rubsSuccessMsg && (
                  <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-3 rounded-xl text-xs font-semibold">
                    {rubsSuccessMsg}
                  </div>
                )}

                {rubsCalculated && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Allocations Breakdown</span>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-150/40 pb-1.5">
                        <span className="font-bold text-slate-700">Penthouse A101 (4 occupants, 2.5 ratio)</span>
                        <span className="font-mono font-black text-slate-800">
                          {formatPrice(Math.round(rubsTotalBill * 0.45), "FRW")} RWF
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-150/40 pb-1.5">
                        <span className="font-bold text-slate-700">Cozy Studio B102 (1 occupant, 1.0 ratio)</span>
                        <span className="font-mono font-black text-slate-800">
                          {formatPrice(Math.round(rubsTotalBill * 0.18), "FRW")} RWF
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-150/40 pb-1.5">
                        <span className="font-bold text-slate-700">Family Haven C103 (3 occupants, 2.0 ratio)</span>
                        <span className="font-mono font-black text-slate-800">
                          {formatPrice(Math.round(rubsTotalBill * 0.37), "FRW")} RWF
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400 text-[10px] pt-1">
                        <span>Sum Total Allocation (100% verified)</span>
                        <span className="font-mono font-bold">{formatPrice(rubsTotalBill, "FRW")} RWF</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Smart Lock console */}
            {integrations.find(i => i.id === "smarthome")?.active && (
              <div className="bg-white p-6 rounded-2xl border border-amber-500/30 shadow-md space-y-4 animate-slide-up">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                    <h4 className="font-bold text-slate-800 text-xs">Playground: Yale & Nest IoT Smart Lock Center</h4>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">GATEWAY STATUS: ONLINE</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { num: "A101", desc: "Penthouse Level" },
                    { num: "B102", desc: "Studio Level" },
                    { num: "C103", desc: "Vacant Family" },
                    { num: "Garden-1", desc: "Ground Courtyard" }
                  ].map(unit => {
                    const isLocked = lockStates[unit.num] !== "unlocked";
                    const isLoading = lockLoading === unit.num;
                    return (
                      <div key={unit.num} className="p-3 bg-slate-50 border border-slate-150/60 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-black text-slate-800">Unit {unit.num}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{unit.desc}</p>
                        </div>
                        <button 
                          onClick={() => toggleLock(unit.num)}
                          disabled={isLoading}
                          className={`px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                            isLoading ? "bg-slate-200 text-slate-400" :
                            isLocked ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          }`}
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Syncing...</span>
                            </>
                          ) : isLocked ? (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>LOCKED</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>UNLOCKED</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lisa AI Assistant Simulator */}
            {integrations.find(i => i.id === "ai_leasing")?.active && (
              <div className="bg-white p-6 rounded-2xl border border-rose-500/30 shadow-md space-y-4 animate-slide-up">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                    <h4 className="font-bold text-slate-800 text-xs">Playground: Lisa AI Virtual Leasing Chat</h4>
                  </div>
                  <span className="text-[9px] font-bold text-rose-600 font-mono">STATUS: AUTO-RESPONDING</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150/60 h-48 overflow-y-auto space-y-3 text-xs flex flex-col justify-end">
                  {lisaChatHistory.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`max-w-[85%] p-2.5 rounded-2xl ${
                        item.sender === "user" 
                          ? "bg-slate-200 text-slate-800 self-end rounded-br-none" 
                          : "bg-rose-900 text-white self-start rounded-bl-none"
                      }`}
                    >
                      <p className="font-bold text-[9px] opacity-80 uppercase block">
                        {item.sender === "user" ? "Prospective Renter" : "Lisa AppFolio AI"}
                      </p>
                      <p className="mt-0.5">{item.text}</p>
                    </div>
                  ))}
                  {lisaTyping && (
                    <div className="bg-rose-900/10 text-rose-800 p-2 rounded-xl self-start text-[11px] font-semibold italic animate-pulse">
                      Lisa is reviewing listings database...
                    </div>
                  )}
                </div>

                <form onSubmit={sendLisaMessage} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ask Lisa something (e.g. Do you allow pets? Rent cost?)..."
                    value={lisaInput}
                    onChange={(e) => setLisaInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none"
                  />
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-[#0a2342] hover:bg-black text-white text-xs font-bold rounded-xl"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
