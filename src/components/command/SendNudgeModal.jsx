import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SendNudgeModal({ open, onClose, onSuccess, users, senderName }) {
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    tone: "encouraging"
  });
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const userArray = Array.isArray(users) ? users : [users];
  const isBulk = userArray.length > 1;

  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const userNames = userArray.map(u => u.full_name || u.email).join(", ");
      
      const response = await base44.integrations.invoke('Core', 'InvokeLLM', {
        prompt: `You are a supportive leadership development coach writing an encouraging message to team members.

Recipients: ${userNames}
Tone: ${formData.tone}
Context: This is a nudge/reminder message from their manager (${senderName}) to encourage them to stay engaged with their leadership development activities.

Generate a warm, professional, and ${formData.tone} email that:
1. Acknowledges their leadership journey
2. Encourages them to continue their development activities
3. Reminds them of available resources and support
4. Is personal and authentic, not generic

Provide both a subject line and message body.`,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            message: { type: "string" }
          }
        }
      });

      if (response.subject && response.message) {
        setFormData(prev => ({
          ...prev,
          subject: response.subject,
          message: response.message
        }));
        toast.success("Message generated with AI!");
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error("Failed to generate message with AI");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error("Please enter both subject and message");
      return;
    }

    setSending(true);
    try {
      const emailPromises = userArray.map(user => 
        base44.integrations.invoke('Core', 'SendEmail', {
          to: user.email,
          subject: formData.subject,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h2 style="color: white; margin: 0; font-size: 24px;">A Message from ${senderName}</h2>
              </div>
              
              <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Hi ${user.full_name || 'there'},</p>
                
                <div style="color: #374151; line-height: 1.8; white-space: pre-wrap;">${formData.message}</div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Best regards,<br/>
                    ${senderName}
                  </p>
                </div>
              </div>
            </div>
          `,
          from_name: senderName
        })
      );

      await Promise.all(emailPromises);

      // Create notification records
      const notificationPromises = userArray.map(user =>
        base44.functions.invoke('createNotification', {
          user_email: user.email,
          type: 'nudge',
          title: formData.subject,
          message: formData.message,
          priority: 'medium',
          scheduled_for: new Date().toISOString()
        })
      );

      await Promise.all(notificationPromises);

      toast.success(`Nudge sent to ${userArray.length} user(s)`);
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error sending nudge:', error);
      toast.error('Failed to send nudge');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setFormData({
      subject: "",
      message: "",
      tone: "encouraging"
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-orange-600" />
            Send {isBulk ? 'Bulk' : ''} Nudge / Reminder
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Sending to: {userArray.map(u => u.full_name || u.email).join(", ")}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Message Tone</Label>
            <Select
              value={formData.tone}
              onValueChange={(value) => setFormData(prev => ({ ...prev, tone: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="encouraging">Encouraging & Supportive</SelectItem>
                <SelectItem value="motivational">Motivational & Energizing</SelectItem>
                <SelectItem value="professional">Professional & Direct</SelectItem>
                <SelectItem value="caring">Caring & Empathetic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateAI}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Message with AI
              </>
            )}
          </Button>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="e.g., Keep Up the Great Work on Your Leadership Journey!"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Write your encouraging message here..."
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {formData.message.length} characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !formData.subject.trim() || !formData.message.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to {userArray.length} User{userArray.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}