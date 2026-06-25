import React, { useState, useEffect } from "react";
import { UserProfile, UserRole } from "./types";
import { loginOrRegister, fetchAdminsCount, setupAdmin, fetchUsers, fetchMessages, fetchMaintenanceRequests, fetchPayments, markMessagesAsRead } from "./utils/api";
import { 
  Building, ShieldAlert, CheckCircle2, User, HelpCircle, Key, 
  Wrench, Users, Shield, Compass, LogIn, LayoutGrid, LogOut, RefreshCw,
  Home, FileText, CreditCard, MessageSquare, ShieldCheck, Menu, X, Eye, EyeOff,
  Bell, Inbox, AlertTriangle
} from "lucide-react";
import LandlordDashboard from "./components/LandlordDashboard";
import MaintenanceHub from "./components/MaintenanceHub";
import AdminPanel from "./components/AdminPanel";
import TenantPortal from "./components/TenantPortal";
import TechnicianView from "./components/TechnicianView";
import TermsModal from "./components/TermsModal";
import LandingPage from "./components/LandingPage";

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [sessionUsers, setSessionUsers] = useState<UserProfile[]>([]);
  const [adminsCount, setAdminsCount] = useState(0);

  // Terms of service status trackers
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // View state management
  const [activeWorkspace, setActiveWorkspace] = useState<string>("dashboard");
  const [tenantActiveTab, setTenantActiveTab] = useState<"overview" | "payments" | "maintenance" | "documents" | "chat">("overview");
  const [landlordActiveTab, setLandlordActiveTab] = useState<"overview" | "properties" | "bylaws" | "payments" | "documents" | "messages" | "security" | "reception" | "marketplace" | "roadmap">("overview");
  const [isSetupView, setIsSetupView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authFormEmail, setAuthFormEmail] = useState("");
  const [authFormName, setAuthFormName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordVal, setPasswordVal] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLocalOrDev = typeof window !== "undefined" && (
    window.location.hostname.includes("localhost") || 
    window.location.hostname.includes("127.0.0.1") || 
    window.location.search.includes("dev=true")
  );
  const [showTestSuite, setShowTestSuite] = useState(true);
  const [logoClicks, setLogoClicks] = useState(0);

  // Background states for messages, tasks, and notifications
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Sync background data
  useEffect(() => {
    if (!profile) return;

    const pollData = async () => {
      try {
        const [msgs, reqs, pays] = await Promise.all([
          fetchMessages(),
          fetchMaintenanceRequests(),
          fetchPayments()
        ]);
        setAllMessages(msgs || []);
        setAllRequests(reqs || []);
        setAllPayments(pays || []);
      } catch (err) {
        console.warn("Background data synchronization failed silently:", err);
      }
    };

    pollData();
    const interval = setInterval(pollData, 5000);
    return () => clearInterval(interval);
  }, [profile?.email]);

  // Compute unread messages count
  const unreadMessagesCount = profile
    ? allMessages.filter(m => m.receiverEmail.toLowerCase() === profile.email.toLowerCase() && !m.read).length
    : 0;

  // Compute pending tasks count
  const pendingTasksCount = profile
    ? (profile.role === "tenant"
        ? allRequests.filter(r => r.tenantEmail.toLowerCase() === profile.email.toLowerCase() && r.status !== "completed").length
        : profile.role === "technician"
        ? allRequests.filter(r => r.assignedTechEmail?.toLowerCase() === profile.email.toLowerCase() && r.status !== "completed").length
        : ["admin", "landlord", "property_manager"].includes(profile.role)
        ? allRequests.filter(r => r.status === "pending" || r.status === "assigned" || r.status === "progressing").length
        : 0)
    : 0;

  // Derive dynamic notifications array
  const derivedNotifications = React.useMemo(() => {
    if (!profile) return [];
    const list: any[] = [];

    const userEmailLower = profile.email.toLowerCase();

    // 1. Unread messages
    const unreadMsgs = allMessages.filter(m => m.receiverEmail.toLowerCase() === userEmailLower && !m.read);
    unreadMsgs.forEach(m => {
      list.push({
        id: m.id,
        title: `Message from ${m.senderName || m.senderEmail}`,
        description: m.content,
        timestamp: m.timestamp,
        type: "message",
        targetTab: profile.role === "tenant" ? "chat" : "messages",
        targetWorkspace: profile.role === "tenant" ? "tenant" : "dashboard"
      });
    });

    // 2. Tasks/Maintenance
    if (profile.role === "tenant") {
      const tenantReqs = allRequests.filter(r => r.tenantEmail.toLowerCase() === userEmailLower && r.status !== "completed");
      tenantReqs.forEach(r => {
        list.push({
          id: r.id,
          title: `Active Maintenance Request`,
          description: `"${r.title}" is currently marked ${r.status}.`,
          timestamp: r.logs?.[r.logs.length - 1]?.timestamp || new Date().toISOString(),
          type: "maintenance",
          targetTab: "maintenance",
          targetWorkspace: "tenant"
        });
      });
    } else if (profile.role === "technician") {
      const techReqs = allRequests.filter(r => r.assignedTechEmail?.toLowerCase() === userEmailLower && r.status !== "completed");
      techReqs.forEach(r => {
        list.push({
          id: r.id,
          title: `New Assigned Repair Order`,
          description: `You have been assigned: "${r.title}".`,
          timestamp: r.logs?.[r.logs.length - 1]?.timestamp || new Date().toISOString(),
          type: "maintenance",
          targetWorkspace: "maintenance"
        });
      });
    } else if (["admin", "landlord", "property_manager"].includes(profile.role)) {
      const openReqs = allRequests.filter(r => r.status === "pending");
      openReqs.forEach(r => {
        list.push({
          id: r.id,
          title: `Unassigned Maintenance Request`,
          description: `"${r.title}" from resident ${r.tenantEmail} is pending technician assignment.`,
          timestamp: r.logs?.[0]?.timestamp || new Date().toISOString(),
          type: "maintenance",
          targetWorkspace: "maintenance"
        });
      });
    }

    // 3. Payments
    if (profile.role === "tenant") {
      const pendingPays = allPayments.filter(p => p.tenantEmail.toLowerCase() === userEmailLower && p.status === "pending");
      pendingPays.forEach(p => {
        list.push({
          id: p.id,
          title: `Payment Pending Approval`,
          description: `Your payment of RWF ${p.amount.toLocaleString()} is currently awaiting landlord approval.`,
          timestamp: p.timestamp,
          type: "payment",
          targetTab: "payments",
          targetWorkspace: "tenant"
        });
      });
    } else if (["admin", "landlord", "property_manager"].includes(profile.role)) {
      const pendingPays = allPayments.filter(p => p.status === "pending");
      pendingPays.forEach(p => {
        list.push({
          id: p.id,
          title: `Tenant Payment Pending Approval`,
          description: `${p.tenantEmail} logged an offline payment of RWF ${p.amount.toLocaleString()} (Ref: ${p.reference || "None"}).`,
          timestamp: p.timestamp,
          type: "payment",
          targetTab: "payments",
          targetWorkspace: "dashboard"
        });
      });
    }

    // Sort notifications chronologically (newest first)
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [profile, allMessages, allRequests, allPayments]);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setShowTestSuite(p => !p);
        return 0;
      }
      return next;
    });
  };

  const syncAdminsCount = async () => {
    try {
      const count = await fetchAdminsCount();
      setAdminsCount(count);
    } catch {
      setAdminsCount(0);
    }
  };

  const syncAllSessionUsers = async () => {
    try {
      const list = await fetchUsers();
      setSessionUsers(list);
    } catch {
      setSessionUsers([]);
    }
  };

  // Mount logic
  useEffect(() => {
    const initSession = async () => {
      setLoading(true);
      setError("");
      try {
        await syncAdminsCount();
        await syncAllSessionUsers();

        // Check if path is setup or if there are no admins in DB
        const isSetupPath = window.location.pathname === "/admin/setup";
        if (isSetupPath) {
          setIsSetupView(true);
        }

        // Auto sign in with stored email or fallback to dundanarcos@gmail.com
        const storedEmail = localStorage.getItem("ikode_user_email");
        const defaultEmail = storedEmail || "dundanarcos@gmail.com";
        const defaultName = storedEmail ? "" : "Dundan Arcos";
        
        const metaUser = await loginOrRegister(defaultEmail, defaultName);
        if (metaUser) {
          setProfile(metaUser);
          setCurrentUserEmail(metaUser.email);
          setCurrentUserName(metaUser.name);
          localStorage.setItem("ikode_user_email", metaUser.email);
          
          if (!metaUser.role) {
            setActiveWorkspace("norole");
          } else {
            setActiveWorkspace(metaUser.role === "admin" ? "admin" : "dashboard");
          }
        }
      } catch (err: any) {
        console.error("Auto sign-in bypassed: ", err);
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, []);

  // Sync workspace view based on login transitions
  useEffect(() => {
    if (profile) {
      if (!profile.role) {
        setActiveWorkspace("norole");
      } else if (profile.role === "tenant") {
        setActiveWorkspace("tenant");
      } else if (profile.role === "technician") {
        setActiveWorkspace("technician");
      } else {
        setActiveWorkspace("dashboard");
      }
    }
  }, [profile]);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authFormEmail) return;
    if (!agreeToTerms) {
      setError("You must acknowledge and agree to Ikode's Terms of Service and Privacy Policy to access this workspace.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await loginOrRegister(authFormEmail, authFormName || authFormEmail.split("@")[0]);
      setProfile(user);
      setCurrentUserEmail(user.email);
      setCurrentUserName(user.name);
      localStorage.setItem("ikode_user_email", user.email);
      await syncAllSessionUsers();
    } catch (err: any) {
      setError(err.message || "Authentication rejected.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authFormEmail) return;
    if (!agreeToTerms) {
      setError("Please read and check the agreement box indicating acceptance of administrative covenants.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await setupAdmin(authFormEmail, authFormName || "Ikode Administrator");
      setProfile(user);
      setCurrentUserEmail(user.email);
      setCurrentUserName(user.name);
      localStorage.setItem("ikode_user_email", user.email);
      setIsSetupView(false);
      await syncAdminsCount();
      await syncAllSessionUsers();
    } catch (err: any) {
      setError(err.message || "First-time setup failed.");
    } finally {
      setLoading(false);
    }
  };

  // Switcher login bypass (helps evaluate all developer perspectives within the single iframe)
  const handleSwapProfile = async (email: string) => {
    setLoading(true);
    setError("");
    try {
      const user = await loginOrRegister(email);
      setProfile(user);
      setCurrentUserEmail(user.email);
      setCurrentUserName(user.name);
      localStorage.setItem("ikode_user_email", user.email);
    } catch (err: any) {
      setError(err.message || "Failed to swap persona.");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!profile) return;
    
    // 1. If it's a message, mark as read
    if (notif.type === "message") {
      try {
        const msgItem = allMessages.find(m => m.id === notif.id);
        if (msgItem) {
          await markMessagesAsRead(msgItem.senderEmail, profile.email);
          // Refresh messages list in background
          const updated = await fetchMessages();
          setAllMessages(updated || []);
        }
      } catch (err) {
        console.warn("Failed marking message as read upon notification click:", err);
      }
    }

    // 2. Perform navigation based on target
    if (notif.targetWorkspace) {
      setActiveWorkspace(notif.targetWorkspace);
    }
    if (notif.targetTab) {
      if (notif.targetWorkspace === "tenant") {
        setTenantActiveTab(notif.targetTab);
      } else if (notif.targetWorkspace === "dashboard") {
        setLandlordActiveTab(notif.targetTab);
      }
    }

    setNotificationsOpen(false);
  };

  const handleLogout = () => {
    setProfile(null);
    setCurrentUserEmail("");
    setCurrentUserName("");
    localStorage.removeItem("ikode_user_email");
    setActiveWorkspace("login");
  };

  // Helper to retrieve initials for profile circles
  const getInitials = (name: string) => {
    if (!name) return "IK";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper icons for the switcher list
  const getRoleColorLabel = (role?: UserRole) => {
    switch (role) {
      case "admin": return "rose";
      case "landlord": return "indigo";
      case "property_manager": return "cyan";
      case "tenant": return "emerald";
      case "technician": return "amber";
      default: return "slate";
    }
  };

  const renderSidebarLinks = () => {
    if (!profile) return null;
    const role = profile.role;

    if (role === "tenant") {
      const links = [
        { id: "overview", label: "Dashboard", icon: Home },
        { id: "maintenance", label: "Maintenance", icon: Wrench },
        { id: "payments", label: "Payments", icon: CreditCard },
        { id: "documents", label: "Documents", icon: FileText },
        { id: "chat", label: "Messages", icon: MessageSquare },
      ];
      return links.map(link => {
        const isActive = activeWorkspace === "tenant" && tenantActiveTab === link.id;
        return (
          <button
            key={link.id}
            type="button"
            onClick={() => {
              setActiveWorkspace("tenant");
              setTenantActiveTab(link.id as any);
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${isActive ? "bg-slate-800 text-[#fca311]" : "text-slate-300 hover:bg-slate-800/40 hover:text-white"}`}
          >
            <link.icon className={`w-4 h-4 ${isActive ? "text-[#fca311]" : "text-slate-400"}`} />
            <span className="flex-1 text-left">{link.label}</span>
            {link.id === "chat" && unreadMessagesCount > 0 && (
              <span className="bg-rose-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center animate-pulse shrink-0">
                {unreadMessagesCount}
              </span>
            )}
            {link.id === "maintenance" && pendingTasksCount > 0 && (
              <span className="bg-amber-500 text-slate-900 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center shrink-0">
                {pendingTasksCount}
              </span>
            )}
          </button>
        );
      });
    }

    if (role && role !== "tenant" && role !== "technician") {
      const links: { id: string; label: string; icon: any; type: string }[] = [];
      
      // All these roles have the primary Dashboard
      links.push({ id: "overview", label: "Dashboard", icon: Home, type: "landlord_tab" });
      
      // Platform OS & Roadmap
      if (role === "admin" || role === "landlord" || role === "property_manager") {
        links.push({ id: "roadmap", label: "iKode OS & Roadmap", icon: LayoutGrid, type: "landlord_tab" });
      }
      
      if (role === "admin") {
        links.push({ id: "marketplace", label: "AppFolio Market", icon: Compass, type: "landlord_tab" });
      }
      
      if (role === "admin" || role === "landlord" || role === "property_manager" || role === "leasing_officer" || role === "property_owner" || role === "accountant") {
        links.push({ id: "properties", label: "Properties", icon: Building, type: "landlord_tab" });
      }
      
      if (role === "admin" || role === "landlord" || role === "property_manager" || role === "leasing_officer") {
        links.push({ id: "bylaws", label: "Leases", icon: ShieldCheck, type: "landlord_tab" });
      } else if (role === "accountant" || role === "property_owner") {
        links.push({ id: "bylaws", label: "Leases (View)", icon: ShieldCheck, type: "landlord_tab" });
      }
      
      if (role === "admin" || role === "landlord" || role === "property_manager") {
        links.push({ id: "maintenance", label: "Maintenance", icon: Wrench, type: "workspace" });
      }
      
      if (role === "admin" || role === "landlord" || role === "property_manager" || role === "accountant" || role === "property_owner") {
        links.push({ id: "payments", label: "Payments", icon: CreditCard, type: "landlord_tab" });
      }
      
      if (role === "admin" || role === "landlord" || role === "property_manager" || role === "accountant" || role === "leasing_officer" || role === "property_owner") {
        links.push({ id: "documents", label: "Documents", icon: FileText, type: "landlord_tab" });
      }
      
      if (role === "admin" || role === "landlord" || role === "property_manager" || role === "leasing_officer" || role === "receptionist") {
        links.push({ id: "messages", label: "Messages", icon: MessageSquare, type: "landlord_tab" });
      }
      
      if (role === "admin" || role === "landlord" || role === "security_guard") {
        links.push({ id: "security", label: "Security Guard", icon: Shield, type: "landlord_tab" });
      }
      
      if (role === "admin" || role === "landlord" || role === "receptionist") {
        links.push({ id: "reception", label: "Reception/Front Desk", icon: Users, type: "landlord_tab" });
      }

      const elements = links.map(link => {
        const isActive = link.type === "workspace" 
          ? activeWorkspace === link.id 
          : (activeWorkspace === "dashboard" && landlordActiveTab === link.id);
        return (
          <button
            key={link.id}
            type="button"
            onClick={() => {
              if (link.type === "workspace") {
                setActiveWorkspace(link.id);
              } else {
                setActiveWorkspace("dashboard");
                setLandlordActiveTab(link.id as any);
              }
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${isActive ? "bg-slate-800 text-[#fca311]" : "text-slate-300 hover:bg-slate-800/40 hover:text-white"}`}
          >
            <link.icon className={`w-4 h-4 ${isActive ? "text-[#fca311]" : "text-slate-400"}`} />
            <span className="flex-1 text-left">{link.label}</span>
            {link.id === "messages" && unreadMessagesCount > 0 && (
              <span className="bg-rose-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center animate-pulse shrink-0">
                {unreadMessagesCount}
              </span>
            )}
            {link.id === "maintenance" && pendingTasksCount > 0 && (
              <span className="bg-amber-500 text-slate-900 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center shrink-0">
                {pendingTasksCount}
              </span>
            )}
          </button>
        );
      });

      if (role === "admin") {
        const isAdminActive = activeWorkspace === "admin";
        elements.push(
          <button
            key="admin_roles"
            type="button"
            onClick={() => {
              setActiveWorkspace("admin");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${isAdminActive ? "bg-slate-800 text-rose-400" : "text-slate-300 hover:bg-slate-800/40 hover:text-white"}`}
          >
            <ShieldAlert className={`w-4 h-4 ${isAdminActive ? "text-rose-400" : "text-slate-400"}`} />
            <span>Admin Roles</span>
          </button>
        );
      }

      return elements;
    }

    if (role === "technician") {
      const links = [
        { id: "technician", label: "Work Orders", icon: FileText, type: "workspace" },
        { id: "maintenance", label: "Repairs Board", icon: Wrench, type: "workspace" },
      ];
      return links.map(link => {
        const isActive = activeWorkspace === link.id;
        return (
          <button
            key={link.id}
            type="button"
            onClick={() => {
              setActiveWorkspace(link.id);
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${isActive ? "bg-slate-800 text-[#fca311]" : "text-slate-300 hover:bg-slate-800/40 hover:text-white"}`}
          >
            <link.icon className={`w-4 h-4 ${isActive ? "text-[#fca311]" : "text-slate-400"}`} />
            <span className="flex-1 text-left">{link.label}</span>
            {link.id === "technician" && pendingTasksCount > 0 && (
              <span className="bg-amber-500 text-slate-900 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center shrink-0">
                {pendingTasksCount}
              </span>
            )}
          </button>
        );
      });
    }

    return null;
  };

  const userInitials = profile ? getInitials(profile.name) : "IK";
  const userRoleDisplay = profile ? (
    profile.role === "admin" ? "Super Admin" :
    profile.role === "landlord" ? "Company Admin" :
    profile.role === "property_manager" ? "Property Manager" :
    profile.role === "accountant" ? "Accountant" :
    profile.role === "leasing_officer" ? "Leasing Officer" :
    profile.role === "property_owner" ? "Property Owner" :
    profile.role === "tenant" ? "Tenant" :
    profile.role === "technician" ? "Technician" :
    profile.role === "security_guard" ? "Security Guard" :
    profile.role === "receptionist" ? "Front Desk" :
    "Registered User"
  ) : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center items-center py-20 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
        <span className="text-sm text-slate-400 font-medium">Validating Ikode core context...</span>
      </div>
    );
  }

  if (!profile) {
    if (showLanding) {
      return (
        <LandingPage 
          onOpenPortal={() => { setIsSetupView(false); setShowLanding(false); }}
          onOpenSignUp={() => { setIsSetupView(true); setShowLanding(false); }}
        />
      );
    }

    return (
      <div className="min-h-screen flex flex-col md:flex-row text-slate-800 bg-[#FAF9F6]" id="auth-split-layout">
        {/* LEFT COLUMN: Dark Panel */}
        <div className="md:w-[45%] bg-[#111e2e] p-8 md:p-12 lg:p-16 flex flex-col justify-between text-white relative overflow-hidden shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => setShowLanding(true)}>
            <div className="w-9 h-9 bg-[#fca311] rounded-2xl flex items-center justify-center font-bold text-black text-lg shadow-sm">
              i
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white leading-none">Ikode</span>
          </div>

          {/* Core Branding Pitch */}
          <div className="my-12 md:my-auto space-y-6 max-w-md">
            <h2 className="text-3xl md:text-4.5xl font-display font-extrabold tracking-tight leading-[1.15] text-white">
              Calm property management for modern landlords.
            </h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed font-medium">
              Everything you need to run a portfolio — leases, maintenance, payments, conversations — in one place.
            </p>
          </div>

          {/* Footer */}
          <div className="text-xs text-slate-400 font-medium">
            &copy; 2026 Ikode
          </div>
        </div>

        {/* RIGHT COLUMN: Soft Warm Alabaster Panel */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-16 overflow-y-auto">
          <div className="w-full max-w-md space-y-6">
            
            <button 
              type="button"
              onClick={() => setShowLanding(true)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              &larr; Back to homepage
            </button>

            {/* Tab switchers in a pill wrapper */}
            <div className="bg-[#f0ece3] p-1.5 rounded-2xl flex items-center shadow-xs">
              <button
                type="button"
                onClick={() => { setIsSetupView(false); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${!isSetupView ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setIsSetupView(true); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${isSetupView ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Create account
              </button>
            </div>

            {/* Main Auth Form Container Card */}
            <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 space-y-6 text-left">
              {isSetupView || adminsCount === 0 ? (
                /* CREATE ACCOUNT OR SETUP ADMIN */
                <form onSubmit={adminsCount === 0 ? handleSetupAdminSubmit : handleManualLogin} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900 font-display">Create an account</h3>
                    <p className="text-slate-400 text-xs mt-0.5 font-sans">
                      {adminsCount === 0 
                        ? "No administrator account exists yet. Setup the master console." 
                        : "Register your workspace profile."}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Miller"
                      value={authFormName}
                      onChange={(e) => setAuthFormName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#f0f4f8] border-0 focus:ring-2 focus:ring-indigo-500 rounded-xl text-sm outline-none font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="name@gmail.com"
                      value={authFormEmail}
                      onChange={(e) => setAuthFormEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-[#f0f4f8] border-0 focus:ring-2 focus:ring-indigo-500 rounded-xl text-sm outline-none font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="•••••••••••••"
                        value={passwordVal}
                        onChange={(e) => setPasswordVal(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-[#f0f4f8] border-0 focus:ring-2 focus:ring-indigo-500 rounded-xl text-sm outline-none font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-1 font-sans">
                    <input
                      type="checkbox"
                      id="setup-terms-check"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mt-1 accent-indigo-600 cursor-pointer h-4 w-4 rounded"
                    />
                    <label htmlFor="setup-terms-check" className="text-[11px] text-slate-500 select-none cursor-pointer leading-normal">
                      I have read and accept the{" "}
                      <button
                        type="button"
                        onClick={() => setIsTermsOpen(true)}
                        className="text-indigo-600 hover:underline font-semibold focus:outline-none"
                      >
                        Ikode SaaS Platform Terms of Service
                      </button>
                    </label>
                  </div>

                  {error && <div className="text-rose-600 text-xs font-semibold bg-rose-50 p-2.5 rounded-lg">{error}</div>}

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#111e2e] hover:bg-black text-white font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" /> Create profile
                  </button>
                </form>
              ) : (
                /* SIGN IN */
                <form onSubmit={handleManualLogin} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900 font-display">Welcome back</h3>
                    <p className="text-slate-400 text-xs mt-0.5 font-sans">Sign in to your Ikode workspace.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. tsatsapastore@gmail.com"
                      value={authFormEmail}
                      onChange={(e) => setAuthFormEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-[#f0f4f8] border-0 focus:ring-2 focus:ring-indigo-500 rounded-xl text-sm outline-none font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="•••••••••••••"
                        value={passwordVal}
                        onChange={(e) => setPasswordVal(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-[#f0f4f8] border-0 focus:ring-2 focus:ring-indigo-500 rounded-xl text-sm outline-none font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-1 font-sans">
                    <input
                      type="checkbox"
                      id="login-terms-check"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mt-1 accent-indigo-600 cursor-pointer h-4 w-4 rounded"
                    />
                    <label htmlFor="login-terms-check" className="text-[11px] text-slate-500 select-none cursor-pointer leading-tight">
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setIsTermsOpen(true)}
                        className="text-indigo-600 hover:underline font-semibold focus:outline-none"
                      >
                        Ikode SaaS Platform Terms of Service
                      </button>
                    </label>
                  </div>

                  {error && <div className="text-rose-600 text-xs font-semibold bg-rose-50 p-2.5 rounded-lg font-sans">{error}</div>}

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#111e2e] hover:bg-black text-white font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-colors cursor-pointer font-sans"
                  >
                    Sign in
                  </button>
                </form>
              )}
            </div>

            {/* Sandbox Evaluation Swappers */}
            {showTestSuite && (
              <div className="bg-white/80 p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-3">
                <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block text-center">
                  Sandbox Demo Profiles (Instant Click to Access)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
                  <button onClick={() => { setAuthFormEmail("alexis@ikode.rw"); setAuthFormName("Alexis Habimana"); setAgreeToTerms(true); loginOrRegister("alexis@ikode.rw", "Alexis Habimana").then(setProfile); }} className="hover:bg-slate-100/80 hover:text-indigo-600 text-left bg-slate-50/70 p-2 rounded-xl border border-slate-100 truncate cursor-pointer transition-colors font-medium">
                    👑 Admin (Alexis)
                  </button>
                  <button onClick={() => { setAuthFormEmail("landlord@ikode.rw"); setAuthFormName("James Gakire"); setAgreeToTerms(true); loginOrRegister("landlord@ikode.rw", "James Gakire").then(setProfile); }} className="hover:bg-slate-100/80 hover:text-indigo-600 text-left bg-slate-50/70 p-2 rounded-xl border border-slate-100 truncate cursor-pointer transition-colors font-medium">
                    💼 Landlord (James)
                  </button>
                  <button onClick={() => { setAuthFormEmail("manager@ikode.rw"); setAuthFormName("David Mugisha"); setAgreeToTerms(true); loginOrRegister("manager@ikode.rw", "David Mugisha").then(setProfile); }} className="hover:bg-slate-100/80 hover:text-indigo-600 text-left bg-slate-50/70 p-2 rounded-xl border border-slate-100 truncate cursor-pointer transition-colors font-medium">
                    🏢 Manager (David)
                  </button>
                  <button onClick={() => { setAuthFormEmail("tenant1@gmail.com"); setAuthFormName("Henry Iradukunda"); setAgreeToTerms(true); loginOrRegister("tenant1@gmail.com", "Henry Iradukunda").then(setProfile); }} className="hover:bg-slate-100/80 hover:text-indigo-600 text-left bg-slate-50/70 p-2 rounded-xl border border-slate-100 truncate cursor-pointer transition-colors font-bold text-slate-800">
                    🔑 Tenant (Henry)
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Terms of Service modal */}
        <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col md:flex-row text-slate-800" id="main-app-frame">
      
      {/* LEFT SIDEBAR (Desktop) */}
      <aside className="w-64 bg-[#111e2e] text-white flex flex-col justify-between shrink-0 hidden md:flex border-r border-slate-800/20">
        <div className="flex flex-col flex-1">
          {/* Logo block */}
          <div className="p-6 flex items-center gap-2.5 border-b border-slate-800/40 cursor-pointer select-none" onClick={handleLogoClick}>
            <div className="w-8 h-8 bg-[#fca311] rounded-xl flex items-center justify-center font-bold text-black text-base shadow-sm">
              i
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white leading-none">Ikode</span>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {renderSidebarLinks()}
          </div>
        </div>

        {/* Bottom Profile pill */}
        <div className="p-4 border-t border-slate-800/40">
          <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-800/30">
            <div className="w-9 h-9 bg-[#fca311] text-black font-extrabold text-xs rounded-full flex items-center justify-center shadow-xs">
              {userInitials}
            </div>
            <div className="text-left leading-tight truncate flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{currentUserName}</div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#fca311]">{userRoleDisplay}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:text-rose-400 text-slate-400 rounded-lg hover:bg-slate-800/50 transition-colors focus:outline-none shrink-0"
              title="Sign out profile"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER & NAVIGATION */}
      <header className="md:hidden bg-[#111e2e] text-white p-4 flex justify-between items-center relative z-40 shrink-0">
        <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={handleLogoClick}>
          <div className="w-8 h-8 bg-[#fca311] rounded-xl flex items-center justify-center font-bold text-black text-base shadow-sm">
            i
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white leading-none">Ikode</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-[#111e2e] border-t border-slate-800 p-4 space-y-1.5 shadow-xl animate-fade-in">
            <div className="space-y-1">
              {renderSidebarLinks()}
            </div>
            <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#fca311] text-black font-extrabold text-xs rounded-full flex items-center justify-center">
                  {userInitials}
                </div>
                <div className="text-left leading-tight">
                  <div className="text-xs font-bold text-white">{currentUserName}</div>
                  <span className="text-[10px] uppercase font-bold text-[#fca311]">{userRoleDisplay}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* RIGHT CONTENT WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#FAF9F6] relative overflow-hidden">
        
        {/* Sandbox Header / Info utility line with Swap selection */}
        <div className="bg-white border-b border-slate-100/80 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span>Workspace: {activeWorkspace}</span>
            {activeWorkspace === "tenant" && (
              <>
                <span className="text-slate-300">&bull;</span>
                <span className="text-[#fca311]">Tab: {tenantActiveTab}</span>
              </>
            )}
            {activeWorkspace === "dashboard" && (
              <>
                <span className="text-slate-300">&bull;</span>
                <span className="text-[#fca311]">Tab: {landlordActiveTab}</span>
              </>
            )}
          </div>

          {/* Alert Center & Sandbox Selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Bell Icon Notification Button */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all cursor-pointer focus:outline-none flex items-center justify-center border border-slate-200/40 bg-white"
                title="Notifications Alerts"
              >
                <Bell className="w-4 h-4" />
                {derivedNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-mono text-[9px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center animate-bounce">
                    {derivedNotifications.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown List */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 animate-fade-in max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-sans font-bold text-xs text-slate-800">Alert Center</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                      {derivedNotifications.length} active
                    </span>
                  </div>
                  
                  {derivedNotifications.length === 0 ? (
                    <div className="py-8 px-4 text-center space-y-2">
                      <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-400 font-medium font-sans">All caught up! No new alerts.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {derivedNotifications.map((notif: any) => {
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className="p-3 hover:bg-slate-50 cursor-pointer transition-all flex gap-3 text-left"
                          >
                            <div className="mt-0.5 shrink-0">
                              {notif.type === "message" ? (
                                <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </div>
                              ) : notif.type === "payment" ? (
                                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                                  <CreditCard className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                                  <Wrench className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5 font-sans">
                              <p className="text-xs font-bold text-slate-800 truncate">{notif.title}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">{notif.description}</p>
                              <p className="text-[9px] text-slate-400 font-medium font-mono">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Persona selector for rapid sandboxed sandbox review */}
            {showTestSuite && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-3 py-1 rounded-xl text-xs flex-1 sm:flex-initial">
                <span className="text-slate-400 uppercase tracking-wider font-extrabold text-[9px] shrink-0">Sandbox Selector:</span>
                <select
                  value={currentUserEmail}
                  onChange={(e) => handleSwapProfile(e.target.value)}
                  className="bg-transparent border-0 text-slate-700 font-bold outline-none cursor-pointer py-0.5 text-xs font-sans w-full"
                >
                  <option value="" disabled>Change sandbox profile...</option>
                  {sessionUsers.map((item) => (
                    <option key={item.id} value={item.email}>
                      [{item.role || "No Role"}] {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Workspace Rendering Box */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8" id="workspace-dynamic-render-wrapper">
          {activeWorkspace === "norole" ? (
            /* NO ROLE ASSIGNED WALL */
            <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-3xl border border-slate-150 shadow-md text-center space-y-6 text-slate-700">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-full w-fit mx-auto border border-amber-100">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-lg text-slate-900">No Role Assigned</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Your account has been registered, but no role has been designated yet. Please contact an Ikode administrator or swap profiles using the tester sandbox tool.
                </p>
              </div>
            </div>
          ) : (
            /* WORKSPACE DESKS */
            <div id="active-work-desk" className="relative animate-fade-in">
              {activeWorkspace === "dashboard" && (
                <LandlordDashboard 
                  currentUser={profile} 
                  activeTab={landlordActiveTab} 
                  onTabChange={setLandlordActiveTab} 
                />
              )}
              {activeWorkspace === "maintenance" && <MaintenanceHub currentUser={profile} />}
              {activeWorkspace === "admin" && <AdminPanel currentUser={profile} onRefreshSessionUsers={syncAllSessionUsers} />}
              {activeWorkspace === "tenant" && (
                <TenantPortal 
                  currentUser={profile} 
                  activeTab={tenantActiveTab} 
                  onTabChange={setTenantActiveTab} 
                  onNavigateToMaintenance={() => { 
                    setActiveWorkspace("tenant"); 
                    setTenantActiveTab("maintenance"); 
                  }} 
                />
              )}
              {activeWorkspace === "technician" && <TechnicianView currentUser={profile} />}
            </div>
          )}
        </div>

        {/* Right Pane Footer credit line */}
        <footer className="py-5 border-t border-slate-100 bg-white text-center text-xs text-slate-400 font-medium shrink-0 no-print">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p>Ikode SaaS Platform &bull; Professional Edition</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsTermsOpen(true)}
                className="hover:underline font-semibold text-indigo-600 focus:outline-none cursor-pointer"
              >
                Terms of Service Agreement
              </button>
              <span>&bull;</span>
              <span>Privacy Policy</span>
            </div>
          </div>
        </footer>

      </div>

      {/* Reusable Platform Terms of Use Modal */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
}
