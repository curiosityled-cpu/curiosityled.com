import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Search, Download, UserPlus, Loader2, Shield,
  ChevronDown, ChevronUp, Upload, Plus, Edit, Trash2,
  Lock, Unlock, AlertTriangle, MoreVertical, Filter, X
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { toast } from "sonner";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import UserDetailPanel from "../components/command/UserDetailPanel";
import BulkUserUpload from "../components/users/BulkUserUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BulkRoleAssignment from "../components/roles/BulkRoleAssignment";
import AccountActionsMenu from "../components/users/AccountActionsMenu";
import BulkAccountActions from "../components/users/BulkAccountActions";
import ExpirationStatusBadge from "../components/users/ExpirationStatusBadge";
import EditUserModal from "../components/users/EditUserModal";
import InviteUserModal from "../components/users/InviteUserModal";
import BulkUserEditCSV from "../components/users/BulkUserEditCSV";
import CreateRoleModal from "../components/roles/CreateRoleModal";
import BulkRoleActions from "../components/roles/BulkRoleActions";
import PermissionDependencyViewer from "../components/roles/PermissionDependencyViewer";

const ROLE_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#a855f7'
];

const FRIENDLY_ROLES = {
  'User Level 1': 'User',
  'User Level 2': 'Team Leader',
  'Analyst': 'Analyst',
  'Executive': 'Executive',
  'Admin Level 1': 'Program Admin',
  'Admin Level 2': 'HR Admin',
  'Super Administrator': 'Super Admin',
  'Partner Business Administrator': 'Partner Admin',
  'Platform Admin': 'Platform Admin',
};

const STATUS_CONFIG = {
  active: { label: 'Active', className: 'bg-green-50 text-green-700 border-green-200' },
  suspended: { label: 'Suspended', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  locked: { label: 'Locked', className: 'bg-red-50 text-red-700 border-red-200' },
  pending_activation: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
};

function StatCard({ label, value, sub, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border p-5 hover:shadow-md transition-all ${accent ? 'border-l-4' : 'border-gray-200'}`}
      style={accent ? { borderLeftColor: accent } : {}}
    >
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </button>
  );
}

function UserManagement() {
  const { user: currentUser, isSuperAdmin, isPlatformAdmin, isPartnerBusinessAdmin, startImpersonation, isImpersonating, hasPermission } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_date', direction: 'desc' });
  const [impersonating, setImpersonating] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showBulkEditCSV, setShowBulkEditCSV] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [partners, setPartners] = useState([]);
  const [addonRoles, setAddonRoles] = useState([]);
  const [allCertifications, setAllCertifications] = useState([]);
  const [allExternalAssessments, setAllExternalAssessments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [roleFormData, setRoleFormData] = useState({ role_name: '', description: '', color: ROLE_COLORS[0], is_addon: false });
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [showBulkRoleAssignment, setShowBulkRoleAssignment] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 50;

  const [filters, setFilters] = useState({
    role: 'all', department: 'all', status: 'all', accountStatus: 'all',
    expirationStatus: 'all', client: 'all', partner: 'all', userType: 'all',
    certification: 'all', assessment: 'all'
  });

  const resetFilters = () => setFilters({
    role: 'all', department: 'all', status: 'all', accountStatus: 'all',
    expirationStatus: 'all', client: 'all', partner: 'all', userType: 'all',
    certification: 'all', assessment: 'all'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('listAllUsers');
      if (response.data?.success) setUsers(response.data.users);

      const [clientsList, partnersList, addonRolesList, certsList, extAssessmentsList] = await Promise.all([
        base44.entities.Client.list('-created_date'),
        base44.entities.Partner.list('-created_date'),
        base44.entities.CustomRole.filter({ is_addon: true, is_active: true }),
        base44.entities.Certification.filter({ status: 'verified' }),
        base44.entities.ExternalAssessmentResult.filter({ status: 'verified' })
      ]);
      setClients(clientsList || []);
      setPartners(partnersList || []);
      setAddonRoles(addonRolesList || []);
      setAllCertifications(certsList || []);
      setAllExternalAssessments(extAssessmentsList || []);

      const [perms, customRoles] = await Promise.all([
        base44.entities.Permission.list(),
        base44.entities.CustomRole.list('-created_date')
      ]);
      setPermissions(perms || []);
      setRoles(customRoles || []);

      // Auto-seed roles if none exist yet
      if ((customRoles || []).length === 0) {
        try {
          await base44.functions.invoke('seedCustomRoleTemplates');
          const freshRoles = await base44.entities.CustomRole.list('-created_date');
          setRoles(freshRoles || []);
        } catch (seedErr) {
          console.warn('Could not auto-seed roles:', seedErr.message);
        }
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleProxyAsUser = async (user) => {
    setImpersonating(true);
    try {
      const result = await startImpersonation(user.id);
      if (result.success) {
        toast.success(`Now viewing as ${user.full_name || user.email}`);
        setTimeout(() => { window.location.href = '/'; }, 1000);
      } else {
        toast.error(result.error || 'Failed to start impersonation');
      }
    } catch { toast.error('Failed to proxy as user'); }
    finally { setImpersonating(false); }
  };

  const handleEditUser = async (user) => {
    try {
      const response = await base44.functions.invoke('getUserById', { userId: user.id });
      if (response.data?.success) { setEditingUser(response.data.user); setShowEditUserModal(true); }
      else toast.error(response.data?.error || 'User not found');
    } catch { toast.error('Failed to load user details'); }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      const { full_name, email, created_date, updated_date, id, ...editableData } = userData;
      const response = await base44.functions.invoke('updateUserById', { userId, userData: editableData });
      if (response.data?.success) {
        toast.success('User updated successfully');
        setShowEditUserModal(false); setEditingUser(null);
        await loadData();
      } else toast.error(response.data?.error || 'Failed to update user');
    } catch { toast.error('Failed to update user'); }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to delete ${user.full_name || user.email}?`)) return;
    try {
      const response = await base44.functions.invoke('deleteUserById', { userId: user.id });
      if (response.data?.success) { toast.success('User deleted'); await loadData(); }
      else toast.error(response.data?.error || 'Failed to delete user');
    } catch { toast.error('Failed to delete user'); }
  };

  const getOrganizationName = (user) => {
    if (user.app_role === 'Platform Admin') return 'Platform';
    if (user.client_id) return clients.find(c => c.id === user.client_id)?.name || 'Unknown';
    if (user.partner_id) return partners.find(p => p.id === user.partner_id)?.name || 'Unknown';
    return '—';
  };

  const processedUsers = useMemo(() => {
    let filtered = users;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.full_name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.current_role?.toLowerCase().includes(term) ||
        u.department?.toLowerCase().includes(term)
      );
    }
    if (filters.role !== 'all') filtered = filtered.filter(u => u.app_role === filters.role);
    if (filters.accountStatus !== 'all') filtered = filtered.filter(u => (u.account_status || 'active') === filters.accountStatus);
    if (filters.client !== 'all') filtered = filtered.filter(u => u.client_id === filters.client);
    if (filters.partner !== 'all') filtered = filtered.filter(u => u.partner_id === filters.partner || clients.find(c => c.id === u.client_id)?.partner_id === filters.partner);
    if (filters.status === 'active') { const ago = new Date(Date.now() - 30 * 864e5); filtered = filtered.filter(u => new Date(u.updated_date) > ago); }
    if (filters.status === 'inactive') { const ago = new Date(Date.now() - 30 * 864e5); filtered = filtered.filter(u => new Date(u.updated_date) <= ago); }

    return [...filtered].sort((a, b) => {
      let aV = a[sortConfig.key], bV = b[sortConfig.key];
      if (!aV) return 1; if (!bV) return -1;
      if (typeof aV === 'string') { aV = aV.toLowerCase(); bV = bV?.toLowerCase(); }
      return sortConfig.direction === 'asc' ? (aV > bV ? 1 : -1) : (aV < bV ? 1 : -1);
    });
  }, [users, searchTerm, filters, sortConfig, clients, partners]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * usersPerPage;
    return processedUsers.slice(start, start + usersPerPage);
  }, [processedUsers, currentPage]);

  const totalPages = Math.ceil(processedUsers.length / usersPerPage);

  const statistics = useMemo(() => {
    const active = users.filter(u => (u.account_status || 'active') === 'active').length;
    const pending = users.filter(u => u.account_status === 'pending_activation' || !u.invitation_accepted_at).length;
    const suspended = users.filter(u => u.account_status === 'suspended').length;
    const locked = users.filter(u => u.account_status === 'locked').length;
    return { total: users.length, active, pending, suspended, locked };
  }, [users]);

  const handleSort = (key) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

  const handleSelectAll = (checked) => setSelectedUsers(checked ? paginatedUsers.map(u => u.id) : []);
  const handleSelectUser = (userId, checked) => setSelectedUsers(prev => checked ? [...prev, userId] : prev.filter(id => id !== userId));

  const handleExportCSV = () => {
    const rows = processedUsers.map(u => ({
      'Name': u.full_name || '', 'Email': u.email, 'Status': u.account_status || 'active',
      'Organization': getOrganizationName(u), 'Role': FRIENDLY_ROLES[u.app_role] || u.app_role || '',
      'Job Title': u.current_role || '', 'Department': u.department || '',
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `users-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  };

  // Role management
  const groupedPermissions = permissions.reduce((acc, p) => { if (!acc[p.category]) acc[p.category] = []; acc[p.category].push(p); return acc; }, {});
  const filteredRoles = roles.filter(r => r.role_name.toLowerCase().includes(roleSearchQuery.toLowerCase()));

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleFormData({ role_name: '', description: '', color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)], is_addon: false });
    setSelectedPermissions([]);
    setShowCreateRoleModal(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleFormData({ role_name: role.role_name, description: role.description || '', color: role.color || ROLE_COLORS[0], is_addon: role.is_addon || false });
    setSelectedPermissions(role.permissions || []);
    setShowCreateRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleFormData.role_name.trim()) { toast.error('Role name is required'); return; }
    if (selectedPermissions.length === 0) { toast.error('Select at least one permission'); return; }
    try {
      const roleData = { ...roleFormData, role_key: roleFormData.role_name.toLowerCase().replace(/[^a-z0-9]/g, '_'), permissions: selectedPermissions, is_system_role: false, is_active: true };
      if (editingRole) await base44.entities.CustomRole.update(editingRole.id, roleData);
      else await base44.entities.CustomRole.create(roleData);
      toast.success(editingRole ? 'Role updated' : 'Role created');
      setShowCreateRoleModal(false);
      await loadData();
    } catch { toast.error('Failed to save role'); }
  };

  const handleDeleteRole = async (role) => {
    if (role.is_system_role) { toast.error('Cannot delete system roles'); return; }
    if (role.user_count > 0) { toast.error(`Cannot delete role with ${role.user_count} assigned users`); return; }
    if (!confirm(`Delete role "${role.role_name}"?`)) return;
    try { await base44.entities.CustomRole.delete(role.id); toast.success('Role deleted'); await loadData(); }
    catch { toast.error('Failed to delete role'); }
  };

  const handleSaveRoleAssignment = async (roleId) => {
    if (!selectedUserForRole) return;
    try {
      const response = await base44.functions.invoke('assignRoleToUser', { userId: selectedUserForRole.id, roleId });
      if (response.data?.success) { toast.success('Role assigned'); setShowAssignRoleModal(false); setSelectedUserForRole(null); await loadData(); }
      else toast.error(response.data?.error || 'Failed to assign role');
    } catch { toast.error('Failed to assign role'); }
  };

  const handleSelectRole = (roleId, checked) => setSelectedRoles(prev => checked ? [...prev, roles.find(r => r.id === roleId)] : prev.filter(r => r.id !== roleId));
  const handleSelectAllRoles = (checked) => setSelectedRoles(checked ? filteredRoles.filter(r => !r.is_system_role) : []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0202ff] mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  const activeFiltersCount = Object.entries(filters).filter(([, v]) => v !== 'all').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">{statistics.total} total users</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBulkEditCSV(true)}>
              <Edit className="w-4 h-4 mr-2" /> Bulk Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBulkUpload(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload CSV
            </Button>
            <Button size="sm" onClick={() => setShowInviteModal(true)} style={{ backgroundColor: '#0202ff' }} className="hover:opacity-90">
              <UserPlus className="w-4 h-4 mr-2" /> Invite User
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
          {[{ id: 'users', label: 'Users', icon: Users }, { id: 'roles', label: 'Roles & Permissions', icon: Shield }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={statistics.total} onClick={resetFilters} accent="#0202ff" />
              <StatCard label="Active" value={statistics.active} onClick={() => setFilters({ ...filters, accountStatus: 'active' })} accent="#10b981" />
              <StatCard label="Pending Activation" value={statistics.pending} onClick={() => setFilters({ ...filters, accountStatus: 'pending_activation' })} accent="#f59e0b" />
              <StatCard label="Suspended / Locked" value={statistics.suspended + statistics.locked} onClick={() => setFilters({ ...filters, accountStatus: 'suspended' })} accent="#ef4444" />
            </div>

            {/* Search + Filter bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, title, department..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={activeFiltersCount > 0 ? 'border-[#0202ff] text-[#0202ff]' : ''}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters {activeFiltersCount > 0 && <span className="ml-1 bg-[#0202ff] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFiltersCount}</span>}
                </Button>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    <X className="w-4 h-4 mr-1" /> Clear
                  </Button>
                )}
              </div>

              {/* Quick chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'All', key: 'accountStatus', value: 'all' },
                  { label: 'Active', key: 'accountStatus', value: 'active' },
                  { label: 'Pending', key: 'accountStatus', value: 'pending_activation' },
                  { label: 'Suspended', key: 'accountStatus', value: 'suspended' },
                  { label: 'Locked', key: 'accountStatus', value: 'locked' },
                ].map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => setFilters({ ...filters, [chip.key]: chip.value })}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${filters[chip.key] === chip.value ? 'border-[#0202ff] bg-[#0202ff]/5 text-[#0202ff]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Advanced filters */}
              {showFilters && (
                <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
                  <Select value={filters.client} onValueChange={(v) => setFilters({ ...filters, client: v })}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Clients" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.role} onValueChange={(v) => setFilters({ ...filters, role: v })}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Roles" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {Object.entries(FRIENDLY_ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.partner} onValueChange={(v) => setFilters({ ...filters, partner: v })}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Partners" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Partners</SelectItem>
                      {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Bulk actions */}
            {selectedUsers.length > 1 && (
              <BulkAccountActions
                selectedUserIds={selectedUsers}
                users={users}
                onSuccess={loadData}
                onClearSelection={() => setSelectedUsers([])}
              />
            )}

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : `${processedUsers.length} users`}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="w-10 px-4 py-3"></th>
                      {[
                        { label: 'Name', key: 'full_name' },
                        { label: 'Email', key: 'email' },
                        { label: 'Organization', key: 'client_id' },
                        { label: 'Role', key: 'app_role' },
                        { label: 'Job Title', key: 'current_role' },
                        { label: 'Status', key: 'account_status' },
                        { label: 'Last Login', key: 'last_login' },
                      ].map(col => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-900 whitespace-nowrap"
                          onClick={() => handleSort(col.key)}
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            {sortConfig.key === col.key && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedUsers.map(user => {
                      const statusCfg = STATUS_CONFIG[user.account_status || 'active'] || STATUS_CONFIG.active;
                      return (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <Checkbox checked={selectedUsers.includes(user.id)} onCheckedChange={(c) => handleSelectUser(user.id, c)} />
                          </td>
                          <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedUserEmail(user.email)}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-[#0202ff]">{(user.full_name || user.email || '?')[0].toUpperCase()}</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 hover:text-[#0202ff] transition-colors">{user.full_name || user.email}</p>
                                {user.display_name && <p className="text-xs text-gray-400">{user.display_name}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-700">{getOrganizationName(user)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {FRIENDLY_ROLES[user.app_role] || user.app_role || 'User'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{user.current_role || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.className}`}>
                                {statusCfg.label}
                              </span>
                              <ExpirationStatusBadge user={user} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {user.last_login ? format(new Date(user.last_login), 'MMM d, yyyy') : 'Never'}
                          </td>
                          <td className="px-4 py-3">
                            <AccountActionsMenu
                              user={user}
                              onViewDetails={() => setSelectedUserEmail(user.email)}
                              onEdit={() => handleEditUser(user)}
                              onAssignRole={() => { setSelectedUserForRole(user); setShowAssignRoleModal(true); }}
                              onDelete={() => handleDeleteUser(user)}
                              onProxy={() => handleProxyAsUser(user)}
                              isImpersonating={isImpersonating}
                              impersonatingAction={impersonating}
                              onSuccess={loadData}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {processedUsers.length === 0 && (
                <div className="py-16 text-center">
                  <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No users match your filters</p>
                  <button onClick={resetFilters} className="mt-2 text-xs text-[#0202ff] hover:underline">Clear filters</button>
                </div>
              )}

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Showing {((currentPage - 1) * usersPerPage) + 1}–{Math.min(currentPage * usersPerPage, processedUsers.length)} of {processedUsers.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                    <span className="text-xs text-gray-500 px-2">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search roles..." value={roleSearchQuery} onChange={(e) => setRoleSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowBulkRoleAssignment(true)}>
                  <Upload className="w-4 h-4 mr-2" /> Bulk Assign
                </Button>
                <Button size="sm" onClick={handleCreateRole} style={{ backgroundColor: '#0202ff' }} className="hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" /> Create Role
                </Button>
              </div>
            </div>

            {selectedRoles.length > 0 && (
              <BulkRoleActions selectedRoles={selectedRoles} onSuccess={loadData} onClearSelection={() => setSelectedRoles([])} />
            )}

            {/* Role list — full width */}
            <div className="space-y-3">
              {filteredRoles.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={selectedRoles.length > 0 && selectedRoles.length === filteredRoles.filter(r => !r.is_system_role).length}
                    onCheckedChange={handleSelectAllRoles}
                  />
                  <span className="text-xs text-gray-500">Select all custom roles</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredRoles.map(role => (
                  <div key={role.id} className={`bg-white rounded-xl border p-5 hover:shadow-sm transition-all ${selectedRoles.some(r => r.id === role.id) ? 'border-[#0202ff] ring-1 ring-[#0202ff]/20' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {!role.is_system_role && (
                          <Checkbox checked={selectedRoles.some(r => r.id === role.id)} onCheckedChange={(c) => handleSelectRole(role.id, c)} />
                        )}
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: (role.color || '#6366f1') + '20' }}>
                          <Shield className="w-4 h-4" style={{ color: role.color || '#6366f1' }} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{role.role_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{role.permissions?.length || 0} permissions · {role.user_count || 0} users</p>
                        </div>
                      </div>
                      {!role.is_system_role && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditRole(role)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteRole(role)} disabled={role.user_count > 0}>
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {role.description && <p className="text-xs text-gray-500 mt-3 ml-12">{role.description}</p>}
                    {role.is_system_role && <span className="ml-12 mt-2 inline-block text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">System Role</span>}
                  </div>
                ))}
              </div>

              {filteredRoles.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                  <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No roles found</p>
                  {!roleSearchQuery && <button onClick={handleCreateRole} className="mt-2 text-xs text-[#0202ff] hover:underline">Create your first role</button>}
                </div>
              )}
            </div>

            {/* Permission Coverage + Role Hierarchy — side by side below roles */}
            <PermissionDependencyViewer selectedPermissions={selectedPermissions} allPermissions={permissions} />
          </div>
        )}
      </div>

      {/* Modals & Panels */}
      <AnimatePresence>
        {selectedUserEmail && (
          <UserDetailPanel userEmail={selectedUserEmail} onClose={() => setSelectedUserEmail(null)} viewContext="admin" />
        )}
      </AnimatePresence>

      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload CSV</DialogTitle></DialogHeader>
          <BulkUserUpload onCancel={() => setShowBulkUpload(false)} onSuccess={() => { setShowBulkUpload(false); loadData(); }} />
        </DialogContent>
      </Dialog>

      <EditUserModal
        open={showEditUserModal} onOpenChange={setShowEditUserModal}
        editingUser={editingUser} setEditingUser={setEditingUser}
        onSave={handleUpdateUser} clients={clients} partners={partners}
        addonRoles={addonRoles} isPlatformAdmin={isPlatformAdmin} allUsers={users}
      />

      <Dialog open={showAssignRoleModal} onOpenChange={setShowAssignRoleModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Role — {selectedUserForRole?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-2">
            {roles.filter(r => !r.is_system_role).map(role => (
              <button key={role.id} onClick={() => handleSaveRoleAssignment(role.id)} className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-[#0202ff] hover:bg-[#0202ff]/5 transition-all text-left">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: (role.color || '#6366f1') + '20' }}>
                  <Shield className="w-4 h-4" style={{ color: role.color || '#6366f1' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{role.role_name}</p>
                  <p className="text-xs text-gray-400">{role.permissions?.length || 0} permissions</p>
                </div>
              </button>
            ))}
            {roles.filter(r => !r.is_system_role).length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No custom roles available</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateRoleModal
        open={showCreateRoleModal} onOpenChange={setShowCreateRoleModal}
        editingRole={editingRole} roleFormData={roleFormData} setRoleFormData={setRoleFormData}
        selectedPermissions={selectedPermissions} groupedPermissions={groupedPermissions}
        onTogglePermission={(k) => setSelectedPermissions(prev => prev.includes(k) ? prev.filter(p => p !== k) : [...prev, k])}
        onSave={handleSaveRole}
      />

      <InviteUserModal open={showInviteModal} onOpenChange={setShowInviteModal} onSuccess={loadData} isPlatformAdmin={isPlatformAdmin} />

      <BulkRoleAssignment open={showBulkRoleAssignment} onClose={() => setShowBulkRoleAssignment(false)} onSuccess={loadData} />

      {showBulkEditCSV && <BulkUserEditCSV users={users} onSuccess={loadData} onClose={() => setShowBulkEditCSV(false)} />}
    </div>
  );
}

export default withAuthProtection(UserManagement, ['Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator']);