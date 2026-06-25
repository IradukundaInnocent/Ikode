import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { 
  Shield, Users, Clipboard, Key, Search, Plus, 
  AlertTriangle, CheckCircle, Clock, Trash2, ShieldAlert 
} from "lucide-react";

interface SecurityGuardViewProps {
  currentUser: UserProfile;
}

interface VisitorLog {
  id: string;
  name: string;
  phone: string;
  purpose: string;
  plateNumber: string;
  hostUnit: string;
  checkIn: string;
  checkOut?: string;
  date: string;
}

interface IncidentReport {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: "low" | "medium" | "high";
  status: "open" | "resolved";
  reportedAt: string;
  reportedBy: string;
}

interface GatePass {
  id: string;
  passCode: string;
  holderName: string;
  plateNumber: string;
  status: "valid" | "used" | "expired";
  createdAt: string;
}

export default function SecurityGuardView({ currentUser }: SecurityGuardViewProps) {
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Active view tab
  const [activeTab, setActiveTab] = useState<"visitors" | "incidents" | "gatepass" | "vehicles">("visitors");

  // Visitor state
  const [visitors, setVisitors] = useState<VisitorLog[]>(() => {
    const saved = localStorage.getItem("ikode_visitors");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "vis-1",
        name: "Jean Claude Niyonzima",
        phone: "0788123456",
        purpose: "Delivery (Package)",
        plateNumber: "RAD 123 A",
        hostUnit: "Block A - Unit 101",
        checkIn: "10:15 AM",
        checkOut: "10:30 AM",
        date: "2026-06-24"
      },
      {
        id: "vis-2",
        name: "Alice Umutoni",
        phone: "0788765432",
        purpose: "Social Visit",
        plateNumber: "GR 456 B",
        hostUnit: "Block B - Unit 102",
        checkIn: "08:45 AM",
        date: "2026-06-24"
      }
    ];
  });

  // Incident reports state
  const [incidents, setIncidents] = useState<IncidentReport[]>(() => {
    const saved = localStorage.getItem("ikode_incidents");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "inc-1",
        title: "Block B Parking Gate Sensor Malfunction",
        description: "The automated gate sensor failed to detect vehicles pulling up. Switched to manual override and reported to technician.",
        location: "Block B Main Gate",
        priority: "medium",
        status: "open",
        reportedAt: "2026-06-24 09:12 AM",
        reportedBy: currentUser.name || "Security Officer"
      }
    ];
  });

  // Gate passes state
  const [gatePasses, setGatePasses] = useState<GatePass[]>(() => {
    const saved = localStorage.getItem("ikode_gatepasses");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "pass-1",
        passCode: "IK-PASS-9941",
        holderName: "David Habimana",
        plateNumber: "RAB 777 Z",
        status: "valid",
        createdAt: "2026-06-24 07:00 AM"
      },
      {
        id: "pass-2",
        passCode: "IK-PASS-8821",
        holderName: "Gasana Landscaping",
        plateNumber: "RAA 101 X",
        status: "used",
        createdAt: "2026-06-23 02:30 PM"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("ikode_visitors", JSON.stringify(visitors));
  }, [visitors]);

  useEffect(() => {
    localStorage.setItem("ikode_incidents", JSON.stringify(incidents));
  }, [incidents]);

  useEffect(() => {
    localStorage.setItem("ikode_gatepasses", JSON.stringify(gatePasses));
  }, [gatePasses]);

  // Form Fields
  // Visitor
  const [visName, setVisName] = useState("");
  const [visPhone, setVisPhone] = useState("");
  const [visPurpose, setVisPurpose] = useState("");
  const [visPlate, setVisPlate] = useState("");
  const [visHost, setVisHost] = useState("");

  // Incident
  const [incTitle, setIncTitle] = useState("");
  const [incDesc, setIncDesc] = useState("");
  const [incLoc, setIncLoc] = useState("");
  const [incPriority, setIncPriority] = useState<"low" | "medium" | "high">("medium");

  // Gate Pass
  const [passHolder, setPassHolder] = useState("");
  const [passPlate, setPassPlate] = useState("");

  const handleRegisterVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visName || !visPhone || !visHost) {
      setError("Please fill in Visitor Name, Phone, and Destination Unit.");
      return;
    }
    setError("");
    setSuccess("");

    const newVis: VisitorLog = {
      id: "vis-" + Date.now(),
      name: visName,
      phone: visPhone,
      purpose: visPurpose || "General Visit",
      plateNumber: visPlate.toUpperCase() || "N/A",
      hostUnit: visHost,
      checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split("T")[0]
    };

    setVisitors(prev => [newVis, ...prev]);
    setSuccess(`Successfully checked in visitor: ${visName}`);
    
    // Reset Form
    setVisName("");
    setVisPhone("");
    setVisPurpose("");
    setVisPlate("");
    setVisHost("");
  };

  const handleRegisterIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incTitle || !incDesc || !incLoc) {
      setError("Please provide incident Title, Description, and Location.");
      return;
    }
    setError("");
    setSuccess("");

    const newInc: IncidentReport = {
      id: "inc-" + Date.now(),
      title: incTitle,
      description: incDesc,
      location: incLoc,
      priority: incPriority,
      status: "open",
      reportedAt: new Date().toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      reportedBy: currentUser.name || "Security Guard"
    };

    setIncidents(prev => [newInc, ...prev]);
    setSuccess(`Logged incident: "${incTitle}" successfully. Compound supervisor notified.`);
    
    // Reset
    setIncTitle("");
    setIncDesc("");
    setIncLoc("");
    setIncPriority("medium");
  };

  const handleGenerateGatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passHolder) {
      setError("Please provide a Gate Pass Holder Name.");
      return;
    }
    setError("");
    setSuccess("");

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const newPass: GatePass = {
      id: "pass-" + Date.now(),
      passCode: `IK-PASS-${randomDigits}`,
      holderName: passHolder,
      plateNumber: passPlate.toUpperCase() || "WALK-IN",
      status: "valid",
      createdAt: new Date().toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    setGatePasses(prev => [newPass, ...prev]);
    setSuccess(`Gate pass generated! Code: ${newPass.passCode}`);
    setPassHolder("");
    setPassPlate("");
  };

  const handleCheckOutVisitor = (id: string) => {
    setVisitors(prev => prev.map(v => {
      if (v.id === id) {
        return {
          ...v,
          checkOut: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return v;
    }));
    setSuccess("Visitor checked out successfully.");
  };

  const handleResolveIncident = (id: string) => {
    setIncidents(prev => prev.map(i => {
      if (i.id === id) {
        return { ...i, status: "resolved" as const };
      }
      return i;
    }));
    setSuccess("Incident marked as resolved.");
  };

  const handleUseGatePass = (id: string) => {
    setGatePasses(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: "used" as const };
      }
      return p;
    }));
    setSuccess("Gate pass code validated and marked as used.");
  };

  const filteredVisitors = visitors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.hostUnit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-[#111e2e] text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            Security Guard Dashboard
          </span>
          <h1 className="text-2xl font-display font-black mt-2">Compound Security Desk</h1>
          <p className="text-slate-300 text-xs mt-1 font-medium">
            Authorized for compounds, visitor registrations, gate authorization triggers, and vehicle logs.
          </p>
        </div>

        <div className="text-right text-xs">
          <p className="text-slate-400 font-medium">Reporting Guard:</p>
          <p className="font-bold text-white text-sm">{currentUser.name}</p>
          <p className="text-[10px] text-rose-300 font-mono mt-0.5">{currentUser.email}</p>
        </div>
      </div>

      {/* Banner messages */}
      {success && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-xs font-semibold border border-emerald-100 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 text-rose-800 p-4 rounded-xl text-xs font-semibold border border-rose-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mini Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Visitors</p>
          <h3 className="text-xl font-black text-slate-800 mt-1">{visitors.filter(v => !v.checkOut).length} inside</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Incidents</p>
          <h3 className="text-xl font-black text-rose-600 mt-1">{incidents.filter(i => i.status === "open").length} unresolved</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gate Passes</p>
          <h3 className="text-xl font-black text-indigo-600 mt-1">{gatePasses.filter(p => p.status === "valid").length} valid</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Logs Today</p>
          <h3 className="text-xl font-black text-slate-800 mt-1">{visitors.length} checked</h3>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-150 gap-2">
        <button
          onClick={() => setActiveTab("visitors")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "visitors" ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Visitor Register
        </button>
        <button
          onClick={() => setActiveTab("incidents")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "incidents" ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Incident reports
        </button>
        <button
          onClick={() => setActiveTab("gatepass")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "gatepass" ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Gate pass validations
        </button>
        <button
          onClick={() => setActiveTab("vehicles")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "vehicles" ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Compound Vehicles
        </button>
      </div>

      {/* Search Input for records */}
      {activeTab === "visitors" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search visitor, plate, unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-250 focus:border-indigo-500 rounded-xl text-xs outline-none transition-all shadow-2xs"
          />
        </div>
      )}

      {/* Tab Body Contents */}
      {activeTab === "visitors" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Check-In Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Register New Visitor Check-In</h3>
            
            <form onSubmit={handleRegisterVisitor} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Visitor Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jean Pierre"
                  value={visName}
                  onChange={(e) => setVisName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Visitor Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 0788123456"
                  value={visPhone}
                  onChange={(e) => setVisPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Vehicle Plate (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. RAD 123 A"
                    value={visPlate}
                    onChange={(e) => setVisPlate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Destination Unit / Host</label>
                  <input
                    type="text"
                    placeholder="e.g. Block A Unit 105"
                    value={visHost}
                    onChange={(e) => setVisHost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Purpose of Visit</label>
                <input
                  type="text"
                  placeholder="e.g. Delivery, Guest, Service repair"
                  value={visPurpose}
                  onChange={(e) => setVisPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Authorize Gate Check-In</span>
              </button>
            </form>
          </div>

          {/* Visitor List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-display font-semibold text-slate-900 text-sm">Gate Movements Logbook</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    <th className="px-5 py-3">Visitor Details</th>
                    <th className="px-5 py-3">Vehicle / Destination</th>
                    <th className="px-5 py-3">Timestamps</th>
                    <th className="px-5 py-3 text-right">Gate action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredVisitors.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{v.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{v.phone} &bull; {v.purpose}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-600 font-mono">{v.plateNumber}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{v.hostUnit}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-semibold font-mono text-[10px]">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          <span>In: {v.checkIn}</span>
                        </div>
                        {v.checkOut ? (
                          <div className="flex items-center gap-1.5 text-rose-500 font-semibold font-mono text-[10px] mt-1">
                            <Clock className="w-3 h-3 text-rose-400" />
                            <span>Out: {v.checkOut}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-extrabold text-[#fca311] bg-amber-50 px-2 py-0.5 rounded-full mt-1.5 inline-block animate-pulse">INSIDE</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!v.checkOut && (
                          <button
                            onClick={() => handleCheckOutVisitor(v.id)}
                            className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Check-Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "incidents" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Report Incident Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Report Compound Incident</h3>
            
            <form onSubmit={handleRegisterIncident} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Incident Title / Hazard</label>
                <input
                  type="text"
                  placeholder="e.g. Broken water pipe leaking in parking block"
                  value={incTitle}
                  onChange={(e) => setIncTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Description of Incident</label>
                <textarea
                  placeholder="State the observed details and immediate actions taken..."
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Hazard Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Block C Garage Entrance"
                    value={incLoc}
                    onChange={(e) => setIncLoc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Urgency Priority</label>
                  <select
                    value={incPriority}
                    onChange={(e) => setIncPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all cursor-pointer"
                  >
                    <option value="low">Low (Debris, Noise)</option>
                    <option value="medium">Medium (Hardware Malfunction)</option>
                    <option value="high">High (Flooding, Security Breach)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#111e2e] hover:bg-slate-850 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Log Incident & File Report</span>
              </button>
            </form>
          </div>

          {/* Active Incidents List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-display font-bold text-slate-900 text-sm">Active Incident Logs</h3>
            {incidents.map(inc => (
              <div key={inc.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  inc.priority === "high" ? "bg-rose-500" :
                  inc.priority === "medium" ? "bg-amber-500" : "bg-indigo-500"
                }`} />

                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{inc.title}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Location: {inc.location} &bull; Filed: {inc.reportedAt}</p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${
                    inc.status === "open" ? "bg-rose-50 text-rose-700 animate-pulse" : "bg-emerald-50 text-emerald-700"
                  }`}>
                    {inc.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">{inc.description}</p>

                <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-[10px]">
                  <span className="text-slate-400">Reported by: <span className="font-bold text-slate-600">{inc.reportedBy}</span></span>
                  
                  {inc.status === "open" && (
                    <button
                      onClick={() => handleResolveIncident(inc.id)}
                      className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "gatepass" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generate Pass Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Issue Secure Gate Pass</h3>
            
            <form onSubmit={handleGenerateGatePass} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Holder Name (Company or Person)</label>
                <input
                  type="text"
                  placeholder="e.g. MTN Fiber Technician"
                  value={passHolder}
                  onChange={(e) => setPassHolder(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Vehicle Plate Number (If applicable)</label>
                <input
                  type="text"
                  placeholder="e.g. GR 442 C"
                  value={passPlate}
                  onChange={(e) => setPassPlate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Key className="w-4 h-4 text-indigo-200" />
                <span>Issue & Generate QR-Code Pass</span>
              </button>
            </form>
          </div>

          {/* Passes List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-display font-semibold text-slate-900 text-sm">Gate Authorization Registers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    <th className="px-5 py-3">Security Code</th>
                    <th className="px-5 py-3">Pass Holder</th>
                    <th className="px-5 py-3">Vehicle Plate</th>
                    <th className="px-5 py-3 text-right">Pass Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {gatePasses.map(pass => (
                    <tr key={pass.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4 font-mono font-bold text-indigo-600">{pass.passCode}</td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{pass.holderName}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Created: {pass.createdAt}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold font-mono text-slate-600">{pass.plateNumber}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {pass.status === "valid" ? (
                          <button
                            onClick={() => handleUseGatePass(pass.id)}
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Mark as Used / Open Gate
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-400 font-extrabold rounded-full text-[9px] uppercase tracking-widest">
                            {pass.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "vehicles" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Compound Vehicle Placement Tracker</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  <th className="px-5 py-3">License Plate</th>
                  <th className="px-5 py-3">Authorized Owner</th>
                  <th className="px-5 py-3">Compound Parking Block</th>
                  <th className="px-5 py-3">In/Out Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {visitors.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-mono font-bold text-slate-800 text-sm">{v.plateNumber}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-700">{v.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{v.phone}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-600">{v.hostUnit.split("-")[0] || "Main Compound Parking"}</p>
                    </td>
                    <td className="px-5 py-4">
                      {v.checkOut ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full text-[9px] font-extrabold uppercase">DEPARTED</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-extrabold uppercase">LOGGED INSIDE</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
