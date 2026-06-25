import React, { useState, useEffect } from "react";
import { MaintenanceRequest, UserProfile, Property, Unit } from "../types";
import { 
  fetchMaintenanceRequests, 
  createMaintenanceRequest, 
  assignTechnician, 
  updateMaintenanceStatus,
  fetchUsers,
  fetchProperties,
  fetchUnits,
  fileToBase64 
} from "../utils/api";
import { 
  Wrench, AlertTriangle, Clock, CheckCircle2, User, UserCheck, 
  Mail, Calendar, FileText, Upload, Plus, MessageSquare, 
  Image as ImageIcon, Eye, Star, ChevronRight
} from "lucide-react";

interface MaintenanceHubProps {
  currentUser: UserProfile;
}

export default function MaintenanceHub({ currentUser }: MaintenanceHubProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // UI state
  const [selectedReq, setSelectedReq] = useState<MaintenanceRequest | null>(null);
  const [isFiling, setIsFiling] = useState(false);

  // File request fields (Tenant perspective)
  const [fileTitle, setFileTitle] = useState("");
  const [fileDesc, setFileDesc] = useState("");
  const [fileCategory, setFileCategory] = useState("plumbing");
  const [filePriority, setFilePriority] = useState<"low" | "medium" | "high">("medium");
  const [selectedPropId, setSelectedPropId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [filePhotos, setFilePhotos] = useState<string[]>([]);
  const [imageCount, setImageCount] = useState(0);

  // Log update fields
  const [logComment, setLogComment] = useState("");
  const [logStatus, setLogStatus] = useState<any>("");
  const [logPhoto, setLogPhoto] = useState<string>("");

  // Assign Tech fields
  const [assignTechEmail, setAssignTechEmail] = useState("");

  const refreshAllData = async () => {
    setLoading(true);
    setError("");
    try {
      const [reqsData, usersData, propsData, unitsData] = await Promise.all([
        fetchMaintenanceRequests(),
        fetchUsers(),
        fetchProperties(),
        fetchUnits()
      ]);
      setRequests(reqsData);
      setTechnicians(usersData.filter((u: any) => u.role === "technician"));
      setProperties(propsData);
      setUnits(unitsData);

      // Auto-select first property/unit for tenant
      if (propsData.length > 0) {
        setSelectedPropId(propsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Could not synchronize maintenance reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, [currentUser]);

  // Handle auto unit selection when property changes
  useEffect(() => {
    if (selectedPropId) {
      const propUnits = units.filter(u => u.propertyId === selectedPropId);
      if (propUnits.length > 0) {
        setSelectedUnitId(propUnits[0].id);
      } else {
        setSelectedUnitId("");
      }
    }
  }, [selectedPropId, units]);

  // Update selected request in UI if list changes
  useEffect(() => {
    if (selectedReq) {
      const updated = requests.find(r => r.id === selectedReq.id);
      if (updated) setSelectedReq(updated);
    }
  }, [requests]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isForLog: boolean = false) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const newImages: string[] = [];

      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          setError("Photos must be under 5MB in size.");
          continue;
        }
        try {
          const base64 = await fileToBase64(file);
          newImages.push(base64);
        } catch (err) {
          setError("Failed to convert image files.");
        }
      }

      if (isForLog) {
        if (newImages.length > 0) setLogPhoto(newImages[0]); // Log accepts 1 progress photo
      } else {
        // Ticket accepts up to 8 photos
        const combined = [...filePhotos, ...newImages].slice(0, 8);
        setFilePhotos(combined);
        setImageCount(combined.length);
      }
    }
  };

  const handleFileTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileTitle || !selectedPropId || !selectedUnitId || !fileDesc) {
      setError("Please fill in property, unit, summary and description.");
      return;
    }
    setError("");
    setSuccess("");
    try {
      const ticket = await createMaintenanceRequest({
        unitId: selectedUnitId,
        propertyId: selectedPropId,
        title: fileTitle,
        description: fileDesc,
        category: fileCategory,
        priority: filePriority,
        tenantEmail: currentUser.email,
        photos: filePhotos
      });
      setSuccess("Your maintenance request was registered masterfully.");
      setIsFiling(false);
      setFileTitle("");
      setFileDesc("");
      setFilePhotos([]);
      setImageCount(0);
      await refreshAllData();
      setSelectedReq(ticket);
    } catch (err: any) {
      setError(err.message || "Failed to submit maintenance request.");
    }
  };

  const handleAssignTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !assignTechEmail) return;
    setError("");
    setSuccess("");
    try {
      const updated = await assignTechnician(selectedReq.id, assignTechEmail, currentUser.email);
      setSuccess("Job assigned correctly, repair logs updated.");
      setAssignTechEmail("");
      await refreshAllData();
    } catch (err: any) {
      setError(err.message || "Failed to assign technician.");
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !logStatus || !logComment) {
      setError("Please enter a progress status and logs description.");
      return;
    }
    setError("");
    setSuccess("");
    try {
      await updateMaintenanceStatus(selectedReq.id, {
        status: logStatus,
        comments: logComment,
        updatedBy: currentUser.email,
        photo: logPhoto || undefined
      });
      setSuccess(`Updated ticket to ${logStatus} successfully.`);
      setLogComment("");
      setLogStatus("");
      setLogPhoto("");
      await refreshAllData();
    } catch (err: any) {
      setError(err.message || "Failed to update maintenance event.");
    }
  };

  // filter requests based on user role
  const getFilteredRequests = () => {
    if (currentUser.role === "tenant") {
      return requests.filter(r => r.tenantEmail.toLowerCase() === currentUser.email.toLowerCase());
    } else if (currentUser.role === "technician") {
      return requests.filter(r => r.assignedTechEmail?.toLowerCase() === currentUser.email.toLowerCase());
    }
    return requests; // Landlord or Admin sees everything
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "high":
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 font-semibold text-[11px] rounded-lg">High</span>;
      case "medium":
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 font-semibold text-[11px] rounded-lg">Medium</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-semibold text-[11px] rounded-lg">Low</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "completed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-medium rounded-full"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>;
      case "progressing":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-medium rounded-full"><Clock className="w-3.5 h-3.5 animate-pulse" /> In Progress</span>;
      case "assigned":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-medium rounded-full"><UserCheck className="w-3.5 h-3.5" /> Assigned</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium rounded-full"><AlertTriangle className="w-3.5 h-3.5" /> Unassigned</span>;
    }
  };

  const filtered = getFilteredRequests();

  return (
    <div className="space-y-8" id="maint-hub-container">
      {/* Header card with action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="maint-hub-header">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-slate-900" id="maint-title">Maintenance & Repairs Workflow</h2>
          <p className="text-slate-500 text-sm mt-1" id="maint-desc">End-to-end task flows tracking structural, plumbing, electrical, and facility repair cycles.</p>
        </div>
        {currentUser.role === "tenant" && !isFiling && (
          <button 
            onClick={() => { setIsFiling(true); setError(""); setSuccess(""); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
            id="maint-file-btn"
          >
            <Plus className="w-4 h-4" />
            File Request
          </button>
        )}
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2" id="maint-success-alert">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm font-medium border border-rose-100" id="maint-error-alert">
          {error}
        </div>
      )}

      {/* Filing request view (Tenant form) */}
      {isFiling && (
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm max-w-2xl mx-auto space-y-6" id="maint-filing-card">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-lg font-display font-semibold text-slate-900">New Maintenance Ticket</h3>
            <button 
              onClick={() => setIsFiling(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-medium"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleFileTicket} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5Reg">
                <label className="text-xs font-semibold text-slate-600 block">Select Building</label>
                <select
                  value={selectedPropId}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none cursor-pointer"
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5Reg">
                <label className="text-xs font-semibold text-slate-600 block">Select Unit</label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none cursor-pointer"
                  required
                >
                  {units.filter(u => u.propertyId === selectedPropId).map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.number} ({unit.type})</option>
                  ))}
                </select>
                {units.filter(u => u.propertyId === selectedPropId).length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No units vacant or assigned inside this property group.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5Reg">
                <label className="text-xs font-semibold text-slate-600 block">Problem Category</label>
                <select
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none cursor-pointer"
                >
                  <option value="plumbing">Plumbing (Leak, tap, bath)</option>
                  <option value="electrical">Electrical (Sockets, wiring, fuse)</option>
                  <option value="appliance">Appliance (Oven, washing, fridge)</option>
                  <option value="structural">Structural (Wall, ceiling, door)</option>
                  <option value="other">Other Facility Concern</option>
                </select>
              </div>

              <div className="space-y-1.5Reg">
                <label className="text-xs font-semibold text-slate-600 block">Priority Urgency</label>
                <select
                  value={filePriority}
                  onChange={(e) => setFilePriority(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none cursor-pointer"
                >
                  <option value="low">Low (Minor inconvenience)</option>
                  <option value="medium">Medium (Standard request)</option>
                  <option value="high">High (Flooding, total outage, lock-out)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Short Summary Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Bathroom sink pipe burst"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Detailed Description</label>
              <textarea
                required
                rows={4}
                placeholder="Tell us about the issue in detail, how it started, and access directions..."
                value={fileDesc}
                onChange={(e) => setFileDesc(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm outline-none transition-all resize-none"
              ></textarea>
            </div>

            {/* Photos upload area (Tenant ticket gallery) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 block">Proof Photos (Up to 8 images, Max 5MB each)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {filePhotos.map((p, index) => (
                  <div key={index} className="relative aspect-video rounded-xl bg-slate-100 overflow-hidden group border border-slate-200">
                    <img src={p} alt={`Uploaded Proof ${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...filePhotos];
                        next.splice(index, 1);
                        setFilePhotos(next);
                        setImageCount(next.length);
                      }}
                      className="absolute top-1 right-1 px-1.5 py-0.5 bg-rose-600 text-white text-[10px] rounded hover:bg-rose-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}

                {imageCount < 8 && (
                  <label className="flex h-20 sm:h-auto aspect-video cursor-pointer justify-center items-center rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 transition-colors bg-slate-50 hover:bg-indigo-50/20">
                    <div className="text-center text-slate-500">
                      <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                      <span className="text-xs font-medium">Add Photo</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, false)}
                    />
                  </label>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Wrench className="w-4 h-4" />
              File Urgent Request
            </button>
          </form>
        </div>
      )}

      {/* Main Ticket Dashboard Split */}
      {!isFiling && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="maint-list-layout">
          {/* List Section */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col max-h-[700px] overflow-hidden" id="tasks-side-list">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-display font-semibold text-slate-950 text-base">Active Tickets List ({filtered.length})</h3>
              <p className="text-xs text-slate-400 mt-0.5">Filter of issues involving your active status.</p>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
              {loading ? (
                <div className="p-10 text-center text-slate-400">Loading system repairs...</div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">
                  {currentUser.role === "tenant" ? "You have not filed any maintenance cases." : "No maintenance concerns currently recorded."}
                </div>
              ) : (
                filtered.map((item) => {
                  const prop = properties.find(p => p.id === item.propertyId);
                  const unit = units.find(u => u.id === item.unitId);
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setSelectedReq(item); setError(""); setSuccess(""); }}
                      className={`w-full p-5 text-left transition-all flex justify-between items-start hover:bg-slate-50 cursor-pointer border-l-4 ${selectedReq?.id === item.id ? "bg-indigo-50/45 border-indigo-600" : "border-transparent"}`}
                    >
                      <div className="space-y-1.5 flex-1 pr-3">
                        <div className="flex gap-2 items-center">
                          <span className="text-[12px] font-mono text-slate-400 capitalize">{item.category}</span>
                          {getPriorityBadge(item.priority)}
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">{item.title}</h4>
                        <p className="text-slate-400 text-xs font-medium truncate">
                          {prop?.name} - Unit {unit?.number}
                        </p>
                        <p className="text-slate-400 text-[11px] font-semibold">
                          Tenant: {item.tenantEmail}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                        {getStatusBadge(item.status)}
                        <ChevronRight className="w-4 h-4 text-slate-300 mt-2" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[500px]" id="tasks-detail-panel">
            {selectedReq ? (
              <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col" id="ticket-detail-view">
                {/* Back Navigation trigger */}
                <div className="pb-2">
                  <button
                    onClick={() => setSelectedReq(null)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all focus:outline-none cursor-pointer flex items-center gap-1 w-fit"
                    title="Return to list of all tickets"
                  >
                    &larr; Back to Tickets List
                  </button>
                </div>
                {/* Header detail */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 tracking-wider capitalize font-mono inline-block">Case ID: {selectedReq.id}</span>
                    <h3 className="text-xl font-display font-semibold text-slate-900 leading-tight">{selectedReq.title}</h3>
                    <p className="text-slate-400 text-xs">
                      Property: <span className="font-semibold text-slate-700">{properties.find(p => p.id === selectedReq.propertyId)?.name}</span> &bull; 
                      Unit: <span className="font-semibold text-slate-700">{units.find(u => u.id === selectedReq.unitId)?.number}</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    {getStatusBadge(selectedReq.status)}
                    <span className="text-xs text-slate-400 font-mono">Priority: {getPriorityBadge(selectedReq.priority)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50/70 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Reporter / Tenant</span>
                    <p className="text-xs font-semibold text-slate-800">{selectedReq.tenantEmail}</p>
                  </div>
                  <div className="bg-slate-50/70 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Assigned Expert Technician</span>
                    <p className="text-xs font-semibold text-slate-800">
                      {selectedReq.assignedTechEmail ? (
                        <span className="text-slate-800">{selectedReq.assignedTechEmail}</span>
                      ) : (
                        <span className="text-amber-600 font-medium italic">Pending Assignment</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-400" /> Problem Overview</span>
                  <div className="p-4 bg-slate-50/40 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed">
                    {selectedReq.description}
                  </div>
                </div>

                {/* Photo Gallery for maintenance */}
                {selectedReq.photos && selectedReq.photos.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-slate-400" /> Maintenance Gallery ({selectedReq.photos.length})</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {selectedReq.photos.map((p, idx) => (
                        <a key={idx} href={p} target="_blank" rel="noreferrer" referrerPolicy="no-referrer" className="relative aspect-video rounded-xl bg-slate-100 overflow-hidden group border border-slate-200">
                          <img src={p} alt={`Maintenance Image ${idx}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-5 h-5 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assign Technician Form (Landlord/Admin/Property Manager sees if pending) */}
                {(currentUser.role === "landlord" || currentUser.role === "admin" || currentUser.role === "property_manager") && (
                  <div className="p-5 bg-indigo-50/30 rounded-xl border border-indigo-100/60 mt-4 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-900 font-medium">
                      <User className="w-5 h-5" />
                      <span>{selectedReq.assignedTechEmail ? "Change Assigned Technician" : "Assign Technician Expert"}</span>
                    </div>

                    <form onSubmit={handleAssignTech} className="flex gap-2">
                      <select
                        value={assignTechEmail}
                        onChange={(e) => setAssignTechEmail(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none cursor-pointer"
                        required
                      >
                        <option value="">Select available technician...</option>
                        {technicians.map(t => (
                          <option key={t.id} value={t.email}>{t.name} ({t.email})</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                      >
                        Assign Job
                      </button>
                    </form>
                  </div>
                )}

                {/* Job Logs & Status update timeline */}
                <div className="space-y-4 pt-4 border-t border-slate-100" id="maint-logs-timeline">
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><MessageSquare className="w-4.5 h-4.5 text-slate-400" /> Activity Repair Log Timeline</h4>
                  <div className="space-y-4 pl-3 border-l-2 border-slate-100 relative">
                    {selectedReq.logs.map((log, idx) => (
                      <div key={log.id || idx} className="relative pl-6 space-y-1.5">
                        <span className="absolute left-[-21px] top-1.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs">
                          <span className="font-semibold text-slate-800">{log.updatedBy} &bull; <span className="capitalize text-indigo-600 font-medium">{log.status}</span></span>
                          <span className="text-slate-400 text-[10px] font-mono">{new Date(log.date).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-600 text-xs italic">{log.comments}</p>
                        {log.photo && (
                          <div className="mt-2 text-left">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Attached Progress Photo:</span>
                            <div className="mt-1 w-32 aspect-video rounded-lg overflow-hidden border border-slate-200">
                              <img src={log.photo} className="w-full h-full object-cover" alt="Progress Photo" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add state log update (Tenant, Landlord, Technician can update) */}
                <div className="p-5 bg-slate-50 rounded-xl mt-4 space-y-4" id="log-posting-section">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs uppercase tracking-wider">
                    <Star className="w-4 h-4 text-slate-400" /> Write Progress Update
                  </div>

                  <form onSubmit={handleStatusUpdate} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Upgrade Ticket Status</label>
                        <select
                          value={logStatus}
                          onChange={(e) => setLogStatus(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none cursor-pointer"
                          required
                        >
                          <option value="">Choose new status...</option>
                          <option value="pending">Pending Review</option>
                          {selectedReq.assignedTechEmail && <option value="progressing">In Progress / Traveling</option>}
                          <option value="completed">Completed / Solved</option>
                        </select>
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Attach Progress Photo</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, true)}
                          className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Status & Log Details Description</label>
                      <input
                        type="text"
                        required
                        placeholder="Detail comments (e.g., swapped cartridge, verified copper pipes sealed perfectly)."
                        value={logComment}
                        onChange={(e) => setLogComment(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Post Progress Entry
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center p-12 text-center text-slate-400 space-y-2">
                <Wrench className="w-12 h-12 text-slate-200" />
                <h4 className="font-semibold text-slate-700 text-sm">No Task Ticket Selected</h4>
                <p className="text-xs max-w-sm">Tap on any active repair ticket on the left menu rail to analyze timelines, update statuses, or assign specialist engineers.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
