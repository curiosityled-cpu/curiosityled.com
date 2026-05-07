import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, Search, Filter, Download, UserPlus, Loader2, Shield,
  Activity, ChevronDown, Upload, Plus, Edit, Trash2, Lock,
  Unlock, AlertTriangle, ChevronRight
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
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

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
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showBulkRoleAssignment, setShowBulkRoleAssignment] = useState(false);

  const [clients, setClients] = useState([]);
  const [partners, setPartners] = useState([]);
  const [addonRoles, setAddonRoles] = useState([]);

  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    accountStatus: 'all',
    client: 'all',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 50;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('listAllUsers');
      if (response.data?.success) {
        setUsers(response.data.users);
      }
      const [clientsList, partnersList, addonRolesList] = await Promise.all([
        base44.entities.Client.list('-created_date'),
        base44.entities.Partner.list('-created_date'),
        base44.entities.CustomRole.filter({ is_addon: true, is_active: true }),
      ]);
      setClients(clientsList || []);
      setPartners(partnersList || []);
      setAddonRoles(addonRolesList || []);
    } catch (error) {
      console.error('Error loading data:', error);
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
    } catch (error) {
      toast.error('Failed to proxy as user');
    } finally {
      setImpersonating(false);
    }
  };

  const handleEditUser = async (user) => {
    try {
      const response = await base44.functions.invoke('getUserById', { userId: user.id });
      if (response.data?.success) {
        setEditingUser(response.data.user);
        setShowEditUserModal(true);
      } else {
        toast.error(response.data?.error || 'User not found');
      }
    } catch (error) {
      toast.error('Failed to load user details');
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      const { full_name, email, created_date, updated_date, id, ...editableData } = userData;
      const response = await base44.functions.invoke('updateUserById', { userId, userData: editableData });
      if (response.data?.success) {
        toast.success('User updated successfully');
        setShowEditUserModal(false);
        setEditingUser(null);
        await loadData();
      } else {
        toast.error(response.data?.error || 'Failed to update user');
      }
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to delete ${user.full_name || user.email}? This action cannot be undone.`)) return;
    try {
      const response = await base44.functions.invoke('deleteUserById', { userId: user.id });
      if (response.data?.success) {
        toast.success('User deleted successfully');
        await loadData();
      } else {
        toast.error(response.data?.error || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const getOrganizationInfo = (user) => {
    if (user.app_role === 'Platform Admin') return { name: 'Platform', color: 'bg-purple-100 text-purple-800' };
    if (user.partner_id) {
      const partner = partners.find(p => p.id === user.partner_id);
      return { name: partner?.name || 'Partner', color: 'bg-orange-100 text-orange-800' };
    }
    if (user.client_id) {
      const client = clients.find(c => c.id === user.client_id);
      return { name: client?.name || 'Client', color: 'bg-blue-100 text-blue-800' };
    }
    return { name: 'Unassigned', color: 'bg-gray-100 text-gray-800' };
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

    return [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key] ?? '';
      let bVal = b[sortConfig.key] ?? '';
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal?.toLowerCase() || ''; }
      return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [users, searchTerm, filters, sortConfig]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * usersPerPage;
    return processedUsers.slice(start, start + usersPerPage);
  }, [processedUsers, currentPage]);

  const totalPages = Math.ceil(processedUsers.length / usersPerPage);

  const statistics = useMemo(() => {
    let active = 0, suspended = 0, pending = 0;
    users.forEach(u => {
      if (u.account_status === 'suspended') suspended++;
      else if (!u.invitation_accepted_at) pending++;
      else active++;
    });
    return { total: users.length, active, suspended, pending };
  }, [users]);

  const handleExportCSV = () => {
    const csvData = processedUsers.map(u => ({
      'Name': u.full_name || '',
      'Email': u.email,
      'Role': u.app_role || '',
      'Status': u.account_status || 'active',
      'Department': u.department || '',
      'Created': format(new Date(u.created_date), 'yyyy-MM-dd'),
    }));
    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `users-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  };

  const getActivityStatus = (date) => new Date(date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  if (loading) {
    return (
      <MVPPageLayout title="User Management" subtitle="Manage users and platform access">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
        </div>
      </MVPPageLayout>
    );
  }

  return (
    <MVPPageLayout
      title="User Management"
      subtitle="Manage users, roles, and platform access."
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Button size="sm" onClick={() => setShowInviteModal(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
            <UserPlus className="w-4 h-4 mr-1.5" /> Invite User
          </Button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Users', value: statistics.total, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
          { label: 'Active', value: statistics.active, icon: Activity, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
          { label: 'Suspended / Pending', value: statistics.suspended + statistics.pending, icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-500' },
        ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <Card key={label} className="border-0 shadow-sm rounded-2xl">
            <CardContent className="py-5 text-center">
              <div className={`flex items-center justify-center w-9 h-9 ${iconBg} rounded-full mx-auto mb-2.5`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Search */}
      <Card className="border border-gray-100 shadow-sm rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, email, role..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9 h-9 text-sm bg-gray-50 border-gray-200"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'All', key: 'accountStatus', value: 'all' },
              { label: 'Active', key: 'accountStatus', value: 'active' },
              { label: 'Suspended', key: 'accountStatus', value: 'suspended' },
              { label: 'Pending', key: 'accountStatus', value: 'pending_activation' },
            ].map(chip => (
              <button
                key={chip.label}
                onClick={() => { setFilters(f => ({ ...f, [chip.key]: chip.value })); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filters[chip.key] === chip.value
                    ? 'bg-[#0202ff] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
            <Select value={filters.role} onValueChange={v => { setFilters(f => ({ ...f, role: v })); setCurrentPage(1); }}>
              <SelectTrigger className="h-7 text-xs w-36 rounded-full border-gray-200 bg-gray-100">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="User Level 1">User Level 1</SelectItem>
                <SelectItem value="User Level 2">User Level 2</SelectItem>
                <SelectItem value="Analyst">Analyst</SelectItem>
                <SelectItem value="Admin Level 1">Program Admin</SelectItem>
                <SelectItem value="Admin Level 2">HR Admin</SelectItem>
                <SelectItem value="Super Administrator">Super Admin</SelectItem>
                <SelectItem value="Platform Admin">Platform Admin</SelectItem>
              </SelectContent>
            </Select>
            {clients.length > 0 && (
              <Select value={filters.client} onValueChange={v => { setFilters(f => ({ ...f, client: v })); setCurrentPage(1); }}>
                <SelectTrigger className="h-7 text-xs w-36 rounded-full border-gray-200 bg-gray-100">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedUsers.length > 1 && (
        <BulkAccountActions
          selectedUserIds={selectedUsers}
          users={users}
          onSuccess={loadData}
          onClearSelection={() => setSelectedUsers([])}
        />
      )}

      {/* User Table */}
      <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0202ff]" />
            Users
            <span className="text-sm font-normal text-gray-400">({processedUsers.length})</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {paginatedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                  onCheckedChange={checked => setSelectedUsers(checked ? paginatedUsers.map(u => u.id) : [])}
                />
                <span className="text-xs text-gray-500">Select page</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowBulkUpload(true)}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-100">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600">Role</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600">Organization</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600">Last Login</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map(user => {
                  const orgInfo = getOrganizationInfo(user);
                  const initial = user.full_name?.[0] || user.email?.[0] || '?';
                  return (
                    <TableRow key={user.id} className="hover:bg-gray-50 border-b border-gray-50">
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={checked =>
                            setSelectedUsers(prev => checked ? [...prev, user.id] : prev.filter(id => id !== user.id))
                          }
                        />
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setSelectedUserEmail(user.email)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-[#0202ff]">{initial}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate hover:text-[#0202ff]">
                              {user.full_name || user.email}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200 border font-medium whitespace-nowrap">
                          {user.app_role || 'User Level 1'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border font-medium whitespace-nowrap ${orgInfo.color}`}>
                          {orgInfo.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(user.account_status || 'active') === 'active' ? (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        ) : (user.account_status === 'suspended') ? (
                          <span className="flex items-center gap-1.5 text-xs text-orange-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Suspended
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Pending
                          </span>
                        )}
                        <ExpirationStatusBadge user={user} className="mt-1" />
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {user.last_login ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${getActivityStatus(user.last_login) ? 'bg-green-500' : 'bg-gray-300'}`} />
                            {format(new Date(user.last_login), 'MMM d')}
                          </div>
                        ) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <AccountActionsMenu
                          user={user}
                          onViewDetails={() => setSelectedUserEmail(user.email)}
                          onEdit={() => handleEditUser(user)}
                          onDelete={() => handleDeleteUser(user)}
                          onProxy={() => handleProxyAsUser(user)}
                          isImpersonating={isImpersonating}
                          impersonatingAction={impersonating}
                          onSuccess={loadData}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {processedUsers.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No users match your filters.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {((currentPage - 1) * usersPerPage) + 1}–{Math.min(currentPage * usersPerPage, processedUsers.length)} of {processedUsers.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  Previous
                </Button>
                <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AnimatePresence>
        {selectedUserEmail && (
          <UserDetailPanel
            userEmail={selectedUserEmail}
            onClose={() => setSelectedUserEmail(null)}
            viewContext="admin"
          />
        )}
      </AnimatePresence>

      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload CSV</DialogTitle></DialogHeader>
          <BulkUserUpload onCancel={() => setShowBulkUpload(false)} onSuccess={() => { setShowBulkUpload(false); loadData(); }} />
        </DialogContent>
      </Dialog>

      <EditUserModal
        open={showEditUserModal}
        onOpenChange={setShowEditUserModal}
        editingUser={editingUser}
        setEditingUser={setEditingUser}
        onSave={handleUpdateUser}
        clients={clients}
        partners={partners}
        addonRoles={addonRoles}
        isPlatformAdmin={isPlatformAdmin}
      />

      <InviteUserModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onSuccess={loadData}
        isPlatformAdmin={isPlatformAdmin}
      />

      <BulkRoleAssignment
        open={showBulkRoleAssignment}
        onClose={() => setShowBulkRoleAssignment(false)}
        onSuccess={loadData}
      />

      {showBulkEditCSV && (
        <BulkUserEditCSV users={users} onSuccess={loadData} onClose={() => setShowBulkEditCSV(false)} />
      )}
    </MVPPageLayout>
  );
}

export default withAuthProtection(UserManagement, ['Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator']);