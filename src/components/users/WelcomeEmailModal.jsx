import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

export default function WelcomeEmailModal({ isOpen, onClose, userEmail, userName }) {
  const [customMessage, setCustomMessage] = useState("");
  const [includePlatformInfo, setIncludePlatformInfo] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const { data } = await base44.functions.invoke('sendWelcomeEmail', {
        userEmail,
        customMessage: customMessage.trim() || undefined,
        includePlatformInfo
      });

      if (data.success) {
        toast.success('Welcome email sent successfully');
        onClose();
      } else {
        toast.error(data.error || 'Failed to send welcome email');
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
      toast.error('Failed to send welcome email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Send Welcome Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Send a welcome email to <strong>{userName}</strong> ({userEmail})
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customMessage">Custom Message (Optional)</Label>
            <Textarea
              id="customMessage"
              placeholder="Add a personal message to include in the welcome email..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[120px]"
            />
            <p className="text-xs text-gray-500">
              This message will appear in a highlighted section of the welcome email.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includePlatformInfo"
              checked={includePlatformInfo}
              onCheckedChange={setIncludePlatformInfo}
            />
            <Label htmlFor="includePlatformInfo" className="cursor-pointer">
              Include platform getting started information
            </Label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Email Preview</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p>✅ Welcome message and greeting</p>
              {customMessage && <p>✅ Your custom message</p>}
              {includePlatformInfo && <p>✅ Getting started guide</p>}
              <p>✅ Support contact information</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending} className="bg-blue-600 hover:bg-blue-700">
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Welcome Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}