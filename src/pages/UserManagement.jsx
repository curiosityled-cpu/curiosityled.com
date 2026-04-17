import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";
import {
  Users,
  Search,
  Filter,
  Download,
  UserPlus,
  Loader2,
  Eye,
  Shield,
  Activity,
  ChevronDown,
  ChevronUp,
  Upload,
  Plus,
  Edit,
  Trash2,
  Lock,
  Info,
  Unlock,
  AlertTriangle,
  Calendar as CalendarIcon
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import UserDetailPanel from "../components/command/UserDetailPanel";
import BulkUserUpload from "../components/users/BulkUserUpload";
import PageHeader from "@/components/common/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import BulkRoleActions from "../components/roles/BulkRoleActions";
import BulkRoleAssignment from "../components/roles/BulkRoleAssignment";
import PermissionDependencyViewer from "../components/roles/PermissionDependencyViewer";
import { usePageContext } from "../Layout";
import AccountActionsMenu from "../components/users/AccountActionsMenu";
import BulkAccountActions from "../components/users/BulkAccountActions";
import ExpirationStatusBadge from "../components/users/ExpirationStatusBadge";
import InactiveUsersWidget from "../components/users/InactiveUsersWidget";
import LicenseInfoBanner from "../components/users/LicenseInfoBanner";
import EditUserModal from "../components/users/EditUserModal";
import InviteUserModal from "../components/users/InviteUserModal";
import CreateRoleModal from "../components/roles/CreateRoleModal";

const ROLE_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#a855f7'
];

function UserManagement() {
  const { user: currentUser, isSuperAdmin, isPlatformAdmin, isPartnerBusinessAdmin, startImpersonation, isImpersonating, hasPermission } = useAuth();
  const { updatePageContext } = usePageContext();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_date', direction: 'desc' });
  const [impersonating, setImpersonating] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // New: Client and Partner data
  const [clients, setClients] = useState([]);
  const [partners, setPartners] = useState([]);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [addonRoles, setAddonRoles] = useState([]);
  
  // External qualifications data for filtering
  const [allCertifications, setAllCertifications] = useState([]);
  const [allExternalAssessments, setAllExternalAssessments] = useState([]);

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [roleFormData, setRoleFormData] = useState({
    role_name: '',
    description: '',
    color: ROLE_COLORS[0],
    is_addon: false
  });

  // New: Bulk role actions
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [showBulkRoleAssignment, setShowBulkRoleAssignment] = useState(false);

  const [columnWidths, setColumnWidths] = useState({
    checkbox: 48,
    name: 140,
    email: 180,
    status: 120,
    organization: 150,
    role: 140,
    position: 120,
    department: 110,
    lastLogin: 110,
    actions: 64
  });
  const [resizingColumn, setResizingColumn] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const [filters, setFilters] = useState({
    role: 'all',
    department: 'all',
    status: 'all',
    accountStatus: 'all', // 'all', 'active', 'suspended', 'pending_activation', 'locked'
    expirationStatus: 'all', // 'all', 'expiring_soon', 'expired'
    client: 'all',
    partner: 'all',
    userType: 'all', // 'all', 'client_users', 'partner_admins', 'platform_admins'
    certification: 'all',
    assessment: 'all'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 50;

  const [activeTab, setActiveTab] = useState('users');

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

      // Load license info if user is Super Admin or Partner Business Admin
      if (currentUser?.client_id && response.data?.users) {
        const userClient = clientsList.find(c => c.id === currentUser.client_id);
        if (userClient) {
          const activeUsersInClient = response.data.users.filter(u => 
            u.client_id === currentUser.client_id && 
            u.account_status !== 'suspended'
          ).length;
          setLicenseInfo({
            license_count: userClient.license_count || 0,
            seats_used: activeUsersInClient,
            client_name: userClient.name
          });
        }
      } else if (currentUser?.partner_id && response.data?.users) {
        const partnerClients = clientsList.filter(c => c.partner_id === currentUser.partner_id);
        const totalLicenses = partnerClients.reduce((sum, c) => sum + (c.license_count || 0), 0);
        const activeUsersInPartnerClients = response.data.users.filter(u => 
          partnerClients.some(c => c.id === u.client_id) && 
          u.account_status !== 'suspended'
        ).length;
        setLicenseInfo({
          license_count: totalLicenses,
          seats_used: activeUsersInPartnerClients,
          partner_name: partnersList.find(p => p.id === currentUser.partner_id)?.name
        });
      }

      // Load roles and permissions - only seed if Platform Admin
      if (isPlatformAdmin) {
        try {
          await base44.functions.invoke('seedSystemPermissions');
        } catch (seedError) {
          console.warn('Could not seed permissions:', seedError.message);
        }
      }
      
      const [perms, customRoles] = await Promise.all([
        base44.entities.Permission.list(),
        base44.entities.CustomRole.list('-created_date')
      ]);

      setPermissions(perms || []);
      setRoles(customRoles || []);
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
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        toast.error(result.error || 'Failed to start impersonation');
      }
    } catch (error) {
      console.error('Error starting impersonation:', error);
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
      console.error('Error loading user for edit:', error);
      toast.error('Failed to load user details');
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      const response = await base44.functions.invoke('updateUserById', { userId, userData });
      if (response.data?.success) {
        toast.success('User updated successfully');
        setShowEditUserModal(false);
        setEditingUser(null);
        await loadData();
      } else {
        toast.error(response.data?.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to delete ${user.full_name || user.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await base44.functions.invoke('deleteUserById', { userId: user.id });
      if (response.data?.success) {
        toast.success('User deleted successfully');
        await loadData();
      } else {
        toast.error(response.data?.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
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

    if (filters.role !== 'all') {
      filtered = filtered.filter(u => u.app_role === filters.role || u.custom_role_id === filters.role);
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(u => u.department === filters.department);
    }

    // Filter by account status
    if (filters.accountStatus !== 'all') {
      filtered = filtered.filter(u => (u.account_status || 'active') === filters.accountStatus);
    }

    // Filter by expiration status
    if (filters.expirationStatus === 'expiring_soon') {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(u => {
        if (!u.account_expires_at) return false;
        const expDate = new Date(u.account_expires_at);
        return expDate <= thirtyDaysFromNow && expDate > new Date();
      });
    } else if (filters.expirationStatus === 'expired') {
      filtered = filtered.filter(u => {
        if (!u.account_expires_at) return false;
        return new Date(u.account_expires_at) <= new Date();
      });
    }

    // Filter by activity status
    if (filters.status === 'active') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(u => new Date(u.updated_date) > thirtyDaysAgo);
    } else if (filters.status === 'inactive') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(u => new Date(u.updated_date) <= thirtyDaysAgo);
    }

    // New: Filter by client
    if (filters.client !== 'all') {
      filtered = filtered.filter(u => u.client_id === filters.client);
    }

    // New: Filter by partner
    if (filters.partner !== 'all') {
      filtered = filtered.filter(u => {
        if (u.partner_id === filters.partner) return true;
        // Also include users whose client belongs to this partner
        const userClient = clients.find(c => c.id === u.client_id);
        return userClient?.partner_id === filters.partner;
      });
    }

    // New: Filter by user type
    if (filters.userType === 'client_users') {
      filtered = filtered.filter(u => u.client_id && !u.partner_id && u.app_role.startsWith('User Level'));
    } else if (filters.userType === 'partner_admins') {
      filtered = filtered.filter(u => u.partner_id || u.app_role === 'Partner Business Administrator');
    } else if (filters.userType === 'platform_admins') {
      filtered = filtered.filter(u => u.app_role === 'Platform Admin');
    }

    // Filter by certification
    if (filters.certification !== 'all') {
      const usersWithCert = allCertifications
        .filter(c => c.name === filters.certification)
        .map(c => c.user_email);
      filtered = filtered.filter(u => usersWithCert.includes(u.email));
    }

    // Filter by assessment type
    if (filters.assessment !== 'all') {
      const usersWithAssessment = allExternalAssessments
        .filter(a => a.assessment_type === filters.assessment)
        .map(a => a.user_email);
      filtered = filtered.filter(u => usersWithAssessment.includes(u.email));
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase();
      }

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [users, searchTerm, filters, sortConfig, clients, partners, allCertifications, allExternalAssessments]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * usersPerPage;
    return processedUsers.slice(startIndex, startIndex + usersPerPage);
  }, [processedUsers, currentPage]);

  const totalPages = Math.ceil(processedUsers.length / usersPerPage);

  const statistics = useMemo(() => {
    const roleDistribution = {};
    const departmentDistribution = {};
    const clientDistribution = {};
    const partnerDistribution = {};
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let activeUsers = 0;
    let clientUsers = 0;
    let partnerAdmins = 0;
    let platformAdmins = 0;
    let suspendedUsers = 0;
    let pendingUsers = 0;
    let lockedUsers = 0;
    let expiringUsers = 0;
    let expiredUsers = 0;

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    users.forEach(user => {
      roleDistribution[user.app_role] = (roleDistribution[user.app_role] || 0) + 1;
      if (user.department) {
        departmentDistribution[user.department] = (departmentDistribution[user.department] || 0) + 1;
      }
      if (new Date(user.updated_date) > thirtyDaysAgo) {
        activeUsers++;
      }

      // Count by account status
      if (user.account_status === 'suspended') {
        suspendedUsers++;
      } else if (user.account_status === 'locked') {
        lockedUsers++;
      } else if (user.account_status === 'pending_activation' || !user.invitation_accepted_at) {
        pendingUsers++;
      }

      // Count expiring accounts
      if (user.account_expires_at) {
        const expDate = new Date(user.account_expires_at);
        const now = new Date();
        if (expDate <= now) {
          expiredUsers++;
        } else if (expDate <= thirtyDaysFromNow) {
          expiringUsers++;
        }
      }

      // Count by user type
      if (user.app_role === 'Platform Admin') {
        platformAdmins++;
      } else if (user.app_role === 'Partner Business Administrator') {
        partnerAdmins++;
      } else if (user.client_id && !user.partner_id && user.app_role.startsWith('User Level')) {
        clientUsers++;
      }

      // Client distribution
      if (user.client_id) {
        const client = clients.find(c => c.id === user.client_id);
        const clientName = client?.name || 'Unknown Client';
        clientDistribution[clientName] = (clientDistribution[clientName] || 0) + 1;
      }

      // Partner distribution
      if (user.partner_id) {
        const partner = partners.find(p => p.id === user.partner_id);
        const partnerName = partner?.name || 'Unknown Partner';
        partnerDistribution[partnerName] = (partnerDistribution[partnerName] || 0) + 1;
      } else if (user.client_id) {
        const client = clients.find(c => c.id === user.client_id);
        if (client?.partner_id) {
          const partner = partners.find(p => p.id === client.partner_id);
          const partnerName = partner?.name || 'Unknown Partner';
          partnerDistribution[partnerName] = (partnerDistribution[partnerName] || 0) + 1;
        }
      }
    });

    return {
      total: users.length,
      active: activeUsers,
      suspended: suspendedUsers,
      pending: pendingUsers,
      locked: lockedUsers,
      expiring: expiringUsers,
      expired: expiredUsers,
      clientUsers,
      partnerAdmins,
      platformAdmins,
      roleDistribution: Object.entries(roleDistribution).map(([name, value]) => ({ name, value })),
      departmentDistribution: Object.entries(departmentDistribution).map(([name, value]) => ({ name, value })),
      clientDistribution: Object.entries(clientDistribution).map(([name, value]) => ({ name, value })),
      partnerDistribution: Object.entries(partnerDistribution).map(([name, value]) => ({ name, value }))
    };
  }, [users, clients, partners]);

  // Helper function to get organization name for a user
  const getOrganizationInfo = (user) => {
    if (user.app_role === 'Platform Admin') {
      return { type: 'platform', name: 'Platform Admin', color: 'bg-purple-100 text-purple-800' };
    }

    if (user.partner_id) {
      const partner = partners.find(p => p.id === user.partner_id);
      return {
        type: 'partner',
        name: partner?.name || 'Unknown Partner',
        color: 'bg-orange-100 text-orange-800'
      };
    }

    if (user.client_id) {
      const client = clients.find(c => c.id === user.client_id);
      const clientName = client?.name || 'Unknown Client';

      if (client?.partner_id) {
        const partner = partners.find(p => p.id === client.partner_id);
        return {
          type: 'client_via_partner',
          name: clientName,
          partnerName: partner?.name,
          color: 'bg-blue-100 text-blue-800'
        };
      }

      return {
        type: 'client',
        name: clientName,
        color: 'bg-green-100 text-green-800'
      };
    }

    return { type: 'none', name: 'Unassigned', color: 'bg-gray-100 text-gray-800' };
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (checked) => {
    setSelectedUsers(checked ? paginatedUsers.map(u => u.id) : []);
  };

  const handleSelectUser = (userId, checked) => {
    setSelectedUsers(prev =>
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };

  const handleExportCSV = () => {
    const csvData = processedUsers.map(u => {
      const orgInfo = getOrganizationInfo(u);
      return {
        'Name': u.full_name || '',
        'Email': u.email,
        'Display Name': u.display_name || '',
        'Account Status': u.account_status || 'active',
        'Organization': orgInfo.name + (orgInfo.type === 'client_via_partner' && orgInfo.partnerName ? ` (via ${orgInfo.partnerName})` : ''),
        'Role': u.app_role || '',
        'Position': u.current_role || '',
        'Department': u.department || '',
        'Manager': u.manager_email || '',
        'Invitation Accepted': u.invitation_accepted_at ? 'Yes' : 'No',
        'Created': format(new Date(u.created_date), 'yyyy-MM-dd'),
        'Last Active': format(new Date(u.updated_date), 'yyyy-MM-dd')
      }
    });

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('User list exported successfully');
  };

  const getRoleBadgeColor = (role) => {
    if (role?.includes('Admin')) return 'bg-purple-100 text-purple-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getActivityStatus = (updatedDate) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return new Date(updatedDate) > thirtyDaysAgo;
  };

  const handleAssignRole = (user) => {
    setSelectedUserForRole(user);
    setShowAssignRoleModal(true);
  };

  const handleMouseDown = (columnKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnKey]);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizingColumn) return;
      const delta = e.clientX - startX;
      const newWidth = Math.max(80, startWidth + delta);
      setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove, false);
      document.addEventListener('mouseup', handleMouseUp, false);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      return () => {
        document.removeEventListener('mousemove', handleMouseMove, false);
        document.removeEventListener('mouseup', handleMouseUp, false);
        document.body.style.cursor = 'auto';
        document.body.style.userSelect = 'auto';
      };
    }
  }, [resizingColumn, startX, startWidth]);

  const handleSaveRoleAssignment = async (roleId) => {
    if (!selectedUserForRole) return;

    try {
      const response = await base44.functions.invoke('assignRoleToUser', {
        userId: selectedUserForRole.id,
        roleId: roleId
      });

      if (response.data?.success) {
        toast.success('Role assigned successfully');
        setShowAssignRoleModal(false);
        setSelectedUserForRole(null);
        await loadData();
      } else {
        toast.error(response.data?.error || 'Failed to assign role');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    }
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleFormData({
      role_name: '',
      description: '',
      color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
      is_addon: false
    });
    setSelectedPermissions([]);
    setShowCreateRoleModal(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleFormData({
      role_name: role.role_name,
      description: role.description || '',
      color: role.color || ROLE_COLORS[0],
      is_addon: role.is_addon || false
    });
    setSelectedPermissions(role.permissions || []);
    setShowCreateRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleFormData.role_name.trim()) {
      toast.error('Role name is required');
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      const roleKey = roleFormData.role_name.toLowerCase().replace(/[^a-z0-9]/g, '_');

      const roleData = {
        ...roleFormData,
        role_key: roleKey,
        permissions: selectedPermissions,
        is_system_role: false,
        is_active: true,
        is_addon: roleFormData.is_addon
      };

      if (editingRole) {
        await base44.entities.CustomRole.update(editingRole.id, roleData);
        toast.success('Role updated successfully');
      } else {
        await base44.entities.CustomRole.create(roleData);
        toast.success('Role created successfully');
      }

      setShowCreateRoleModal(false);
      await loadData();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role');
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.is_system_role) {
      toast.error('Cannot delete system roles');
      return;
    }

    if (role.user_count > 0) {
      toast.error(`Cannot delete role with ${role.user_count} assigned users`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.role_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await base44.entities.CustomRole.delete(role.id);
      toast.success('Role deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const handleTogglePermission = (permissionKey) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionKey)
        ? prev.filter(p => p !== permissionKey)
        : [...prev, permissionKey]
    );
  };

  const handleSelectRole = (roleId, checked) => {
    setSelectedRoles(prev =>
      checked
        ? [...prev, roles.find(r => r.id === roleId)]
        : prev.filter(r => r.id !== roleId)
    );
  };

  const handleSelectAllRoles = (checked) => {
    setSelectedRoles(checked ? filteredRoles.filter(r => !r.is_system_role) : []);
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {});

  const filteredRoles = roles.filter(role =>
    role.role_name.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(roleSearchQuery.toLowerCase())
  );

  const clientOptions = useMemo(() => clients.map(c => ({ value: c.id, label: c.name })), [clients]);

  // Enhanced: Build comprehensive context for Atreus
  const buildAICoachContext = () => {
    const activeFiltersCount = [
      filters.role !== 'all',
      filters.client !== 'all',
      searchTerm.trim() !== ''
    ].filter(Boolean).length;

    const filterDescription = [];
    if (filters.role !== 'all') filterDescription.push(`${filters.role} role`);
    if (filters.client !== 'all') {
      const clientName = clientOptions.find(c => c.value === filters.client)?.label || filters.client;
      filterDescription.push(`${clientName} client`);
    }
    if (searchTerm) filterDescription.push(`searching for "${searchTerm}"`);

    const roleBreakdown = processedUsers.reduce((acc, u) => {
      const role = u.app_role || 'Unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    return {
      current_filters: {
        role: filters.role,
        client: filters.client,
        searchQuery: searchTerm,
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction,
        activeFiltersCount,
        filterDescription: filterDescription.length > 0 ? filterDescription.join(', ') : 'viewing all users'
      },
      visible_data_summary: {
        total_users: users.length,
        filtered_users: processedUsers.length,
        role_breakdown: roleBreakdown,
        client_breakdown: clientOptions.length,
        platform_admins: users.filter(u => u.app_role === 'Platform Admin').length,
        super_admins: users.filter(u => u.app_role === 'Super Administrator').length,
        at_risk_users: users.filter(u => u.at_risk_flag).length // Assuming at_risk_flag exists
      },
      selected_items: selectedUsers.map(id => {
        const u = users.find(user => user.id === id);
        return u ? { id: u.id, email: u.email, full_name: u.full_name, app_role: u.app_role } : null;
      }).filter(Boolean),
      modal_focus: showBulkUpload ? 'bulk_upload_modal' :
                   showAssignRoleModal ? 'role_assignment_modal' :
                   showBulkRoleAssignment ? 'bulk_role_modal' :
                   editingUser ? 'edit_user_modal' : null,
      page_specific_insights: {
        can_create_users: hasPermission('users.create'),
        can_edit_users: hasPermission('users.edit'),
        can_delete_users: hasPermission('users.delete'),
        can_assign_roles: hasPermission('roles.assign'),
        bulk_actions_available: selectedUsers.length > 0,
        impersonation_available: isPlatformAdmin,
        role_management_available: isPlatformAdmin || isSuperAdmin
      },
      available_actions: getAvailableActions(),
      viewing_focus: 'user_table' // Assuming current view is always table
    };
  };

  const getAvailableActions = () => {
    const actions = [];

    if (hasPermission('users.create')) {
      actions.push({
        action: 'create_user',
        description: 'Add a new user to the platform'
      });

      actions.push({
        action: 'bulk_upload',
        description: 'Upload multiple users via CSV'
      });
    }

    if (selectedUsers.length > 0) {
      actions.push({
        action: 'bulk_assign_roles',
        description: `Assign roles to ${selectedUsers.length} selected users`
      });

      if (hasPermission('users.delete')) {
        actions.push({
          action: 'bulk_delete',
          description: `Delete ${selectedUsers.length} selected users`
        });
      }
    }

    const activeFiltersCount = [
      filters.role !== 'all',
      filters.client !== 'all',
      searchTerm.trim() !== ''
    ].filter(Boolean).length;

    if (activeFiltersCount > 0) {
      actions.push({
        action: 'clear_filters',
        description: 'Clear filters to see all users'
      });
    }

    if (processedUsers.some(u => u.at_risk_flag)) { // Assuming at_risk_flag exists
      actions.push({
        action: 'review_at_risk',
        description: 'Review users flagged as at-risk'
      });
    }

    // Check for 'users.edit' or 'users.view' to allow export
    if (hasPermission('users.edit') || hasPermission('users.view')) {
      actions.push({
        action: 'export_users',
        description: 'Export user list to CSV'
      });
    }

    return actions;
  };

  // Update context whenever filters or data changes
  useEffect(() => {
    if (users.length > 0) {
      const context = buildAICoachContext();
      updatePageContext(context);
    }
  }, [
    filters.role, filters.client, filters.certification, filters.assessment, searchTerm, sortConfig.key, sortConfig.direction,
    selectedUsers, showBulkUpload, showAssignRoleModal,
    showBulkRoleAssignment, editingUser, processedUsers, users, hasPermission,
    isPlatformAdmin, isSuperAdmin, clients
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="User Management"
          subtitle="Manage users, create custom roles, and control platform access"
          icon={Users}
        />

        <div className="mt-6">
          <LicenseInfoBanner licenseInfo={licenseInfo} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Roles & Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6 space-y-6">
            {/* Charts - Updated */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Users by Organization Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Client Users', value: statistics.clientUsers },
                          { name: 'Partner Admins', value: statistics.partnerAdmins },
                          { name: 'Platform Admins', value: statistics.platformAdmins }
                        ].filter(entry => entry.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell key={`cell-0`} fill="#10b981" />
                        <Cell key={`cell-1`} fill="#f97316" />
                        <Cell key={`cell-2`} fill="#8b5cf6" />
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Users by Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={statistics.departmentDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Key Metrics - Simplified */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* User Activity - Consolidated */}
              <Card className="border-2 border-blue-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => {
                setFilters({
                  role: 'all',
                  department: 'all',
                  status: 'all',
                  accountStatus: 'all',
                  expirationStatus: 'all',
                  client: 'all',
                  partner: 'all',
                  userType: 'all',
                  certification: 'all',
                  assessment: 'all'
                });
                setSearchTerm('');
              }}>
                <CardContent className="p-4 text-center">
                  <Activity className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{statistics.total}</p>
                  <p className="text-xs text-gray-600">User Activity</p>
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span>Total Users:</span>
                      <span className="font-medium">{statistics.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Active (30d):</span>
                      <span className="font-medium">{statistics.active}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">{statistics.pending}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Health - Consolidated */}
              <Card className="border-2 border-red-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => {
                setFilters({...filters, accountStatus: 'suspended'});
              }}>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {statistics.suspended + statistics.locked + statistics.expiring + statistics.expired}
                  </p>
                  <p className="text-xs text-gray-600">User Health</p>
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span>Suspended:</span>
                      <span className="font-medium">{statistics.suspended}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Locked:</span>
                      <span className="font-medium">{statistics.locked}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Expiring:</span>
                      <span className="font-medium">{statistics.expiring}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Expired:</span>
                      <span className="font-medium">{statistics.expired}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* All Admins - Consolidated */}
              <Card className="border-2 border-indigo-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => {
                setFilters({...filters, userType: 'all', accountStatus: 'all'});
                setSearchTerm('admin');
              }}>
                <CardContent className="p-4 text-center">
                  <Shield className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {statistics.roleDistribution.filter(r => r.name?.includes('Admin')).reduce((sum, r) => sum + r.value, 0)}
                  </p>
                  <p className="text-xs text-gray-600">All Admins</p>
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span>Platform Admin:</span>
                      <span className="font-medium">{statistics.platformAdmins}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Super Admin:</span>
                      <span className="font-medium">{statistics.roleDistribution.find(r => r.name === 'Super Administrator')?.value || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Partner Admin:</span>
                      <span className="font-medium">{statistics.partnerAdmins}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>HR Admin:</span>
                      <span className="font-medium">{statistics.roleDistribution.find(r => r.name === 'Admin Level 2')?.value || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Program Admin:</span>
                      <span className="font-medium">{statistics.roleDistribution.find(r => r.name === 'Admin Level 1')?.value || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => setShowBulkUpload(true)} variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV
              </Button>
              <Button onClick={() => setShowInviteModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </div>

            {/* Cleaner Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Primary filter - Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, email, role, or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Quick filter chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { label: 'All Users', key: 'userType', value: 'all', active: filters.userType === 'all' },
                      { label: 'Client Users', key: 'userType', value: 'client_users', active: filters.userType === 'client_users' },
                      { label: 'Admins', key: 'userType', value: 'platform_admins', active: filters.userType === 'platform_admins' },
                      { label: 'Active', key: 'status', value: 'active', active: filters.status === 'active' },
                      { label: 'Suspended', key: 'accountStatus', value: 'suspended', active: filters.accountStatus === 'suspended' },
                      { label: 'Expiring', key: 'expirationStatus', value: 'expiring_soon', active: filters.expirationStatus === 'expiring_soon' },
                    ].map(chip => (
                      <button
                        key={chip.label}
                        onClick={() => setFilters({...filters, [chip.key]: chip.active ? 'all' : chip.value})}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          chip.active
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setFilters({
                        role: 'all',
                        department: 'all',
                        status: 'all',
                        accountStatus: 'all',
                        expirationStatus: 'all',
                        client: 'all',
                        partner: 'all',
                        userType: 'all',
                        certification: 'all',
                        assessment: 'all'
                      })}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full border border-gray-200 transition-colors font-medium"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Advanced filters - collapsible */}
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                      <Filter className="w-4 h-4" />
                      <span>Advanced Filters</span>
                      <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                      <Select value={filters.client} onValueChange={(value) => setFilters({...filters, client: value})}>
                        <SelectTrigger className="h-9 text-sm w-40">
                          <SelectValue placeholder="Client" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Clients</SelectItem>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={filters.partner} onValueChange={(value) => setFilters({...filters, partner: value})}>
                        <SelectTrigger className="h-9 text-sm w-40">
                          <SelectValue placeholder="Partner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Partners</SelectItem>
                          {partners.map(partner => (
                            <SelectItem key={partner.id} value={partner.id}>{partner.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={filters.role} onValueChange={(value) => setFilters({...filters, role: value})}>
                        <SelectTrigger className="h-9 text-sm w-40">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="User Level 1">User Level 1</SelectItem>
                          <SelectItem value="User Level 2">User Level 2</SelectItem>
                          <SelectItem value="Analyst">Analyst</SelectItem>
                          <SelectItem value="Admin Level 1">Admin Level 1</SelectItem>
                          <SelectItem value="Admin Level 2">Admin Level 2</SelectItem>
                          <SelectItem value="Super Administrator">Super Admin</SelectItem>
                          <SelectItem value="Partner Business Administrator">Partner Admin</SelectItem>
                          <SelectItem value="Platform Admin">Platform Admin</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={filters.certification} onValueChange={(value) => setFilters({...filters, certification: value})}>
                        <SelectTrigger className="h-9 text-sm w-40">
                          <SelectValue placeholder="Certification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Certifications</SelectItem>
                          {[...new Set(allCertifications.map(c => c.name))].sort().map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={filters.assessment} onValueChange={(value) => setFilters({...filters, assessment: value})}>
                        <SelectTrigger className="h-9 text-sm w-40">
                          <SelectValue placeholder="Assessment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Assessments</SelectItem>
                          {[...new Set(allExternalAssessments.map(a => a.assessment_type))].sort().map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </details>
                </div>
              </CardContent>
            </Card>

            {selectedUsers.length > 1 && (
              <BulkAccountActions
                selectedUserIds={selectedUsers}
                users={users}
                onSuccess={() => {
                  loadData();
                }}
                onClearSelection={() => setSelectedUsers([])}
              />
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Users ({processedUsers.length})
                  </CardTitle>
                  {paginatedUsers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm text-gray-600">Select All (Page)</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto" style={{ userSelect: resizingColumn ? 'none' : 'auto' }}>
                   <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: columnWidths.checkbox, overflow: 'hidden' }}></TableHead>
                        <TableHead
                          style={{ width: columnWidths.name, position: 'relative', padding: 0 }}
                          className="cursor-pointer hover:bg-gray-50 group"
                        >
                          <div 
                            className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                            onClick={() => handleSort('full_name')}
                          >
                            Name
                            {sortConfig.key === 'full_name' && (
                              sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            onMouseDown={(e) => handleMouseDown('name', e)}
                            className="absolute right-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead
                          style={{ width: columnWidths.email, position: 'relative', padding: 0 }}
                          className="cursor-pointer hover:bg-gray-50 group"
                        >
                          <div 
                            className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                            onClick={() => handleSort('email')}
                          >
                            Email
                            {sortConfig.key === 'email' && (
                              sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            onMouseDown={(e) => handleMouseDown('email', e)}
                            className="absolute right-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead
                          style={{ width: columnWidths.status, position: 'relative', padding: 0 }}
                          className="cursor-pointer hover:bg-gray-50 group"
                        >
                          <div 
                            className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                            onClick={() => handleSort('account_status')}
                          >
                            Status
                            {sortConfig.key === 'account_status' && (
                              sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            onMouseDown={(e) => handleMouseDown('status', e)}
                            className="absolute right-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead
                          style={{ width: columnWidths.organization, position: 'relative', padding: 0 }}
                          className="cursor-pointer hover:bg-gray-50 group"
                        >
                          <div 
                            className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                            onClick={() => handleSort('client_id')}
                          >
                            Organization
                            {sortConfig.key === 'client_id' && (
                              sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            onMouseDown={(e) => handleMouseDown('organization', e)}
                            className="absolute right-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead
                          style={{ width: columnWidths.role, position: 'relative', padding: 0 }}
                          className="cursor-pointer hover:bg-gray-50 group"
                        >
                          <div 
                            className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                            onClick={() => handleSort('app_role')}
                          >
                            Role
                            {sortConfig.key === 'app_role' && (
                              sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            onMouseDown={(e) => handleMouseDown('role', e)}
                            className="absolute right-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead
                          style={{ width: columnWidths.position, position: 'relative', padding: 0 }}
                          className="cursor-pointer hover:bg-gray-50 group"
                        >
                          <div 
                            className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                            onClick={() => handleSort('current_role')}
                          >
                            Position
                            {sortConfig.key === 'current_role' && (
                              sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            onMouseDown={(e) => handleMouseDown('position', e)}
                            className="absolute right-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead
                          style={{ width: columnWidths.department, position: 'relative', padding: 0 }}
                          className="cursor-pointer hover:bg-gray-50 group"
                        >
                          <div 
                            className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                            onClick={() => handleSort('department')}
                          >
                            Department
                            {sortConfig.key === 'department' && (
                              sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            onMouseDown={(e) => handleMouseDown('department', e)}
                            className="absolute right-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead
                          style={{ width: columnWidths.lastLogin, position: 'relative', padding: 0 }}
                          className="cursor-pointer hover:bg-gray-50 group"
                        >
                          <div 
                            className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                            onClick={() => handleSort('last_login')}
                          >
                            Last Login
                            {sortConfig.key === 'last_login' && (
                              sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            onMouseDown={(e) => handleMouseDown('lastLogin', e)}
                            className="absolute right-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.actions, overflow: 'hidden' }} className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map(user => {
                        const isActive = getActivityStatus(user.updated_date);
                        const orgInfo = getOrganizationInfo(user);

                        return (
                          <TableRow key={user.id} className="hover:bg-gray-50">
                            <TableCell style={{ width: columnWidths.checkbox, overflow: 'hidden' }}>
                              <Checkbox
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
                              />
                            </TableCell>
                            <TableCell 
                              style={{ width: columnWidths.name, overflow: 'hidden' }}
                              className="font-medium cursor-pointer hover:text-blue-600"
                              onClick={() => setSelectedUserEmail(user.email)}
                            >
                              <div className="truncate" title={user.full_name || user.email}>
                                {user.full_name || user.email}
                              </div>
                              {user.display_name && (
                                <div className="text-xs text-gray-500 truncate max-w-[140px]" title={user.display_name}>
                                  {user.display_name}
                                </div>
                              )}
                            </TableCell>
                            <TableCell style={{ width: columnWidths.email, overflow: 'hidden' }} className="text-sm text-gray-600">
                              <div className="truncate" title={user.email}>
                                {user.email}
                              </div>
                            </TableCell>
                            <TableCell style={{ width: columnWidths.status, overflow: 'hidden' }}>
                              {(user.account_status || 'active') === 'active' ? (
                                <Badge className="bg-green-100 text-green-800 whitespace-nowrap">
                                  <Unlock className="w-3 h-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (user.account_status || 'active') === 'suspended' ? (
                                <Badge className="bg-orange-100 text-orange-800 whitespace-nowrap">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Suspended
                                </Badge>
                              ) : (user.account_status || 'active') === 'locked' ? (
                                <Badge className="bg-red-100 text-red-800 whitespace-nowrap">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Locked
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800 whitespace-nowrap">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                              <ExpirationStatusBadge user={user} className="mt-1" />
                            </TableCell>
                            <TableCell style={{ width: columnWidths.organization, overflow: 'hidden' }}>
                              <div className="truncate" title={orgInfo.name + (orgInfo.type === 'client_via_partner' && orgInfo.partnerName ? ` (via ${orgInfo.partnerName})` : '')}>
                                <Badge className={orgInfo.color + ' whitespace-nowrap'}>
                                  {orgInfo.name}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell style={{ width: columnWidths.role, overflow: 'hidden' }}>
                              <div className="space-y-1">
                                <Badge className={getRoleBadgeColor(user.app_role) + ' whitespace-nowrap'}>
                                  {user.app_role || 'User Level 1'}
                                </Badge>
                                {user.custom_role_id && (
                                  <div className="truncate max-w-[140px]">
                                    <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 whitespace-nowrap">
                                      + {addonRoles.find(r => r.id === user.custom_role_id)?.role_name || 'Addon'}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell style={{ width: columnWidths.position, overflow: 'hidden' }} className="text-sm">
                              <div className="truncate" title={user.current_role}>
                                {user.current_role || '-'}
                              </div>
                            </TableCell>
                            <TableCell style={{ width: columnWidths.department, overflow: 'hidden' }}>
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {user.department || 'Unassigned'}
                              </Badge>
                            </TableCell>
                            <TableCell style={{ width: columnWidths.lastLogin, overflow: 'hidden' }}>
                              <div className="flex items-center gap-2">
                                {user.last_login ? (
                                  <>
                                    <div className={`w-2 h-2 rounded-full ${getActivityStatus(user.last_login) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <span className="text-sm text-gray-600 whitespace-nowrap">
                                      {format(new Date(user.last_login), 'MMM d')}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-400">Never</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell style={{ width: columnWidths.actions, overflow: 'hidden' }} className="text-right">
                              <AccountActionsMenu
                                user={user}
                                onViewDetails={() => setSelectedUserEmail(user.email)}
                                onEdit={() => handleEditUser(user)}
                                onAssignRole={() => handleAssignRole(user)}
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

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, processedUsers.length)} of {processedUsers.length} users
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {processedUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No users match your filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-6 space-y-6">
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Custom Roles & Permissions</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Create custom roles with specific permissions to control what users can do in the platform.
                      System roles (User Level 1-3, Admin Level 1-2) are managed automatically.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search roles..."
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowBulkRoleAssignment(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Assign Roles
                </Button>
                <Button onClick={handleCreateRole} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom Role
                </Button>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedRoles.length > 0 && (
              <BulkRoleActions
                selectedRoles={selectedRoles}
                onSuccess={loadData}
                onClearSelection={() => setSelectedRoles([])}
              />
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Roles List */}
              <div className="lg:col-span-2 space-y-4">
                {filteredRoles.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                      checked={
                        selectedRoles.length > 0 &&
                        selectedRoles.length === filteredRoles.filter(r => !r.is_system_role).length
                      }
                      onCheckedChange={handleSelectAllRoles}
                    />
                    <span className="text-sm text-gray-600">Select All Custom Roles</span>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {filteredRoles.map((role, index) => (
                      <motion.div
                        key={role.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`border-2 hover:shadow-lg transition-all ${
                          role.is_system_role ? 'border-gray-200 bg-gray-50' : 'border-purple-200'
                        } ${selectedRoles.some(r => r.id === role.id) ? 'ring-2 ring-purple-400' : ''}`}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                {!role.is_system_role && (
                                  <Checkbox
                                    checked={selectedRoles.some(r => r.id === role.id)}
                                    onCheckedChange={(checked) => handleSelectRole(role.id, checked)}
                                  />
                                )}
                                <div
                                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: role.color + '20' }}
                                >
                                  <Shield className="w-6 h-6" style={{ color: role.color }} />
                                </div>
                                <div>
                                  <CardTitle className="text-lg">{role.role_name}</CardTitle>
                                  {role.is_system_role && (
                                    <Badge variant="outline" className="mt-1">System Role</Badge>
                                  )}
                                  {!role.is_active && (
                                    <Badge className="bg-gray-100 text-gray-800 mt-1">Inactive</Badge>
                                  )}
                                </div>
                              </div>
                              {!role.is_system_role && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditRole(role)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteRole(role)}
                                    disabled={role.user_count > 0}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-600 mb-4">
                              {role.description || 'No description provided'}
                            </p>

                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Users className="w-4 h-4" />
                                <span>{role.user_count || 0} users</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Lock className="w-4 h-4" />
                                <span>{role.permissions?.length || 0} permissions</span>
                              </div>
                            </div>

                            {role.permissions && role.permissions.length > 0 && (
                              <div className="mt-4">
                                <p className="text-xs font-medium text-gray-700 mb-2">Key Permissions:</p>
                                <div className="flex flex-wrap gap-1">
                                  {role.permissions.slice(0, 3).map(permKey => {
                                    const perm = permissions.find(p => p.permission_key === permKey);
                                    return perm ? (
                                      <Badge key={permKey} variant="outline" className="text-xs">
                                        {perm.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                  {role.permissions.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{role.permissions.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {filteredRoles.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Roles Found</h3>
                      <p className="text-gray-600 mb-4">
                        {roleSearchQuery ? 'Try adjusting your search' : 'Get started by creating your first custom role'}
                      </p>
                      {!roleSearchQuery && (
                        <Button onClick={handleCreateRole} className="bg-purple-600 hover:bg-purple-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Custom Role
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Permission Dependency Viewer */}
              <div className="lg:col-span-1">
                <PermissionDependencyViewer
                  selectedPermissions={selectedPermissions}
                  allPermissions={permissions}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

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
          <DialogHeader>
            <DialogTitle>Upload CSV</DialogTitle>
          </DialogHeader>
          <BulkUserUpload
            onCancel={() => setShowBulkUpload(false)}
            onSuccess={() => {
              setShowBulkUpload(false);
              loadData();
            }}
          />
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

      <Dialog open={showAssignRoleModal} onOpenChange={setShowAssignRoleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to {selectedUserForRole?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select a custom role to assign to this user. This will override their standard role permissions.
            </p>
            <div className="space-y-2">
              {roles.filter(r => !r.is_system_role).map(role => (
                <button
                  key={role.id}
                  onClick={() => handleSaveRoleAssignment(role.id)}
                  className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: role.color + '20' }}
                  >
                    <Shield className="w-5 h-5" style={{ color: role.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{role.role_name}</p>
                    <p className="text-xs text-gray-500">{role.permissions?.length || 0} permissions</p>
                  </div>
                </button>
              ))}
              {roles.filter(r => !r.is_system_role).length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No custom roles available</p>
                  <Button
                    onClick={() => {
                      setShowAssignRoleModal(false);
                      setActiveTab('roles');
                      handleCreateRole();
                    }}
                    className="mt-4"
                  >
                    Create a Role
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateRoleModal
        open={showCreateRoleModal}
        onOpenChange={setShowCreateRoleModal}
        editingRole={editingRole}
        roleFormData={roleFormData}
        setRoleFormData={setRoleFormData}
        selectedPermissions={selectedPermissions}
        groupedPermissions={groupedPermissions}
        onTogglePermission={handleTogglePermission}
        onSave={handleSaveRole}
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
    </div>
  );
}

export default withAuthProtection(UserManagement, ['Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator']);