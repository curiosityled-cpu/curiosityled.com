import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function AccountExpirationModal({ isOpen, onClose, user, onSuccess }) {
  const [expirationDate, setExpirationDate] = useState(user?.account_expires_at ? new Date(user.account_expires_at) : null);
  const [accountType, setAccountType] = useState(user?.account_type || "permanent");
  const [notifyUser, setNotifyUser] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await base44.functions.invoke('setAccountExpiration', {
        userId: user.id,
        expirationDate: expirationDate ? expirationDate.toISOString() : null,
        accountType,
        notifyUser
      });

      if (data.success) {
        toast.success('Account expiration updated successfully');
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.error || 'Failed to update account expiration');
      }
    } catch (error) {
      console.error('Error updating account expiration:', error);
      toast.error('Failed to update account expiration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Set Account Expiration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Configure expiration settings for <strong>{user?.full_name}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label>Account Type</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Permanent Access</SelectItem>
                <SelectItem value="temporary">Temporary Access</SelectItem>
                <SelectItem value="trial">Trial Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Expiration Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expirationDate ? format(expirationDate, 'PPP') : 'No expiration date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expirationDate}
                  onSelect={setExpirationDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
                {expirationDate && (
                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpirationDate(null)}
                      className="w-full"
                    >
                      Clear expiration date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {accountType !== 'permanent' && !expirationDate && (
              <p className="text-xs text-amber-600">
                ⚠️ Temporary and trial accounts should have an expiration date
              </p>
            )}
          </div>

          {expirationDate && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyUser"
                checked={notifyUser}
                onCheckedChange={setNotifyUser}
              />
              <Label htmlFor="notifyUser" className="cursor-pointer text-sm">
                Send email notification to user
              </Label>
            </div>
          )}

          {expirationDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                <strong>Note:</strong> The account will be automatically suspended on {format(expirationDate, 'PPP')} and all active sessions will be terminated.
              </p>
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
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}