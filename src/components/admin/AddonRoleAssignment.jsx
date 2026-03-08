import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Shield, Plus, X, Users, Check, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/useAuth";
// ADDON_ROLE_TEMPLATES imported from constants/permissions if needed for local fallback

/**
 * AddonRoleAssignment Component
 * 
 * Allows admins to assign addon roles to users.
 * Can be used standalone or embedded in user management screens.
 * 
 * @param {object} targetUser - The user to assign the role to
 * @param {function} onAssignmentComplete - Callback after successful assignment
 * @param {boolean} compact - Show in compact mode for embedding
 */
export default function AddonRoleAssignment({ 
  targetUser, 
  onAssignmentComplete,
  compact = false 
}) {
  const { user: currentUser, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [addonRoles, setAddonRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState('assign'); // 'assign' or 'remove'

  useEffect(() => {
    loadAddonRoles();
  }, []);

  const loadAddonRoles = async () => {
    try {
      // Load addon roles from CustomRole entity
      const roles = await base44.entities.CustomRole.filter({ 
        is_addon: true,
        is_active: true
      });
      setAddonRoles(roles || []);
    } catch (error) {
      console.error('Error loading addon roles:', error);
      setAddonRoles([]);
    }
  };

  const handleAssign = async () => {
    if (!selectedRoleId || !targetUser?.id) return;

    setLoading(true);
    try {
      const response = await base44.functions.invoke('assignAddonRole', {
        user_id: targetUser.id,
        custom_role_id: selectedRoleId,
        action: 'assign'
      });

      if (response.data?.success) {
        toast.success(`Addon role assigned to ${targetUser.full_name}`);
        onAssignmentComplete?.(response.data);
        setShowConfirmDialog(false);
        setSelectedRoleId('');
      } else {
        throw new Error(response.data?.error || 'Failed to assign role');
      }
    } catch (error) {
      console.error('Error assigning addon role:', error);
      toast.error('Failed to assign addon role: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!targetUser?.id) return;

    setLoading(true);
    try {
      const response = await base44.functions.invoke('assignAddonRole', {
        user_id: targetUser.id,
        action: 'remove'
      });

      if (response.data?.success) {
        toast.success(`Addon role removed from ${targetUser.full_name}`);
        onAssignmentComplete?.(response.data);
        setShowConfirmDialog(false);
      } else {
        throw new Error(response.data?.error || 'Failed to remove role');
      }
    } catch (error) {
      console.error('Error removing addon role:', error);
      toast.error('Failed to remove addon role: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentAddonRole = () => {
    if (!targetUser?.custom_role_id) return null;
    return addonRoles.find(r => r.id === targetUser.custom_role_id);
  };

  const currentAddonRole = getCurrentAddonRole();

  // Check if user can assign roles
  const canAssignRoles = hasPermission('roles.assign') || 
                         ['Platform Admin', 'Super Administrator', 'Admin Level 2', 'Partner Business Administrator'].includes(currentUser?.app_role);

  if (!canAssignRoles) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {currentAddonRole ? (
          <>
            <Badge 
              className="text-xs"
              style={{ backgroundColor: currentAddonRole.color + '20', color: currentAddonRole.color, borderColor: currentAddonRole.color }}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {currentAddonRole.role_name}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActionType('remove');
                setShowConfirmDialog(true);
              }}
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActionType('assign');
              setShowConfirmDialog(true);
            }}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Permission
          </Button>
        )}

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'assign' ? 'Assign Addon Permissions' : 'Remove Addon Permissions'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'assign' 
                  ? `Add additional permissions to ${targetUser?.full_name}'s base role.`
                  : `Remove addon permissions from ${targetUser?.full_name}.`
                }
              </DialogDescription>
            </DialogHeader>

            {actionType === 'assign' && (
              <div className="py-4">
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select addon role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {addonRoles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: role.color }}
                          />
                          {role.role_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedRoleId && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">
                      {addonRoles.find(r => r.id === selectedRoleId)?.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {addonRoles.find(r => r.id === selectedRoleId)?.permissions.slice(0, 5).map((perm, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                      {(addonRoles.find(r => r.id === selectedRoleId)?.permissions.length || 0) > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{addonRoles.find(r => r.id === selectedRoleId).permissions.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {actionType === 'remove' && (
              <div className="py-4">
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-sm text-red-700">
                    This will remove the "{currentAddonRole?.role_name}" addon from this user.
                    They will retain their base role permissions.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={actionType === 'assign' ? handleAssign : handleRemove}
                disabled={loading || (actionType === 'assign' && !selectedRoleId)}
                className={actionType === 'remove' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {actionType === 'assign' ? 'Assign Role' : 'Remove Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Full card view
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Addon Permissions
        </CardTitle>
        <CardDescription>
          Assign additional permissions that merge with the user's base role
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Base Role */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Base Role</p>
              <p className="text-lg font-semibold text-gray-900">{targetUser?.app_role}</p>
            </div>
            <Badge variant="outline">Base</Badge>
          </div>

          {/* Current Addon Role */}
          {currentAddonRole ? (
            <div 
              className="flex items-center justify-between p-3 rounded-lg border-2"
              style={{ borderColor: currentAddonRole.color, backgroundColor: currentAddonRole.color + '10' }}
            >
              <div>
                <p className="text-sm font-medium text-gray-700">Active Addon</p>
                <p className="text-lg font-semibold" style={{ color: currentAddonRole.color }}>
                  {currentAddonRole.role_name}
                </p>
                <p className="text-xs text-gray-500 mt-1">{currentAddonRole.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionType('remove');
                  setShowConfirmDialog(true);
                }}
                className="text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
              <p className="text-gray-500 mb-3">No addon permissions assigned</p>
              <Button
                onClick={() => {
                  setActionType('assign');
                  setShowConfirmDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Assign Addon Role
              </Button>
            </div>
          )}

          {/* Available Addon Roles */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Available Addon Roles</h4>
            {addonRoles.length === 0 ? (
              <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                <p className="text-sm">No addon roles available.</p>
                <p className="text-xs mt-1">Run the "Seed Addon Roles" function to create templates.</p>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-3">
              {addonRoles.map(role => (
                <div 
                  key={role.id}
                  className="p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  style={{ borderColor: role.color + '50' }}
                  onClick={() => {
                    if (role.id !== currentAddonRole?.id) {
                      setSelectedRoleId(role.id);
                      setActionType('assign');
                      setShowConfirmDialog(true);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: role.color }}
                    />
                    <span className="font-medium text-sm">{role.role_name}</span>
                    {role.id === currentAddonRole?.id && (
                      <Check className="w-4 h-4 text-green-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{role.description}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Users className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{role.user_count || 0} users</span>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        {/* Confirm Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'assign' ? 'Assign Addon Permissions' : 'Remove Addon Permissions'}
              </DialogTitle>
            </DialogHeader>

            {actionType === 'assign' && selectedRoleId && (
              <div className="py-4">
                <p className="text-gray-600 mb-4">
                  Assign "{addonRoles.find(r => r.id === selectedRoleId)?.role_name}" to {targetUser?.full_name}?
                </p>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> These permissions will be merged with the user's base role permissions ({targetUser?.app_role}).
                  </p>
                </div>
              </div>
            )}

            {actionType === 'remove' && (
              <div className="py-4">
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-sm text-red-700">
                    This will remove all addon permissions. The user will retain their base role ({targetUser?.app_role}) permissions.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={actionType === 'assign' ? handleAssign : handleRemove}
                disabled={loading}
                className={actionType === 'remove' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {actionType === 'assign' ? 'Confirm Assignment' : 'Remove Addon'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}