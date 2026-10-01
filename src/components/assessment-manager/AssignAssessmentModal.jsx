import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Search, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * AssignAssessmentModal — reusable modal for assigning an assessment to
 * individual users or a cohort. Creates Notification records on confirm.
 *
 * Props: open, onClose, assessment (CustomAssessment or validated def),
 *   users[], cohorts[], onAssigned()
 */
export default function AssignAssessmentModal({ open, onClose, assessment, entityType = "CustomAssessment", users = [], cohorts = [], onAssigned }) {
  const [assignmentType, setAssignmentType] = useState("individual");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(
    (u) =>
      u.email &&
      (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleUser = (email) =>
    setSelectedUsers((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );

  const handleAssign = async () => {
    if (!assessment) return;
    let targetEmails = [];
    if (assignmentType === "individual") targetEmails = selectedUsers;
    else if (assignmentType === "cohort" && selectedCohort) {
      const cohort = cohorts.find((c) => c.id === selectedCohort);
      targetEmails = cohort?.participant_emails || [];
    }
    if (targetEmails.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setAssigning(true);
    try {
      const isForm = entityType === "CustomForm";
      const assignedField = isForm ? "assigned_to_emails" : "assigned_user_emails";
      const existingAssigned = assessment[assignedField] || [];

      // Update the entity's assigned list (assessment or form)
      if (assessment.id) {
        const newAssigned = [...new Set([...existingAssigned, ...targetEmails])];
        if (isForm) {
          await base44.entities.CustomForm.update(assessment.id, { assigned_to_emails: newAssigned });
        } else {
          await base44.entities.CustomAssessment.update(assessment.id, { assigned_user_emails: newAssigned });
        }
      }

      // Create notifications in a single bulk call
      const notifications = targetEmails.map((email) => ({
        user_email: email,
        type: isForm ? "form_assigned" : "assessment_due",
        title: `New ${isForm ? "Signal" : "Assessment"}: ${assessment.title}`,
        message: `You have been assigned: ${assessment.title}. Please complete it at your earliest convenience.`,
        related_entity_type: entityType,
        related_entity_id: assessment.id || "validated",
        priority: "medium",
        status: "pending",
      }));
      await base44.entities.Notification.bulkCreate(notifications);

      toast.success(`Assigned to ${targetEmails.length} participant(s)`);
      setSelectedUsers([]);
      setSelectedCohort("");
      setSearch("");
      onClose();
      onAssigned?.();
    } catch (error) {
      console.error("Error assigning assessment:", error);
      toast.error("Failed to assign assessment");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Assessment</DialogTitle>
          <DialogDescription>
            Send &ldquo;{assessment?.title}&rdquo; to participants
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Assignment Type</label>
            <Select value={assignmentType} onValueChange={setAssignmentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual Users</SelectItem>
                <SelectItem value="cohort">Cohort</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignmentType === "individual" && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Users ({selectedUsers.length} selected)
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-64 border rounded-lg p-2">
                <div className="space-y-1">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id || u.email}
                      className="flex items-center gap-2 p-2 hover:bg-muted/40 rounded cursor-pointer"
                      onClick={() => toggleUser(u.email)}
                    >
                      <Checkbox checked={selectedUsers.includes(u.email)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {assignmentType === "cohort" && (
            <div>
              <label className="text-sm font-medium mb-2 block">Select Cohort</label>
              <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                <SelectTrigger><SelectValue placeholder="Choose a cohort" /></SelectTrigger>
                <SelectContent>
                  {cohorts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.participant_emails?.length || 0} participants)
                    </SelectItem>
                  ))}
                  {cohorts.length === 0 && (
                    <SelectItem value="_none" disabled>No cohorts available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={assigning}>
            {assigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Assign Assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}