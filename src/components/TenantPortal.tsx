import React, { useState, useEffect, useRef } from "react";
import { UserProfile, Lease, Property, Unit, MaintenanceRequest, Payment, PropertyDocument, ChatMessage } from "../types";
import { 
  fetchLeases, fetchProperties, fetchUnits, fetchMaintenanceRequests, 
  fetchPayments, createPayment, fetchDocuments, uploadDocument, 
  fetchMessages, sendMessage, markMessagesAsRead, createMaintenanceRequest, fileToBase64,
  fetchUsers, analyzeDocumentWithAI, saveDocumentNotes
} from "../utils/api";
import { 
  CreditCard, Calendar, ShoppingBag, ShieldCheck, Mail, CheckCircle2, 
  HelpCircle, Sparkles, RefreshCw, AlertTriangle, ArrowUpRight, Receipt, X,
  Globe, Printer, Download, FileText, MessageSquare, Send, Wrench, FilePlus, 
  Clock, Check, Eye, User, FileUp, ShieldAlert, Key, ClipboardList, Building, Plus
} from "lucide-react";
import { formatPrice, getSavedCurrency, saveCurrency, CurrencyCode } from "../utils/currency";
import CurrencyConverter from "./CurrencyConverter";

interface TenantPortalProps {
  currentUser: UserProfile;
  onNavigateToMaintenance?: () => void;
  activeTab?: "overview" | "payments" | "maintenance" | "documents" | "chat";
  onTabChange?: (tab: "overview" | "payments" | "maintenance" | "documents" | "chat") => void;
}

export default function TenantPortal({ currentUser, onNavigateToMaintenance, activeTab: propsActiveTab, onTabChange }: TenantPortalProps) {
  // Navigation tabs
  const [internalActiveTab, setInternalActiveTab] = useState<"overview" | "payments" | "maintenance" | "documents" | "chat">("overview");
  const activeTab = propsActiveTab !== undefined ? propsActiveTab : internalActiveTab;
  const setActiveTab = (tab: "overview" | "payments" | "maintenance" | "documents" | "chat") => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  // Domain states
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // UI state management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>(getSavedCurrency());
  
  // Modals / Overlays
  const [activeLeaseCertificate, setActiveLeaseCertificate] = useState<Lease | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Forms - Rent Payment
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDescription, setPaymentDescription] = useState("Rent Payment");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'offline'>('momo');
  const [offlineNotes, setOfflineNotes] = useState("");

  // Forms - Maintenance Creation
  const [showNewMaintModal, setShowNewMaintModal] = useState(false);
  const [newMaintTitle, setNewMaintTitle] = useState("");
  const [newMaintCategory, setNewMaintCategory] = useState("plumbing");
  const [newMaintPriority, setNewMaintPriority] = useState<"low" | "medium" | "high">("medium");
  const [newMaintDesc, setNewMaintDesc] = useState("");
  const [newMaintPhoto, setNewMaintPhoto] = useState<string>("");
  const [isFilingMaint, setIsFilingMaint] = useState(false);

  // Forms - Document Upload
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocCategory, setNewDocCategory] = useState<"identification" | "receipt" | "other">("identification");
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [newDocBase64, setNewDocBase64] = useState("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Magic AI Notes & Custom Notes
  const [selectedDocForNotes, setSelectedDocForNotes] = useState<PropertyDocument | null>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [tempUserNotes, setTempUserNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Forms - Direct Chat
  const [newMessageText, setNewMessageText] = useState("");
  const [chatReceiver, setChatReceiver] = useState("manager@ikode.rw"); // fallbacks to preseeded manager
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [managerName, setManagerName] = useState("David Mugisha");
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatFilter, setChatFilter] = useState<"all" | "read" | "unread">("all");
  
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Synchronize currency preferences across windows
  useEffect(() => {
    const handleCurrencySync = () => {
      setCurrency(getSavedCurrency());
    };
    window.addEventListener("ikode_currency_changed", handleCurrencySync);
    return () => {
      window.removeEventListener("ikode_currency_changed", handleCurrencySync);
    };
  }, []);

  // Fetch or reload entire tenant data scope
  const loadTenantDetails = async (showSilently = false) => {
    if (!showSilently) setLoading(true);
    setError("");
    try {
      const [leasesData, propsData, unitsData, maintData, paymentsData, docsData] = await Promise.all([
        fetchLeases(),
        fetchProperties(),
        fetchUnits(),
        fetchMaintenanceRequests(),
        fetchPayments(currentUser.email),
        fetchDocuments({ email: currentUser.email })
      ]);

      // Filter active tenant's assets
      const activeLeases = leasesData.filter(l => l.tenantEmail.toLowerCase() === currentUser.email.toLowerCase());
      setLeases(activeLeases);
      setProperties(propsData);
      setUnits(unitsData);

      const activeMaint = maintData.filter(m => m.tenantEmail.toLowerCase() === currentUser.email.toLowerCase());
      setMaintenance(activeMaint);

      setPayments(paymentsData);
      setDocuments(docsData);

      if (activeLeases.length > 0) {
        setPaymentAmount(activeLeases[0].rentAmount);
      }

      // Fetch dynamic Property Manager details instead of landlord
      let actualReceiver = "manager@ikode.rw";
      let actualManagerName = "David Mugisha";
      try {
        const usersList = await fetchUsers();
        const manager = usersList.find(u => u.role === "property_manager");
        if (manager) {
          actualReceiver = manager.email;
          actualManagerName = manager.name || "David Mugisha";
        }
      } catch (uErr) {
        console.warn("Could not find dynamic property manager:", uErr);
      }
      setChatReceiver(actualReceiver);
      setManagerName(actualManagerName);

      // Fetch Chat Messages with property manager
      const chatData = await fetchMessages(currentUser.email, actualReceiver);
      setMessages(chatData);

    } catch (err: any) {
      setError(err.message || "Failed downloading tenant workspace details.");
    } finally {
      if (!showSilently) setLoading(false);
    }
  };

  useEffect(() => {
    loadTenantDetails();
  }, [currentUser?.email]);

  // Handle continuous background message checks to update unread notifications
  useEffect(() => {
    let isActive = true;
    const fetchAndCheck = async () => {
      try {
        if (!currentUser?.email || !chatReceiver) return;
        const data = await fetchMessages(currentUser.email, chatReceiver);
        if (!isActive) return;

        setMessages(prev => {
          if (activeTab !== "chat" && prev.length > 0) {
            const existingIds = new Set(prev.map(m => m.id));
            const newFromManager = data.filter(
              m => m.senderEmail.toLowerCase() === chatReceiver.toLowerCase() && !existingIds.has(m.id)
            );
            if (newFromManager.length > 0) {
              setUnreadCount(u => u + newFromManager.length);
            }
          }
          return data;
        });
      } catch (err) {
        console.warn("Silent chat check failed:", err);
      }
    };

    fetchAndCheck();

    const interval = setInterval(fetchAndCheck, 5000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [currentUser?.email, chatReceiver, activeTab]);

  // Reset unread count and mark database messages as read when clicking on chat tab
  useEffect(() => {
    if (activeTab === "chat" && currentUser?.email && chatReceiver) {
      setUnreadCount(0);
      markMessagesAsRead(chatReceiver, currentUser.email)
        .catch(err => console.warn("Failed to mark tenant messages as read:", err));
    }
  }, [activeTab, chatReceiver, currentUser?.email]);

  // Scroll to bottom of chat when new messages land
  useEffect(() => {
    if (activeTab === "chat" && messages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, activeTab]);

  const activeLease = leases.find(l => l.status === "active" || l.status === "defaulted");
  const linkedProperty = activeLease ? properties.find(p => p.id === activeLease.propertyId) : null;
  const linkedUnit = activeLease ? units.find(u => u.id === activeLease.unitId) : null;

  // Simulate or execute mobile money checkout
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || paymentAmount <= 0) {
      setError("Please insert a valid payment amount.");
      return;
    }
    setIsPaying(true);
    setError("");
    try {
      const isOfflineStatus = paymentMethod === 'offline';
      
      const p = await createPayment({
        leaseId: activeLease?.id || "lease-custom",
        tenantEmail: currentUser.email,
        amount: Number(paymentAmount),
        description: isOfflineStatus 
          ? `[Offline Payment] Unit ${linkedUnit?.number || "General"} (${offlineNotes || "Cash/Bank Transfer"})`
          : `${activeLease?.leaseType === "service_fee" ? "Service Fee Remittance" : "Rent Pool Settlement"} - Unit ${linkedUnit?.number || "General"} via MoMo`,
        status: isOfflineStatus ? "pending_verification" : "successful",
        reference: isOfflineStatus ? `OFFLINE-${Math.floor(Date.now() / 1000)}` : undefined
      });
      
      if (isOfflineStatus) {
        setSuccess("Your offline payment confirmation request has been successfully filed with the manager!");
      } else {
        setSuccess("Remittance processed successfully over MTN MoMo secure pipeline!");
      }
      
      setShowPaymentModal(false);
      setOfflineNotes("");
      
      // Reload details to capture updated ledger entries
      const updatedPayments = await fetchPayments(currentUser.email);
      setPayments(updatedPayments);
    } catch (err: any) {
      setError(err.message || "Remittance rejected.");
    } finally {
      setIsPaying(false);
    }
  };

  // Submit new maintenance ticket
  const handleFilingMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaintTitle.trim() || !newMaintDesc.trim()) {
      setError("Please fill in both the issue title and detailed description.");
      return;
    }
    if (!linkedUnit || !linkedProperty) {
      setError("You must have an active registered lease to file a maintenance issue.");
      return;
    }
    setIsFilingMaint(true);
    setError("");
    try {
      await createMaintenanceRequest({
        unitId: linkedUnit.id,
        propertyId: linkedProperty.id,
        title: newMaintTitle,
        description: newMaintDesc,
        category: newMaintCategory,
        priority: newMaintPriority,
        tenantEmail: currentUser.email,
        photos: newMaintPhoto ? [newMaintPhoto] : []
      });
      setSuccess("Your concern ticket was successfully logged with the central administrator.");
      setShowNewMaintModal(false);
      // Reset form
      setNewMaintTitle("");
      setNewMaintDesc("");
      setNewMaintPhoto("");
      // Reload list
      const updatedMaint = await fetchMaintenanceRequests();
      setMaintenance(updatedMaint.filter(m => m.tenantEmail.toLowerCase() === currentUser.email.toLowerCase()));
    } catch (err: any) {
      setError(err.message || "Filing failed.");
    } finally {
      setIsFilingMaint(false);
    }
  };

  // Upload custom identification document or local transaction receipts
  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocFile) {
      setError("Please input a descriptive title and select a physical local file.");
      return;
    }
    setIsUploadingDoc(true);
    setError("");
    try {
      // Calculate realistic display size
      const sizeKB = (newDocFile.size / 1024).toFixed(1);
      const displaySize = Number(sizeKB) > 1024 ? (Number(sizeKB) / 1024).toFixed(1) + " MB" : sizeKB + " KB";
      
      await uploadDocument({
        title: newDocTitle,
        fileName: newDocFile.name,
        fileSize: displaySize,
        category: newDocCategory,
        propertyId: linkedProperty?.id,
        unitId: linkedUnit?.id,
        tenantEmail: currentUser.email,
        fileData: newDocBase64 || "DEMO_ATTACHMENT_CONTENT",
        uploadedBy: currentUser.email
      });

      setSuccess("Document uploaded successfully to the property archives.");
      setShowDocUploadModal(false);
      setNewDocTitle("");
      setNewDocFile(null);
      setNewDocBase64("");

      // Reload
      const updatedDocs = await fetchDocuments({ email: currentUser.email });
      setDocuments(updatedDocs);
    } catch (err: any) {
      setError(err.message || "Could not complete upload.");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleAIAnalyze = async (docId: string) => {
    setIsAnalyzingDoc(true);
    setError("");
    try {
      const updatedDoc = await analyzeDocumentWithAI(docId);
      setSelectedDocForNotes(updatedDoc);
      setDocuments(prev => prev.map(d => d.id === docId ? updatedDoc : d));
      setSuccess("Gemini AI successfully processed document attachments and generated structured summaries!");
    } catch (err: any) {
      setError(err.message || "Failed to analyze document with Gemini.");
    } finally {
      setIsAnalyzingDoc(false);
    }
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForNotes) return;
    setIsSavingNotes(true);
    setError("");
    try {
      const updatedDoc = await saveDocumentNotes(selectedDocForNotes.id, tempUserNotes);
      setSelectedDocForNotes(updatedDoc);
      setDocuments(prev => prev.map(d => d.id === selectedDocForNotes.id ? updatedDoc : d));
      setSuccess("Your custom personal notes have been saved securely.");
    } catch (err: any) {
      setError(err.message || "Could not save custom notes.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Send messaging text
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;
    setIsSendingMessage(true);
    try {
      const sent = await sendMessage({
        senderEmail: currentUser.email,
        senderName: currentUser.name,
        receiverEmail: chatReceiver,
        content: newMessageText.trim()
      });
      setMessages(prev => [...prev, sent]);
      setNewMessageText("");
    } catch (err: any) {
      setError(err.message || "Message transmission failed.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Convert uploaded attachments
  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewDocFile(file);
      try {
        const b64 = await fileToBase64(file);
        setNewDocBase64(b64);
      } catch (err) {
        console.error("Base64 conversion failed", err);
      }
    }
  };

  const handleMaintPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const b64 = await fileToBase64(file);
        setNewMaintPhoto(b64);
      } catch (err) {
        console.error("Base64 photo transfer failed", err);
      }
    }
  };

  // Text representation for printing the lease contract.
  const downloadContractAsFile = (lease: Lease) => {
    const title = `IKODE_LEASE_DEED_${lease.id.toUpperCase()}`;
    const fileContent = `IKODE PROP-TECH SYSTEMS - APPROVED LEASEHOLD AGREEMENT
------------------------------------------------------------
DEED REFERENCE: IKODE-L-${lease.id.toUpperCase()}
MUNICIPAL PROPERTY CODE: RWA-MUNI-KGL-8491-00
LEASE REGISTRATION: ${lease.status.toUpperCase()}

CONTRACTING PARTIES:
-------------------
A. Landlord/Administrator: Alexis Habimana
   Contact: alexis@ikode.gov.rw

B. Registered Resident:
   Email Address: ${lease.tenantEmail}

FINANCIAL INDEMNITY & RATE SPECIFICATIONS:
------------------------------------------
Contract Duration: ${lease.startDate} up to ${lease.endDate}
Agreement Format: ${lease.leaseType === 'service_fee' ? 'SERVICE FEE AGREEMENT (OWNER)' : 'STANDARD TENANCY RENT'}
Monthly Rate Fee: ${lease.rentAmount.toLocaleString()} RWF / month

------------------------------------------------------------
SEALED AND REGISTERED SECURELY ON THE CENTRAL IKODE PLATFORM.
`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="tenant-portal-root">
      
      {/* 1. TOP STATS BAR DESIGN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs" id="tenant-summary-header">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <User className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-display font-semibold text-slate-900">Hello, {currentUser.name}!</h2>
            <p className="text-slate-500 text-xs mt-0.5">Resident Account: <span className="font-mono text-slate-700 font-semibold">{currentUser.email}</span></p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Currency configuration */}
          <CurrencyConverter />
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Globe className="w-4 h-4 text-emerald-500 animate-spin-slow" />
            <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Currency:</span>
            <select
              value={currency}
              onChange={(e) => saveCurrency(e.target.value as CurrencyCode)}
              className="bg-transparent border-0 text-slate-800 font-bold outline-none cursor-pointer text-xs"
            >
              <option value="FRW">RWF (FRW)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          
          <button 
            onClick={() => loadTenantDetails()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync Content
          </button>
        </div>
      </div>

      {/* Success/Error Banners */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-center gap-2 text-left">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2 text-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="ml-auto text-emerald-600 font-bold">dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
          <p className="text-sm font-medium">Syncing tenant workspace...</p>
        </div>
      ) : (
        <div id="tenant-portal-panels-host">
          
          {/* TAB 1: OVERVIEW & ACTIVE LEASE */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left" id="panel-overview">
              
              {/* Left major info cards */}
              <div className="lg:col-span-2 space-y-6">
                
                {activeLease && linkedProperty && linkedUnit ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                    <div className="p-6 border-b border-slate-150 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-mono">Assigned Tenancy Space</span>
                        <h3 className="font-display font-semibold text-slate-950 text-base">
                          {linkedProperty.name} &bull; Apartment {linkedUnit.number}
                        </h3>
                        <p className="text-slate-500 text-xs mt-0.5">{linkedProperty.address}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-xl ${
                        activeLease.status === "active" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-rose-100 text-rose-800"
                      }`}>
                        {activeLease.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100">
                      <div>
                        <span className="text-slate-400 text-xs block font-semibold mb-1">Monthly Billing Rate</span>
                        <p className="text-xl font-bold font-display text-indigo-700">
                          {formatPrice(activeLease.rentAmount, currency)} <span className="text-xs font-normal text-slate-400">/ mo</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">Local Base: {formatPrice(activeLease.rentAmount, "FRW")}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 text-xs block font-semibold mb-1">Contract Duration</span>
                        <p className="text-sm font-bold text-slate-800">{activeLease.startDate} &mdash; {activeLease.endDate}</p>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          {activeLease.leaseType === "service_fee" ? "Service Fee Type" : "Standard Rent Pool"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => setActiveTab("payments")}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Direct Rent Payment
                        </button>
                        <button
                          onClick={() => setActiveLeaseCertificate(activeLease)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" /> Print Formal Certificate
                        </button>
                      </div>
                    </div>

                    {/* Unit specifications & features */}
                    <div className="p-6 space-y-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Apartment Specifications</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <span className="block text-slate-400 font-medium font-sans">Unit Space Layout</span>
                          <span className="font-bold text-slate-800">{linkedUnit.type}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <span className="block text-slate-400 font-medium font-sans">Property Registry</span>
                          <span className="font-bold text-slate-800">{linkedProperty.name} Block</span>
                        </div>
                      </div>

                      {/* Photo grid of unit if present */}
                      {linkedUnit.photos && linkedUnit.photos.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Unit Gallery Promos</span>
                          <div className="grid grid-cols-3 gap-2">
                            {linkedUnit.photos.map((ph, idx) => (
                              <img 
                                key={idx} 
                                src={ph} 
                                alt="Apartment representation" 
                                className="w-full h-24 object-cover rounded-xl border border-slate-150"
                                referrerPolicy="no-referrer"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center text-slate-400 space-y-4 flex flex-col justify-center items-center">
                    <ShoppingBag className="w-16 h-16 text-slate-200" />
                    <div>
                      <h4 className="font-semibold text-slate-800 text-base">No Active Lease Contract Associated</h4>
                      <p className="text-xs max-w-sm mx-auto mt-1 text-slate-500">
                        Please notify your rental property agent to register your tenant email address <strong className="font-mono">{currentUser.email}</strong> on their leases directory first.
                      </p>
                    </div>
                  </div>
                )}

                {/* Local Area Rules Brief */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-display font-semibold text-slate-900 text-sm">Key Association Covenants</h4>
                  </div>
                  <p className="text-xs text-slate-500 italic">
                    "All community residents are bound by municipal regulations. Payments must be recorded before the first day of each billing month to avoid administrative holds."
                  </p>
                </div>
              </div>

              {/* Right Sidebar quick utilities */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Active Balance Snapshot */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-850 shadow-md space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-400 uppercase font-mono">Rent Snapshot</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1 font-mono uppercase bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Current Monthly Liability</span>
                    <p className="text-3xl font-display font-black text-white">
                      {activeLease ? formatPrice(activeLease.rentAmount, currency) : "N/A RWF"}
                    </p>
                  </div>

                  <hr className="border-slate-800" />

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-sans">Payment Frequency:</span>
                    <span className="font-bold font-mono">Monthly Ledger</span>
                  </div>

                  <button
                    onClick={() => setActiveTab("payments")}
                    className="w-full py-2.5 bg-white text-slate-950 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 hover:bg-slate-100 cursor-pointer transition-colors shadow-xs"
                  >
                    Manage Payments & Ledger &rarr;
                  </button>
                </div>

                {/* Quick Maintenance overview */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                  <h3 className="font-display font-semibold text-slate-950 text-sm">Active Maintenance Items</h3>
                  
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                    {maintenance.length === 0 ? (
                      <p className="py-6 text-center text-slate-300 text-xs italic">
                        No active repair reports.
                      </p>
                    ) : (
                      maintenance.slice(0, 3).map(m => (
                        <div key={m.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800 truncate max-w-[120px]">{m.title}</span>
                            <span className="px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 bg-indigo-50 rounded-md uppercase">
                              {m.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{m.description}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setActiveTab("maintenance")}
                    className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Open Maintenance Panel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RENT & PAYMENTS LEDGER */}
          {activeTab === "payments" && (
            <div className="space-y-6 text-left animate-fade-in" id="panel-payments">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                <div>
                  <h3 className="text-base font-display font-semibold text-slate-950">MTN MoMo Rent &amp; Service Ledger</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Settle your rental or service amounts directly with dynamic RWF integration.</p>
                </div>
                {activeLease && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                  >
                    <CreditCard className="w-4 h-4" /> Pay Rent / Service Charge
                  </button>
                )}
              </div>

              {/* Transactions grid list */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Transaction History ({payments.length})</h4>
                </div>

                {payments.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic">
                    No transactional movements found on this resident account.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {payments.map(pay => (
                      <div key={pay.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                            <Receipt className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs">{pay.description}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold font-mono">Reference ID: <span className="text-slate-600">{pay.reference}</span></p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right self-stretch sm:self-auto justify-between sm:justify-end">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-slate-900 block font-mono">{formatPrice(pay.amount, currency)}</span>
                            {pay.status === 'pending_verification' ? (
                              <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 border border-amber-200 rounded">
                                PENDING VERIFICATION
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 border border-emerald-100 rounded">
                                SUCCESSFUL
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedReceipt(pay)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                            title="Print secure receipt verification"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MAINTENANCE REQUESTS */}
          {activeTab === "maintenance" && (
            <div className="space-y-6 text-left animate-fade-in" id="panel-maintenance">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                <div>
                  <h3 className="text-base font-display font-semibold text-slate-950">File &amp; Track Repairs</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Report damages or mechanical items for rapid technician response.</p>
                </div>
                {linkedUnit && (
                  <button
                    onClick={() => setShowNewMaintModal(true)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                  >
                    <Plus className="w-4 h-4" /> File Repair Ticket
                  </button>
                )}
              </div>

              {/* Maintenance grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {maintenance.length === 0 ? (
                  <div className="md:col-span-2 bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100 italic">
                    No logged concern items filed for this unit space.
                  </div>
                ) : (
                  maintenance.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between">
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase rounded ${
                            item.priority === "high" ? "bg-rose-100 text-rose-850" : "bg-slate-100 text-slate-650"
                          }`}>
                            {item.priority} Priority
                          </span>
                          <span className="font-bold text-xs text-indigo-700 font-mono capitalize px-2 py-0.5 bg-indigo-50 rounded">
                            {item.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-950 text-sm truncate">{item.title}</h4>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-mono mt-0.5">{item.category}</p>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {item.description}
                        </p>

                        {item.photos && item.photos.length > 0 && (
                          <div className="flex gap-1 overflow-x-auto pt-1">
                            {item.photos.map((ph, idx) => (
                              <img 
                                key={idx} 
                                src={ph} 
                                alt="Damage report visual" 
                                className="w-14 h-14 object-cover rounded-lg border border-slate-150 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Logs timeline brief */}
                      <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 space-y-2">
                        <span className="font-bold text-slate-400 uppercase font-mono tracking-widest block text-[8px]">Updates Timeline</span>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                          {item.logs?.map((l: any, idx: number) => (
                            <div key={l.id || idx} className="flex justify-between items-start gap-2 bg-white p-2 rounded-lg border border-slate-200">
                              <div className="space-y-0.2">
                                <p className="font-bold text-slate-705 capitalize">Status: <span className="text-indigo-600">{l.status}</span></p>
                                <p className="text-slate-600 font-medium italic">"{l.comments}"</p>
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono shrink-0">{new Date(l.date).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PROPERTY DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-6 text-left animate-fade-in" id="panel-documents">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                <div>
                  <h3 className="text-base font-display font-semibold text-slate-950">Property Documents &amp; Archives</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Explore statutory building guidelines, general house rules, or upload custom resident certificates.</p>
                </div>
                <button
                  onClick={() => setShowDocUploadModal(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                >
                  <FilePlus className="w-4 h-4" /> Upload Custom Document
                </button>
              </div>

              {/* Documents grid layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.length === 0 ? (
                  <div className="md:col-span-3 bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100 italic">
                    No documents matched this active residence profile.
                  </div>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                            <FileText className="w-6 h-6" />
                          </div>
                          <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded">
                            {doc.category}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-950 text-xs tracking-tight line-clamp-2" title={doc.title}>
                            {doc.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-semibold font-mono mt-0.5 truncate">{doc.fileName}</p>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-3">
                        <div className="flex justify-between items-center text-[10px]">
                          <div>
                            <p className="text-slate-400">Uploaded on: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                            <p className="text-slate-400 shrink-0">Scale: <span className="font-bold text-slate-600 font-mono">{doc.fileSize}</span></p>
                          </div>
                          {doc.fileData && doc.fileData !== "DEMO_ATTACHMENT_CONTENT" && (
                            <a
                              href={doc.fileData}
                              download={doc.fileName}
                              className="flex items-center gap-1 text-indigo-650 font-bold hover:underline"
                            >
                              <Download className="w-3.5 h-3.5" /> Grab File
                            </a>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setSelectedDocForNotes(doc);
                            setTempUserNotes(doc.userNotes || "");
                          }}
                          className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-100 hover:border-purple-200 text-purple-700 font-bold text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                          <span>AI Notes &amp; My Notebook</span>
                          {doc.aiNotes ? (
                            <span className="ml-auto bg-purple-200 text-purple-800 text-[8px] font-mono px-1.5 py-0.2 rounded-full">Active</span>
                          ) : (
                            <span className="ml-auto text-slate-400 font-mono text-[9px]">&#8594;</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PROPERTY MANAGER CHAT */}
          {activeTab === "chat" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[520px] text-left animate-fade-in" id="panel-chat">
              {/* Chat head */}
              <div className="bg-slate-900 text-white p-4.5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-xl leading-none">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm tracking-tight text-white leading-none">{managerName}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      Property Manager &bull; Online Communication
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-extrabold bg-slate-800 text-teal-300 px-2.5 py-1 rounded tracking-wider uppercase border border-slate-700">
                  IKODE HUB
                </span>
              </div>

              {/* Tab Selector: All, Read, Unread pill badges exactly like the screenshot */}
              {(() => {
                const unreadMessagesCount = messages.filter(m => 
                  m.receiverEmail.toLowerCase() === currentUser?.email?.toLowerCase() && 
                  !m.read
                ).length;

                return (
                  <div className="flex gap-2 px-5 py-3.5 bg-white border-b border-slate-100 shrink-0 overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setChatFilter("all")}
                      className={`px-4.5 py-1.5 rounded-full text-xs font-extrabold transition-all border cursor-pointer font-sans shrink-0 ${
                        chatFilter === "all"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatFilter("unread")}
                      className={`px-4.5 py-1.5 rounded-full text-xs font-extrabold transition-all border cursor-pointer font-sans shrink-0 flex items-center gap-1 ${
                        chatFilter === "unread"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Unread {unreadMessagesCount > 0 ? unreadMessagesCount : "0"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatFilter("read")}
                      className={`px-4.5 py-1.5 rounded-full text-xs font-extrabold transition-all border cursor-pointer font-sans shrink-0 ${
                        chatFilter === "read"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Read
                    </button>
                  </div>
                );
              })()}

              {/* Messaging window */}
              <div className="flex-1 overflow-y-auto p-4.5 space-y-4 bg-slate-50">
                {(() => {
                  const filteredMessages = messages.filter(m => {
                    if (chatFilter === "unread") {
                      return !m.read && m.receiverEmail.toLowerCase() === currentUser?.email?.toLowerCase();
                    } else if (chatFilter === "read") {
                      return m.read || m.senderEmail.toLowerCase() === currentUser?.email?.toLowerCase();
                    }
                    return true;
                  });

                  if (filteredMessages.length === 0) {
                    return (
                      <div className="py-20 text-center text-slate-400 text-xs italic space-y-2 max-w-xs mx-auto">
                        <MessageSquare className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                        <p>No messages matching this filter found.</p>
                      </div>
                    );
                  }

                  return filteredMessages.map(msg => {
                    const isMe = msg.senderEmail.toLowerCase() === currentUser.email.toLowerCase();
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl p-4 space-y-1.5 shadow-xs text-left ${
                          isMe 
                            ? 'bg-slate-900 text-white rounded-tr-none' 
                            : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                        }`}>
                          <p className={`text-[10.5px] font-bold tracking-wide uppercase font-sans ${
                            isMe ? "text-indigo-300" : "text-indigo-600"
                          }`}>
                            {isMe ? "You" : msg.senderName || "Manager"}
                          </p>
                          <p className="text-sm leading-relaxed break-words font-medium">{msg.content}</p>
                          <span className={`text-[9.5px] block font-mono mt-1 pt-1 border-t ${
                            isMe ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-100"
                          }`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={chatBottomRef} />
              </div>

              {/* Input layout */}
              <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  required
                  placeholder={`Send secure reply to ${managerName}...`}
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
      )}

      {/* 4. MODALS & POP-UPS */}

      {/* Unified MTN MoMo & Offline Settlement modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 relative shadow-xl text-left">
            <button 
              onClick={() => { setShowPaymentModal(false); setPaymentMethod('momo'); setOfflineNotes(''); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <Sparkles className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
              <h3 className="font-display font-semibold text-slate-900 text-sm">Rent &amp; Service Charge Settlement</h3>
              <p className="text-xs text-slate-400">Choose your preferred settlement method below.</p>
            </div>

            {/* Select payment method */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('momo')}
                className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${paymentMethod === 'momo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                MTN MoMo IPS
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('offline')}
                className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${paymentMethod === 'offline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Offline Payment
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs select-none">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Client Beneficiary:</p>
                <p className="font-bold text-slate-800">{linkedProperty?.name || "Alexis Habimana"}</p>
                <p className="font-bold text-slate-800 font-mono">Apartment {linkedUnit?.number || "A101"}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-1">
                  Method: <span className="font-bold text-indigo-600 uppercase">{paymentMethod === 'momo' ? 'In-App MoMo Transfer' : 'Offline Bank / Cash'}</span>
                </p>
              </div>

              <div className="space-y-1 font-sans">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-600 block">Settle Value (RWF Preferred Display)</label>
                  <CurrencyConverter />
                </div>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 font-bold text-slate-800 text-sm rounded-xl outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-sans font-medium">
                  Converted value: <strong className="text-indigo-650">{formatPrice(paymentAmount, currency)}</strong>
                </p>
              </div>

              {paymentMethod === 'offline' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Offline Reference &amp; Notes</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paid in Cash to Alexis, or Bank Slip ID"
                    value={offlineNotes}
                    onChange={(e) => setOfflineNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none text-slate-800"
                  />
                  <p className="text-[9px] text-slate-400">Specify details about your cash or bank transfer for the manager's review.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isPaying}
                className="w-full py-3 bg-slate-900 hover:bg-black text-white font-semibold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isPaying 
                  ? "Processing..." 
                  : paymentMethod === 'offline' 
                  ? "Report Offline Payment" 
                  : "Initiate Secure IPS Transfer"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* File Maintenance Modal */}
      {showNewMaintModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5 relative shadow-xl text-left">
            <button 
              onClick={() => setShowNewMaintModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-display font-semibold text-slate-900 text-base">File New Repair Case</h3>
              <p className="text-xs text-slate-400 mt-0.5">Report mechanical, electrical, or structural plumbing issues in your unit room.</p>
            </div>

            <form onSubmit={handleFilingMaint} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Service Category</label>
                  <select
                    value={newMaintCategory}
                    onChange={(e) => setNewMaintCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="plumbing">Plumbing Leaks</option>
                    <option value="electrical">Electrical Grid</option>
                    <option value="appliance">Kitchen Appliance</option>
                    <option value="structural">Ceiling / Structures</option>
                    <option value="other">Other Incident</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Incident Priority</label>
                  <select
                    value={newMaintPriority}
                    onChange={(e) => setNewMaintPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="low">Low (Standard Care)</option>
                    <option value="medium">Medium (Regular Check)</option>
                    <option value="high">High (Immediate Repair)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Descriptive Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Toilet tank overflow or balcony door latch broken"
                  value={newMaintTitle}
                  onChange={(e) => setNewMaintTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Repair Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain exactly what is leaking, buzzing, or broken..."
                  value={newMaintDesc}
                  onChange={(e) => setNewMaintDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none resize-none font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Attach Damage Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMaintPhotoChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-150 cursor-pointer"
                />
                {newMaintPhoto && (
                  <img 
                    src={newMaintPhoto} 
                    alt="Under-review target upload" 
                    className="w-16 h-16 object-cover rounded-md mt-2 border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={isFilingMaint}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isFilingMaint ? "Logging Incident..." : "Submit Formal Repair Ticket"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showDocUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 relative shadow-xl text-left">
            <button 
              onClick={() => setShowDocUploadModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-display font-semibold text-slate-900 text-base">Archiving Resident Records</h3>
              <p className="text-xs text-slate-400 mt-0.5">Upload scanned PDFs, identification cards, or banking rent proof certificates.</p>
            </div>

            <form onSubmit={handleDocUpload} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Document Title name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scanned National ID Card or Bank Proof"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Registry Category</label>
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="identification">National Identity Cards / Passport</option>
                  <option value="receipt">Third-party Bank Transfer Receipts</option>
                  <option value="other">General Tenant Dossier document</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block font-mono">Attachment File Selector</label>
                <input
                  type="file"
                  required
                  onChange={handleDocFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-150 cursor-pointer"
                />
                {newDocFile && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono font-bold">Selected: {newDocFile.name}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isUploadingDoc}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-colors"
              >
                {isUploadingDoc ? "Saving records..." : "Commit Document File"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Magic AI Document & Notebook Modal */}
      {selectedDocForNotes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col relative shadow-2xl border border-slate-100 text-left">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center relative shrink-0">
              <div className="space-y-1 pr-8">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                  <h3 className="font-display font-bold text-base tracking-tight">AI Notebook &amp; Annotations</h3>
                </div>
                <p className="text-[11px] text-slate-300 font-medium truncate max-w-[450px]">
                  {selectedDocForNotes.title} &bull; <span className="font-mono font-bold uppercase">{selectedDocForNotes.category}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedDocForNotes(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white cursor-pointer bg-slate-800 p-1.5 rounded-full transition-colors focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Document metadata block */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                <div>
                  <p className="text-slate-500 font-semibold font-mono truncate max-w-[320px]">File: {selectedDocForNotes.fileName}</p>
                  <p className="text-slate-400">Size: {selectedDocForNotes.fileSize} &bull; Uploaded on {new Date(selectedDocForNotes.uploadedAt).toLocaleDateString()}</p>
                </div>
                {selectedDocForNotes.fileData && selectedDocForNotes.fileData !== "DEMO_ATTACHMENT_CONTENT" && (
                  <a
                    href={selectedDocForNotes.fileData}
                    download={selectedDocForNotes.fileName}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Download className="w-3 h-3" /> Grab Source File
                  </a>
                )}
              </div>

              {/* Grid split: Left is AI Notes, Right is My Custom Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* LEFT COL: AI NOTES */}
                <div className="space-y-4 flex flex-col h-full">
                  <div className="flex items-center gap-1.5 border-b border-purple-100 pb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h4 className="font-bold text-xs text-purple-900 tracking-tight">AI Generated Insights</h4>
                  </div>

                  {isAnalyzingDoc ? (
                    <div className="flex-1 min-h-[220px] bg-purple-50/40 border border-purple-100/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
                      <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
                      <div>
                        <p className="text-xs font-bold text-purple-950">Gemini is scanning document...</p>
                        <p className="text-[10px] text-purple-400 mt-1">Extracting bylaws, covenants, and dates</p>
                      </div>
                    </div>
                  ) : selectedDocForNotes.aiNotes ? (
                    <div className="flex-1 bg-purple-50/30 border border-purple-150 rounded-2xl p-4 overflow-y-auto max-h-[300px] text-xs text-slate-800 space-y-2 leading-relaxed">
                      {selectedDocForNotes.aiNotes.split('\n').map((line, idx) => {
                        if (line.startsWith('###')) {
                          return <h5 key={idx} className="font-extrabold text-xs text-slate-900 mt-3 border-b border-slate-100 pb-1">{line.replace('###', '')}</h5>;
                        } else if (line.startsWith('**') && line.endsWith('**')) {
                          return <p key={idx} className="font-bold text-slate-900 mt-2">{line.replace(/\*\*/g, '')}</p>;
                        } else if (line.startsWith('•') || line.startsWith('*') || line.startsWith('-')) {
                          return <div key={idx} className="flex gap-1.5 pl-1.5 my-1 text-slate-700"><span>&bull;</span><span>{line.replace(/^[\s•*-]+/, '')}</span></div>;
                        }
                        return <p key={idx} className="mt-1">{line}</p>;
                      })}
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[220px] bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                      <p className="text-[11px] text-slate-400">No AI-synthesized notes are currently generated for this record.</p>
                      <button
                        onClick={() => handleAIAnalyze(selectedDocForNotes.id)}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 transition-all hover:scale-[1.02]"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" /> Ask Gemini to Analyze
                      </button>
                    </div>
                  )}
                </div>

                {/* RIGHT COL: MY CUSTOM ANNOTATIONS */}
                <div className="space-y-4 flex flex-col h-full">
                  <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <h4 className="font-bold text-xs text-slate-900 tracking-tight">My Private Annotations</h4>
                  </div>

                  <form onSubmit={handleSaveNotes} className="flex-1 flex flex-col space-y-3">
                    <textarea
                      value={tempUserNotes}
                      onChange={(e) => setTempUserNotes(e.target.value)}
                      placeholder="Type private notes, reminders, contact numbers, or questions you have regarding this policy/document..."
                      className="w-full flex-1 min-h-[200px] max-h-[240px] p-4 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl text-xs outline-none resize-none"
                    />

                    <button
                      type="submit"
                      disabled={isSavingNotes}
                      className="w-full py-2.5 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      {isSavingNotes ? "Saving..." : "Save Notes"}
                    </button>
                  </form>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Official Printable Lease Certificate Modal */}
      {activeLeaseCertificate && (
        <div 
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer font-sans no-print" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveLeaseCertificate(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6 flex flex-col relative my-8 shadow-2xl border border-slate-200 cursor-default">
            
            {/* Header utilities inside lease certificate */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-650 animate-pulse" />
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest font-mono">IKODE Secure Residence Slip</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadContractAsFile(activeLeaseCertificate)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Download contract as plain-text file"
                >
                  <Download className="w-4 h-4" /> Download .txt Deed
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Trigger PDF download or printout"
                >
                  <Printer className="w-4.5 h-4.5" /> Print/Save PDF
                </button>
                <button
                  onClick={() => setActiveLeaseCertificate(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 rounded-xl cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* PRINT MATERIAL */}
            <div className="bg-white p-6 border-4 border-double border-slate-350 rounded-xl space-y-6 text-left leading-relaxed text-slate-850 print-area" id="tenant-contract-agreement-sheet">
              {/* Emblem / Header */}
              <div className="text-center space-y-2 font-sans">
                <div className="flex justify-center items-center gap-2 text-slate-900 font-display font-extrabold text-2xl tracking-wider">
                  <span className="text-emerald-500 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-250 font-display">IKODE</span>
                  <span>SAAS PROP-TECH SYSTEMS</span>
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Approved Municipal Housing Deed & Lease Agreement Certificate</p>
                <div className="h-0.5 w-16 bg-slate-400 mx-auto rounded"></div>
              </div>

              {/* Lease Registry Details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl font-mono text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">DEED REFERENCE</span>
                  <span className="font-semibold text-slate-900">IKODE-L-{activeLeaseCertificate.id.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">COMPLIANCE CODE</span>
                  <span className="font-semibold text-slate-900">RWA-MUNI-KGL-8491-00</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">LEASE STATUS</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">● ACTIVE LEDGER</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold font-sans">DEED STRUCTURE</span>
                  <span className="font-bold text-slate-800">{activeLeaseCertificate.leaseType === 'service_fee' ? 'SERVICE FEE AGREEMENT' : 'RESIDENTIAL LEASE'}</span>
                </div>
              </div>

              {/* Contracting Parties */}
              <div className="space-y-3">
                <h4 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-dashed border-slate-200 pb-1">I. Contracting Parties</h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">A. Landlord & Administrator:</span>
                    <p className="font-bold text-slate-800">James Karemo (Representative)</p>
                    <p className="text-[11px] text-slate-500 font-mono italic">Account: landlord@karemo.com</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">B. Registered Tenant:</span>
                    <p className="font-bold text-slate-800">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono italic">Account: {currentUser.email}</p>
                  </div>
                </div>
              </div>

              {/* Property details */}
              <div className="space-y-3 font-sans">
                <h4 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-dashed border-slate-200 pb-1">II. Demised Premises details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">BUILDING ESTATE:</span>
                    <p className="font-bold text-slate-800">{linkedProperty?.name || "Oakridge Heights"}</p>
                    <p className="text-[11px] text-slate-500">{linkedProperty?.address || "Kigali, Rwanda"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">APT / UNIT NUMBER:</span>
                    <p className="font-bold text-slate-800">Unit Number {linkedUnit?.number}</p>
                    <p className="text-[11px] text-slate-500">Spec: {linkedUnit?.type}</p>
                  </div>
                </div>
              </div>

              {/* Financial Rate details */}
              <div className="space-y-3 font-sans">
                <h4 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-dashed border-slate-200 pb-1">III. Financial Covenants & Monthly Rates</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">RENT VALUE:</span>
                    <p className="text-sm font-black font-mono text-indigo-700">{formatPrice(activeLeaseCertificate.rentAmount, "FRW")}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">TENANCY DATES:</span>
                    <p className="font-bold text-slate-800">{activeLeaseCertificate.startDate} up to {activeLeaseCertificate.endDate}</p>
                  </div>
                </div>
              </div>

              {/* Stamp Signatures */}
              <div className="pt-6 border-t border-slate-200 font-sans">
                <div className="flex justify-between items-end text-xs text-center">
                  <div className="space-y-1">
                    <p className="font-mono text-[9px] text-indigo-650 italic">James Karemo (Cleared Representative)</p>
                    <div className="border-b border-slate-300 w-40 mx-auto my-1.5"></div>
                    <p className="font-bold text-slate-400 uppercase text-[8px]">LANDLORD SIGNATURE SEAL</p>
                  </div>

                  <div className="w-16 h-16 border-4 border-dashed border-emerald-500/80 rounded-full flex flex-col justify-center items-center rotate-6 leading-none select-none">
                    <span className="text-[8px] font-black uppercase text-emerald-800">IKODE</span>
                    <span className="text-[6px] font-mono text-emerald-600 font-bold">RWA SECURE</span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-mono text-[9px] text-slate-500 italic">{currentUser.name} (Resident Signed)</p>
                    <div className="border-b border-slate-300 w-40 mx-auto my-1.5"></div>
                    <p className="font-bold text-slate-400 uppercase text-[8px]">TENANT AGENT SIGNATURE</p>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setActiveLeaseCertificate(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Close Deed Preview
            </button>
          </div>
        </div>
      )}

      {/* Official Transaction Receipt Modal */}
      {selectedReceipt && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer font-sans no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedReceipt(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-6 flex flex-col relative my-8 shadow-2xl border border-slate-200 cursor-default">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                &larr; Back to Portal
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  <Printer className="w-4.5 h-4.5" /> Print Receipt
                </button>
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Receipt Content */}
            <div className="space-y-6 text-left p-1" id="printable-receipt-sheet">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1 px-1 py-0.5 rounded">
                    <span className="text-xl font-black tracking-wider text-slate-905">IKODE</span>
                    <span className="text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-black font-mono">PAID</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold font-mono mt-0.5">Prop-Tech Cloud Ledger Integrator</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs font-bold font-mono text-slate-905">RECEIPT #{selectedReceipt.id.toUpperCase()}</p>
                  <p className="text-[9px] text-slate-400">Date: {new Date(selectedReceipt.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-200 py-3.5 space-y-2.5 font-sans">
                <div className="flex justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenant Resident Account</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">{currentUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Demised Unit specs</span>
                  <span className="text-xs font-bold text-slate-800 font-mono text-right">
                    {linkedProperty?.name || "Property Space"} &bull; Unit {linkedUnit?.number || "General"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Reference ID</span>
                  <span className="text-xs font-extrabold text-slate-800 font-mono text-right">{selectedReceipt.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accounting Description</span>
                  <span className="text-xs font-bold text-slate-700 text-right">{selectedReceipt.description}</span>
                </div>
              </div>

              {/* Highlight payment details */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-1">
                <div className="flex justify-between items-center font-sans">
                  <span className="text-xs font-bold text-slate-500 uppercase">Paid amount:</span>
                  <span className="text-lg font-black text-indigo-700 font-mono">{formatPrice(selectedReceipt.amount, currency)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono leading-none pt-1 border-t border-dashed border-slate-200">
                  <span>Local Settlement Base Rate:</span>
                  <span className="font-bold text-slate-700">{selectedReceipt.amount.toLocaleString()} FRW</span>
                </div>
              </div>

              {/* Bottom Stamp and Compliance Verification */}
              <div className="flex justify-between items-end pt-4 border-t border-slate-100 flex-wrap gap-2 text-xs">
                <div className="space-y-1 font-sans">
                  <p className="font-mono text-[9px] text-indigo-650 italic">Gakire Habimana &middot; Prop-Tech Seal</p>
                  <div className="border-b border-slate-200 w-32 my-1"></div>
                  <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">LEDGER AGENT SIGNATURE</p>
                </div>

                <div className="w-14 h-14 border-4 border-dashed border-emerald-500/80 rounded-full flex flex-col justify-center items-center rotate-3 leading-none bg-emerald-50 text-emerald-800 shadow-inner select-none font-mono">
                  <span className="text-[5px] font-black uppercase tracking-wide">IKODE</span>
                  <span className="text-[10px] font-black text-emerald-700">MOMO OK</span>
                </div>
              </div>

            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Return to Portal
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
