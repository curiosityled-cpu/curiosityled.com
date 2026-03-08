import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, XCircle, Loader2, Users, Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function BulkRoleActions({ selectedRoles, onSuccess, onClearSelection }) {
  const [processing, setProcessing] = useState(false);

  const handleBulkEnable = async () => {
    if (selectedRoles.length === 0) {
      toast.error('No roles selected');
      return;
    }

    if (!confirm(`Enable ${selectedRoles.length} roles?`)) return;

    setProcessing(true);
    try {
      const updatePromises = selectedRoles.map(role =>
        base44.entities.CustomRole.update(role.id, { is_active: true })
      );
      
      await Promise.all(updatePromises);
      toast.success(`${selectedRoles.length} roles enabled successfully`);
      onSuccess();
      onClearSelection();
    } catch (error) {
      console.error('Error enabling roles:', error);
      toast.error('Failed to enable roles');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDisable = async () => {
    if (selectedRoles.length === 0) {
      toast.error('No roles selected');
      return;
    }

    // Check if any role has users assigned
    const rolesWithUsers = selectedRoles.filter(role => (role.user_count || 0) > 0);
    if (rolesWithUsers.length > 0) {
      toast.error(`Cannot disable roles that have users assigned. Remove users first.`);
      return;
    }

    if (!confirm(`Disable ${selectedRoles.length} roles?`)) return;

    setProcessing(true);
    try {
      const updatePromises = selectedRoles.map(role =>
        base44.entities.CustomRole.update(role.id, { is_active: false })
      );
      
      await Promise.all(updatePromises);
      toast.success(`${selectedRoles.length} roles disabled successfully`);
      onSuccess();
      onClearSelection();
    } catch (error) {
      console.error('Error disabling roles:', error);
      toast.error('Failed to disable roles');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRoles.length === 0) {
      toast.error('No roles selected');
      return;
    }

    // Check for system roles
    const systemRoles = selectedRoles.filter(role => role.is_system_role);
    if (systemRoles.length > 0) {
      toast.error('Cannot delete system roles');
      return;
    }

    // Check if any role has users assigned
    const rolesWithUsers = selectedRoles.filter(role => (role.user_count || 0) > 0);
    if (rolesWithUsers.length > 0) {
      toast.error(`Cannot delete roles that have users assigned. Remove users first.`);
      return;
    }

    if (!confirm(`Permanently delete ${selectedRoles.length} roles? This action cannot be undone.`)) return;

    setProcessing(true);
    try {
      const deletePromises = selectedRoles.map(role =>
        base44.entities.CustomRole.delete(role.id)
      );
      
      await Promise.all(deletePromises);
      toast.success(`${selectedRoles.length} roles deleted successfully`);
      onSuccess();
      onClearSelection();
    } catch (error) {
      console.error('Error deleting roles:', error);
      toast.error('Failed to delete roles');
    } finally {
      setProcessing(false);
    }
  };

  if (selectedRoles.length === 0) return null;

  const totalUsers = selectedRoles.reduce((sum, role) => sum + (role.user_count || 0), 0);
  const hasSystemRoles = selectedRoles.some(role => role.is_system_role);
  const hasRolesWithUsers = selectedRoles.some(role => (role.user_count || 0) > 0);

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-600 text-white">
              {selectedRoles.length} roles selected
            </Badge>
            {totalUsers > 0 && (
              <Badge variant="outline" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {totalUsers} users affected
              </Badge>
            )}
            {hasSystemRoles && (
              <Badge className="bg-orange-100 text-orange-800 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Includes system roles
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkEnable}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              )}
              Enable
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkDisable}
              disabled={processing || hasRolesWithUsers}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2 text-orange-600" />
              )}
              Disable
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkDelete}
              disabled={processing || hasSystemRoles || hasRolesWithUsers}
              className="text-red-600 hover:text-red-700"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Delete
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
              disabled={processing}
            >
              Clear
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}