import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Lock, Unlock, Mail, X, Loader2, ShieldAlert, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import BulkExpirationModal from "./BulkExpirationModal";

export default function BulkAccountActions({ selectedUserIds, users, onSuccess, onClearSelection }) {
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBulkExpirationModal, setShowBulkExpirationModal] = useState(false);

  const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
  const selectedCount = selectedUsers.length;

  const handleBulkSuspend = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('bulkUpdateUserStatus', {
        userIds: selectedUserIds,
        status: 'suspended',
        reason: suspendReason
      });

      if (data.success) {
        toast.success(data.message);
        setShowSuspendModal(false);
        setSuspendReason("");
        onClearSelection();
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to suspend users');
      }
    } catch (error) {
      console.error('Error bulk suspending:', error);
      toast.error('Failed to suspend users');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkActivate = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('bulkUpdateUserStatus', {
        userIds: selectedUserIds,
        status: 'active'
      });

      if (data.success) {
        toast.success(data.message);
        onClearSelection();
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to activate users');
      }
    } catch (error) {
      console.error('Error bulk activating:', error);
      toast.error('Failed to activate users');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkResendInvitations = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('bulkResendInvitations', {
        userIds: selectedUserIds
      });

      if (data.success) {
        toast.success(data.message);
        onClearSelection();
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to send invitations');
      }
    } catch (error) {
      console.error('Error bulk resending invitations:', error);
      toast.error('Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUnlock = async () => {
    if (!confirm(`Are you sure you want to unlock ${selectedCount} user account(s)?`)) {
      return;
    }

    setLoading(true);
    try {
      const results = {
        success: [],
        failed: []
      };

      for (const userId of selectedUserIds) {
        try {
          const { data } = await base44.functions.invoke('unlockUserAccount', { userId });
          if (data.success) {
            results.success.push(userId);
          } else {
            results.failed.push({ userId, error: data.error });
          }
        } catch (error) {
          results.failed.push({ userId, error: error.message });
        }
      }

      if (results.success.length > 0) {
        toast.success(`Unlocked ${results.success.length} account(s)`);
      }
      if (results.failed.length > 0) {
        toast.error(`Failed to unlock ${results.failed.length} account(s)`);
      }

      onClearSelection();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error bulk unlocking:', error);
      toast.error('Failed to unlock accounts');
    } finally {
      setLoading(false);
    }
  };

  const hasLockedUsers = selectedUsers.some(u => u.account_status === 'locked');

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                  {selectedCount}
                </div>
                <span className="font-medium text-gray-900">
                  {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkResendInvitations}
                  disabled={loading}
                  className="gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Resend Invitations
                </Button>

                {hasLockedUsers && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkUnlock}
                    disabled={loading}
                    className="gap-2"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Unlock
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkActivate}
                  disabled={loading}
                  className="gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  Activate
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSuspendModal(true)}
                  disabled={loading}
                  className="gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Suspend
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkExpirationModal(true)}
                  disabled={loading}
                  className="gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Set Expiration
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClearSelection}
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <BulkExpirationModal
        isOpen={showBulkExpirationModal}
        onClose={() => setShowBulkExpirationModal(false)}
        selectedUserIds={selectedUserIds}
        onSuccess={() => {
          onSuccess();
          onClearSelection();
        }}
      />

      <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {selectedCount} User{selectedCount !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              This will prevent the selected users from accessing the platform.
              They can be reactivated at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-2">Selected Users:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedUsers.slice(0, 10).map(u => (
                  <p key={u.id} className="text-xs text-gray-600">
                    • {u.full_name || u.email}
                  </p>
                ))}
                {selectedCount > 10 && (
                  <p className="text-xs text-gray-500">+ {selectedCount - 10} more...</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="bulk_suspend_reason">Reason for Suspension (Optional)</Label>
              <Textarea
                id="bulk_suspend_reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g., Pending review, Temporary leave..."
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
              onClick={handleBulkSuspend}
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
                  Suspend {selectedCount} User{selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}