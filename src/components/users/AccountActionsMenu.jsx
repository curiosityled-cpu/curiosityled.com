import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoreVertical, Lock, Unlock, Mail, RefreshCw, Loader2, ShieldAlert, Calendar, Send, CreditCard, Eye, Edit, Shield, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import WelcomeEmailModal from "./WelcomeEmailModal";
import AccountExpirationModal from "./AccountExpirationModal";
import LicenseManagementModal from "./LicenseManagementModal";

export default function AccountActionsMenu({ user, onSuccess, onViewDetails, onEdit, onAssignRole, onDelete, onProxy, isImpersonating, impersonatingAction }) {
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWelcomeEmailModal, setShowWelcomeEmailModal] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  const handleSuspend = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('suspendUser', {
        userId: user.id,
        reason: suspendReason
      });

      if (data.success) {
        toast.success('User account suspended');
        setShowSuspendModal(false);
        setSuspendReason("");
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to suspend user');
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('activateUser', {
        userId: user.id
      });

      if (data.success) {
        toast.success('User account activated');
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to activate user');
      }
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Failed to activate user');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('resendUserInvitation', {
        userId: user.id
      });

      if (data.success) {
        toast.success(`Invitation sent to ${user.email}`);
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('unlockUserAccount', {
        userId: user.id
      });

      if (data.success) {
        toast.success('User account unlocked');
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to unlock account');
      }
    } catch (error) {
      console.error('Error unlocking account:', error);
      toast.error('Failed to unlock account');
    } finally {
      setLoading(false);
    }
  };

  const isSuspended = user.account_status === 'suspended';
  const isLocked = user.account_status === 'locked';
  const isPending = user.account_status === 'pending_activation' || !user.invitation_accepted_at;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreVertical className="w-4 h-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onViewDetails}>
            <Eye className="w-4 h-4 mr-2 text-blue-600" />
            View Details
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2 text-gray-600" />
            Edit User
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onAssignRole}>
            <Shield className="w-4 h-4 mr-2 text-purple-600" />
            Assign Role
          </DropdownMenuItem>

          {!isImpersonating && (
            <DropdownMenuItem onClick={onProxy} disabled={impersonatingAction}>
              <Eye className="w-4 h-4 mr-2 text-indigo-600" />
              Proxy as User
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {isPending && (
            <DropdownMenuItem onClick={handleResendInvitation}>
              <Mail className="w-4 h-4 mr-2 text-blue-600" />
              Resend Invitation
            </DropdownMenuItem>
          )}

          {!isPending && (
            <DropdownMenuItem onClick={handleResendInvitation}>
              <RefreshCw className="w-4 h-4 mr-2 text-blue-600" />
              Send Password Reset
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {isLocked && (
            <DropdownMenuItem onClick={handleUnlock}>
              <ShieldAlert className="w-4 h-4 mr-2 text-blue-600" />
              Unlock Account
            </DropdownMenuItem>
          )}

          {!isLocked && (
            <>
              {isSuspended ? (
                <DropdownMenuItem onClick={handleActivate}>
                  <Unlock className="w-4 h-4 mr-2 text-green-600" />
                  Activate Account
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setShowSuspendModal(true)}>
                  <Lock className="w-4 h-4 mr-2 text-orange-600" />
                  Suspend Account
                </DropdownMenuItem>
              )}
            </>
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowWelcomeEmailModal(true)}>
            <Send className="w-4 h-4 mr-2 text-blue-600" />
            Send Welcome Email
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowExpirationModal(true)}>
            <Calendar className="w-4 h-4 mr-2 text-purple-600" />
            Set Account Expiration
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowLicenseModal(true)}>
            <CreditCard className="w-4 h-4 mr-2 text-green-600" />
            Manage License
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WelcomeEmailModal
        isOpen={showWelcomeEmailModal}
        onClose={() => setShowWelcomeEmailModal(false)}
        userEmail={user.email}
        userName={user.full_name}
      />

      <AccountExpirationModal
        isOpen={showExpirationModal}
        onClose={() => setShowExpirationModal(false)}
        user={user}
        onSuccess={() => {
          onSuccess?.();
        }}
      />

      <LicenseManagementModal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        user={user}
        onSuccess={() => {
          onSuccess?.();
        }}
      />

      <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User Account</DialogTitle>
            <DialogDescription>
              Suspending {user.full_name || user.email} will prevent them from accessing the platform.
              They can be reactivated at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="suspend_reason">Reason for Suspension (Optional)</Label>
              <Textarea
                id="suspend_reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g., Pending review, Temporary leave, Policy violation..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendModal(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suspending...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Suspend Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}