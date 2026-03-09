import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Lock,
  Unlock,
  Search,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/common/PageHeader";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";

const ROLE_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#a855f7'
];

function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [formData, setFormData] = useState({
    role_name: '',
    description: '',
    color: ROLE_COLORS[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Seed system permissions first
      await base44.functions.invoke('seedSystemPermissions');
      
      // Load permissions and roles
      const [perms, customRoles] = await Promise.all([
        base44.entities.Permission.list(),
        base44.entities.CustomRole.list('-created_date')
      ]);
      
      setPermissions(perms || []);
      setRoles(customRoles || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setFormData({
      role_name: '',
      description: '',
      color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)]
    });
    setSelectedPermissions([]);
    setShowCreateModal(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setFormData({
      role_name: role.role_name,
      description: role.description || '',
      color: role.color || ROLE_COLORS[0]
    });
    setSelectedPermissions(role.permissions || []);
    setShowCreateModal(true);
  };

  const handleSaveRole = async () => {
    if (!formData.role_name.trim()) {
      toast.error('Role name is required');
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      const roleKey = formData.role_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      const roleData = {
        ...formData,
        role_key: roleKey,
        permissions: selectedPermissions,
        is_system_role: false,
        is_active: true
      };

      if (editingRole) {
        await base44.entities.CustomRole.update(editingRole.id, roleData);
        toast.success('Role updated successfully');
      } else {
        await base44.entities.CustomRole.create(roleData);
        toast.success('Role created successfully');
      }

      setShowCreateModal(false);
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

    if (!confirm(`Are you sure you want to delete the role "${role.role_name}"?`)) {
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

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {});

  const filteredRoles = roles.filter(role =>
    role.role_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roles and permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Management"
        subtitle="Create and manage custom roles with granular permissions"
        icon={Shield}
      />

      {/* Info Banner */}
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

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button onClick={handleCreateRole} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Custom Role
        </Button>
      </div>

      {/* Roles Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
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
              {searchQuery ? 'Try adjusting your search' : 'Get started by creating your first custom role'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateRole} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Role
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Role Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Edit Role' : 'Create Custom Role'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="role_name">Role Name *</Label>
                <Input
                  id="role_name"
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  placeholder="e.g., Content Manager, Analytics Viewer"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this role is responsible for..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {ROLE_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <Label className="text-lg font-semibold mb-4 block">
                Permissions * ({selectedPermissions.length} selected)
              </Label>
              
              <Tabs defaultValue={Object.keys(groupedPermissions)[0]}>
                <TabsList className="grid grid-cols-5 w-full">
                  {Object.keys(groupedPermissions).slice(0, 5).map(category => (
                    <TabsTrigger key={category} value={category} className="capitalize">
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {Object.keys(groupedPermissions).slice(0, 5).map(category => (
                  <TabsContent key={category} value={category} className="space-y-3 mt-4">
                    {groupedPermissions[category].map(permission => (
                      <div
                        key={permission.permission_key}
                        className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50"
                      >
                        <Checkbox
                          id={permission.permission_key}
                          checked={selectedPermissions.includes(permission.permission_key)}
                          onCheckedChange={() => handleTogglePermission(permission.permission_key)}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={permission.permission_key}
                            className="font-medium cursor-pointer"
                          >
                            {permission.name}
                          </Label>
                          <p className="text-xs text-gray-500 mt-1">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>

              {/* Show remaining categories */}
              {Object.keys(groupedPermissions).length > 5 && (
                <Tabs defaultValue={Object.keys(groupedPermissions)[5]} className="mt-4">
                  <TabsList className="grid grid-cols-5 w-full">
                    {Object.keys(groupedPermissions).slice(5).map(category => (
                      <TabsTrigger key={category} value={category} className="capitalize">
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {Object.keys(groupedPermissions).slice(5).map(category => (
                    <TabsContent key={category} value={category} className="space-y-3 mt-4">
                      {groupedPermissions[category].map(permission => (
                        <div
                          key={permission.permission_key}
                          className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50"
                        >
                          <Checkbox
                            id={permission.permission_key}
                            checked={selectedPermissions.includes(permission.permission_key)}
                            onCheckedChange={() => handleTogglePermission(permission.permission_key)}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={permission.permission_key}
                              className="font-medium cursor-pointer"
                            >
                              {permission.name}
                            </Label>
                            <p className="text-xs text-gray-500 mt-1">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRole} className="bg-purple-600 hover:bg-purple-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                {editingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuthProtection(RoleManagement, ['Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator']);