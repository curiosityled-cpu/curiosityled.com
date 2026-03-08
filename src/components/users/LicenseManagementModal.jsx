import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { CreditCard, Loader2, CheckCircle } from "lucide-react";

export default function LicenseManagementModal({ isOpen, onClose, user, onSuccess }) {
  const [licenseType, setLicenseType] = useState(user?.license_type || "full");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await base44.functions.invoke('assignLicense', {
        userId: user.id,
        licenseType
      });

      if (data.success) {
        toast.success('License updated successfully');
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.error || 'Failed to update license');
      }
    } catch (error) {
      console.error('Error updating license:', error);
      toast.error('Failed to update license');
    } finally {
      setSaving(false);
    }
  };

  const licenseInfo = {
    full: {
      label: "Full Access",
      description: "Complete access to all platform features",
      features: ["All assessments", "Goals & tracking", "Learning library", "Analytics", "AI coaching"]
    },
    limited: {
      label: "Limited Access",
      description: "Core features with restricted analytics",
      features: ["Basic assessments", "Personal goals", "Assigned learning", "Limited analytics"]
    },
    view_only: {
      label: "View Only",
      description: "Read-only access for observers",
      features: ["View dashboards", "Read-only reports", "No data creation"]
    }
  };

  const selectedInfo = licenseInfo[licenseType];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Manage License
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Configure license type for <strong>{user?.full_name}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label>License Type</Label>
            <Select value={licenseType} onValueChange={setLicenseType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Access</SelectItem>
                <SelectItem value="limited">Limited Access</SelectItem>
                <SelectItem value="view_only">View Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-sm text-blue-900 mb-1">
                {selectedInfo.label}
              </h4>
              <p className="text-xs text-blue-800 mb-3">
                {selectedInfo.description}
              </p>
              <div className="space-y-1">
                {selectedInfo.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-blue-900">
                    <CheckCircle className="w-3 h-3 text-blue-600" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}

          {user?.license_assigned_date && (
            <div className="text-xs text-gray-500">
              Current license assigned: {format(new Date(user.license_assigned_date), 'MMM d, yyyy')}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Update License'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}