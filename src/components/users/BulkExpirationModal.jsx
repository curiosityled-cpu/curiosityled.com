import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Loader2, Users } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function BulkExpirationModal({ isOpen, onClose, selectedUserIds, onSuccess }) {
  const [expirationDate, setExpirationDate] = useState(null);
  const [accountType, setAccountType] = useState("temporary");
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleApply = async () => {
    setProcessing(true);
    try {
      const { data } = await base44.functions.invoke('bulkSetAccountExpiration', {
        userIds: selectedUserIds,
        expirationDate: expirationDate ? expirationDate.toISOString() : null,
        accountType,
        notifyUsers
      });

      if (data.success) {
        toast.success(data.message);
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.error || 'Failed to update account expirations');
      }
    } catch (error) {
      console.error('Error in bulk expiration update:', error);
      toast.error('Failed to update account expirations');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Bulk Set Account Expiration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              This will update expiration settings for <strong>{selectedUserIds.length}</strong> selected users.
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
                id="notifyUsers"
                checked={notifyUsers}
                onCheckedChange={setNotifyUsers}
              />
              <Label htmlFor="notifyUsers" className="cursor-pointer text-sm">
                Send email notifications to all users
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={processing} className="bg-blue-600 hover:bg-blue-700">
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Apply to All'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}