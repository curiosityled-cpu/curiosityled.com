import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowUpCircle, Info, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EscalateModal({ open, onClose, onSuccess, user, escalatedBy }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleEscalate = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for escalation");
      return;
    }

    if (!user?.manager_email) {
      toast.error("This user does not have a manager assigned");
      return;
    }

    setSubmitting(true);
    try {
      // Send email to the user's manager
      await base44.integrations.invoke('Core', 'SendEmail', {
        to: user.manager_email,
        subject: `Performance Alert: ${user.full_name || user.email}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h2 style="color: white; margin: 0; font-size: 24px;">⚠️ Performance Alert</h2>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Hi,</p>
              
              <div style="background: #fef2f2; padding: 20px; border-left: 4px solid #dc2626; margin-bottom: 20px;">
                <p style="color: #991b1b; font-weight: 600; margin: 0 0 10px 0;">Team Member Requires Attention</p>
                <p style="color: #374151; margin: 0;"><strong>Team Member:</strong> ${user.full_name || user.email}</p>
                <p style="color: #374151; margin: 5px 0 0 0;"><strong>Email:</strong> ${user.email}</p>
              </div>
              
              <p style="color: #374151; font-weight: 600; margin-bottom: 10px;">Escalation Reason:</p>
              <div style="background: #f9fafb; padding: 15px; border-radius: 6px; color: #374151; white-space: pre-wrap; line-height: 1.6;">${reason}</div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  This alert was escalated by: ${escalatedBy}<br/>
                  Please review this team member's status and consider appropriate interventions.
                </p>
              </div>
            </div>
          </div>
        `,
        from_name: 'Curiosity Led Platform'
      });

      // Create notification for the manager
      await base44.functions.invoke('createNotification', {
        user_email: user.manager_email,
        type: 'milestone',
        title: `Performance Alert: ${user.full_name || user.email}`,
        message: `${escalatedBy} has escalated a performance concern regarding ${user.full_name || user.email}. Reason: ${reason}`,
        priority: 'high'
      });

      toast.success(`Escalated to ${user.manager_email}`);
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error escalating:', error);
      toast.error('Failed to escalate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-red-600" />
            Escalate to Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              This will send an alert to <strong>{user?.manager_email || 'the manager'}</strong> regarding <strong>{user?.full_name || user?.email}</strong>'s performance or development concerns.
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Team Member:</span>
              <span className="font-medium">{user?.full_name || user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Manager:</span>
              <span className="font-medium flex items-center gap-2">
                <Mail className="w-3 h-3" />
                {user?.manager_email || 'Not assigned'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Escalation *</Label>
            <Textarea
              id="reason"
              placeholder="Describe the performance concern, specific behaviors observed, or development needs requiring manager attention..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Be specific and constructive. This message will be included in the alert email.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleEscalate} 
            disabled={submitting || !reason.trim() || !user?.manager_email}
            className="bg-red-600 hover:bg-red-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Escalating...
              </>
            ) : (
              <>
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Escalate to Manager
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}