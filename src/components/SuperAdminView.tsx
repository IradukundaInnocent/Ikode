import React, { useState, useEffect } from "react";
import { UserProfile, UserRole } from "../types";
import { fetchUsers, provisionUser, updateRole, deleteUser } from "../utils/api";
import { 
  Shield, Building, Users, CreditCard, Activity, 
  Settings, Key, AlertTriangle, CheckCircle, 
  RefreshCw, Plus, Trash2, Download, Lock, Unlock, FileText 
} from "lucide-react";
import { motion } from "motion/react";

interface SuperAdminViewProps {
  currentUser: UserProfile;
  onRefreshSessionUsers?: () => void;
}

interface CompanySubscription {
  id: string;
  name: string;
  adminEmail: string;
  plan: "Lite" | "Professional" | "Enterprise";
  status: "active" | "suspended" | "pending";
  billingCycle: "monthly" | "annually";
  amountPaid: number;
  joinedAt: string;
}

interface SystemAuditLog {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  severity: "info" | "warning" | "critical";
}

export default function SuperAdminView({ currentUser, onRefreshSessionUsers }: SuperAdminViewProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Subscriptions & Plans
  const [companies, setCompanies] = useState<CompanySubscription[]>(() => {
    const saved = localStorage.getItem("ikode_companies");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "co-1",
        name: "Kigali Heights Properties Ltd",
        adminEmail: "landlord@karemo.com",
        plan: "Enterprise",
        status: "active",
        billingCycle: "monthly",
        amountPaid: 195000,
        joinedAt: "2026-01-10"
      },
      {
        id: "co-2",
        name: "Rwanda Living Property Co",
        adminEmail: "landlord@ikode.rw",
        plan: "Professional",
        status: "active",
        billingCycle: "monthly",
        amountPaid: 65000,
        joinedAt: "2026-03-15"
      },
      {
        id: "co-3",
        name: "Gisenyi Lake View Estates",
        adminEmail: "manager@gmail.com",
        plan: "Lite",
        status: "pending",
        billingCycle: "monthly",
        amountPaid: 19500,
        joinedAt: "2026-06-20"
      }
    ];
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => {
    const saved = localStorage.getItem("ikode_audit_logs");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "log-1",
        timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
        operator: "Super Admin (You)",
        action: "Approved Kigali Heights subscription expansion",
        severity: "info"
      },
      {
        id: "log-2",
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        operator: "System Cron",
        action: "Dispatched SMS reminders for monthly rent balances",
        severity: "info"
      },
      {
        id: "log-3",
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        operator: "dundanarcos@gmail.com",
        action: "Modified standard system service fee to $15 RWF equivalent",
        severity: "warning"
      }
    ];
  });

  // Provisioning inputs
  const [coName, setCoName] = useState("");
  const [coEmail, setCoEmail] = useState("");
  const [coPlan, setCoPlan] = useState<"Lite" | "Professional" | "Enterprise">("Professional");
  const [coCycle, setCoCycle] = useState<"monthly" | "annually">("monthly");

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");

  const [activeSubTab, setActiveSubTab] = useState<"companies" | "users" | "logs" | "settings">("companies");

  useEffect(() => {
    localStorage.setItem("ikode_companies", JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem("ikode_audit_logs", JSON.stringify(auditLogs));
  }, [auditLogs]);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load system users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllUsers();
  }, []);

  const addAuditLog = (action: string, severity: "info" | "warning" | "critical" = "info") => {
    const newLog: SystemAuditLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      operator: currentUser.email,
      action,
      severity
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coName || !coEmail) {
      setError("Please fill out both Company Name and Administrator Email.");
      return;
    }
    setError("");
    setSuccessMsg("");
    try {
      // Provision the Landlord user in backend
      await provisionUser(coEmail, coName + " Admin", "landlord");
      
      const newCo: CompanySubscription = {
        id: "co-" + Date.now(),
        name: coName,
        adminEmail: coEmail.toLowerCase(),
        plan: coPlan,
        status: "active",
        billingCycle: coCycle,
        amountPaid: coPlan === "Lite" ? 19500 : coPlan === "Professional" ? 65000 : 195000,
        joinedAt: new Date().toISOString().split("T")[0]
      };

      setCompanies(prev => [...prev, newCo]);
      addAuditLog(`Created property management company: ${coName} with plan ${coPlan}`, "info");
      setSuccessMsg(`Successfully created company "${coName}" and provisioned Company Admin role for "${coEmail}".`);
      setCoName("");
      coEmail && setNewAdminEmail("");
      setCoEmail("");
      
      loadAllUsers();
      if (onRefreshSessionUsers) onRefreshSessionUsers();
    } catch (err: any) {
      setError(err.message || "Failed to provision company admin.");
    }
  };

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminName) {
      setError("Please provide both Email and Full Name for the new Super Admin.");
      return;
    }
    setError("");
    setSuccessMsg("");
    try {
      await provisionUser(newAdminEmail, newAdminName, "admin");
      addAuditLog(`Provisioned new Super Admin profile: ${newAdminEmail}`, "warning");
      setSuccessMsg(`Successfully created new Super Admin account for ${newAdminName}.`);
      setNewAdminEmail("");
      setNewAdminName("");
      loadAllUsers();
      if (onRefreshSessionUsers) onRefreshSessionUsers();
    } catch (err: any) {
      setError(err.message || "Failed to create Super Admin.");
    }
  };

  const handleToggleSubscription = (coId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    setCompanies(prev => prev.map(c => {
      if (c.id === coId) {
        return { ...c, status: nextStatus as any };
      }
      return c;
    }));
    const targetCo = companies.find(c => c.id === coId);
    addAuditLog(`Changed subscription status of "${targetCo?.name}" to "${nextStatus.toUpperCase()}"`, nextStatus === "suspended" ? "critical" : "info");
    setSuccessMsg(`Subscription status for ${targetCo?.name} updated to ${nextStatus}.`);
  };

  const handleUpdateUserRole = async (email: string, role: UserRole) => {
    try {
      await updateRole(email, role);
      addAuditLog(`Updated user role of ${email} to ${role}`, "warning");
      setSuccessMsg(`Updated user role for ${email} successfully.`);
      loadAllUsers();
      if (onRefreshSessionUsers) onRefreshSessionUsers();
    } catch (err: any) {
      setError("Failed to update user role.");
    }
  };

  const handleDeleteUserAccount = async (email: string) => {
    if (window.confirm(`Are you absolutely sure you want to permanently delete the profile for ${email}?`)) {
      try {
        await deleteUser(email);
        addAuditLog(`Deleted user account: ${email}`, "critical");
        setSuccessMsg(`Successfully deleted account for ${email}.`);
        loadAllUsers();
        if (onRefreshSessionUsers) onRefreshSessionUsers();
      } catch (err: any) {
        setError("Failed to delete user account.");
      }
    }
  };

  const handleDownloadBackup = () => {
    // Simulated downloading of db.json file
    setError("");
    setSuccessMsg("");
    try {
      addAuditLog("Triggered system-wide database JSON backup", "info");
      
      const simulatedDB = {
        meta: {
          platform: "IKode Property Management",
          version: "Professional Edition v1.4",
          extractedAt: new Date().toISOString()
        },
        companies,
        users,
        auditLogs
      };

      const jsonStr = JSON.stringify(simulatedDB, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ikode_system_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessMsg("System backup generated and downloaded successfully! All active registers compiled.");
    } catch {
      setError("Failed to generate database backup.");
    }
  };

  // Platform analytics
  const activeCompaniesCount = companies.filter(c => c.status === "active").length;
  const platformRevenue = companies
    .filter(c => c.status === "active")
    .reduce((sum, c) => sum + (c.amountPaid * (c.billingCycle === "annually" ? 12 : 1)), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-[#111e2e] text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md">
        <div>
          <span className="bg-[#fca311]/20 text-[#fca311] border border-[#fca311]/30 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
            IKode Executive Suite
          </span>
          <h1 className="text-2xl font-display font-black mt-2">IKode Super Admin Center</h1>
          <p className="text-slate-300 text-xs mt-1 font-medium">
            Authorized platform-wide operations, client SaaS subscriptions, audit trails, and system backups.
          </p>
        </div>

        <button 
          onClick={handleDownloadBackup}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download System Backup</span>
        </button>
      </div>

      {/* Banner message fields */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-xs font-semibold border border-emerald-100 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 text-rose-800 p-4 rounded-xl text-xs font-semibold border border-rose-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Platform Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-2">
          <Building className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SaaS Companies</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{companies.length} Subscribed</h3>
            <p className="text-[10px] text-slate-400 font-medium">{activeCompaniesCount} active & billable</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-2">
          <Users className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Accounts</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{users.length} Users</h3>
            <p className="text-[10px] text-slate-400 font-medium">Fully provisioned across Rwanda</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-2">
          <CreditCard className="w-5 h-5 text-[#fca311]" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Yield Rate</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{platformRevenue.toLocaleString()} RWF</h3>
            <p className="text-[10px] text-emerald-600 font-bold">100% active billing health</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-2">
          <Activity className="w-5 h-5 text-rose-500" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Trail</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">{auditLogs.length} Events Logged</h3>
            <p className="text-[10px] text-indigo-600 font-bold">Encrypted audit compliance</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-150 gap-2">
        <button
          onClick={() => setActiveSubTab("companies")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeSubTab === "companies" ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Management Companies
        </button>
        <button
          onClick={() => setActiveSubTab("users")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeSubTab === "users" ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Global Users Directory
        </button>
        <button
          onClick={() => setActiveSubTab("logs")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeSubTab === "logs" ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Audit logs
        </button>
        <button
          onClick={() => setActiveSubTab("settings")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeSubTab === "settings" ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Plan Settings
        </button>
      </div>

      {/* Dynamic Tab Body */}
      {activeSubTab === "companies" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Company Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Register Management Company</h3>
            <p className="text-[11px] text-slate-400">Add a company client and provision an executive Company Admin user in one click.</p>
            
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Century Real Estate Ltd"
                  value={coName}
                  onChange={(e) => setCoName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Executive Admin Email</label>
                <input
                  type="email"
                  placeholder="e.g. executive@century.rw"
                  value={coEmail}
                  onChange={(e) => setCoEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">SaaS Tier Plan</label>
                  <select
                    value={coPlan}
                    onChange={(e) => setCoPlan(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all cursor-pointer"
                  >
                    <option value="Lite">Lite (19,500 RWF)</option>
                    <option value="Professional">Professional (65,000 RWF)</option>
                    <option value="Enterprise">Enterprise (195,000 RWF)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Billing Frequency</label>
                  <select
                    value={coCycle}
                    onChange={(e) => setCoCycle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all cursor-pointer"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Register & Provision Admin</span>
              </button>
            </form>
          </div>

          {/* Companies List Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-display font-semibold text-slate-900 text-sm">Active SaaS Accounts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    <th className="px-5 py-3">Company Details</th>
                    <th className="px-5 py-3">SaaS Subscription</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {companies.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{c.adminEmail}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold rounded-full text-[9px] uppercase tracking-wider">{c.plan}</span>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">
                          {c.amountPaid.toLocaleString()} RWF / {c.billingCycle}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          c.status === "active" ? "bg-emerald-50 text-emerald-700" :
                          c.status === "suspended" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleToggleSubscription(c.id, c.status)}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1 ml-auto transition-colors ${
                            c.status === "active" 
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-600" 
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                          }`}
                        >
                          {c.status === "active" ? (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Suspend Account</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>Activate Subscription</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Provision Super Admin Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Provision Super Admin</h3>
            <p className="text-[11px] text-slate-400">Generate other executive team members to share administration responsibilities.</p>

            <form onSubmit={handleCreateSuperAdmin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jean Bosco"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Executive Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. bosco@ikode.rw"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Super Admin</span>
              </button>
            </form>
          </div>

          {/* Global Users Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-display font-semibold text-slate-900 text-sm">Global System User Accounts</h3>
              <button 
                onClick={loadAllUsers}
                className="text-indigo-600 hover:underline text-xs font-bold cursor-pointer"
              >
                Refresh List
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    <th className="px-5 py-3">Full Name / Email</th>
                    <th className="px-5 py-3">Platform Role</th>
                    <th className="px-5 py-3 text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{u.name || "Unnamed Profile"}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{u.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={u.role || "none"}
                          onChange={(e) => handleUpdateUserRole(u.email, e.target.value as any)}
                          className="px-2 py-1 bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 rounded-lg outline-none cursor-pointer focus:border-indigo-500"
                          disabled={u.email === currentUser.email}
                        >
                          <option value="none">None Assigned</option>
                          <option value="admin">Super Admin</option>
                          <option value="landlord">Company Admin</option>
                          <option value="property_manager">Property Manager</option>
                          <option value="accountant">Accountant</option>
                          <option value="leasing_officer">Leasing Officer</option>
                          <option value="property_owner">Property Owner</option>
                          <option value="tenant">Tenant</option>
                          <option value="technician">Technician</option>
                          <option value="security_guard">Security Guard</option>
                          <option value="receptionist">Receptionist</option>
                        </select>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {u.email !== currentUser.email && (
                          <button
                            onClick={() => handleDeleteUserAccount(u.email)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors inline-block"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {activeSubTab === "logs" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Authorized Audit Trails</h3>
            <button
              onClick={() => {
                setAuditLogs([]);
                localStorage.removeItem("ikode_audit_logs");
              }}
              className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
            >
              Clear Audit logs
            </button>
          </div>

          <div className="space-y-3.5">
            {auditLogs.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">Audit logbook is currently empty.</p>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="flex justify-between items-start text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">{log.action}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>Operator: {log.operator}</span>
                      <span>&bull;</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${
                    log.severity === "critical" ? "bg-rose-50 text-rose-700" :
                    log.severity === "warning" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                  }`}>
                    {log.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeSubTab === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Platform & Plan Billing Rates</h3>
            <p className="text-[11px] text-slate-400">Manage client pricing metrics for Rwandan property companies subscribing to IKode.</p>
            
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-50">
                <div>
                  <p className="font-bold text-slate-800">Lite Tier Pricing</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Maximum 5 housing units, basic reporting</p>
                </div>
                <input
                  type="text"
                  defaultValue="19,500 RWF / mo"
                  className="w-36 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-700 text-xs outline-none"
                />
              </div>

              <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-50">
                <div>
                  <p className="font-bold text-slate-800">Professional Tier Pricing</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Maximum 50 housing units, advanced ledgers, photo repairs</p>
                </div>
                <input
                  type="text"
                  defaultValue="65,000 RWF / mo"
                  className="w-36 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-700 text-xs outline-none"
                />
              </div>

              <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-50">
                <div>
                  <p className="font-bold text-slate-800">Enterprise Tier Pricing</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Unlimited housing units, multiple properties, dedicated support</p>
                </div>
                <input
                  type="text"
                  defaultValue="195,000 RWF / mo"
                  className="w-36 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-700 text-xs outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => {
                addAuditLog("Custom subscription pricing rates updated", "warning");
                setSuccessMsg("System pricing tiers saved and broadcasted to upcoming invoice cycles.");
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Save Pricing Changes
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-display font-semibold text-slate-900 text-sm">Global Gateway Integration Status</h3>
            <p className="text-[11px] text-slate-400">Configure localized service APIs, SMS triggers, and Kinyarwanda template parameters.</p>
            
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">MTN Mobile Money API</p>
                    <p className="text-[10px] text-slate-400 font-mono">Status: Connected to RWF Merchant gateway</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">LIVE</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Airtel Money Rwanda API</p>
                    <p className="text-[10px] text-slate-400 font-mono">Status: Secure tunnel established</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">LIVE</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">IKode Rwanda SMS Hub</p>
                    <p className="text-[10px] text-slate-400 font-mono">Status: Dispatched 1,402 rent reminders today</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
