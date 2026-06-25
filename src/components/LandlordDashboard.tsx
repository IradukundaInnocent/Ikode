import React, { useState, useEffect } from "react";
import { Property, Unit, Lease, UserProfile, DashboardStats, Payment, PropertyDocument, ChatMessage } from "../types";
import { 
  fetchProperties, 
  createProperty, 
  addPropertyPhotos, 
  deletePropertyPhoto,
  fetchUnits, 
  createUnit, 
  addUnitPhotos,
  fetchLeases, 
  createLease, 
  endLease, 
  cancelLease,
  updateLease,
  fetchStats,
  fileToBase64,
  fetchPayments,
  createPayment,
  approvePayment,
  fetchDocuments,
  uploadDocument,
  analyzeDocumentWithAI,
  saveDocumentNotes,
  fetchMessages,
  sendMessage,
  markMessagesAsRead,
  fetchUsers,
  provisionUser
} from "../utils/api";
import { 
  Building, Home, Calendar, Users, Wallet, AlertTriangle, 
  Plus, Upload, Trash2, Camera, Eye, ArrowRight, ArrowLeft, X, Clock, Check, HelpCircle,
  Globe, Printer, Download, Settings, FileText, ChevronDown, RefreshCw, Scale,
  MessageSquare, Send, Sparkles, Search, Lock, ShieldCheck, ShieldAlert
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { formatPrice, getSavedCurrency, saveCurrency, CurrencyCode } from "../utils/currency";
import SuperAdminView from "./SuperAdminView";
import SecurityGuardView from "./SecurityGuardView";
import ReceptionistView from "./ReceptionistView";
import AppFolioMarketplace from "./AppFolioMarketplace";
import RoadmapView from "./RoadmapView";
import CurrencyConverter from "./CurrencyConverter";

interface LandlordDashboardProps {
  currentUser: UserProfile;
  activeTab?: "overview" | "properties" | "bylaws" | "payments" | "documents" | "messages" | "security" | "reception" | "marketplace" | "roadmap";
  onTabChange?: (tab: "overview" | "properties" | "bylaws" | "payments" | "documents" | "messages" | "security" | "reception" | "marketplace" | "roadmap") => void;
}

export default function LandlordDashboard({ currentUser, activeTab: propsActiveTab, onTabChange }: LandlordDashboardProps) {
  // Data states
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Currency & Internationalization configuration
  const [currency, setCurrency] = useState<CurrencyCode>(getSavedCurrency());

  useEffect(() => {
    const handleCurrencySync = () => {
      setCurrency(getSavedCurrency());
    };
    window.addEventListener("ikode_currency_changed", handleCurrencySync);
    return () => {
      window.removeEventListener("ikode_currency_changed", handleCurrencySync);
    };
  }, []);

  // Customizable bylaws states (pre-populated from localStorage or system fallbacks)
  const [bylaw1, setBylaw1] = useState(() => {
    return localStorage.getItem("ikode_bylaw_1") || 
      "The tenant/resident agrees to report any leakage, damage, or wear in physical roof structures, ceiling panels, and high or low-hanging structural gutters immediately. Balcony access holds absolute resident liability.";
  });

  const [bylaw2Rent, setBylaw2Rent] = useState(() => {
    return localStorage.getItem("ikode_bylaw_2_rent") || 
      "Rent must be paid in full on or before the first (1st) day of each calendar month. Late penalties are set at 2.5% of the local RWF base rate.";
  });

  const [bylaw2Service, setBylaw2Service] = useState(() => {
    return localStorage.getItem("ikode_bylaw_2_service") || 
      "Service fee payments must be remitted on or before the first (1st) day of each calendar month. Support elements may be paused for the unique unit space if arrears exceed 15 calendar days.";
  });

  const [bylaw3, setBylaw3] = useState(() => {
    return localStorage.getItem("ikode_bylaw_3") || 
      "Common stairwell elements, garbage clearance, and security perimeter guarding are covered standardly inside the designated monthly service ledger.";
  });

  const [penaltyPct, setPenaltyPct] = useState(() => {
    return localStorage.getItem("ikode_penalty_pct") || "2.5";
  });

  const [defaultServiceAmount, setDefaultServiceAmount] = useState(() => {
    return localStorage.getItem("ikode_default_service_amt") || "65000";
  });

  // Navigation / Focus state
  const [internalActiveTab, setInternalActiveTab] = useState<"overview" | "properties" | "bylaws" | "payments" | "documents" | "messages" | "security" | "reception" | "marketplace" | "roadmap">("overview");
  const activeTab = propsActiveTab !== undefined ? propsActiveTab : internalActiveTab;
  const setActiveTab = (tab: "overview" | "properties" | "bylaws" | "payments" | "documents" | "messages" | "security" | "reception" | "marketplace" | "roadmap") => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  // Persistent integration states for the Landlord portal
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [allDocs, setAllDocs] = useState<PropertyDocument[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Property Manager Rent Audit & Delinquency states
  const [auditMonth, setAuditMonth] = useState<number>(5); // Default to June (0-indexed, index 5)
  const [auditYear, setAuditYear] = useState<number>(2026);
  const [auditFilter, setAuditFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [paymentsSubTab, setPaymentsSubTab] = useState<"auditor" | "feed">("auditor");
  const [leasesSubTab, setLeasesSubTab] = useState<"agreements" | "standards">("agreements");

  // Permission lock modal state
  const [permissionAlertModal, setPermissionAlertModal] = useState<{
    show: boolean;
    actionAttempted: string;
    requiredRole: string;
    explanation: string;
  } | null>(null);

  const triggerPermissionAlert = (action: string, requiredRole: string, explanation: string) => {
    setPermissionAlertModal({
      show: true,
      actionAttempted: action,
      requiredRole: requiredRole,
      explanation: explanation
    });
  };

  const userRole = currentUser?.role || "landlord";

  // Hierarchy calculations
  const isSuperAdmin = userRole === "admin";
  const isCompanyAdmin = userRole === "admin" || userRole === "landlord";
  const isPropertyManager = isCompanyAdmin || userRole === "property_manager";
  const isAccountant = isPropertyManager || userRole === "accountant";
  const isLeasingOfficer = isPropertyManager || userRole === "leasing_officer";
  const isPropertyOwner = userRole === "property_owner";

  // Permissions mappings
  const canManageCompany = isCompanyAdmin; // bylaws, billing, integrations
  const canAddProperty = isCompanyAdmin; // adding properties
  const canAddUnit = isPropertyManager; // PM or higher
  const canManageLeases = isLeasingOfficer || isPropertyManager; // Leasing Officer or PM
  const canRecordPayments = isAccountant || isPropertyManager; // Accountant or PM
  const canManageMaintenance = isPropertyManager; // PM
  const canUploadDocs = isLeasingOfficer || isAccountant || isPropertyManager; // PM, Accountant, Leasing Officer
  
  // Log Manual Payment state
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [manualPayTenantEmail, setManualPayTenantEmail] = useState("");
  const [manualPayLeaseId, setManualPayLeaseId] = useState("");
  const [manualPayAmount, setManualPayAmount] = useState(0);
  const [manualPayMonthName, setManualPayMonthName] = useState("June 2026");
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);

  // Interaction and Form states for Landlord side integrations
  const [selectedChatTenant, setSelectedChatTenant] = useState("tenant1@gmail.com");
  const [mobileChatViewActive, setMobileChatViewActive] = useState(false);
  const [chatFilter, setChatFilter] = useState<"all" | "read" | "unread">("all");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [landlordNewMsg, setLandlordNewMsg] = useState("");
  const [isSendingLandlordMsg, setIsSendingLandlordMsg] = useState(false);

  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [uploadDocTitle, setUploadDocTitle] = useState("");
  const [uploadDocCategory, setUploadDocCategory] = useState<"bylaw" | "lease" | "other">("bylaw");
  const [uploadDocPropId, setUploadDocPropId] = useState("");
  const [uploadDocFile, setUploadDocFile] = useState<File | null>(null);
  const [uploadDocBase64, setUploadDocBase64] = useState("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Magic AI Notes & Custom Notes
  const [selectedDocForNotes, setSelectedDocForNotes] = useState<PropertyDocument | null>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [tempUserNotes, setTempUserNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Modal / Dialog Open/Close state
  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showNewLeaseModal, setShowNewLeaseModal] = useState(false);
  const [showEndLeaseModal, setShowEndLeaseModal] = useState(false);
  const [activeUnitGallery, setActiveUnitGallery] = useState<Unit | null>(null);
  const [activeLeaseCertificate, setActiveLeaseCertificate] = useState<Lease | null>(null);

  // Forms states - Add Property
  const [newPropName, setNewPropName] = useState("");
  const [newPropAddr, setNewPropAddr] = useState("");
  const [newPropDesc, setNewPropDesc] = useState("");
  const [newPropPhotos, setNewPropPhotos] = useState<string[]>([]);

  // Forms states - Add Unit
  const [newUnitNum, setNewUnitNum] = useState("");
  const [newUnitType, setNewUnitType] = useState("Standard Apartment");
  const [newUnitRent, setNewUnitRent] = useState(150000);

  // Forms states - Start Lease
  const [leaseUnit, setLeaseUnit] = useState<Unit | null>(null);
  const [leaseTenantEmail, setLeaseTenantEmail] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [leaseRent, setLeaseRent] = useState(150000); // Set to default RWF value e.g., 150k
  const [leaseType, setLeaseType] = useState<'rent' | 'service_fee'>('rent');
  const [propertySearchQuery, setPropertySearchQuery] = useState("");
  const [leaseCreateTenantMode, setLeaseCreateTenantMode] = useState<'existing' | 'new'>('existing');
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantEmail, setNewTenantEmail] = useState("");

  // Forms states - Edit Lease details
  const [showEditLeaseModal, setShowEditLeaseModal] = useState(false);
  const [leaseToEdit, setLeaseToEdit] = useState<Lease | null>(null);
  const [editLeaseRent, setEditLeaseRent] = useState(150000);
  const [editLeaseTenantEmail, setEditLeaseTenantEmail] = useState("");
  const [editLeaseStart, setEditLeaseStart] = useState("");
  const [editLeaseEnd, setEditLeaseEnd] = useState("");
  const [editLeaseType, setEditLeaseType] = useState<'rent' | 'service_fee'>('rent');
  const [editLeaseStatus, setEditLeaseStatus] = useState<'active' | 'defaulted' | 'ended' | 'cancelled'>('active');

  // Forms states - End Lease dialog trigger
  const [leaseToEnd, setLeaseToEnd] = useState<Lease | null>(null);
  const [endExplanation, setEndExplanation] = useState("");
  const [leaseEndActionType, setLeaseEndActionType] = useState<"end" | "cancel">("end");

  // Load backend data
  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const [propsData, unitsData, leasesData, statsData, paymentsData, docsData, messagesData, usersData] = await Promise.all([
        fetchProperties(),
        fetchUnits(),
        fetchLeases(),
        fetchStats(),
        fetchPayments(),
        fetchDocuments(),
        fetchMessages(),
        fetchUsers()
      ]);
      setProperties(propsData);
      setUnits(unitsData);
      setLeases(leasesData);
      setStats(statsData);
      setAllPayments(paymentsData);
      setAllDocs(docsData);
      setAllMessages(messagesData);
      setAllUsers(usersData);

      // Keep focus property reference updated
      if (selectedProperty) {
        const updated = propsData.find(p => p.id === selectedProperty.id);
        if (updated) setSelectedProperty(updated);
      }
    } catch (err: any) {
      setError(err.message || "Failed to download dashboard directories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Mark incoming messages from selected tenant as read
  useEffect(() => {
    if (activeTab === "messages" && currentUser?.email && selectedChatTenant) {
      markMessagesAsRead(selectedChatTenant, currentUser.email)
        .then(() => fetchMessages())
        .then(data => setAllMessages(data))
        .catch(err => console.warn("Failed to mark landlord messages as read:", err));
    }
  }, [activeTab, selectedChatTenant, currentUser?.email]);

  // Poll for live client chat messages when active
  useEffect(() => {
    if (activeTab === "messages") {
      const poll = setInterval(() => {
        fetchMessages()
          .then(data => setAllMessages(data))
          .catch(err => console.warn("Background chat update failed:", err));
      }, 5000);
      return () => clearInterval(poll);
    }
  }, [activeTab]);

  // Synchronize dynamic contact selections based on user roles
  useEffect(() => {
    if (activeTab === "messages" && allUsers.length > 0) {
      if (currentUser?.role === "property_manager") {
        // Manager chats with any other user
        const otherContacts = allUsers.filter(u => u.email.toLowerCase() !== currentUser.email.toLowerCase());
        if (otherContacts.length > 0) {
          const alreadySelectedExists = otherContacts.some(u => u.email.toLowerCase() === selectedChatTenant.toLowerCase());
          if (!alreadySelectedExists) {
            setSelectedChatTenant(otherContacts[0].email);
          }
        }
      } else {
        // Landlord or Admin: they can ONLY chat with a property manager
        const pm = allUsers.find(u => u.role === "property_manager") || { email: "manager@ikode.rw" };
        setSelectedChatTenant(pm.email);
      }
    }
  }, [activeTab, allUsers, currentUser?.email, currentUser?.role]);

  const handleLandlordSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!landlordNewMsg.trim()) return;
    setIsSendingLandlordMsg(true);
    try {
      const sent = await sendMessage({
        senderEmail: currentUser.email,
        senderName: currentUser.name || "James Karemo",
        receiverEmail: selectedChatTenant,
        content: landlordNewMsg.trim()
      });
      setAllMessages(prev => [...prev, sent]);
      setLandlordNewMsg("");
    } catch (err: any) {
      setError(err.message || "Could not transmit chat back.");
    } finally {
      setIsSendingLandlordMsg(false);
    }
  };

  const handleLandlordUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDocTitle.trim() || !uploadDocFile) {
      setError("Please key in a title and choose a file.");
      return;
    }
    setIsUploadingDoc(true);
    setError("");
    setSuccess("");
    try {
      const sizeKB = (uploadDocFile.size / 1024).toFixed(1);
      const displaySize = Number(sizeKB) > 1024 ? (Number(sizeKB) / 1024).toFixed(1) + " MB" : sizeKB + " KB";
      
      await uploadDocument({
        title: uploadDocTitle,
        category: uploadDocCategory,
        fileName: uploadDocFile.name,
        fileSize: displaySize,
        propertyId: uploadDocPropId || undefined,
        fileData: uploadDocBase64 || "DEMO_ATTACHMENT_CONTENT",
        uploadedBy: currentUser.email
      });

      setSuccess("New blueprint guideline successfully committed!");
      setShowAddDocModal(false);
      
      // Reset Form
      setUploadDocTitle("");
      setUploadDocFile(null);
      setUploadDocBase64("");
      
      // Reload documents
      const docs = await fetchDocuments();
      setAllDocs(docs);
    } catch (err: any) {
      setError(err.message || "Failed doc upload.");
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
      setAllDocs(prev => prev.map(d => d.id === docId ? updatedDoc : d));
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
      setAllDocs(prev => prev.map(d => d.id === selectedDocForNotes.id ? updatedDoc : d));
      setSuccess("Your custom personal notes have been saved securely.");
    } catch (err: any) {
      setError(err.message || "Could not save custom notes.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadDocFile(file);
      try {
        const b64 = await fileToBase64(file);
        setUploadDocBase64(b64);
      } catch (err) {
        console.error("Base64 conversion failed:", err);
      }
    }
  };

  // Multi-photo upload for Property
  const handlePropPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const list: string[] = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          setError("Photos must be under 5MB.");
          continue;
        }
        try {
          const bs64 = await fileToBase64(file);
          list.push(bs64);
        } catch (err) {
          setError("Upload encoding mismatch.");
        }
      }
      setNewPropPhotos(prev => [...prev, ...list].slice(0, 12));
    }
  };

  const handlePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName || !newPropAddr) return;
    setError("");
    setSuccess("");
    try {
      await createProperty({
        name: newPropName,
        address: newPropAddr,
        description: newPropDesc,
        photos: newPropPhotos
      });
      setSuccess("Created building collection seamlessly!");
      setShowAddPropModal(false);
      setNewPropName("");
      setNewPropAddr("");
      setNewPropDesc("");
      setNewPropPhotos([]);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || "Property creation fail.");
    }
  };

  // Add Unit Submit
  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty || !newUnitNum || !newUnitRent) return;
    setError("");
    setSuccess("");
    try {
      await createUnit({
        propertyId: selectedProperty.id,
        number: newUnitNum,
        type: newUnitType,
        rentAmount: Number(newUnitRent)
      });
      setSuccess(`Added Unit ${newUnitNum} properly.`);
      setShowAddUnitModal(false);
      setNewUnitNum("");
      setNewUnitType("Standard Apartment");
      setNewUnitRent(1500);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || "Unit creation fail.");
    }
  };

  // Unit photo gallery append
  const handleUnitPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, unitId: string) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const list: string[] = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) continue;
        try {
          const b64 = await fileToBase64(file);
          list.push(b64);
        } catch (err) {
          console.error(err);
        }
      }
      try {
        const updatedUnit = await addUnitPhotos(unitId, list);
        setActiveUnitGallery(updatedUnit);
        await loadDashboardData();
      } catch (err: any) {
        setError(err.message || "Failed appending unit photos.");
      }
    }
  };

  // Start lease submitting
  const handleLeaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    let targetTenantEmail = "";
    if (leaseCreateTenantMode === "new") {
      if (!newTenantEmail || !newTenantName) {
        setError("Please provide a name and email address to create a new tenant profile.");
        return;
      }
      targetTenantEmail = newTenantEmail.trim().toLowerCase();
    } else {
      if (!leaseTenantEmail) {
        setError("Please select an existing tenant or create a new profile.");
        return;
      }
      targetTenantEmail = leaseTenantEmail.trim().toLowerCase();
    }

    if (!leaseUnit || !leaseStart || !leaseEnd || !leaseRent) {
      setError("Please key in contract dates and monthly billing rate.");
      return;
    }

    try {
      // If we are creating a new tenant, call provisionUser inline to create their profile
      if (leaseCreateTenantMode === "new") {
        await provisionUser(targetTenantEmail, newTenantName.trim(), "tenant");
      }

      await createLease({
        unitId: leaseUnit.id,
        propertyId: selectedProperty?.id || leaseUnit.propertyId,
        tenantEmail: targetTenantEmail,
        startDate: leaseStart,
        endDate: leaseEnd,
        rentAmount: Number(leaseRent),
        leaseType: leaseType,
        createdBy: currentUser.email
      });

      setSuccess(`Tenant contract started successfully on Unit ${leaseUnit.number}.`);
      setShowNewLeaseModal(false);
      setLeaseUnit(null);
      setLeaseTenantEmail("");
      setNewTenantName("");
      setNewTenantEmail("");
      setLeaseCreateTenantMode("existing");
      setLeaseStart("");
      setLeaseEnd("");
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || "Lease activation failed.");
    }
  };

  // Update/Edit lease submitting
  const handleUpdateLeaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaseToEdit) return;
    setError("");
    setSuccess("");
    try {
      await updateLease(leaseToEdit.id, {
        rentAmount: Number(editLeaseRent),
        tenantEmail: editLeaseTenantEmail,
        startDate: editLeaseStart,
        endDate: editLeaseEnd,
        leaseType: editLeaseType,
        status: editLeaseStatus,
        updatedBy: currentUser.email
      });
      setSuccess("Lease agreement modified and synchronized in real-time.");
      setShowEditLeaseModal(false);
      setLeaseToEdit(null);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || "Failed editing lease agreement.");
    }
  };

  // Submit ending/canceling lease
  const handleEndLeaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaseToEnd) return;
    setError("");
    setSuccess("");
    try {
      if (leaseEndActionType === "end") {
        await endLease(leaseToEnd.id, currentUser.email, endExplanation);
        setSuccess("Active property unit is now vacant immediately.");
      } else {
        await cancelLease(leaseToEnd.id, currentUser.email, endExplanation);
        setSuccess("Rent lease cancelled, unit vacant immediately.");
      }
      setShowEndLeaseModal(false);
      setLeaseToEnd(null);
      setEndExplanation("");
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || "Failed modifying lease agreement.");
    }
  };

  // Add photos directly to a focused property
  const appendPropertyPhotosDirect = async (e: React.ChangeEvent<HTMLInputElement>, propId: string) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const list: string[] = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) continue;
        try {
          const bs = await fileToBase64(file);
          list.push(bs);
        } catch { }
      }
      try {
        const updated = await addPropertyPhotos(propId, list);
        setSelectedProperty(updated);
        await loadDashboardData();
      } catch (err: any) {
        setError(err.message || "Failed adding photo.");
      }
    }
  };

  // Remove photo from property list
  const deletePropertyPhotoDirect = async (propId: string, idx: number) => {
    try {
      const updated = await deletePropertyPhoto(propId, idx);
      setSelectedProperty(updated);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || "Removing photo fails.");
    }
  };

  // Utilities functions
  const unitStatusColors = {
    vacant: "bg-emerald-100 text-emerald-800 border-emerald-200",
    occupied: "bg-indigo-100 text-indigo-800 border-indigo-200",
    maintenance: "bg-amber-100 text-amber-800 border-amber-200"
  };

  const getActiveLease = (unitId: string) => {
    return leases.find(l => l.unitId === unitId && l.status === "active");
  };

  const downloadContractAsFile = (lease: Lease) => {
    const title = `IKODE_CONTRACT_DEED_${lease.id.toUpperCase()}`;
    const fileContent = `IKODE PROP-TECH SYSTEMS - MUNICIPAL HOUSING AGREEMENT
------------------------------------------------------------
CONTRACT REFERENCE: IKODE-L-${lease.id.toUpperCase()}
MUNICIPAL COMPLIANCE CODE: RWA-MUNI-KGL-8491-00
LEASE TERM TYPE: ${lease.leaseType === 'service_fee' ? 'SERVICE FEE AGREEMENT (OWNER)' : 'RESIDENTIAL TENANCY'}
REGISTRATION STATUS: ${lease.status.toUpperCase()}

PARTIES TO CONTRACT:
--------------------
A. Landlord & Administrator: Alexis Habimana
   Contact Registered: alexis@ikode.gov.rw

B. Registered Tenant/Space Owner:
   Resident Email Address: ${lease.tenantEmail}

CORE COVENANTS & RENTAL RATES:
------------------------------
Timeline Schedule: ${lease.startDate} to ${lease.endDate}
Financial Remittance Model: ${lease.leaseType === 'service_fee' ? 'Service Charge Only (Prop purchased)' : 'Standard Rent + Service charge pool'}
Monthly Rate: ${lease.leaseType === 'service_fee' ? '0 RWF Rent' : `${lease.rentAmount.toLocaleString()} RWF`}
Communal Service Ledger Value: ${lease.rentAmount.toLocaleString()} RWF / month

------------------------------------------------------------
SECURED VIA IKODE PROP-TECH LEDGER INTEGRATOR.
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

  // Render bento statistics charts data
  const pieData = stats ? [
    { name: "Occupied Spaces", value: units.filter(u => u.status === "occupied").length, color: "#4f46e5" },
    { name: "Vacant Spaces", value: units.filter(u => u.status === "vacant").length, color: "#10b981" },
    { name: "Under Rehab", value: units.filter(u => u.status === "maintenance").length, color: "#f59e0b" }
  ] : [];

  // Rent projection array bar chart
  const barChartData = properties.map(p => {
    const propUnits = units.filter(u => u.propertyId === p.id);
    const expected = propUnits.filter(u => u.status === "occupied").reduce((sum, u) => sum + u.rentAmount, 0);
    return {
      name: p.name.split(" ")[0],
      ActiveIncome: expected,
    };
  });

  // Month list helper
  const monthsList = [
    { name: "January", index: 0 },
    { name: "February", index: 1 },
    { name: "March", index: 2 },
    { name: "April", index: 3 },
    { name: "May", index: 4 },
    { name: "June", index: 5 },
    { name: "July", index: 6 },
    { name: "August", index: 7 },
    { name: "September", index: 8 },
    { name: "October", index: 9 },
    { name: "November", index: 10 },
    { name: "December", index: 11 }
  ];

  // Helper to compile rent audit records for a selected month/year
  const getRentAuditList = (targetMonthIndex: number, targetYear: number) => {
    return leases
      .filter(l => l.status === "active") // Check active leases
      .map(lease => {
        const unit = units.find(u => u.id === lease.unitId);
        const property = properties.find(p => p.id === lease.propertyId);
        
        // Find successful payments made by this tenant for this lease in the target month/year
        const tenantPayments = allPayments.filter(p => {
          if (p.tenantEmail.toLowerCase() !== lease.tenantEmail.toLowerCase()) return false;
          if (p.status !== "successful" && p.status !== "processing") return false;
          
          const payDate = new Date(p.date);
          const payMonth = payDate.getFullYear() === targetYear && payDate.getMonth() === targetMonthIndex;
          return payMonth;
        });

        // Find pending offline payments requested for verification in the target month/year
        const pendingPayments = allPayments.filter(p => {
          if (p.tenantEmail.toLowerCase() !== lease.tenantEmail.toLowerCase()) return false;
          if (p.status !== "pending_verification") return false;

          const payDate = new Date(p.date);
          const payMonth = payDate.getFullYear() === targetYear && payDate.getMonth() === targetMonthIndex;
          return payMonth;
        });

        const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
        const hasPaid = totalPaid >= lease.rentAmount;
        const outstandingAmount = Math.max(0, lease.rentAmount - totalPaid);

        return {
          lease,
          unit,
          property,
          tenantEmail: lease.tenantEmail,
          expectedAmount: lease.rentAmount,
          totalPaid,
          hasPaid,
          outstandingAmount,
          payments: tenantPayments,
          pendingPayments
        };
      });
  };

  const getDaysOverdueOfSelectedAudit = (monthIndex: number, year: number) => {
    const today = new Date("2026-06-23T05:07:49-07:00"); // Mock current workspace date
    const firstOfTargetMonth = new Date(year, monthIndex, 1);
    
    if (today < firstOfTargetMonth) return 0; // Future month has 0 dues yet
    
    // If it's the current month, let's say it's overdue by (today's day)
    if (today.getFullYear() === year && today.getMonth() === monthIndex) {
      return today.getDate();
    }
    
    // If it's a previous month of 2026
    const diffTime = Math.abs(today.getTime() - firstOfTargetMonth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Log Manual direct cash/bank remittance handler
  const handleLogManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPayTenantEmail || manualPayAmount <= 0) return;
    setIsLoggingPayment(true);
    setError("");
    setSuccess("");
    try {
      await createPayment({
        leaseId: manualPayLeaseId || "lease-manual",
        tenantEmail: manualPayTenantEmail.toLowerCase(),
        amount: Number(manualPayAmount),
        description: `Direct rent payment processed by Property Manager for ${manualPayMonthName}`,
        reference: `MANUAL-${Date.now().toString().substring(7)}-RWA`
      });
      setSuccess(`Direct payment of ${formatPrice(manualPayAmount, currency)} successfully logged for ${manualPayTenantEmail}.`);
      setShowManualPaymentModal(false);
      
      // Reload both payments and dashboard stats
      const paymentsData = await fetchPayments();
      setAllPayments(paymentsData);
      
      const statsData = await fetchStats();
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || "Failed to log direct manual payment.");
    } finally {
      setIsLoggingPayment(false);
    }
  };

  const handleApproveOfflinePayment = async (paymentId: string) => {
    try {
      setLoading(true);
      setError("");
      await approvePayment(paymentId);
      setSuccess("Offline payment verified and approved successfully! Account balance was reconciled.");
      
      // Reload both payments and stats
      const [paymentsData, statsData] = await Promise.all([
        fetchPayments(),
        fetchStats()
      ]);
      setAllPayments(paymentsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || "Failed to approve payment verification.");
    } finally {
      setLoading(false);
    }
  };

  // Send rent reminder chat message notice
  const handleSendUnpaidReminder = async (tenantEmail: string, amount: number, monthLabel: string) => {
    try {
      const msgText = `⚠️ Rent Delinquency Reminder: Outstanding rent amount of ${formatPrice(amount, currency)} due for the month of ${monthLabel} is pending. Please settle via MTN MoMo in your Tenant Portal at your earliest convenience or contact your property manager David Mugisha. Thank you!`;
      await sendMessage({
        senderEmail: currentUser.email,
        senderName: currentUser.name || "Property Manager",
        receiverEmail: tenantEmail,
        content: msgText
      });
      setSuccess(`SMS / App notification reminder dispatched successfully to tenant (${tenantEmail}).`);
      
      const msgs = await fetchMessages();
      setAllMessages(msgs);
    } catch (err: any) {
      setError(err.message || "Failed to send message reminder to resident.");
    }
  };

  return (
    <div className="space-y-8" id="landlord-main-container">
      {/* Elegantly styled header bar with currency selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 no-print">
        <div>
          <h2 className="text-2xl font-display font-extrabold tracking-tight text-slate-900 capitalize">
            {activeTab === "overview" ? "Dashboard" : activeTab === "bylaws" ? "Lease Contracts" : activeTab === "marketplace" ? "AppFolio Integration Marketplace" : activeTab === "roadmap" ? "SaaS OS Blueprint & Role Roadmap" : activeTab}
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            {activeTab === "overview" && "At-a-glance rental portfolio status and essential actions."}
            {activeTab === "properties" && "Manage your residential complexes, units, and tenant placements."}
            {activeTab === "bylaws" && "Lease agreements, terms of service covenants, and property rules."}
            {activeTab === "payments" && "Incoming rent, water/power service charge ledgers, and transactions."}
            {activeTab === "documents" && "Store and share agreements, compliance documents, and receipts."}
            {activeTab === "messages" && "Chat logs, system broadcast alerts, and reminders for residents."}
            {activeTab === "security" && "Secure compound logbooks, resident gate passes, vehicle tracking, and incident logs."}
            {activeTab === "reception" && "Visitor registration, package tracking logs, and direct tenant support assistance."}
            {activeTab === "marketplace" && "Simulate high-volume portfolios and activate AppFolio professional real estate utilities."}
            {activeTab === "roadmap" && "Interactive system blueprints, permission inheritance matrix, and complete operational workflows."}
          </p>
        </div>
        
        {/* Simple elegant currency picker & converter */}
        <div className="flex flex-wrap items-center gap-2">
          <CurrencyConverter />
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currency:</span>
            <select
              value={currency}
              onChange={(e) => saveCurrency(e.target.value as CurrencyCode)}
              className="bg-transparent text-slate-800 text-xs font-bold outline-none cursor-pointer pr-1"
            >
              <option value="FRW">RWF (Rwandan Franc)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound)</option>
            </select>
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-100 animate-fade-in" id="success-banner">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm font-medium border border-rose-100 animate-fade-in" id="error-banner">
          {error}
        </div>
      )}

      {/* OVERVIEW STATS TAB */}
      {activeTab === "overview" && !selectedProperty && (
        currentUser.role === "admin" ? (
          <SuperAdminView currentUser={currentUser} />
        ) : currentUser.role === "security_guard" ? (
          <SecurityGuardView currentUser={currentUser} />
        ) : currentUser.role === "receptionist" ? (
          <ReceptionistView currentUser={currentUser} />
        ) : (
          <div className="space-y-8" id="overview-layout">
          {/* Welcome Banner / Alert */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm" id="welcome-manager-banner">
            <div>
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {currentUser.role === "property_manager" ? "Property Manager Console" : "Master Landlord Workspace"}
              </span>
              <h2 className="text-xl font-display font-bold mt-2">
                Hello, {currentUser.name || "Administrator"}!
              </h2>
              <p className="text-slate-300 text-xs mt-1">
                {currentUser.role === "property_manager" 
                  ? "Here is the operational and financial status of all active housing blocks."
                  : "Monitor rent yields, draft compliance rules, and review legal document directories."}
              </p>
            </div>
            
            {/* Quick Rent Delinquency Indicator */}
            {(() => {
              const currentMonthIndex = 5; // June 2026
              const auditList = getRentAuditList(currentMonthIndex, 2026);
              const unpaidCount = auditList.filter(a => !a.hasPaid).length;
              const unpaidSum = auditList.filter(a => !a.hasPaid).reduce((sum, a) => sum + a.outstandingAmount, 0);

              if (unpaidCount > 0) {
                return (
                  <div className="bg-rose-500/15 border border-rose-500/30 rounded-xl p-3 max-w-sm flex items-start gap-3 text-left">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wide">Outstanding Rent Alert</h4>
                      <p className="text-[11px] text-slate-200 mt-0.5">
                        There are <span className="font-bold text-white">{unpaidCount} tenants</span> with unpaid balances for June 2026, totaling <span className="font-bold text-rose-400">{formatPrice(unpaidSum, currency)}</span>.
                      </p>
                      <button 
                        onClick={() => setActiveTab("payments")}
                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 mt-1.5 flex items-center gap-1 cursor-pointer focus:outline-none"
                      >
                        Launch Rent Audit <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 max-w-sm flex items-start gap-3 text-left">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wide">Financial Ledger Balanced</h4>
                      <p className="text-[11px] text-slate-200 mt-0.5">
                        All active residents have fully settled their rent invoices for the current billing cycle.
                      </p>
                    </div>
                  </div>
                );
              }
            })()}
          </div>

          {/* Dashboard Metrics grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" id="stats-dashboard-grid">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 flex flex-col justify-between">
              <Building className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Properties</p>
                <h3 className="text-xl font-display font-bold text-slate-800">{stats?.totalProperties || 0}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 flex flex-col justify-between">
              <Home className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Units</p>
                <h3 className="text-xl font-display font-bold text-slate-800">{stats?.totalUnits || 0}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 flex flex-col justify-between">
              <Users className="w-5 h-5 text-rose-500" />
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Occupancy Rate</p>
                <h3 className="text-xl font-display font-bold text-slate-800">{stats?.occupancyRate || 0}%</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 flex flex-col justify-between col-span-2 sm:col-span-1">
              <Wallet className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans">Monthly Invoice Pool</p>
                <h3 className="text-xl font-display font-bold text-slate-850">{formatPrice(stats?.expectedRent || 0, currency)}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 flex flex-col justify-between col-span-2 sm:col-span-1">
              <AlertTriangle className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Repairs</p>
                <h3 className="text-xl font-display font-bold text-slate-800">{stats?.openIssuesCount || 0}</h3>
              </div>
            </div>
          </div>

          {/* Graphical Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="graphics-charts-row">
            {/* Pie Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <h4 className="font-display font-semibold text-slate-800 text-sm mb-4">Space Occupancy Status Ratio</h4>
              <div className="h-60 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2 text-xs">
                {pieData.map((d, index) => (
                  <div key={index} className="flex items-center gap-1.5 font-medium">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600">{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar Chart Expected Income */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <h4 className="font-display font-semibold text-slate-800 text-sm mb-4">Rent Ledger Pool by Building Group</h4>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar dataKey="ActiveIncome" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* SECURITY COMPONENT TAB */}
      {activeTab === "security" && (
        <SecurityGuardView currentUser={currentUser} />
      )}

      {/* RECEPTION COMPONENT TAB */}
      {activeTab === "reception" && (
        <ReceptionistView currentUser={currentUser} />
      )}

      {/* APPFOLIO INTEGRATION MARKETPLACE */}
      {activeTab === "marketplace" && (
        userRole === "admin" ? (
          <AppFolioMarketplace currentUser={currentUser} />
        ) : (
          <div className="p-12 text-center text-slate-500 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
            <Lock className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 font-display">Access Locked</h3>
            <p className="text-xs max-w-md mx-auto">This AppFolio Professional Real Estate Marketplace is restricted exclusively to the Super Admin role.</p>
          </div>
        )
      )}

      {/* PLATFORM BLUEPRINT AND ROLE ROADMAP */}
      {activeTab === "roadmap" && (
        (userRole === "admin" || userRole === "landlord" || userRole === "property_manager") ? (
          <RoadmapView currentUser={currentUser} />
        ) : (
          <div className="p-12 text-center text-slate-500 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
            <Lock className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 font-display">Access Locked</h3>
            <p className="text-xs max-w-md mx-auto">The iKode OS Blueprint and Roadmap is restricted to Admins and Property Managers only.</p>
          </div>
        )
      )}

      {/* PROPERTIES & UNITS MAIN GRID */}
      {activeTab === "properties" && !selectedProperty && (() => {
        const filteredProperties = properties.filter(p => {
          if (!propertySearchQuery) return true;
          const query = propertySearchQuery.toLowerCase();
          const nameMatch = p.name?.toLowerCase().includes(query);
          const addrMatch = p.address?.toLowerCase().includes(query);
          const descMatch = p.description?.toLowerCase().includes(query);
          
          const propUnits = units.filter(u => u.propertyId === p.id);
          const unitMatch = propUnits.some(u => {
            const activeLease = leases.find(l => l.unitId === u.id && l.status === "active");
            return u.number?.toLowerCase().includes(query) || 
                   u.type?.toLowerCase().includes(query) || 
                   activeLease?.tenantEmail?.toLowerCase().includes(query);
          });

          return nameMatch || addrMatch || descMatch || unitMatch;
        });

        return (
          <div className="space-y-6" id="properties-grid-tab">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-slate-50 border border-slate-200/50 p-4 rounded-xl">
              <span className="text-xs text-slate-500 font-semibold">{filteredProperties.length} of {properties.length} Active Building Portfolios found</span>
              <button
                onClick={() => {
                  if (!canAddProperty) {
                    triggerPermissionAlert(
                      "Add Building Portfolio",
                      "Company Admin",
                      "Creating and provisioning brand new building portfolios is restricted to Company Admins (SaaS Level 4) or higher to ensure corporate asset control."
                    );
                  } else {
                    setShowAddPropModal(true);
                    setError("");
                    setSuccess("");
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm sm:ml-auto"
              >
                <Plus className="w-4 h-4" /> Add Building Portfolio
              </button>
            </div>

            {/* Search Box with icon */}
            <div className="relative bg-white rounded-2xl border border-slate-150 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search portfolios by name, address, unit numbers (e.g. 102), or resident emails..."
                  value={propertySearchQuery}
                  onChange={(e) => setPropertySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs sm:text-sm outline-none transition-all font-medium text-slate-800"
                />
                {propertySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPropertySearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              {propertySearchQuery && (
                <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl font-bold shrink-0">
                  Found {filteredProperties.length} matches
                </span>
              )}
            </div>

            {filteredProperties.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center space-y-3">
                <Building className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="font-display font-bold text-slate-800 text-base">No Matching Portfolios</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">We couldn't find any building portfolios matching your search query. Try typing another term or clear the filter.</p>
                <button
                  onClick={() => setPropertySearchQuery("")}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Clear search filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="properties-bento">
                {filteredProperties.map(p => {
                  const propUnits = units.filter(u => u.propertyId === p.id);
                  const occCount = propUnits.filter(u => u.status === "occupied").length;
                  return (
                    <div 
                      key={p.id} 
                      className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col hover:shadow-md hover:border-slate-200 transition-all cursor-pointer"
                      onClick={() => setSelectedProperty(p)}
                      id={`prop-card-${p.id}`}
                    >
                      <div className="h-44 bg-slate-100 relative overflow-hidden">
                        {p.photos && p.photos.length > 0 ? (
                          <img src={p.photos[0]} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                            <Building className="w-10 h-10 mb-1" />
                            <span className="text-xs">No cover image configured</span>
                          </div>
                        )}
                        <span className="absolute top-3 right-3 px-2.5 py-1 bg-black/50 text-white rounded-lg text-[11px] font-semibold tracking-wide backdrop-blur-xs">
                          {propUnits.length} Units
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1">
                          <h4 className="font-display font-semibold text-slate-900 text-base">{p.name}</h4>
                          <p className="text-xs text-slate-400 font-medium line-clamp-1">{p.address}</p>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-2">{p.description}</p>
                        </div>

                        <div className="flex border-t border-slate-100 pt-3 items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-500">
                            Occupancy rate: <span className="text-indigo-600 font-semibold">{propUnits.length > 0 ? Math.round((occCount / propUnits.length) * 100) : 0}%</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                            Enter Workspace <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* INDIVIDUAL PROPERTY DETAILS WORKSPACE */}
      {selectedProperty && (
        <div className="space-y-8" id="selected-property-workspace">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-150 shadow-sm">
            <div>
              <button 
                onClick={() => setSelectedProperty(null)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold mb-1 flex items-center gap-1.5 focus:outline-none cursor-pointer"
              >
                &larr; Back to all properties
              </button>
              <h3 className="text-xl font-display font-semibold tracking-tight text-slate-900">{selectedProperty.name} Details</h3>
              <p className="text-slate-400 text-xs mt-0.5">{selectedProperty.address}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!canAddUnit) {
                    triggerPermissionAlert(
                      "Add Multi Unit",
                      "Property Manager",
                      "Registering additional units or services within a property is restricted to Property Managers (SaaS Level 3) or higher."
                    );
                  } else {
                    setShowAddUnitModal(true);
                    setError("");
                    setSuccess("");
                  }
                }}
                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Multi Unit
              </button>

              <label className="flex items-center gap-1 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 bg-white rounded-xl text-xs font-semibold cursor-pointer">
                <Camera className="w-4 h-4 text-slate-400" /> Upload Building Photo
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => appendPropertyPhotosDirect(e, selectedProperty.id)}
                />
              </label>
            </div>
          </div>

          {/* Building Photo Gallery System with up to 12. Support delete directly. */}
          {selectedProperty.photos && selectedProperty.photos.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="property-multiphoto-gallery">
              <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                <h4 className="font-display font-semibold text-sm text-slate-800 flex items-center gap-1.5"><Camera className="w-4.5 h-4.5 text-indigo-500" /> Building Photo Gallery ({selectedProperty.photos.length} / 12)</h4>
                <p className="text-[10px] text-slate-400 font-medium">PNG/JPG up to 12 files supported with instant delete.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {selectedProperty.photos.map((p, index) => (
                  <div key={index} className="relative aspect-video rounded-xl bg-slate-50 overflow-hidden group border border-slate-200">
                    <img src={p} alt={`Building Gallery ${index}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    
                    <button
                      type="button"
                      onClick={() => deletePropertyPhotoDirect(selectedProperty.id, index)}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 hover:bg-rose-600 rounded-lg text-white font-medium transition-colors cursor-pointer"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 right-1 font-mono text-[9px] bg-black/40 text-white rounded-md px-1 py-0.2">
                      #{index+1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Space/Units inventory */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="property-workspace-split">
            {/* Real units list */}
            {(() => {
              const allPropUnits = units.filter(u => u.propertyId === selectedProperty.id);
              const filteredPropUnits = allPropUnits.filter(u => {
                if (!propertySearchQuery) return true;
                const query = propertySearchQuery.toLowerCase();
                const activeLease = leases.find(l => l.unitId === u.id && l.status === "active");
                
                return u.number?.toLowerCase().includes(query) ||
                       u.type?.toLowerCase().includes(query) ||
                       activeLease?.tenantEmail?.toLowerCase().includes(query) ||
                       activeLease?.leaseType?.toLowerCase().includes(query);
              });

              return (
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-slate-50/50">
                    <div>
                      <h3 className="font-display font-semibold text-slate-800 text-sm">Building Units & Active Leases ({filteredPropUnits.length} of {allPropUnits.length})</h3>
                      <p className="text-[10px] text-slate-400">Manage tenancies and activate vacancies.</p>
                    </div>

                    {/* Inline Search Bar */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        placeholder="Search unit #, specification, email..."
                        value={propertySearchQuery}
                        onChange={(e) => setPropertySearchQuery(e.target.value)}
                        className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none font-medium text-slate-700"
                      />
                      {propertySearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPropertySearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                        >
                          X
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {filteredPropUnits.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <Home className="w-8 h-8 text-slate-300 mx-auto" />
                        <h4 className="text-xs font-bold text-slate-700">No matching units found</h4>
                        <p className="text-[10px] text-slate-400">Try checking unit number spelling or clear search term.</p>
                        <button
                          onClick={() => setPropertySearchQuery("")}
                          className="text-[10px] text-indigo-600 font-bold hover:underline"
                        >
                          Reset Filters
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                            <th className="px-5 py-3">Unit Number</th>
                            <th className="px-5 py-3">Specification / Type</th>
                            <th className="px-5 py-3">Rent Pool</th>
                            <th className="px-5 py-3">Unit Status</th>
                            <th className="px-5 py-3 text-right">Operations</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                          {filteredPropUnits.map(unit => {
                            const activeLease = getActiveLease(unit.id);
                            return (
                              <tr key={unit.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="px-5 py-4 font-bold text-slate-900">{unit.number}</td>
                                <td className="px-5 py-4 text-slate-500 font-medium">{unit.type}</td>
                                 <td className="px-5 py-4">
                                  {activeLease?.leaseType === 'service_fee' ? (
                                    <div className="space-y-0.5 text-left">
                                      <span className="font-bold text-slate-400 block line-through decoration-slate-400 decoration-1 text-[10px]">
                                        {formatPrice(unit.rentAmount, currency)} <span className="text-[9px] font-normal italic">rent</span>
                                      </span>
                                      <div className="text-xs text-emerald-700 font-extrabold flex items-center gap-1">
                                        <span>Service: {formatPrice(activeLease.rentAmount, currency)} / mo</span>
                                      </div>
                                      <span className="text-[9px] text-slate-400 font-mono block">({formatPrice(activeLease.rentAmount, "FRW")})</span>
                                      <span className="text-[9.5px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-black uppercase inline-block mt-1">Unit Owner</span>
                                    </div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <span className="font-semibold text-slate-850">{formatPrice(unit.rentAmount, currency)}</span><span className="text-slate-400 text-[10px]/none font-normal">/mo</span>
                                      {activeLease && (
                                        <div className="space-y-1">
                                          <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-bold block w-max mt-0.5">Rent + Service</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`px-2.5 py-0.5 border rounded-full text-[10px] uppercase font-bold tracking-wide ${unitStatusColors[unit.status]}`}>
                                    {unit.status}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right flex justify-end gap-1.5 items-center">
                                  {/* Option to create a rent lease if vacant */}
                                  {unit.status === "vacant" ? (
                                    <button
                                      onClick={() => {
                                        if (!canManageLeases) {
                                          triggerPermissionAlert(
                                            "Activate Tenancy Lease",
                                            "Leasing Officer",
                                            "Drafting tenancy agreements and registering active leases is restricted to Leasing Officers or Property Managers."
                                          );
                                        } else {
                                          setLeaseUnit(unit);
                                          setLeaseRent(unit.rentAmount);
                                          setShowNewLeaseModal(true);
                                          setError("");
                                          setSuccess("");
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] cursor-pointer font-bold"
                                    >
                                      Activate Lease
                                    </button>
                                  ) : activeLease ? (
                              <div className="flex flex-wrap gap-1 justify-end">
                                <button
                                  onClick={() => { setActiveLeaseCertificate(activeLease); }}
                                  className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-150 hover:bg-indigo-100 text-[10px] font-bold cursor-pointer rounded flex items-center gap-1"
                                  title="Print Official Lease Covenants"
                                >
                                  <Printer className="w-3 h-3 text-indigo-600" /> Contract
                                </button>
                                <button
                                  onClick={() => {
                                    if (!canManageLeases) {
                                      triggerPermissionAlert(
                                        "Edit Lease Agreement",
                                        "Leasing Officer",
                                        "Modifying existing tenancy terms, rent rates, or billing durations requires Leasing Officer or Property Manager credentials."
                                      );
                                    } else {
                                      setLeaseToEdit(activeLease);
                                      setEditLeaseRent(activeLease.rentAmount);
                                      setEditLeaseTenantEmail(activeLease.tenantEmail);
                                      setEditLeaseStart(activeLease.startDate);
                                      setEditLeaseEnd(activeLease.endDate);
                                      setEditLeaseType(activeLease.leaseType || 'rent');
                                      setEditLeaseStatus(activeLease.status || 'active');
                                      setShowEditLeaseModal(true);
                                    }
                                  }}
                                  className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 text-[10px] font-bold cursor-pointer rounded flex items-center gap-1"
                                  title="Edit, modify or adjust live agreement details"
                                >
                                  <Settings className="w-3 h-3 text-amber-600" /> Edit Terms
                                </button>
                                <button
                                  onClick={() => {
                                    if (!canManageLeases) {
                                      triggerPermissionAlert(
                                        "End Lease Contract",
                                        "Leasing Officer",
                                        "Terminating or ending an active tenancy agreement is restricted to Leasing Officers or Property Managers."
                                      );
                                    } else {
                                      setLeaseToEnd(activeLease);
                                      setLeaseEndActionType("end");
                                      setShowEndLeaseModal(true);
                                    }
                                  }}
                                  className="px-2 py-1 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 text-[10px] cursor-pointer rounded"
                                  title="End lease contract"
                                >
                                  End
                                </button>
                                <button
                                  onClick={() => {
                                    if (!canManageLeases) {
                                      triggerPermissionAlert(
                                        "Cancel Lease Agreement",
                                        "Leasing Officer",
                                        "Cancelling a registered tenancy contract requires Leasing Officer or Property Manager credentials."
                                      );
                                    } else {
                                      setLeaseToEnd(activeLease);
                                      setLeaseEndActionType("cancel");
                                      setShowEndLeaseModal(true);
                                    }
                                  }}
                                  className="px-2 py-1 bg-rose-55 hover:bg-rose-100 text-rose-700 border border-rose-100 text-[10px] cursor-pointer rounded"
                                  title="Cancel lease contract"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-amber-500 italic block">In Maintenance / Setup</span>
                            )}

                            {/* View Unit Inline Photo gallery */}
                            <button
                              onClick={() => { setActiveUnitGallery(unit); }}
                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Unit Photo Gallery"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
              );
            })()}

            {/* Dedicated Lease History list for this property's units */}
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <h4 className="font-display font-semibold text-slate-800 text-sm">Lease History Audit Log</h4>
                <p className="text-[11px] text-slate-400">Chronological history registry showing ended or cancelled leases within this property.</p>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {leases.filter(l => l.propertyId === selectedProperty.id && l.status !== "active").length === 0 ? (
                  <div className="p-8 text-center text-slate-300 text-xs">
                    No ended or cancelled leases have loaded yet on this property workspace.
                  </div>
                ) : (
                  leases.filter(l => l.propertyId === selectedProperty.id && l.status !== "active").map((histLease) => (
                    <div key={histLease.id} className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-100 relative">
                      <div className="flex justify-between items-center text-[10px] uppercase font-mono">
                        <span className={`px-2 py-0.2 rounded font-bold ${histLease.status === "ended" ? "bg-slate-200 text-slate-700" : "bg-rose-100 text-rose-700"}`}>
                          {histLease.status}
                        </span>
                        <span className="text-slate-400">Unit: {units.find(u => u.id === histLease.unitId)?.number}</span>
                      </div>

                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">Tenant: <span className="font-mono">{histLease.tenantEmail}</span></p>
                        <p className="text-[11px] text-slate-500">
                          {histLease.leaseType === "service_fee" ? "Service Fee" : "Rent pool"}: {histLease.rentAmount.toLocaleString()} FRW/mo
                        </p>
                        <p className="text-[11px] text-slate-500">Dates: {histLease.startDate} &mdash; {histLease.endDate}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/50 space-y-1 text-slate-600 block">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Activity logs:</span>
                        {histLease.history?.map((h, idx) => (
                          <div key={h.id || idx} className="text-[11px] pb-1 border-b border-dashed border-slate-100 last:border-0">
                            <span className="font-bold text-slate-700">{h.changedBy}:</span> {h.details}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* DIALOGS / FORM MODALS */}

      {/* Add Property Modal */}
      {showAddPropModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="add-property-modal">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-6 flex flex-col relative my-8">
            <button 
              onClick={() => setShowAddPropModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-display font-bold text-slate-900">Create Property Collection</h3>
              <p className="text-xs text-slate-400 mt-0.5">Initialize a building portfolio group for housing units.</p>
            </div>

            <form onSubmit={handlePropertySubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-600">Property Building Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oakridge Heights"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-600">Physical Address in Rwanda</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KN 76 Rd, Kiyovu, Nyarugenge, Kigali"
                  value={newPropAddr}
                  onChange={(e) => setNewPropAddr(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                />
              </div>

              {/* Rwandan Geographic Location Selectors */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Rwanda Province Helper</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none text-slate-700 font-medium"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        if (!newPropAddr.includes(val)) {
                          setNewPropAddr(prev => prev ? `${prev}, ${val}` : val);
                        }
                      }
                    }}
                  >
                    <option value="">-- Click to Append --</option>
                    <option value="Kigali City">Kigali City</option>
                    <option value="Eastern Province">Eastern Province</option>
                    <option value="Western Province">Western Province</option>
                    <option value="Northern Province">Northern Province</option>
                    <option value="Southern Province">Southern Province</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">District / Location Helper</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none text-slate-700 font-medium"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        if (!newPropAddr.includes(val)) {
                          setNewPropAddr(prev => prev ? `${val}, ${prev}` : val);
                        }
                      }
                    }}
                  >
                    <option value="">-- Click to Prepend --</option>
                    <option value="Nyarugenge">Nyarugenge (Downtown Kigali)</option>
                    <option value="Gasabo">Gasabo (Kigali Center)</option>
                    <option value="Kicukiro">Kicukiro (Kigali East)</option>
                    <option value="Musanze">Musanze (Northern Region)</option>
                    <option value="Rubavu">Rubavu (Western Resort Region)</option>
                    <option value="Huye">Huye (Southern Academic Region)</option>
                    <option value="Rwamagana">Rwamagana (Eastern Province)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-600">Overview Description</label>
                <textarea
                  placeholder="Describe development, concierge rules, facilities, spaces..."
                  value={newPropDesc}
                  rows={3}
                  onChange={(e) => setNewPropDesc(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none resize-none"
                ></textarea>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold text-slate-600 block">Cover / Gallery Photos (Limit 12)</label>
                <div className="flex gap-2 items-center flex-wrap">
                  {newPropPhotos.map((img, idx) => (
                    <div key={idx} className="w-16 h-12 bg-slate-100 rounded-lg overflow-hidden border relative">
                      <img src={img} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {newPropPhotos.length < 12 && (
                    <label className="w-16 h-12 bg-slate-50 border border-dashed rounded-lg flex flex-col justify-center items-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors">
                      <Camera className="w-4 h-4" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePropPhotoUpload} />
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer"
              >
                Assemble Building Portfolio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showAddUnitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" id="add-unit-modal">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-6 relative">
            <button 
              onClick={() => setShowAddUnitModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-display font-bold text-slate-900">Provision Unit Room</h3>
              <p className="text-xs text-slate-400">Establish a rental space inside {selectedProperty?.name}.</p>
            </div>

            <form onSubmit={handleUnitSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-600">Unit Number / Floor ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit-3B"
                  value={newUnitNum}
                  onChange={(e) => setNewUnitNum(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-600">Unit Type Specification</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Studio, 2 Bedroom luxury, Office space"
                  value={newUnitType}
                  onChange={(e) => setNewUnitType(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-600">Monthly Standard Rate (FRW)</label>
                <input
                  type="number"
                  required
                  value={newUnitRent}
                  onChange={(e) => setNewUnitRent(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer"
              >
                Provision Unit Space
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Log Manual Direct Receipt Payment Modal */}
      {showManualPaymentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="manual-payment-receipt-modal">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-6 relative border border-slate-100 shadow-xl">
            <button 
              onClick={() => setShowManualPaymentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <span className="bg-cyan-50 text-cyan-700 border border-cyan-150 px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wide">
                Property Manager Action
              </span>
              <h3 className="text-base font-display font-bold text-slate-900 mt-2">Log Cash / Direct Bank Receipt</h3>
              <p className="text-xs text-slate-500 mt-0.5">Officially reconcile outstanding rent via manual paper receipts or direct bank transfers.</p>
            </div>

            <form onSubmit={handleLogManualPaymentSubmit} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Resident Email</label>
                <input
                  type="email"
                  value={manualPayTenantEmail}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500 select-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Settle Billing Period</label>
                  <input
                    type="text"
                    value={manualPayMonthName}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 outline-none"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Outstanding (Due)</label>
                  <input
                    type="text"
                    value={formatPrice(manualPayAmount, currency)}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Amount to Reconcile ({currency})</label>
                  <CurrencyConverter />
                </div>
                <input
                  type="number"
                  value={manualPayAmount}
                  onChange={(e) => setManualPayAmount(Number(e.target.value))}
                  placeholder="Enter exact cash amount"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-850 outline-none shadow-xs"
                  required
                />
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-start gap-2 text-slate-500 text-[10px] leading-relaxed">
                <Scale className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p>This will record a certified historical transaction entry, zero the resident's dues for this billing month, and issue a digital payment confirmation code.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowManualPaymentModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingPayment}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isLoggingPayment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Logging ledger...
                    </>
                  ) : (
                    "Authorize Reconciliation"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Start New Lease Modal */}
      {showNewLeaseModal && leaseUnit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="start-lease-modal">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5 relative my-8 shadow-2xl border border-slate-200">
            <button 
              onClick={() => { setShowNewLeaseModal(false); setLeaseUnit(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-display font-bold text-slate-900">Activate Tenant Contract</h3>
              <p className="text-xs text-slate-400">Prepare legal residential or service billing details for Unit {leaseUnit.number}.</p>
            </div>

            <form onSubmit={handleLeaseSubmit} className="space-y-4">
              {/* Contract Type Radio Toggles */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Contract & Billing Model</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLeaseType("rent");
                      setLeaseRent(leaseUnit.rentAmount || 150000);
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex flex-col gap-0.5 transition-all text-left cursor-pointer ${
                      leaseType === "rent"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>Rent + Service Fee</span>
                    <span className="text-[9px] opacity-80 font-normal">Full residential tenant</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLeaseType("service_fee");
                      setLeaseRent(19500); // Standard $15 service fee default in FRW (Approx 19,500)
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex flex-col gap-0.5 transition-all text-left cursor-pointer ${
                      leaseType === "service_fee"
                        ? "border-emerald-600 bg-emerald-50/70 text-emerald-700 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>Service Fee Only</span>
                    <span className="text-[9px] opacity-80 font-normal">Unit owner / pays service only</span>
                  </button>
                </div>
              </div>

              {/* Tenant Selection Selector */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Tenant Selection</label>
                
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLeaseCreateTenantMode("existing")}
                    className={`py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${leaseCreateTenantMode === "existing" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Existing Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaseCreateTenantMode("new")}
                    className={`py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${leaseCreateTenantMode === "new" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Register New
                  </button>
                </div>

                {leaseCreateTenantMode === "existing" ? (
                  <div className="space-y-1">
                    <select
                      value={leaseTenantEmail}
                      onChange={(e) => setLeaseTenantEmail(e.target.value)}
                      required={leaseCreateTenantMode === "existing"}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none font-medium text-slate-800 cursor-pointer"
                    >
                      <option value="">-- Choose registered resident --</option>
                      {allUsers.filter(u => u.role === "tenant" || !u.role || u.role === "resident").map((user) => (
                        <option key={user.email} value={user.email}>
                          {user.name || user.email.split("@")[0]} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Resident Full Name</label>
                      <input
                        type="text"
                        required={leaseCreateTenantMode === "new"}
                        placeholder="John Doe"
                        value={newTenantName}
                        onChange={(e) => setNewTenantName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Resident Email Address</label>
                      <input
                        type="email"
                        required={leaseCreateTenantMode === "new"}
                        placeholder="john.doe@gmail.com"
                        value={newTenantEmail}
                        onChange={(e) => setNewTenantEmail(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaseStart}
                    onChange={(e) => setLeaseStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaseEnd}
                    onChange={(e) => setLeaseEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                    {leaseType === "service_fee" ? "Monthly Service Charge (FRW)" : "Lease Monthly Rent Rate (FRW)"}
                  </label>
                  <CurrencyConverter />
                </div>
                <input
                  type="number"
                  required
                  value={leaseRent}
                  onChange={(e) => setLeaseRent(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Equivalent display value: <span className="font-extrabold text-emerald-600">{formatPrice(leaseRent, currency)}</span>
                </p>
                {leaseType === "service_fee" && (
                  <p className="text-[10px] text-amber-800 font-semibold bg-amber-50 border border-amber-150 rounded p-2.5 mt-1.5 leading-normal">
                    &bull; Note: Standard service fee is <strong>$15.00 / month</strong> (Approx. 19,500 FRW). This registers the resident as a <strong>Unit Owner</strong> having bought their unit (Rent defaults to $0/month).
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer capitalize"
              >
                Issue & Start {leaseType === "service_fee" ? "Service Contract" : "Rent Lease"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* End / Cancel Lease Modal Dialog */}
      {showEndLeaseModal && leaseToEnd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" id="end-cancel-lease-dialog">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-6 relative">
            <button 
              onClick={() => { setShowEndLeaseModal(false); setLeaseToEnd(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-display font-bold text-slate-900 capitalize">Confirm: {leaseEndActionType} Lease Contract</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ending or canceling will immediately flip the unit status back to **vacant** and record actions into history tracking.
              </p>
            </div>

            <form onSubmit={handleEndLeaseSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-600">Detailed Action Explanation (Saved in history)</label>
                <textarea
                  required
                  placeholder="e.g. Tenant requested early release due to work re-assignment, keys cleared."
                  value={endExplanation}
                  rows={4}
                  onChange={(e) => setEndExplanation(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer ${leaseEndActionType === "end" ? "bg-slate-700 hover:bg-slate-800" : "bg-rose-600 hover:bg-rose-700"}`}
              >
                Confirm and Release Space Immediately
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Unit Photo Gallery Inline Dialog */}
      {activeUnitGallery && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="unit-photos-modal bg">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-6 flex flex-col relative my-8">
            <button 
              onClick={() => setActiveUnitGallery(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-display font-bold text-slate-900">Unit Room Photos - Unit {activeUnitGallery.number}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{activeUnitGallery.type} &bull; Monthly Rate: {activeUnitGallery.rentAmount.toLocaleString()} FRW</p>
            </div>

            {/* Gallery show and upload */}
            <div className="space-y-4 text-left">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {activeUnitGallery.photos && activeUnitGallery.photos.map((p, idx) => (
                  <div key={idx} className="relative aspect-video bg-slate-50 border rounded-xl overflow-hidden shadow-xs">
                    <img src={p} className="w-full h-full object-cover" />
                  </div>
                ))}
                {(!activeUnitGallery.photos || activeUnitGallery.photos.length < 12) && (
                  <label className="aspect-video bg-slate-50 border border-dashed hover:border-indigo-400 transition-colors rounded-xl flex flex-col justify-center items-center text-slate-400 hover:text-slate-600 cursor-pointer">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-semibold">Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleUnitPhotoUpload(e, activeUnitGallery.id)}
                    />
                  </label>
                )}
              </div>
              {activeUnitGallery.photos && activeUnitGallery.photos.length === 0 && (
                <div className="text-center p-6 text-slate-400 text-xs italic bg-slate-50 rounded-xl border">
                  No interior gallery photos uploaded. Tap "Upload Photo" above to publish unit rooms.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Printable Lease Certificate / Rent Contract Agreement Modal */}
      {activeLeaseCertificate && (
        <div 
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer" 
          id="lease-certificate-viewer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveLeaseCertificate(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6 flex flex-col relative my-8 shadow-2xl border border-slate-200 cursor-default">
            {/* Control buttons inside modal */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 animate-pulse" />
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest font-mono">IKODE SaaS Secure Document</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadContractAsFile(activeLeaseCertificate)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all focus:outline-none cursor-pointer"
                  title="Download contract as plain-text file"
                >
                  <Download className="w-4 h-4" /> Download .txt Deed
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all focus:outline-none cursor-pointer"
                  title="Trigger PDF download or printout"
                >
                  <Printer className="w-4.5 h-4.5" /> Print/Save PDF
                </button>
                <button
                  onClick={() => setActiveLeaseCertificate(null)}
                  className="px-3 py-1.5 text-slate-700 hover:bg-slate-100 transition-colors border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close View
                </button>
              </div>
            </div>

            {/* HIGH FIDELITY PRINTABLE CONTRACT STRUCTURE */}
            <div className="bg-white p-6 border-4 border-double border-slate-350 rounded-xl space-y-6 text-left leading-relaxed text-slate-800 font-sans print-area" id="contract-agreement-sheet">
              {/* Emblem / Header */}
              <div className="text-center space-y-2">
                <div className="flex justify-center items-center gap-2 text-slate-900 font-display font-extrabold text-2xl tracking-wider">
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">IKODE</span>
                  <span>SAAS PROP-TECH SYSTEMS</span>
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Approved Municipal Housing Deed & Lease Agreement Certificate</p>
                <div className="h-0.5 w-16 bg-slate-400 mx-auto rounded"></div>
              </div>

              {/* Lease Metadata Registry Box */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/70 border border-slate-200 p-4 rounded-xl font-mono text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">CONTRACT REFERENCE</span>
                  <span className="font-semibold text-slate-900">IKODE-L-{activeLeaseCertificate.id.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">COMPLIANCE CODE</span>
                  <span className="font-semibold text-slate-900">RWA-MUNI-KGL-8491-00</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">LEASE TERM TYPE</span>
                  <span className="font-semibold text-slate-900 uppercase">{activeLeaseCertificate.leaseType === 'service_fee' ? 'SERVICE FEE AGREEMENT (OWNER)' : 'RESIDENTIAL TENANCY'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">REGISTRATION STATUS</span>
                  <span className="text-emerald-700 font-bold uppercase flex items-center gap-1">● ACTIVE LEDGER</span>
                </div>
              </div>

              {/* Contracting Parties */}
              <div className="space-y-3">
                <h4 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-dashed border-slate-200 pb-1">I. Contracting Parties</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">A. Landlord & Administrator:</span>
                    <p className="font-bold text-slate-800">{currentUser.name || "Alexis Habimana"}</p>
                    <p className="text-[11px] text-slate-500 font-mono italic">Account: {currentUser.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">B. Registered Tenant:</span>
                    <p className="font-bold text-slate-800">SARAH MILLER & ASSOCIATES</p>
                    <p className="text-[11px] text-slate-500 font-mono italic">Account: {activeLeaseCertificate.tenantEmail}</p>
                  </div>
                </div>
              </div>

              {/* Financial Terms & Currencies */}
              <div className="space-y-3">
                <h4 className="font-display font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-dashed border-slate-200 pb-1">
                  {activeLeaseCertificate.leaseType === 'service_fee' ? 'III. Financial Covenants & Core Service Charges' : 'III. Financial Covenants & Core Rent Rates'}
                </h4>
                <p className="text-[11px] text-slate-600">
                  {activeLeaseCertificate.leaseType === 'service_fee'
                    ? "The space owner has purchased their property unit space and holds 0 FRW monthly rental liability. They are standardly covenant-bound to pay communal service charges (including sanitation, security guard patrols, rooftop/gutters care, stairwell electricity & elevator repairs) at the custom rate specified on their unit owner registry."
                    : "The tenant hereby agrees to remit monthly dues in a prompt manner. Figures are calculated based on Rwandan local currency and synchronized into international treasury assets."}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeLeaseCertificate.leaseType === 'service_fee' ? (
                    <>
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                        <span className="text-[10px] text-amber-700 font-bold block uppercase">UNIT OWNER STATUS:</span>
                        <p className="text-sm font-bold text-slate-900">PROPERTY BOUGHT (Space Owner)</p>
                        <p className="text-[11px] text-slate-500 mt-1">Rent liability is <strong>0 FRW / month</strong></p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                        <span className="text-[10px] text-emerald-700 font-bold block uppercase">MONTHLY SERVICE CHARGE:</span>
                        <p className="text-lg font-extrabold text-emerald-800 font-mono">
                          {formatPrice(activeLeaseCertificate.rentAmount, currency)} / month
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">Local Registry Base Value: <strong className="font-mono">{formatPrice(activeLeaseCertificate.rentAmount, "FRW")}</strong></p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">PREFFERED ACTIVE DISPLAY RATE:</span>
                        <p className="text-lg font-extrabold text-indigo-700 font-mono">{formatPrice(activeLeaseCertificate.rentAmount, currency)} <span className="text-[11px] font-normal text-slate-400 lowercase">per billing cycle</span></p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase font-sans">LOCAL REVENUE BASE RATE (RWF):</span>
                        <p className="text-lg font-extrabold text-slate-850 font-mono">{formatPrice(activeLeaseCertificate.rentAmount, "FRW")} <span className="text-[11px] font-normal text-slate-400 lowercase">per calendar month</span></p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Signatures & Execution Section */}
              <div className="pt-6 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 text-xs text-center">
                  <div className="space-y-1 w-full sm:w-auto">
                    <p className="font-mono text-[10px] text-indigo-600 italic">Alexis Gakire (e-sig: Digitally Cleared)</p>
                    <div className="border-b border-slate-300 w-44 mx-auto my-1.5"></div>
                    <p className="font-bold text-slate-900 uppercase">LANDLORD SIGNATURE SEAL</p>
                  </div>

                  {/* Circular Stamp */}
                  <div className="w-20 h-20 border-4 border-dashed border-emerald-500/80 rounded-full flex flex-col justify-center items-center select-none rotate-6 leading-none cursor-help bg-emerald-50 text-emerald-700 shadow-inner" title="Ikode Blockchain Ledger stamp security verification OK">
                    <span className="text-[8px] font-extrabold uppercase tracking-wide">IKODE</span>
                    <span className="text-[12px] font-black text-emerald-800 py-0.5">VALID</span>
                    <span className="text-[7px] font-mono tracking-widest">{activeLeaseCertificate.id.split("-")[1] || "3491-92"}</span>
                  </div>

                  <div className="space-y-1 w-full sm:w-auto">
                    <p className="font-mono text-[10px] text-slate-500 italic">Sarah Miller (e-sig: Verified via Email)</p>
                    <div className="border-b border-slate-300 w-44 mx-auto my-1.5"></div>
                    <p className="font-bold text-slate-900 uppercase">TENANT AGENT SIGNATURE</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Disclaimer & Dedicated Bottom Close Link */}
            <div className="flex flex-col items-center gap-4 pt-1 border-t border-slate-100 no-print">
              <p className="text-[10px] text-slate-400 text-center leading-normal max-w-md">
                Registered with the Ikode International Real Estate network. Data stored in custom SaaS cloud directories for global Diaspora integration.
              </p>
              <button
                onClick={() => setActiveLeaseCertificate(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Return to landlord console"
              >
                <X className="w-4 h-4 text-rose-400 font-extrabold animate-pulse" /> Exit Contract Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENTS LEDGER AUDIT TAB */}
      {activeTab === "payments" && (() => {
        // Compute rent audit metrics for selected month/year
        const auditList = getRentAuditList(auditMonth, auditYear);
        const totalRentExpected = auditList.reduce((sum, item) => sum + item.expectedAmount, 0);
        const totalRentCollected = auditList.reduce((sum, item) => sum + item.totalPaid, 0);
        const totalRentUnpaid = auditList.reduce((sum, item) => sum + item.outstandingAmount, 0);
        const collectionEfficiency = totalRentExpected > 0 ? Math.round((totalRentCollected / totalRentExpected) * 100) : 100;

        const filteredAudit = auditList.filter(item => {
          if (auditFilter === "paid") return item.hasPaid;
          if (auditFilter === "unpaid") return !item.hasPaid;
          return true;
        });

        const selectedMonthLabel = monthsList.find(m => m.index === auditMonth)?.name || "June";

        return (
          <div className="space-y-6 text-left" id="payments-audit-tab-panel">
            {/* Upper control bar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="payments-control-header">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                  Housing Ledger &amp; Rent Delinquency Audit
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Perform real-time billing reconciliation, examine payment profiles, and log direct cash collections.
                </p>
              </div>

              {/* selectors */}
              <div className="flex flex-wrap items-center gap-2" id="audit-selectors-group">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={auditMonth}
                    onChange={(e) => setAuditMonth(Number(e.target.value))}
                    className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                  >
                    {monthsList.map(m => (
                      <option key={m.index} value={m.index}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <select
                    value={auditYear}
                    onChange={(e) => setAuditYear(Number(e.target.value))}
                    className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dashboard Mini widgets for Payments Audit */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="ledger-stats-grid">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected billing</span>
                <span className="text-sm font-extrabold text-slate-800 font-mono mt-1">{formatPrice(totalRentExpected, currency)}</span>
              </div>
              <div className="bg-emerald-50/45 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Settled/Received</span>
                <span className="text-sm font-extrabold text-emerald-800 font-mono mt-1">{formatPrice(totalRentCollected, currency)}</span>
              </div>
              <div className="bg-rose-50/45 p-5 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Unpaid / Delinquent</span>
                <span className="text-sm font-extrabold text-rose-800 font-mono mt-1">{formatPrice(totalRentUnpaid, currency)}</span>
              </div>
              <div className="bg-slate-100 p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collection Ratio</span>
                <span className="text-sm font-extrabold text-slate-800 font-mono mt-1">{collectionEfficiency}%</span>
              </div>
            </div>

            {/* Sub-Tab Navigation Switcher */}
            <div className="flex border-b border-slate-200 gap-6" id="payments-sub-tabs">
              <button
                onClick={() => setPaymentsSubTab("auditor")}
                className={`pb-2.5 text-xs font-bold transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 ${paymentsSubTab === "auditor" ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-400 hover:text-slate-700"}`}
              >
                <Users className="w-3.5 h-3.5" />
                Active Tenant Delinquency Audit ({auditList.length})
              </button>
              <button
                onClick={() => setPaymentsSubTab("feed")}
                className={`pb-2.5 text-xs font-bold transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 ${paymentsSubTab === "feed" ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-400 hover:text-slate-700"}`}
              >
                <Clock className="w-3.5 h-3.5" />
                MTN MoMo Transaction Feed ({allPayments.length})
              </button>
            </div>

            {/* AUDITOR VIEW */}
            {paymentsSubTab === "auditor" && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="auditor-sub-panel">
                {/* Filters */}
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setAuditFilter("all")}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${auditFilter === "all" ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"}`}
                    >
                      All Residents ({auditList.length})
                    </button>
                    <button
                      onClick={() => setAuditFilter("paid")}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${auditFilter === "paid" ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"}`}
                    >
                      Paid ({auditList.filter(a => a.hasPaid).length})
                    </button>
                    <button
                      onClick={() => setAuditFilter("unpaid")}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${auditFilter === "unpaid" ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-200 text-rose-650 hover:bg-slate-50"}`}
                    >
                      Unpaid/Delinquent ({auditList.filter(a => !a.hasPaid).length})
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Billing Cycle: 01-{selectedMonthLabel.substring(0,3).toUpperCase()}-{auditYear}
                  </span>
                </div>

                {/* Table list of tenants */}
                <div className="overflow-x-auto" id="auditor-table-container">
                  {filteredAudit.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs italic">
                      No matching records found for this custom filter.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs" id="rent-audit-master-table">
                      <thead>
                        <tr className="bg-slate-50/55 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-3">Resident / Tenant</th>
                          <th className="px-6 py-3">Assigned Unit</th>
                          <th className="px-6 py-3 font-mono">Standard Rent</th>
                          <th className="px-6 py-3 font-mono">Settled Code</th>
                          <th className="px-6 py-3">Status Label</th>
                          <th className="px-6 py-3 text-right">Ledger Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAudit.map((item, idx) => {
                          const daysOverdue = getDaysOverdueOfSelectedAudit(auditMonth, auditYear);

                          return (
                            <tr key={idx} className="hover:bg-slate-55 transition-colors" id={`audit-row-${idx}`}>
                              {/* Tenant */}
                              <td className="px-6 py-4">
                                <span className="font-semibold text-slate-850 block text-[13px]">{item.tenantEmail}</span>
                                <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">
                                  Lease Term: {item.lease.startDate} to {item.lease.endDate}
                                </span>
                              </td>

                              {/* Unit */}
                              <td className="px-6 py-4 font-medium text-slate-700">
                                {item.property?.name || "Multiple Property"} 
                                <span className="bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded ml-1 text-[10px] font-mono font-bold">
                                  Unit {item.unit?.unitNumber || "N/A"}
                                </span>
                              </td>

                              {/* Expected */}
                              <td className="px-6 py-4 font-bold text-slate-800 font-mono">
                                {formatPrice(item.expectedAmount, currency)}
                              </td>

                              {/* Paid info */}
                              <td className="px-6 py-4 font-mono text-slate-500">
                                {item.hasPaid ? (
                                  <div className="space-y-0.5 animate-fade-in">
                                    <span className="font-bold text-emerald-700 text-[11px] block">Fully Paid</span>
                                    <span className="text-[10px] text-slate-400 block font-sans">Code: {item.payments[0]?.reference.substring(0,14)}</span>
                                  </div>
                                ) : item.pendingPayments && item.pendingPayments.length > 0 ? (
                                  <div className="space-y-1.5 animate-pulse">
                                    <span className="font-bold text-amber-700 text-[11.5px] block">Offline Reported</span>
                                    {item.pendingPayments.map(p => (
                                      <p key={p.id} className="text-[9.5px] font-sans text-slate-500 leading-none">
                                        Ref: <span className="font-bold text-slate-700">{p.reference}</span> ({formatPrice(p.amount, currency)})
                                      </p>
                                    ))}
                                  </div>
                                ) : item.totalPaid > 0 ? (
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-amber-700 animate-fade-in font-sans">Partial: {formatPrice(item.totalPaid, currency)}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">No transactional log</span>
                                )}
                              </td>

                              {/* Status pill */}
                              <td className="px-6 py-4">
                                {item.hasPaid ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    PAID
                                  </span>
                                ) : item.pendingPayments && item.pendingPayments.length > 0 ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                                      PENDING APPROVAL
                                    </span>
                                    <span className="text-[9px] text-amber-600 font-semibold font-sans mt-0.5 ml-1">
                                      Verify offline transfer
                                    </span>
                                  </div>
                                ) : (
                                  <span className="inline-flex flex-col gap-0.5">
                                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                      DELINQUENT ({formatPrice(item.outstandingAmount, currency)} due)
                                    </span>
                                    {daysOverdue > 0 && (
                                      <span className="text-[10px] text-amber-600 font-semibold font-mono mt-0.5 ml-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {daysOverdue} days overdue
                                      </span>
                                    )}
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Log Manual payment if unpaid */}
                                  {!item.hasPaid && (
                                    <>
                                      {item.pendingPayments && item.pendingPayments.length > 0 ? (
                                        <button
                                          onClick={() => {
                                            if (!canRecordPayments) {
                                              triggerPermissionAlert(
                                                "Confirm Resident Payment",
                                                "Accountant",
                                                "Approving pending offline payments, bank wires, or MTN MoMo receipts is restricted to Accountants (SaaS Level 2) or Property Managers (SaaS Level 3) or higher."
                                              );
                                            } else {
                                              handleApproveOfflinePayment(item.pendingPayments[0].id);
                                            }
                                          }}
                                          className="px-3 py-1.5 bg-emerald-600 font-extrabold hover:bg-emerald-700 text-white text-[10px] rounded-lg cursor-pointer transition-colors flex items-center gap-1 whitespace-nowrap shadow-xs"
                                        >
                                          <Check className="w-3 h-3 stroke-[2.5]" /> Confirm Paid
                                        </button>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => {
                                              if (!canRecordPayments) {
                                                triggerPermissionAlert(
                                                  "Log Manual Receipt",
                                                  "Accountant",
                                                  "Recording cash, checks, or offline payments in the general ledger is restricted to Accountants (SaaS Level 2) or Property Managers (SaaS Level 3) or higher."
                                                );
                                              } else {
                                                setManualPayTenantEmail(item.tenantEmail);
                                                setManualPayLeaseId(item.lease.id);
                                                setManualPayAmount(item.outstandingAmount);
                                                setManualPayMonthName(`${selectedMonthLabel} ${auditYear}`);
                                                setShowManualPaymentModal(true);
                                              }
                                            }}
                                            className="px-2.5 py-1 bg-slate-900 text-white font-bold hover:bg-slate-800 text-[10px] rounded-lg cursor-pointer transition-colors"
                                          >
                                            Log Receipt
                                          </button>
                                          
                                          <button
                                            onClick={() => handleSendUnpaidReminder(item.tenantEmail, item.outstandingAmount, `${selectedMonthLabel} ${auditYear}`)}
                                            className="px-2 py-1 text-slate-600 hover:bg-slate-100 text-[10px] rounded-lg border border-slate-200 cursor-pointer transition-colors font-bold"
                                            title="Dispatch in-app MoMo instant SMS alert"
                                          >
                                            Send Reminder
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}
                                  {item.hasPaid && (
                                    <span className="text-[10px] text-emerald-600 font-semibold italic">Reconciled</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* RAW TRANSACTION FEED VIEW */}
            {paymentsSubTab === "feed" && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-left space-y-4 font-sans" id="momo-direct-ledger-panel">
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {allPayments.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic text-xs">
                      No active rent payments logged.
                    </div>
                  ) : (
                    allPayments.map(p => (
                      <div key={p.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50" id={`feed-payment-${p.id}`}>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{p.description}</h4>
                          <p className="text-[10px] text-slate-400">Paid by: <span className="font-mono text-slate-600 font-bold">{p.tenantEmail}</span></p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Reference ID: <span className="text-slate-600 font-semibold font-mono">{p.reference}</span></p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Date: {new Date(p.date).toLocaleString()}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1.5">
                          <span className="text-xs font-black text-slate-900 block font-mono">{formatPrice(p.amount, currency)}</span>
                          {p.status === 'pending_verification' ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 border border-amber-200 rounded font-mono">
                                PENDING APPROVAL
                              </span>
                              <button
                                onClick={() => handleApproveOfflinePayment(p.id)}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[8.5px] rounded cursor-pointer transition-colors"
                              >
                                Confirm Paid
                              </button>
                            </div>
                          ) : (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-100 rounded font-mono uppercase">
                              SUCCESSFUL
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* LEASES & COVENANTS HUB TAB */}
      {activeTab === "bylaws" && (() => {
        // Find properties and units associated with leases
        const getLeaseUnitNumber = (unitId: string) => {
          const unit = units.find(u => u.id === unitId);
          return unit ? `Unit ${unit.number}` : "Unit N/A";
        };

        const getLeasePropertyName = (propertyId: string) => {
          const prop = properties.find(p => p.id === propertyId);
          return prop ? prop.name : "Unknown Property";
        };

        const handleSaveStandards = (e: React.FormEvent) => {
          e.preventDefault();
          if (!canManageCompany) {
            triggerPermissionAlert(
              "Update Community Standards",
              "Company Admin",
              "Altering community covenants, late rent fees, or penalty structures is restricted to Company Admins (SaaS Level 4) or higher."
            );
            return;
          }
          // Save values to localStorage
          localStorage.setItem("ikode_bylaw_1", bylaw1);
          localStorage.setItem("ikode_bylaw_2_rent", bylaw2Rent);
          localStorage.setItem("ikode_bylaw_2_service", bylaw2Service);
          localStorage.setItem("ikode_bylaw_3", bylaw3);
          localStorage.setItem("ikode_penalty_pct", penaltyPct);
          localStorage.setItem("ikode_default_service_amt", defaultServiceAmount);
          setSuccess("Corporate bylaws and payment schedules updated on decentralized storage!");
          setError("");
        };

        return (
          <div className="space-y-6 text-left" id="leases-hub-tab-panel">
            {/* Header controls */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  Lease Contracts &amp; Covenants Hub
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Draft residential tenancies, configure service charges, edit rules, and audit corporate community bylaws.
                </p>
              </div>

              {/* Sub-tab switcher */}
              <div className="flex bg-slate-50 border border-slate-150 p-1.5 rounded-xl self-start md:self-auto">
                <button
                  onClick={() => setLeasesSubTab("agreements")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${leasesSubTab === "agreements" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"}`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Tenancy Contracts ({leases.length})
                </button>
                <button
                  onClick={() => setLeasesSubTab("standards")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${leasesSubTab === "standards" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Community Standards
                </button>
              </div>
            </div>

            {/* Read-Only mode banner for lower roles */}
            {!canManageLeases && leasesSubTab === "agreements" && (
              <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl flex items-start gap-3 text-amber-900">
                <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Read-Only Tenant Agreement Access</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5 font-medium">
                    You are logged in as <strong className="font-semibold uppercase font-mono">{userRole}</strong>. Modifying signed agreements, adjusting monthly rents, or ending leases is restricted to **Leasing Officers** &amp; **Property Managers**.
                  </p>
                </div>
              </div>
            )}

            {!canManageCompany && leasesSubTab === "standards" && (
              <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl flex items-start gap-3 text-amber-900">
                <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Locked Bylaws Configuration</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5 font-medium">
                    As an active <strong className="font-semibold uppercase font-mono">{userRole}</strong>, bylaws editing is locked. Modifying corporate community structures is reserved for **Company Admins** (SaaS Level 4).
                  </p>
                </div>
              </div>
            )}

            {/* SUB-TAB: AGREEMENTS LIST */}
            {leasesSubTab === "agreements" && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  {leases.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs italic">
                      No active lease contracts registered. Go to the properties tab to activate leases on vacant units.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-3.5">Resident / Tenant</th>
                          <th className="px-6 py-3.5">Property Location</th>
                          <th className="px-6 py-3.5">Agreement Type</th>
                          <th className="px-6 py-3.5">Monthly Billing</th>
                          <th className="px-6 py-3.5">Contract Timeline</th>
                          <th className="px-6 py-3.5">Status</th>
                          <th className="px-6 py-3.5 text-right">Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {leases.map((lease) => {
                          const isLeaseActive = lease.status === 'active';
                          return (
                            <tr key={lease.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-bold text-slate-900 block text-[13px]">{lease.tenantEmail}</span>
                                <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Lease ID: {lease.id.substring(0,8)}...</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-slate-800 font-semibold block">{getLeasePropertyName(lease.propertyId)}</span>
                                <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-mono font-bold uppercase inline-block mt-1">
                                  {getLeaseUnitNumber(lease.unitId)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {lease.leaseType === 'service_fee' ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2 py-0.5 text-[10px] font-bold">
                                    Service Charge Only
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2 py-0.5 text-[10px] font-bold">
                                    Standard Rent
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                                {formatPrice(lease.rentAmount, currency)}
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-mono">
                                <div className="space-y-0.5">
                                  <span>{lease.startDate} &rarr; {lease.endDate}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {lease.status === 'active' ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    ACTIVE
                                  </span>
                                ) : lease.status === 'defaulted' ? (
                                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                    DEFAULTED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                    {lease.status.toUpperCase()}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => { setActiveLeaseCertificate(lease); }}
                                    className="p-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                    title="Print lease agreement"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      if (!canManageLeases) {
                                        triggerPermissionAlert("Edit Lease Terms", "Leasing Officer", "Modifying existing lease rent levels, billing styles, or tenancy end dates is restricted to Leasing Officers or Property Managers.");
                                      } else {
                                        setLeaseToEdit(lease);
                                        setEditLeaseRent(lease.rentAmount);
                                        setEditLeaseTenantEmail(lease.tenantEmail);
                                        setEditLeaseStart(lease.startDate);
                                        setEditLeaseEnd(lease.endDate);
                                        setEditLeaseType(lease.leaseType || 'rent');
                                        setEditLeaseStatus(lease.status || 'active');
                                        setShowEditLeaseModal(true);
                                      }
                                    }}
                                    className="p-1.5 bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                    title="Configure agreement settings"
                                  >
                                    <Settings className="w-3.5 h-3.5" />
                                  </button>

                                  {isLeaseActive && (
                                    <>
                                      <button
                                        onClick={() => {
                                          if (!canManageLeases) {
                                            triggerPermissionAlert("End Lease Contract", "Leasing Officer", "Terminating signed tenant contracts and reclaiming the housing unit is restricted to Leasing Officers and Property Managers.");
                                          } else {
                                            setLeaseToEnd(lease);
                                            setLeaseEndActionType("end");
                                            setShowEndLeaseModal(true);
                                          }
                                        }}
                                        className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                      >
                                        End
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (!canManageLeases) {
                                            triggerPermissionAlert("Cancel Lease Agreement", "Leasing Officer", "Cancelling a tenancy with no penalty liabilities is restricted to Leasing Officers and Property Managers.");
                                          } else {
                                            setLeaseToEnd(lease);
                                            setLeaseEndActionType("cancel");
                                            setShowEndLeaseModal(true);
                                          }
                                        }}
                                        className="px-2 py-1 bg-rose-55 text-rose-700 hover:bg-rose-100 border border-rose-100 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB: STANDARDS & BYLAWS */}
            {leasesSubTab === "standards" && (
              <form onSubmit={handleSaveStandards} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Custom Corporate Bylaws &amp; Penalties</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Define operational guidelines that govern maintenance requests, rent penalties, and service fee limits. Updates take immediate effect on tenant portals.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bylaw 1 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase block tracking-wide">Bylaw 1: Physical Maintenance Rules</label>
                    <textarea
                      value={bylaw1}
                      onChange={(e) => setBylaw1(e.target.value)}
                      disabled={!canManageCompany}
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 resize-none font-medium text-slate-700 leading-normal"
                    />
                  </div>

                  {/* Bylaw 2 Rent */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase block tracking-wide">Bylaw 2A: Rent Settlement Rules</label>
                    <textarea
                      value={bylaw2Rent}
                      onChange={(e) => setBylaw2Rent(e.target.value)}
                      disabled={!canManageCompany}
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 resize-none font-medium text-slate-700 leading-normal"
                    />
                  </div>

                  {/* Bylaw 2 Service */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase block tracking-wide">Bylaw 2B: Service Charge Rules</label>
                    <textarea
                      value={bylaw2Service}
                      onChange={(e) => setBylaw2Service(e.target.value)}
                      disabled={!canManageCompany}
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 resize-none font-medium text-slate-700 leading-normal"
                    />
                  </div>

                  {/* Bylaw 3 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase block tracking-wide">Bylaw 3: Common Facilities Rules</label>
                    <textarea
                      value={bylaw3}
                      onChange={(e) => setBylaw3(e.target.value)}
                      disabled={!canManageCompany}
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 resize-none font-medium text-slate-700 leading-normal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  {/* Penalty % */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase block tracking-wide">Late Rent Penalty Fee (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={penaltyPct}
                      onChange={(e) => setPenaltyPct(e.target.value)}
                      disabled={!canManageCompany}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-extrabold outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  {/* Base Service Fee */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase block tracking-wide">Default Service Fee Amount (RWF)</label>
                    <input
                      type="number"
                      min="0"
                      value={defaultServiceAmount}
                      onChange={(e) => setDefaultServiceAmount(e.target.value)}
                      disabled={!canManageCompany}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-extrabold outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Standard display conversion: <span className="font-semibold text-emerald-600">{formatPrice(Number(defaultServiceAmount), currency)}</span>
                    </p>
                  </div>
                </div>

                {canManageCompany && (
                  <div className="flex justify-end pt-4" id="save-bylaws-container">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm"
                    >
                      Commit Community Bylaws
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        );
      })()}

      {/* DOCUMENT HUB TAB */}
      {activeTab === "documents" && (
        <div className="space-y-6 text-left">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h3 className="text-base font-display font-bold text-slate-900">Building Guidelines &amp; Tenant Certificates</h3>
              <p className="text-xs text-slate-400">Publish house policies, emergency codes, or review personal tenant documents.</p>
            </div>
            <button
              onClick={() => {
                if (!canUploadDocs) {
                  triggerPermissionAlert(
                    "Publish New Document",
                    "Leasing Officer",
                    "Uploading circular notices, house policies, or emergency guidelines requires Leasing Officer, Accountant, or Property Manager credentials."
                  );
                } else {
                  setShowAddDocModal(true);
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Publish New Document
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allDocs.length === 0 ? (
              <div className="md:col-span-3 bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100 italic text-xs">
                No registered documents in the archive.
              </div>
            ) : (
              allDocs.map(doc => (
                <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl leading-none">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded font-mono">
                        {doc.category}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-950 text-xs tracking-tight line-clamp-2" title={doc.title}>{doc.title}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono mt-0.5 truncate">{doc.fileName}</p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-[10px]">
                      <div>
                        <p className="text-slate-400 font-medium">Creator: {doc.uploadedBy}</p>
                        <p className="text-slate-400">Size: <span className="font-bold text-slate-600 font-mono">{doc.fileSize}</span></p>
                      </div>
                      {doc.fileData && doc.fileData !== "DEMO_ATTACHMENT_CONTENT" && (
                        <a
                          href={doc.fileData}
                          download={doc.fileName}
                          className="flex items-center gap-1 text-indigo-650 font-bold hover:underline"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
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
                      <span>AI Notes &amp; Landlord Notebook</span>
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

      {/* MESSAGES CHAT TAB */}
      {activeTab === "messages" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-left" style={{ height: "550px" }}>
          {/* Left Column: Grouped/Filtered contact list */}
          <div className={`lg:col-span-1 border-r border-slate-150 flex flex-col bg-white ${mobileChatViewActive ? 'hidden lg:flex' : 'flex'}`}>
            {/* Chat Title exactly like the screenshot */}
            <div className="px-5 pt-5 pb-2 shrink-0">
              <h2 className="text-2xl font-black text-slate-800 font-sans tracking-tight">Chats</h2>
            </div>
            
            {/* Search Input exactly like the screenshot */}
            <div className="px-5 py-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 stroke-[1.8]" />
                <input
                  type="text"
                  placeholder="Search or start a new chat..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100/60 border-0 rounded-full text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-slate-50 transition-all font-sans"
                />
              </div>
            </div>

            {/* Pill-shaped filter badges exactly like the screenshot */}
            {(() => {
              const totalUnreadMessages = allUsers.filter(u => 
                allMessages.some(m => 
                  m.senderEmail.toLowerCase() === u.email.toLowerCase() && 
                  m.receiverEmail.toLowerCase() === currentUser?.email?.toLowerCase() && 
                  !m.read
                )
              ).length;

              return (
                <div className="flex gap-2 px-5 py-3 shrink-0 bg-white border-b border-slate-100 overflow-x-auto scrollbar-none">
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
                    Unread {totalUnreadMessages > 0 ? totalUnreadMessages : "0"}
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

            {/* Contacts list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
              {(() => {
                const isManager = currentUser?.role === "property_manager";
                let contacts = isManager 
                  ? allUsers.filter(u => u.email.toLowerCase() !== currentUser.email.toLowerCase())
                  : allUsers.filter(u => u.role === "property_manager");

                // Fallback list if users aren't loaded or DB is empty
                if (contacts.length === 0) {
                  if (!isManager) {
                    const fallbackPm = { email: "manager@ikode.rw", name: "David Mugisha", role: "property_manager" };
                    contacts.push(fallbackPm as any);
                  } else {
                    const extra = Array.from(new Set(leases.map(l => l.tenantEmail as string))).map((email: any) => ({
                      id: email, email, name: String(email).split("@")[0], role: "tenant"
                    }));
                    contacts.push(...(extra as any[]));
                  }
                }

                // Apply Search query filter
                if (chatSearchQuery.trim()) {
                  const q = chatSearchQuery.toLowerCase();
                  contacts = contacts.filter(contact => 
                    (contact.name || "").toLowerCase().includes(q) ||
                    contact.email.toLowerCase().includes(q)
                  );
                }

                // Apply Chat Filter logic
                contacts = contacts.filter(contact => {
                  const unreadCount = allMessages.filter(m => 
                    m.senderEmail.toLowerCase() === contact.email.toLowerCase() && 
                    m.receiverEmail.toLowerCase() === currentUser?.email?.toLowerCase() && 
                    !m.read
                  ).length;

                  if (chatFilter === "unread") {
                    return unreadCount > 0;
                  } else if (chatFilter === "read") {
                    return unreadCount === 0;
                  }
                  return true;
                });

                if (contacts.length === 0) {
                  return (
                    <div className="py-16 px-4 text-center text-slate-400 text-xs italic font-sans">
                      No chats match your current filter.
                    </div>
                  );
                }

                return contacts.map((contact) => {
                  const isSelected = contact.email.toLowerCase() === selectedChatTenant.toLowerCase();
                  
                  // Stylings per role
                  let roleColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
                  let roleLabel = contact.role || "tenant";
                  if (contact.role === "admin") {
                    roleColor = "bg-rose-50 text-rose-700 border-rose-200";
                  } else if (contact.role === "landlord") {
                    roleColor = "bg-amber-50 text-amber-700 border-amber-220";
                  } else if (contact.role === "property_manager") {
                    roleColor = "bg-teal-50 text-teal-700 border-teal-200";
                    roleLabel = "manager";
                  } else if (contact.role === "technician") {
                    roleColor = "bg-slate-100 text-slate-700 border-slate-300";
                    roleLabel = "technician";
                  }

                  const contactUnreadCount = allMessages.filter(m => 
                    m.senderEmail.toLowerCase() === contact.email.toLowerCase() && 
                    m.receiverEmail.toLowerCase() === currentUser?.email?.toLowerCase() && 
                    !m.read
                  ).length;

                  // Find latest message between currentUser and contact
                  const relevantMsgs = allMessages.filter(m =>
                    (m.senderEmail.toLowerCase() === contact.email.toLowerCase() && m.receiverEmail.toLowerCase() === currentUser?.email?.toLowerCase()) ||
                    (m.senderEmail.toLowerCase() === currentUser?.email?.toLowerCase() && m.receiverEmail.toLowerCase() === contact.email.toLowerCase())
                  );
                  // Sort descending by timestamp
                  const lastMsg = relevantMsgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

                  const displayName = contact.name || contact.email.split("@")[0];
                  const initials = displayName.slice(0, 2).toUpperCase();

                  // Select vibrant gradient for avatar
                  const avatarGradients = [
                    "from-purple-500 to-indigo-600",
                    "from-emerald-400 to-teal-600",
                    "from-rose-400 to-pink-600",
                    "from-amber-400 to-orange-600",
                    "from-sky-400 to-blue-600"
                  ];
                  const hashIndex = Math.abs(contact.email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % avatarGradients.length;
                  const selectedGradient = avatarGradients[hashIndex];

                  return (
                    <button
                      key={contact.email}
                      onClick={() => {
                        setSelectedChatTenant(contact.email);
                        setMobileChatViewActive(true);
                        setError("");
                      }}
                      className={`w-full p-3.5 text-left flex items-center gap-3 hover:bg-slate-50 transition-all cursor-pointer border-l-4 ${
                        isSelected ? 'bg-slate-50/80 border-indigo-600' : 'border-transparent'
                      }`}
                    >
                      {/* Round Avatar exactly like the screenshot */}
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${selectedGradient} text-white flex items-center justify-center font-bold text-xs tracking-wide shadow-sm border border-white/20 shrink-0 relative`}>
                        {initials}
                        {contactUnreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
                        )}
                      </div>

                      {/* Info on the right */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className={`text-xs text-slate-800 font-extrabold truncate font-sans ${isSelected ? 'text-indigo-600' : ''}`}>
                            {displayName}
                          </p>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 border rounded uppercase font-mono tracking-widest leading-none shrink-0 ${roleColor}`}>
                            {roleLabel.replace('_', ' ')}
                          </span>
                        </div>
                        
                        {/* Latest message preview exactly like screenshot */}
                        <div className="flex justify-between items-center w-full">
                          <p className="text-[11px] text-slate-500 truncate font-sans pr-2 max-w-[170px]">
                            {lastMsg ? (
                              <span>
                                {lastMsg.senderEmail.toLowerCase() === currentUser?.email?.toLowerCase() ? "You: " : ""}
                                {lastMsg.content}
                              </span>
                            ) : (
                              <span className="italic text-slate-400 font-medium">No messages yet</span>
                            )}
                          </p>
                          {contactUnreadCount > 0 && (
                            <span className="bg-rose-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0">
                              {contactUnreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Right Column: Chat timeline box */}
          <div className={`lg:col-span-2 flex flex-col justify-between ${!mobileChatViewActive ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileChatViewActive(false)}
                  className="lg:hidden p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  {(() => {
                    const targetUser = allUsers.find(u => u.email.toLowerCase() === selectedChatTenant.toLowerCase());
                    const displayName = targetUser 
                      ? `${targetUser.name} (${targetUser.role?.replace('_', ' ').toUpperCase()})` 
                      : selectedChatTenant;
                    return (
                      <h4 className="font-display font-semibold text-xs leading-none">Chat Stream: {displayName}</h4>
                    );
                  })()}
                  <p className="text-[9px] text-slate-400 mt-1.5">Direct synchronizer connection bridge</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/50">
              {allMessages.filter(m => 
                (m.senderEmail.toLowerCase() === selectedChatTenant.toLowerCase() && m.receiverEmail.toLowerCase() === currentUser.email.toLowerCase()) || 
                (m.senderEmail.toLowerCase() === currentUser.email.toLowerCase() && m.receiverEmail.toLowerCase() === selectedChatTenant.toLowerCase())
              ).length === 0 ? (
                <div className="py-16 text-center text-slate-350 italic text-xs">
                  No chat threads found. Send a warm hello to get started!
                </div>
              ) : (
                allMessages.filter(m => 
                  (m.senderEmail.toLowerCase() === selectedChatTenant.toLowerCase() && m.receiverEmail.toLowerCase() === currentUser.email.toLowerCase()) || 
                  (m.senderEmail.toLowerCase() === currentUser.email.toLowerCase() && m.receiverEmail.toLowerCase() === selectedChatTenant.toLowerCase())
                ).map(msg => {
                  const isMe = msg.senderEmail.toLowerCase() === currentUser.email.toLowerCase();
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl p-3.5 space-y-1.5 shadow-xs text-left ${
                        isMe 
                          ? 'bg-slate-900 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                      }`}>
                        <p className={`text-[10px] font-bold tracking-wide uppercase font-sans ${
                          isMe ? "text-indigo-300" : "text-indigo-600"
                        }`}>
                          {isMe ? "You" : msg.senderName}
                        </p>
                        <p className="text-xs leading-relaxed break-words font-medium">{msg.content}</p>
                        <span className={`text-[9px] block font-mono mt-1 pt-1 border-t ${
                          isMe ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-100"
                        }`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleLandlordSendChat} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                required
                placeholder={`Write back message text to ${selectedChatTenant}...`}
                value={landlordNewMsg}
                onChange={(e) => setLandlordNewMsg(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none text-xs"
              />
              <button
                type="submit"
                disabled={isSendingLandlordMsg}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1 transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Reply
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Landlord Upload Guidelines Modal */}
      {showAddDocModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print" id="publish-doc-modal">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 relative shadow-xl text-left">
            <button 
              onClick={() => setShowAddDocModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-display font-semibold text-slate-900 text-base">Publish Circular Document</h3>
              <p className="text-xs text-slate-400 mt-0.5">Upload safety circulars, garbage guides, or resident checklists.</p>
            </div>

            <form onSubmit={handleLandlordUploadDoc} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-650 block">Descriptive Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Garbage Schedule or Bylaw Amendment 2026"
                  value={uploadDocTitle}
                  onChange={(e) => setUploadDocTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Category Label</label>
                <select
                  value={uploadDocCategory}
                  onChange={(e) => setUploadDocCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="bylaw">Bylaw Rules & Standards</option>
                  <option value="lease">Sample Tenancy Template</option>
                  <option value="other">General Circular Map / Notice</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Assign Property Scope (Optional)</label>
                <select
                  value={uploadDocPropId}
                  onChange={(e) => setUploadDocPropId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="">All Building Estates</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Select Guideline File (.pdf, .png)</label>
                <input
                  type="file"
                  required
                  onChange={handleUploadFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-150 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isUploadingDoc}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-colors"
              >
                {isUploadingDoc ? "Saving Guidelines..." : "Publish Circular"}
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

      {/* Highly Interactive Edit Lease/Agreement Terms Modal */}
      {showEditLeaseModal && leaseToEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="edit-lease-terms-modal">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-6 flex flex-col relative my-8 shadow-2xl border border-slate-200">
            <button 
              onClick={() => { setShowEditLeaseModal(false); setLeaseToEdit(null); }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-display font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                <span>Configure Agreement Laws</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Adjust prices, billing styles, tenancy timeline records, or tenant emails instantly.</p>
            </div>

            <form onSubmit={handleUpdateLeaseSubmit} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Tenant Resident Email</label>
                <input
                  type="email"
                  required
                  value={editLeaseTenantEmail}
                  onChange={(e) => setEditLeaseTenantEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 focus:border-indigo-500 focus:bg-white rounded-xl text-xs sm:text-sm outline-none font-semibold text-slate-800 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editLeaseStart}
                    onChange={(e) => setEditLeaseStart(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">End Date</label>
                  <input
                    type="date"
                    required
                    value={editLeaseEnd}
                    onChange={(e) => setEditLeaseEnd(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Subscription type</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditLeaseType('rent')}
                    className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${editLeaseType === 'rent' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                  >
                    Standard Rent Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditLeaseType('service_fee')}
                    className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${editLeaseType === 'service_fee' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                  >
                    Service Charge Only
                  </button>
                </div>
              </div>


              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Monthly Rate (RWF Local Core)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editLeaseRent}
                  onChange={(e) => setEditLeaseRent(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-extrabold text-slate-900 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Equivalent display value: <span className="font-bold text-emerald-600">{formatPrice(editLeaseRent, currency)}</span>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-4 h-4" /> Save Agreement Terms
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECURITY AUTHORIZATION LOCK MODAL */}
      {permissionAlertModal && permissionAlertModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print" id="permission-lock-modal">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-6 flex flex-col relative shadow-2xl border border-rose-100 text-left">
            <button 
              onClick={() => setPermissionAlertModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex-shrink-0">
                <Lock className="w-6 h-6 text-rose-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-slate-900">Security Limit: Action Locked</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">IKODE OS PROTECTION PROTOCOL &bull; LEVEL 403</p>
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-150">
              <div className="text-xs space-y-1">
                <p className="text-slate-500 font-medium">Attempted Operation:</p>
                <p className="text-slate-900 font-bold font-sans text-sm">{permissionAlertModal.actionAttempted}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-200">
                <div>
                  <p className="text-slate-500 font-medium">Your Active Profile:</p>
                  <p className="text-slate-900 font-extrabold uppercase font-mono mt-0.5 inline-flex items-center gap-1.5 bg-slate-200 px-2 py-0.5 rounded text-[10px]">
                    {userRole}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Required Role Level:</p>
                  <p className="text-rose-700 font-extrabold uppercase font-mono mt-0.5 inline-flex items-center gap-1.5 bg-rose-50 px-2 py-0.5 border border-rose-100 rounded text-[10px]">
                    {permissionAlertModal.requiredRole}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-650 leading-relaxed space-y-3 font-medium">
              <p>{permissionAlertModal.explanation}</p>
              <p className="text-slate-500">
                iKode uses a descending permission cascade. To simulate this operation, simply switch your active role in the <strong className="font-bold text-indigo-600">iKode OS &amp; Roadmap</strong> tab! Once changed, the security rules will automatically grant you access.
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setPermissionAlertModal(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Dismiss Warning
              </button>
              <button
                onClick={() => {
                  setPermissionAlertModal(null);
                  setActiveTab("roadmap");
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                Switch Role Sandbox &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

