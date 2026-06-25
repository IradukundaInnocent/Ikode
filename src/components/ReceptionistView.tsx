import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { 
  Users, Mail, CheckCircle, AlertTriangle, 
  Plus, Calendar, MailOpen, UserCheck, MessageSquare, Megaphone 
} from "lucide-react";

interface ReceptionistViewProps {
  currentUser: UserProfile;
}

interface FrontDeskVisitor {
  id: string;
  name: string;
  company: string;
  purpose: string;
  hostPerson: string;
  timeIn: string;
  timeOut?: string;
  date: string;
}

interface PackageDelivery {
  id: string;
  carrier: string;
  trackingNum: string;
  recipientEmail: string;
  status: "pending_pickup" | "picked_up";
  receivedAt: string;
  pickedUpAt?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: "utility" | "general" | "social" | "emergency";
  publishedAt: string;
  author: string;
}

export default function ReceptionistView({ currentUser }: ReceptionistViewProps) {
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"visitors" | "packages" | "announcements">("visitors");

  // Local storage lists
  const [visitors, setVisitors] = useState<FrontDeskVisitor[]>(() => {
    const saved = localStorage.getItem("ikode_reception_visitors");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "rvis-1",
        name: "Honore Niyomugabo",
        company: "Water & Sanitation Corp (WASAC)",
        purpose: "Utility inspection",
        hostPerson: "James Karemo (Landlord)",
        timeIn: "09:30 AM",
        timeOut: "10:15 AM",
        date: "2026-06-24"
      },
      {
        id: "rvis-2",
        name: "Lydia Umulisa",
        company: "Private guest",
        purpose: "Social visit",
        hostPerson: "Henry (Tenant Unit 101)",
        timeIn: "11:00 AM",
        date: "2026-06-24"
      }
    ];
  });

  const [packages, setPackages] = useState<PackageDelivery[]>(() => {
    const saved = localStorage.getItem("ikode_reception_packages");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "pkg-1",
        carrier: "DHL Express",
        trackingNum: "DHL-88192-RW",
        recipientEmail: "tenant1@gmail.com",
        status: "pending_pickup",
        receivedAt: "2026-06-24 08:30 AM"
      },
      {
        id: "pkg-2",
        carrier: "FedEx",
        trackingNum: "FDX-99411-RW",
        recipientEmail: "tenant2@gmail.com",
        status: "picked_up",
        receivedAt: "2026-06-23 01:15 PM",
        pickedUpAt: "2026-06-23 04:30 PM"
      }
    ];
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem("ikode_announcements");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "ann-1",
        title: "Scheduled Maintenance of Clean Water Storage Tanks",
        content: "Please note that clean water storage tanks in Block A & B will undergo professional sanitation this Friday from 9 AM to 12 PM. Water pressure will be temporarily unavailable.",
        category: "utility",
        publishedAt: "2026-06-24",
        author: currentUser.name || "Front Desk"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("ikode_reception_visitors", JSON.stringify(visitors));
  }, [visitors]);

  useEffect(() => {
    localStorage.setItem("ikode_reception_packages", JSON.stringify(packages));
  }, [packages]);

  useEffect(() => {
    localStorage.setItem("ikode_announcements", JSON.stringify(announcements));
  }, [announcements]);

  // Form Fields
  const [visName, setVisName] = useState("");
  const [visCompany, setVisCompany] = useState("");
  const [visPurpose, setVisPurpose] = useState("");
  const [visHost, setVisHost] = useState("");

  const [pkgCarrier, setPkgCarrier] = useState("");
  const [pkgTrack, setPkgTrack] = useState("");
  const [pkgRecipient, setPkgRecipient] = useState("");

  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annCategory, setAnnCategory] = useState<"utility" | "general" | "social" | "emergency">("general");

  const handleCheckInVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visName || !visPurpose || !visHost) {
      setError("Please fill in Visitor Name, Purpose, and Host Person.");
      return;
    }
    setError("");
    setSuccess("");

    const newVis: FrontDeskVisitor = {
      id: "rvis-" + Date.now(),
      name: visName,
      company: visCompany || "None",
      purpose: visPurpose,
      hostPerson: visHost,
      timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split("T")[0]
    };

    setVisitors(prev => [newVis, ...prev]);
    setSuccess(`Visitor checked in: ${visName}`);
    setVisName("");
    setVisCompany("");
    setVisPurpose("");
    setVisHost("");
  };

  const handleRegisterPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgCarrier || !pkgTrack || !pkgRecipient) {
      setError("Please fill in Package Carrier, Tracking Number, and Recipient Tenant Email.");
      return;
    }
    setError("");
    setSuccess("");

    const newPkg: PackageDelivery = {
      id: "pkg-" + Date.now(),
      carrier: pkgCarrier,
      trackingNum: pkgTrack.toUpperCase(),
      recipientEmail: pkgRecipient.toLowerCase(),
      status: "pending_pickup",
      receivedAt: new Date().toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    setPackages(prev => [newPkg, ...prev]);
    setSuccess(`Registered DHL/Courier package. SMS & Email alert triggers sent to "${pkgRecipient}".`);
    setPkgCarrier("");
    setPkgTrack("");
    setPkgRecipient("");
  };

  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) {
      setError("Please fill out Announcement Title and Content body.");
      return;
    }
    setError("");
    setSuccess("");

    const newAnn: Announcement = {
      id: "ann-" + Date.now(),
      title: annTitle,
      content: annContent,
      category: annCategory,
      publishedAt: new Date().toISOString().split("T")[0],
      author: currentUser.name || "Front Desk Office"
    };

    setAnnouncements(prev => [newAnn, ...prev]);
    setSuccess(`Announcement "${annTitle}" successfully broadcasted across all resident workspaces!`);
    setAnnTitle("");
    setAnnContent("");
    setAnnCategory("general");
  };

  const handleCheckOutVisitor = (id: string) => {
    setVisitors(prev => prev.map(v => {
      if (v.id === id) {
        return { ...v, timeOut: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      }
      return v;
    }));
    setSuccess("Front desk visitor checked out.");
  };

  const handleMarkPackagePickedUp = (id: string) => {
    setPackages(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: "picked_up" as const,
          pickedUpAt: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return p;
    }));
    setSuccess("Package delivery completed and receipt logged.");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner Card */}
      <div className="bg-[#111e2e] text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <span className="bg-[#fca311]/20 text-[#fca311] border border-[#fca311]/30 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <Users className="w-3.5 h-3.5" />
            Front Desk Portal
          </span>
          <h1 className="text-2xl font-display font-black mt-2">Reception Office</h1>
          <p className="text-slate-300 text-xs mt-1 font-medium">
            Authorized for visitor registrations, package deliveries, tenant broadcasts, and incident listings.
          </p>
        </div>

        <div className="text-right text-xs">
          <p className="text-slate-400 font-medium">Duty Receptionist:</p>
          <p className="font-bold text-white text-sm">{currentUser.name}</p>
          <p className="text-[10px] text-amber-300 font-mono mt-0.5">{currentUser.email}</p>
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

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Office Visitors</p>
          <h3 className="text-xl font-black text-slate-800 mt-1">{visitors.filter(v => !v.timeOut).length} Checked-In</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Pending Packages</p>
          <h3 className="text-xl font-black text-[#fca311] mt-1">{packages.filter(p => p.status === "pending_pickup").length} Deliveries</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Announcements</p>
          <h3 className="text-xl font-black text-indigo-600 mt-1">{announcements.length} Published</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Office Shift</p>
          <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1.5 inline-block">ONLINE ACTIVE</span>
        </div>
      </div>

      {/* Tab select lines */}
      <div className="flex border-b border-slate-150 gap-2">
        <button
          onClick={() => setActiveTab("visitors")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "visitors" ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Office Visitor Desk
        </button>
        <button
          onClick={() => setActiveTab("packages")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "packages" ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Package Delivery Logs
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "announcements" ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Publish announcements
        </button>
      </div>

      {/* Tab Body contents */}
      {activeTab === "visitors" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Visitor form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Register Lobby Visitor</h3>
            
            <form onSubmit={handleCheckInVisitor} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Visitor Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alice Ineza"
                  value={visName}
                  onChange={(e) => setVisName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Company / Affiliation (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. RURA, WASAC, REG or Guest"
                  value={visCompany}
                  onChange={(e) => setVisCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Host Person / Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. Henry (A101)"
                    value={visHost}
                    onChange={(e) => setVisHost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Purpose of Visit</label>
                  <input
                    type="text"
                    placeholder="e.g. Social, Audit"
                    value={visPurpose}
                    onChange={(e) => setVisPurpose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <UserCheck className="w-4 h-4 text-indigo-200" />
                <span>Register Lobby Entry</span>
              </button>
            </form>
          </div>

          {/* Visitor List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-display font-semibold text-slate-900 text-sm">Lobby Entry Logbook</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    <th className="px-5 py-3">Visitor Name</th>
                    <th className="px-5 py-3">Host / Destination</th>
                    <th className="px-5 py-3">Lobby Timing</th>
                    <th className="px-5 py-3 text-right">Office Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {visitors.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{v.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{v.company} &bull; {v.purpose}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-600">{v.hostPerson}</p>
                      </td>
                      <td className="px-5 py-4 font-semibold font-mono text-[10px] text-slate-500">
                        <p className="text-emerald-600">Entered: {v.timeIn}</p>
                        {v.timeOut ? (
                          <p className="text-rose-600 mt-0.5">Departed: {v.timeOut}</p>
                        ) : (
                          <span className="text-[8px] font-extrabold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full mt-1.5 inline-block animate-pulse">LOBBY</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!v.timeOut && (
                          <button
                            onClick={() => handleCheckOutVisitor(v.id)}
                            className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Lobby Exit
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

      {activeTab === "packages" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Register package */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Log Courier Package Delivery</h3>
            
            <form onSubmit={handleRegisterPackage} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Carrier Service</label>
                <input
                  type="text"
                  placeholder="e.g. DHL, FedEx, Ups, Mobile Carrier"
                  value={pkgCarrier}
                  onChange={(e) => setPkgCarrier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Tracking / Waybill Number</label>
                <input
                  type="text"
                  placeholder="e.g. DHL-88912-RW"
                  value={pkgTrack}
                  onChange={(e) => setPkgTrack(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Recipient Tenant Email</label>
                <input
                  type="email"
                  placeholder="e.g. tenant1@gmail.com"
                  value={pkgRecipient}
                  onChange={(e) => setPkgRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Mail className="w-4 h-4 text-indigo-200" />
                <span>Log Package & Dispatch SMS</span>
              </button>
            </form>
          </div>

          {/* Package Lists */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-display font-semibold text-slate-900 text-sm">Package Deliveries Archive</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    <th className="px-5 py-3">Waybill Code / Carrier</th>
                    <th className="px-5 py-3">Resident Target</th>
                    <th className="px-5 py-3">Date Logged</th>
                    <th className="px-5 py-3 text-right">Delivery Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {packages.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <p className="font-mono font-bold text-indigo-600">{p.trackingNum}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{p.carrier}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-700">{p.recipientEmail}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-[10px] text-slate-500">
                        <p>In: {p.receivedAt}</p>
                        {p.pickedUpAt && <p className="text-emerald-600 mt-0.5">Out: {p.pickedUpAt}</p>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {p.status === "pending_pickup" ? (
                          <button
                            onClick={() => handleMarkPackagePickedUp(p.id)}
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1 ml-auto"
                          >
                            <MailOpen className="w-3.5 h-3.5" />
                            <span>Mark Picked-Up</span>
                          </button>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-400 font-extrabold rounded-full text-[9px] uppercase tracking-widest">
                            COLLECTED
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

      {activeTab === "announcements" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Announcement Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Broadcast Resident Announcement</h3>
            
            <form onSubmit={handlePublishAnnouncement} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Announcement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule for Pool Cleaning / Compound Meeting"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Announcement Category</label>
                <select
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all cursor-pointer"
                >
                  <option value="general">General Broadcast</option>
                  <option value="utility">Utility Status (Water / Power)</option>
                  <option value="social">Social Compound Events</option>
                  <option value="emergency">Emergency Advisories</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Content Body</label>
                <textarea
                  placeholder="Describe the announcements, timings, and expectations..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#111e2e] hover:bg-slate-850 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Megaphone className="w-4 h-4 text-[#fca311]" />
                <span>Publish announcement</span>
              </button>
            </form>
          </div>

          {/* Published Announcements List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-display font-bold text-slate-900 text-sm">Published Broadcast History</h3>
            
            {announcements.map(ann => (
              <div key={ann.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  ann.category === "emergency" ? "bg-rose-500" :
                  ann.category === "utility" ? "bg-amber-500" : "bg-indigo-500"
                }`} />

                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{ann.title}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Author: {ann.author} &bull; Published: {ann.publishedAt}</p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${
                    ann.category === "emergency" ? "bg-rose-50 text-rose-700" :
                    ann.category === "utility" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"
                  }`}>
                    {ann.category}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
