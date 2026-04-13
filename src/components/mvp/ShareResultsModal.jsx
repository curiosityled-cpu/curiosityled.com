import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X, Send } from "lucide-react";
import { toast } from "sonner";

export default function ShareResultsModal({ isOpen, onClose, insight, user }) {
  const [emails, setEmails] = useState([""]);
  const [sending, setSending] = useState(false);

  const addEmail = () => setEmails(prev => [...prev, ""]);
  const removeEmail = (i) => setEmails(prev => prev.filter((_, idx) => idx !== i));
  const updateEmail = (i, val) => setEmails(prev => prev.map((e, idx) => idx === i ? val : e));

  const handleSend = async () => {
    const valid = emails.map(e => e.trim()).filter(e => e.includes("@"));
    if (!valid.length) {
      toast.error("Please enter at least one valid email address.");
      return;
    }
    setSending(true);
    try {
      await base44.functions.invoke("shareAssessmentResults", {
        insight_id: insight.assessment_id || insight.id,
        recipient_emails: valid,
        sender_name: user?.full_name,
      });
      toast.success(`Results shared with ${valid.length} recipient${valid.length > 1 ? "s" : ""}.`);
      setEmails([""]);
      onClose();
    } catch (err) {
      toast.error("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#0202ff]" />
            Share Assessment Results
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-500">
            Send your leadership results to your manager or any email address.
          </p>
          <div className="space-y-2">
            {emails.map((email, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex-1">
                  <Label className="sr-only">Email {i + 1}</Label>
                  <Input
                    type="email"
                    placeholder="recipient@example.com"
                    value={email}
                    onChange={e => updateEmail(i, e.target.value)}
                  />
                </div>
                {emails.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400" onClick={() => removeEmail(i)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full text-[#0202ff] border-[#0202ff]/30" onClick={addEmail}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Another Recipient
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Results
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}