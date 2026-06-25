import React, { useState, useEffect } from "react";
import { UserProfile, UserRole } from "../types";
import { fetchUsers, provisionUser, updateRole, deleteUser } from "../utils/api";
import { User, Shield, Briefcase, Key, Mail, Plus, CheckCircle, RefreshCw, Trash2 } from "lucide-react";

interface AdminPanelProps {
  currentUser: UserProfile;
  onRefreshSessionUsers?: () => void;
}

export default function AdminPanel({ currentUser, onRefreshSessionUsers }: AdminPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Provision fields
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("tenant");

  const loadUsersList = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch user list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersList();
  }, []);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newRole) {
      setError("Email and role are required.");
      return;
    }
    setError("");
    setActionSuccess("");
    try {
      await provisionUser(newEmail, newName, newRole);
      setNewEmail("");
      setNewName("");
      setNewRole("tenant");
      setActionSuccess(`Successfully provisioned ${newEmail} as ${newRole}.`);
      await loadUsersList();
      if (onRefreshSessionUsers) onRefreshSessionUsers();
    } catch (err: any) {
      setError(err.message || "Provisioning error.");
    }
  };

  const handleUpdateRole = async (email: string, role: UserRole) => {
    setError("");
    setActionSuccess("");
    try {
      await updateRole(email, role);
      setActionSuccess(`Updated role for ${email} to ${role}.`);
      await loadUsersList();
      if (onRefreshSessionUsers) onRefreshSessionUsers();
    } catch (err: any) {
      setError(err.message || "Role update failed.");
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email.toLowerCase() === currentUser.email.toLowerCase()) {
      setError("You cannot delete your own admin account.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the user profile for ${email}? This action cannot be undone.`)) {
      return;
    }
    setError("");
    setActionSuccess("");
    try {
      await deleteUser(email);
      setActionSuccess(`Successfully deleted user profile: ${email}.`);
      await loadUsersList();
      if (onRefreshSessionUsers) onRefreshSessionUsers();
    } catch (err: any) {
      setError(err.message || "Failed to delete user profile.");
    }
  };

  // Icon selector based on role
  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4 text-rose-500" />;
      case "landlord":
        return <Briefcase className="w-4 h-4 text-indigo-500" />;
      case "property_manager":
        return <Briefcase className="w-4 h-4 text-cyan-500" />;
      case "technician":
        return <Key className="w-4 h-4 text-amber-500" />;
      default:
        return <User className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-8" id="admin-panel-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="admin-overview">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-slate-900" id="admin-title">Role Assignment & Provisioning</h2>
          <p className="text-slate-500 text-sm mt-1" id="admin-desc">Manage tenant invitations, assign roles (landlord/tenant/technician), and provision new accounts on the fly.</p>
        </div>
        <button 
          onClick={loadUsersList}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors"
          id="admin-refresh-btn"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Users
        </button>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-100" id="admin-success-alert">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm font-medium border border-rose-100" id="admin-error-alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="admin-layout-grid">
        {/* Provision Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6" id="admin-provision-form-card">
          <div>
            <h3 className="text-lg font-display font-semibold text-slate-900" id="provision-form-title">Provision User Profiles</h3>
            <p className="text-xs text-slate-400 mt-1" id="provision-form-subtitle">Registered profiles are auto-confirmed with assigned security limits.</p>
          </div>

          <form onSubmit={handleProvision} className="space-y-4" id="provision-form-element">
            <div className="space-y-1.5" id="field-email-container">
              <label className="text-xs font-semibold text-slate-600 block" id="field-email-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm outline-none transition-all"
                  id="provision-email-input"
                />
              </div>
            </div>

            <div className="space-y-1.5" id="field-name-container">
              <label className="text-xs font-semibold text-slate-600 block" id="field-name-label">Display Name (Optional)</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Sarah Miller"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm outline-none transition-all"
                  id="provision-name-input"
                />
              </div>
            </div>

            <div className="space-y-1.5" id="field-role-container">
              <label className="text-xs font-semibold text-slate-600 block" id="field-role-label">Platform Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm outline-none transition-all appearance-none cursor-pointer"
                id="provision-role-select"
              >
                <option value="admin">Super Admin (IKode Team)</option>
                <option value="landlord">Company Admin (Property Co.)</option>
                <option value="property_manager">Property Manager</option>
                <option value="accountant">Accountant</option>
                <option value="leasing_officer">Leasing Officer</option>
                <option value="property_owner">Property Owner</option>
                <option value="tenant">Tenant</option>
                <option value="technician">Technician</option>
                <option value="security_guard">Security Guard (Optional)</option>
                <option value="receptionist">Receptionist / Front Desk (Optional)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              id="provision-submit-btn"
            >
              <Plus className="w-4 h-4" />
              Provision Account
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col" id="admin-users-table-card">
          <div className="p-6 border-b border-slate-100" id="users-table-header">
            <h3 className="text-lg font-display font-semibold text-slate-900" id="users-table-title">Registered Accounts</h3>
          </div>

          <div className="overflow-x-auto" id="users-table-wrapper">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col justify-center items-center gap-2" id="users-loading-state">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
                <span className="text-sm">Loading user directory...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm" id="users-empty-state">
                No user profiles registered yet. Use the provisioner to add profiles.
              </div>
            ) : (
              <table className="w-full text-left border-collapse" id="users-table-element">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider" id="col-user">User</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider" id="col-email">Email</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider" id="col-role">Current Role</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right" id="col-actions">Change Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((profile) => (
                    <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors" id={`row-user-${profile.id}`}>
                      <td className="px-6 py-4.5">
                        <div className="font-medium text-slate-900 text-sm">{profile.name}</div>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="text-slate-500 text-sm font-mono">{profile.email}</div>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700 capitalize">
                          {getRoleIcon(profile.role)}
                          {profile.role || "No Role Assigned"}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 flex justify-end items-center gap-2">
                        <select
                          value={profile.role || "none"}
                          onChange={(e) => handleUpdateRole(profile.email, e.target.value as UserRole)}
                          className="px-3 py-1 bg-white border border-slate-200 text-xs font-medium text-slate-700 rounded-lg outline-none cursor-pointer focus:border-indigo-500 select-role-control"
                          disabled={profile.email === currentUser.email} // Disable self role-edit via GUI
                          id={`select-role-${profile.id}`}
                        >
                          <option value="none" disabled>None</option>
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
                        {profile.email !== currentUser.email && (
                          <button
                            onClick={() => handleDeleteUser(profile.email)}
                            className="p-1 px-2 border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                            title="Delete user account"
                            id={`delete-user-${profile.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
