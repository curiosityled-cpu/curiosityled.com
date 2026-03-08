import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function ReminderManager({ form, onUpdate }) {
  const [reminders, setReminders] = useState(form.reminders || {
    enabled: false,
    frequency_days: 7,
    reminder_message: `Hi! This is a friendly reminder to complete the "${form.title}" form. Your feedback is important to us.`,
    last_reminder_sent: null
  });

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomForm.update(form.id, {
        reminders: reminders
      });

      toast.success("Reminder settings saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving reminders:", error);
      toast.error("Failed to save reminder settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    setSending(true);
    try {
      // Get incomplete submissions
      const allSubmissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      });

      // Get assigned users who haven't submitted
      const assignedEmails = form.assigned_to_emails || [];
      const submitterEmails = allSubmissions.map(s => s.submitter_email);
      const pendingEmails = assignedEmails.filter(email => !submitterEmails.includes(email));

      if (pendingEmails.length === 0) {
        toast.info("All assigned users have already submitted");
        setSending(false);
        return;
      }

      // Send reminders
      for (const email of pendingEmails) {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `Reminder: ${form.title}`,
          body: reminders.reminder_message
        });
      }

      // Update last sent timestamp
      await base44.entities.CustomForm.update(form.id, {
        reminders: {
          ...reminders,
          last_reminder_sent: new Date().toISOString()
        }
      });

      toast.success(`Reminders sent to ${pendingEmails.length} user${pendingEmails.length !== 1 ? 's' : ''}`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error sending reminders:", error);
      toast.error("Failed to send reminders");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Automatic Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Reminders */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="enable_reminders"
            checked={reminders.enabled}
            onCheckedChange={(checked) => setReminders({
              ...reminders,
              enabled: checked
            })}
          />
          <label htmlFor="enable_reminders" className="text-sm cursor-pointer font-medium">
            Enable automatic reminders
          </label>
        </div>

        {reminders.enabled && (
          <>
            {/* Frequency */}
            <div>
              <Label htmlFor="frequency">Reminder Frequency</Label>
              <Select
                value={reminders.frequency_days.toString()}
                onValueChange={(value) => setReminders({
                  ...reminders,
                  frequency_days: parseInt(value)
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Daily</SelectItem>
                  <SelectItem value="3">Every 3 days</SelectItem>
                  <SelectItem value="7">Weekly</SelectItem>
                  <SelectItem value="14">Every 2 weeks</SelectItem>
                  <SelectItem value="30">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                How often to remind users who haven't submitted
              </p>
            </div>

            {/* Reminder Message */}
            <div>
              <Label htmlFor="reminder_message">Reminder Message</Label>
              <Textarea
                id="reminder_message"
                value={reminders.reminder_message}
                onChange={(e) => setReminders({
                  ...reminders,
                  reminder_message: e.target.value
                })}
                rows={4}
                placeholder="Enter the reminder message..."
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be sent to users who haven't completed the form
              </p>
            </div>

            {/* Last Sent */}
            {reminders.last_reminder_sent && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-600">
                  Last reminder sent: {new Date(reminders.last_reminder_sent).toLocaleString()}
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
            style={{ backgroundColor: '#0202ff' }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>

          {reminders.enabled && (
            <Button
              onClick={handleSendNow}
              disabled={sending}
              variant="outline"
              className="flex-1"
            >
              {sending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Now
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}