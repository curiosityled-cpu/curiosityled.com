import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { UserPlus, X, Send, Loader2 } from "lucide-react";

export default function FormAssignmentManager({ form, onUpdate }) {
  const [assignees, setAssignees] = useState(form.assigned_to_emails || []);
  const [newEmail, setNewEmail] = useState("");
  const [users, setUsers] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const userData = await base44.entities.User.list();
      setUsers(userData);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleAddAssignee = async () => {
    const email = newEmail.trim().toLowerCase();
    
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Sanitize email to prevent XSS
    const sanitizedEmail = email.replace(/[<>]/g, '');

    if (assignees.includes(sanitizedEmail)) {
      toast.error("This user is already assigned");
      return;
    }

    const updatedAssignees = [...assignees, sanitizedEmail];
    setAssignees(updatedAssignees);
    setNewEmail("");

    try {
      await base44.entities.CustomForm.update(form.id, {
        assigned_to_emails: updatedAssignees
      });
      toast.success("Assignee added");
      onUpdate();
    } catch (error) {
      console.error("Error adding assignee:", error);
      toast.error("Failed to add assignee");
      setAssignees(assignees);
    }
  };

  const handleRemoveAssignee = async (email) => {
    const updatedAssignees = assignees.filter(e => e !== email);
    setAssignees(updatedAssignees);

    try {
      await base44.entities.CustomForm.update(form.id, {
        assigned_to_emails: updatedAssignees
      });
      toast.success("Assignee removed");
      onUpdate();
    } catch (error) {
      console.error("Error removing assignee:", error);
      toast.error("Failed to remove assignee");
      setAssignees(assignees);
    }
  };

  const handleSendNotifications = async () => {
    if (assignees.length === 0) {
      toast.error("No assignees to notify");
      return;
    }

    setSending(true);
    try {
      const formUrl = `${window.location.origin}/FormSubmission?formId=${form.id}`;

      for (const email of assignees) {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `Form Assignment: ${form.title}`,
          body: `
            <h2>You have been assigned a form</h2>
            <p><strong>${form.title}</strong></p>
            <p>${form.description || ''}</p>
            <p><a href="${formUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0202ff; color: white; text-decoration: none; border-radius: 5px;">Complete Form</a></p>
            <p>Or copy this link: ${formUrl}</p>
          `
        });
      }

      toast.success(`Notifications sent to ${assignees.length} user(s)`);
    } catch (error) {
      console.error("Error sending notifications:", error);
      toast.error("Failed to send notifications");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Assignments</CardTitle>
        <p className="text-sm text-gray-600">
          Assign this form to specific users and send notifications
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddAssignee()}
            />
          </div>
          <Button
            onClick={handleAddAssignee}
            className="mt-6"
            style={{ backgroundColor: '#0202ff' }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {assignees.length > 0 && (
          <>
            <div className="space-y-2">
              <Label>Assigned Users ({assignees.length})</Label>
              <div className="flex flex-wrap gap-2">
                {assignees.map((email) => (
                  <Badge key={email} variant="secondary" className="pr-1">
                    {email}
                    <button
                      onClick={() => handleRemoveAssignee(email)}
                      className="ml-2 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSendNotifications}
              disabled={sending}
              variant="outline"
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Notification Emails
                </>
              )}
            </Button>
          </>
        )}

        {assignees.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No users assigned yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}