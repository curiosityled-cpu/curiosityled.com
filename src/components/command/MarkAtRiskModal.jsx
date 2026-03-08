import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Flag, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";

export default function MarkAtRiskModal({ open, onClose, onSuccess, users }) {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    reason: "",
    severity: "medium",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const userArray = Array.isArray(users) ? users : [users];
  const isBulk = userArray.length > 1;

  const handleSubmit = async () => {
    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for marking as at-risk");
      return;
    }

    setSubmitting(true);
    try {
      const updatePromises = userArray.map(async (targetUser) => {
        // Update user's at-risk flag
        await base44.asServiceRole.entities.User.update(targetUser.id, {
          at_risk_flag: true,
          at_risk_reason: formData.reason,
          at_risk_notes: formData.notes || "",
          at_risk_flagged_by: currentUser.email,
          at_risk_flagged_date: new Date().toISOString()
        });

        // Create notification for the user
        await base44.functions.invoke('createNotification', {
          user_email: targetUser.email,
          type: 'milestone',
          title: 'Development Support Available',
          message: `Your manager has flagged you for additional development support. This is an opportunity to accelerate your growth with personalized guidance.`,
          priority: formData.severity === 'high' ? 'urgent' : 'high'
        });

        // Notify the user's manager (if different from current user)
        if (targetUser.manager_email && targetUser.manager_email !== currentUser.email) {
          await base44.functions.invoke('createNotification', {
            user_email: targetUser.manager_email,
            type: 'milestone',
            title: `Team Member Flagged: ${targetUser.full_name}`,
            message: `${currentUser.full_name} has marked ${targetUser.full_name} as at-risk. Reason: ${formData.reason}`,
            priority: 'high'
          });
        }
      });

      await Promise.all(updatePromises);

      toast.success(`Marked ${userArray.length} user(s) as at-risk`);
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error marking as at-risk:', error);
      toast.error('Failed to mark user(s) as at-risk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ reason: "", severity: "medium", notes: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-600" />
            Mark as At-Risk {isBulk && `(${userArray.length} users)`}
          </DialogTitle>
        </DialogHeader>

        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-800">
            This will flag {isBulk ? 'these users' : 'this user'} as requiring additional support and notify relevant stakeholders.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {!isBulk && users && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Team Member:</p>
              <p className="text-base font-semibold text-gray-900">{users.full_name || users.email}</p>
              <p className="text-xs text-gray-600">{users.current_role} • {users.department}</p>
            </div>
          )}

          {isBulk && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Selected Users ({userArray.length}):</p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {userArray.map(u => (
                  <p key={u.id} className="text-xs text-gray-600">• {u.full_name || u.email}</p>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="severity">Severity Level</Label>
            <Select value={formData.severity} onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}>
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Monitoring Required</SelectItem>
                <SelectItem value="medium">Medium - Support Needed</SelectItem>
                <SelectItem value="high">High - Immediate Intervention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Primary Reason *</Label>
            <Select value={formData.reason} onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low assessment score (below 60%)">Low assessment score (below 60%)</SelectItem>
                <SelectItem value="No recent activity (14+ days)">No recent activity (14+ days)</SelectItem>
                <SelectItem value="Multiple overdue goals">Multiple overdue goals</SelectItem>
                <SelectItem value="Low learning completion rate">Low learning completion rate</SelectItem>
                <SelectItem value="Performance concerns">Performance concerns</SelectItem>
                <SelectItem value="Engagement issues">Engagement issues</SelectItem>
                <SelectItem value="Career transition support needed">Career transition support needed</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional context or observations..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={submitting || !formData.reason}
            className="bg-red-600 hover:bg-red-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Marking as At-Risk...
              </>
            ) : (
              <>
                <Flag className="w-4 h-4 mr-2" />
                Mark as At-Risk
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}