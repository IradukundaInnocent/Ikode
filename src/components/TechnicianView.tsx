import React, { useState, useEffect } from "react";
import { UserProfile, MaintenanceRequest, Property, Unit, ChatMessage } from "../types";
import { 
  fetchMaintenanceRequests, 
  updateMaintenanceStatus, 
  fetchProperties, 
  fetchUnits, 
  fileToBase64,
  fetchMessages,
  sendMessage
} from "../utils/api";
import { 
  Wrench, CheckCircle2, Clock, Upload, ArrowRight, MessageSquare, 
  Sparkles, Camera, Clipboard, HelpCircle, Eye, AlertTriangle,
  Send, User
} from "lucide-react";

interface TechnicianViewProps {
  currentUser: UserProfile;
}

export default function TechnicianView({ currentUser }: TechnicianViewProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedTask, setSelectedTask] = useState<MaintenanceRequest | null>(null);

  // Form states
  const [commentText, setCommentText] = useState("");
  const [newStatus, setNewStatus] = useState("progressing");
  const [progressPhoto, setProgressPhoto] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Direct Manager Chat States
  const [activeTab, setActiveTab] = useState<"tasks" | "chat">("tasks");
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [managerEmail] = useState("manager@ikode.rw");
  const [managerName] = useState("David Mugisha");

  const loadTechnicianTasks = async () => {
    setLoading(true);
    setError("");
    try {
      const [reqs, props, unts, msgs] = await Promise.all([
        fetchMaintenanceRequests(),
        fetchProperties(),
        fetchUnits(),
        fetchMessages()
      ]);
      setRequests(reqs);
      setProperties(props);
      setUnits(unts);
      setAllMessages(msgs);

      if (selectedTask) {
        const updated = reqs.find(r => r.id === selectedTask.id);
        if (updated) setSelectedTask(updated);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load expert tasks ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTechnicianTasks();
  }, [currentUser]);

  // Live Chat polling
  useEffect(() => {
    if (activeTab === "chat") {
      const poll = setInterval(() => {
        fetchMessages()
          .then(data => setAllMessages(data))
          .catch(err => console.warn("Technician background chat updater failed:", err));
      }, 5000);
      return () => clearInterval(poll);
    }
  }, [activeTab]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;
    setIsSendingMessage(true);
    try {
      const sent = await sendMessage({
        senderEmail: currentUser.email,
        senderName: currentUser.name || "Technician",
        receiverEmail: managerEmail,
        content: newMessageText.trim()
      });
      setAllMessages(prev => [...prev, sent]);
      setNewMessageText("");
    } catch (err: any) {
      setError(err.message || "Failed to transmit message.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError("Photos must be under 5MB in size.");
        return;
      }
      try {
        const b64 = await fileToBase64(file);
        setProgressPhoto(b64);
      } catch {
        setError("Error parsing image files.");
      }
    }
  };

  const handleProgressLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newStatus || !commentText) {
      setError("Please fill in status and comment details.");
      return;
    }
    setError("");
    setSuccess("");
    setIsUpdating(true);
    try {
      await updateMaintenanceStatus(selectedTask.id, {
        status: newStatus,
        comments: commentText,
        updatedBy: currentUser.email,
        photo: progressPhoto || undefined
      });
      setSuccess(`Job status updated to ${newStatus} with repair records saved!`);
      setCommentText("");
      setNewStatus("progressing");
      setProgressPhoto("");
      await loadTechnicianTasks();
    } catch (err: any) {
      setError(err.message || "Failed post repair progress log.");
    } finally {
      setIsUpdating(false);
    }
  };

  const myTasks = requests.filter(
    (item) => item.assignedTechEmail?.toLowerCase() === currentUser.email.toLowerCase()
  );

  const getPriorityTag = (arg: string) => {
    switch (arg) {
      case "high":
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 font-bold text-[10px] rounded">High Priority</span>;
      case "medium":
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 font-bold text-[10px] rounded">Medium Priority</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded">Low Priority</span>;
    }
  };

  return (
    <div className="space-y-8" id="tech-vault-panel">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="tech-header">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-slate-900">Technician Maintenance Drawer</h2>
          <p className="text-slate-500 text-sm mt-1">Review active work orders, record fix logs, and submit proof photo galleries showing resolved repairs.</p>
        </div>
        <button 
          onClick={loadTechnicianTasks}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors"
        >
          <Clock className="w-4 h-4" /> Synchronize Jobs List
        </button>
      </div>

      {/* Tab Selector Segment */}
      <div className="flex gap-2.5 pb-2 border-b border-slate-100" id="tech-workspace-tabs">
        <button
          onClick={() => { setActiveTab("tasks"); setError(""); }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
            activeTab === "tasks" 
              ? "bg-slate-900 text-white shadow-sm font-bold border-transparent" 
              : "bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 border-slate-200"
          }`}
        >
          <Clipboard className="w-3.5 h-3.5" />
          <span>Assigned Maintenance Jobs ({myTasks.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("chat"); setError(""); }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border relative ${
            activeTab === "chat" 
              ? "bg-slate-900 text-white shadow-sm font-bold border-transparent" 
              : "bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 border-slate-200"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Direct Chat with Property Manager</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-2 animate-pulse" />
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2" id="tech-success-toast">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm font-medium border border-rose-100" id="tech-error-toast">
          {error}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="tech-layout-frame">
        {/* Task lists on Left */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[600px] overflow-y-auto" id="tech-jobs-sidebar">
          <div className="p-5 border-b border-slate-150">
            <h3 className="font-display font-semibold text-slate-800 text-sm">Assigned Tasks List ({myTasks.length})</h3>
            <p className="text-slate-400 text-[11px]">Tasks matching your technician profile.</p>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading task boards...</div>
            ) : myTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm italic">
                No active maintenance calls currently assigned to your email list.
              </div>
            ) : (
              myTasks.map((t) => {
                const prop = properties.find(p => p.id === t.propertyId);
                const unit = units.find(u => u.id === t.unitId);
                return (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTask(t); setError(""); setSuccess(""); }}
                    className={`w-full p-5 text-left transition-all border-l-4 hover:bg-slate-50 flex items-start justify-between cursor-pointer ${selectedTask?.id === t.id ? "border-indigo-600 bg-indigo-50/20" : "border-transparent"}`}
                  >
                    <div className="space-y-1.5 flex-1 pr-2 text-left">
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">{t.category}</span>
                        {getPriorityTag(t.priority)}
                      </div>
                      <h4 className="font-semibold text-slate-900 text-sm">{t.title}</h4>
                      <p className="text-slate-400 text-[11px] font-semibold">{prop?.name} &bull; Unit {unit?.number}</p>
                    </div>

                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold capitalize text-[10px] rounded-full flex-shrink-0">
                      {t.status}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Action Detail Panels on Right */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[450px]" id="tech-job-details">
          {selectedTask ? (
            <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col text-left" id="job-active-ledger">
              <div className="border-b border-slate-100 pb-5 space-y-2">
                <span className="text-xs font-semibold text-slate-400 font-mono tracking-wide">TASK ID: {selectedTask.id}</span>
                <h3 className="text-xl font-display font-bold text-slate-900">{selectedTask.title}</h3>
                <p className="text-slate-400 text-xs">
                  Development: <span className="font-bold text-slate-700">{properties.find(p => p.id === selectedTask.propertyId)?.name}</span> &bull; 
                  Unit Room: <span className="font-bold text-slate-700">{units.find(u => u.id === selectedTask.unitId)?.number}</span>
                </p>
                <p className="text-slate-450 text-[11px]">Tenant contact: <span className="font-semibold font-mono text-slate-700">{selectedTask.tenantEmail}</span></p>
              </div>

              {/* Description */}
              <div className="space-y-1.5 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Tenant Reported Problem Details</span>
                <p className="text-xs text-slate-600 leading-relaxed italic">"{selectedTask.description}"</p>
              </div>

              {/* Photos before after logs */}
              {selectedTask.photos && selectedTask.photos.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500">Task Document Photos ({selectedTask.photos.length})</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedTask.photos.map((p, index) => (
                      <div key={index} className="aspect-video rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                        <img src={p} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Repair updates timeline log */}
              <div className="space-y-3 pt-3 border-t border-slate-100 block">
                <h4 className="text-xs font-bold text-slate-600 uppercase">Interactive Timeline Log</h4>
                <div className="space-y-4 pl-3 border-l-2 border-slate-100 relative">
                  {selectedTask.logs.map((log, index) => (
                    <div key={log.id || index} className="relative pl-5 space-y-1 text-xs">
                      <span className="absolute left-[-20px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <div className="flex justify-between items-center pr-1 text-[10px] font-semibold text-slate-400">
                        <span className="text-slate-800 text-[11px] font-bold">{log.updatedBy} ({log.status})</span>
                        <span>{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 italic">"{log.comments}"</p>
                      {log.photo && (
                        <div className="mt-1 w-24 aspect-video rounded border overflow-hidden">
                          <img src={log.photo} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form submit log repairs */}
              <div className="p-5 bg-slate-50 rounded-xl mt-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1"><Clipboard className="w-4.5 h-4.5 text-indigo-500" /> Record Repair action log</h4>
                
                <form onSubmit={handleProgressLogSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Set Status</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none cursor-pointer"
                        required
                      >
                        <option value="progressing">In Progress / Active Treatment</option>
                        <option value="completed">Completed / Work Done</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Work Proof Photo (After / Progress)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Log Comments</label>
                    <input
                      type="text"
                      required
                      placeholder="Comment e.g. Patched ceiling panels, checked moisture level, clean outcome."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Post Repair & Update Job State
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center p-12 text-center text-slate-400 space-y-2">
              <Clipboard className="w-12 h-12 text-slate-200" />
              <h4 className="font-semibold text-slate-700 text-sm">No Task Chosen</h4>
              <p className="text-xs max-w-sm">Tap on any assigned task card from the left-side panel to record action logs, update completion status, or publish resolved before/after proof photos.</p>
            </div>
          )}
        </div>
      </div>
    )}

      {activeTab === "chat" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[520px] text-left animate-fade-in" id="tech-direct-chat">
          {/* Chat head */}
          <div className="bg-slate-900 text-white p-4.5 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl leading-none">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-display font-medium text-sm tracking-tight text-white leading-none">{managerName}</h4>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Property Manager &bull; Online Communication
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono font-extrabold bg-slate-800 text-teal-300 px-2.5 py-1 rounded tracking-wider uppercase border border-slate-700">
              IKODE CO-TECH BRIDGE
            </span>
          </div>

          {/* Messaging scroll timeline */}
          <div className="flex-1 overflow-y-auto p-4.5 space-y-4 bg-slate-50">
            {allMessages.filter(msg => 
              (msg.senderEmail.toLowerCase() === currentUser.email.toLowerCase() && msg.receiverEmail.toLowerCase() === managerEmail.toLowerCase()) ||
              (msg.senderEmail.toLowerCase() === managerEmail.toLowerCase() && msg.receiverEmail.toLowerCase() === currentUser.email.toLowerCase())
            ).length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs italic space-y-2 max-w-xs mx-auto">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                <p>Start a secure dialogue with your Property Manager, {managerName}. Coordinate keys handovers, request custom repair material reimbursements, or share status reports here.</p>
              </div>
            ) : (
              allMessages.filter(msg => 
                (msg.senderEmail.toLowerCase() === currentUser.email.toLowerCase() && msg.receiverEmail.toLowerCase() === managerEmail.toLowerCase()) ||
                (msg.senderEmail.toLowerCase() === managerEmail.toLowerCase() && msg.receiverEmail.toLowerCase() === currentUser.email.toLowerCase())
              ).map(msg => {
                const isMe = msg.senderEmail.toLowerCase() === currentUser.email.toLowerCase();
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl p-4 space-y-1.5 shadow-xs text-left ${
                      isMe 
                        ? 'bg-slate-900 text-white rounded-tr-none' 
                        : 'bg-indigo-50/50 text-indigo-950 rounded-tl-none border border-indigo-100'
                    }`}>
                      <p className={`text-[10.5px] font-bold tracking-wide uppercase font-sans ${
                        isMe ? "text-indigo-300" : "text-indigo-700"
                      }`}>
                        {isMe ? "You" : msg.senderName || "Manager"}
                      </p>
                      <p className="text-sm leading-relaxed break-words font-medium">{msg.content}</p>
                      <span className={`text-[9.5px] block font-mono mt-1 pt-1 border-t ${
                        isMe ? "text-slate-400 border-slate-800" : "text-slate-500 border-indigo-150"
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Secure chat input */}
          <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              required
              placeholder={`Coordinate key logs or progress details with David...`}
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-none font-medium text-slate-900 transition-colors"
            />
            <button
              type="submit"
              disabled={isSendingMessage}
              className="px-5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
