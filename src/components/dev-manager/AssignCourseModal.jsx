import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * AssignCourseModal — assigns a course to individual users or a cohort.
 * Creates CourseProgress records, sends notifications, and auto-enrolls
 * learners into any live Class sessions referenced by the course's lessons.
 *
 * Props: open, onClose, course, users[], cohorts[], clientId, onAssigned()
 */
export default function AssignCourseModal({ open, onClose, course, users = [], cohorts = [], clientId, onAssigned }) {
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

  // Collect unique Class IDs from the course's lessons for auto-enrollment
  const getClassIds = () => {
    const ids = [];
    (course.modules || []).forEach(mod => {
      (mod.lessons || []).forEach(lesson => {
        if (lesson.content_type === "live_class" && lesson.reference_id) {
          ids.push(lesson.reference_id);
        }
      });
    });
    return [...new Set(ids)];
  };

  const handleAssign = async () => {
    if (!course) return;
    let targetEmails = [];
    let cohortId = null;
    if (assignmentType === "individual") {
      targetEmails = selectedUsers;
    } else if (assignmentType === "cohort" && selectedCohort) {
      const cohort = cohorts.find((c) => c.id === selectedCohort);
      targetEmails = cohort?.participant_emails || [];
      cohortId = selectedCohort;
    }
    if (targetEmails.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setAssigning(true);
    try {
      // 1. Update the course's assigned list
      const existingAssigned = course.assigned_to_emails || [];
      const newAssigned = [...new Set([...existingAssigned, ...targetEmails])];
      await base44.entities.Course.update(course.id, {
        assigned_to_emails: newAssigned,
        enrollment_count: newAssigned.length,
        ...(cohortId && !course.cohort_id ? { cohort_id: cohortId } : {}),
      });

      // 2. Create CourseProgress records (skip users who already have one)
      const existingProgress = await base44.entities.CourseProgress.filter({ course_id: course.id });
      const existingEmails = new Set((existingProgress || []).map(p => p.learner_email));
      const newEmails = targetEmails.filter(e => !existingEmails.has(e));

      if (newEmails.length > 0) {
        const progressRecords = newEmails.map(email => ({
          course_id: course.id,
          course_title: course.title,
          learner_email: email,
          client_id: course.client_id || clientId,
          status: "not_started",
          completed_lessons: [],
          overall_percentage: 0,
          enrolled_at: new Date().toISOString(),
          certificate_issued: false,
          cohort_id: cohortId || course.cohort_id || null,
        }));
        await base44.entities.CourseProgress.bulkCreate(progressRecords);

        // 3. Create notifications
        const notifications = newEmails.map(email => ({
          user_email: email,
          type: "learning_assigned",
          title: `New Course: ${course.title}`,
          message: `You have been assigned the course "${course.title}". You can find it in your learning library.`,
          related_entity_type: "Course",
          related_entity_id: course.id,
          priority: "medium",
          status: "pending",
        }));
        await base44.entities.Notification.bulkCreate(notifications);

        // 4. Auto-enroll into live Class sessions
        const classIds = getClassIds();
        if (classIds.length > 0) {
          const allClasses = await base44.entities.Class.list();
          const relevantClasses = (allClasses || []).filter(c => classIds.includes(c.id));
          if (relevantClasses.length > 0) {
            const updates = relevantClasses.map(c => {
              const existingEnrolled = c.enrolled_emails || [];
              const merged = [...new Set([...existingEnrolled, ...newEmails])];
              const maxCap = c.max_capacity || Infinity;
              let enrolled = merged;
              let waitlist = c.waitlist_emails || [];
              if (merged.length > maxCap) {
                enrolled = merged.slice(0, maxCap);
                waitlist = [...new Set([...waitlist, ...merged.slice(maxCap)])];
              }
              return { id: c.id, enrolled_emails: enrolled, waitlist_emails: waitlist };
            });
            await base44.entities.Class.bulkUpdate(updates);
          }
        }
      }

      toast.success(`Assigned to ${targetEmails.length} participant(s)`);
      setSelectedUsers([]);
      setSelectedCohort("");
      setSearch("");
      onClose();
      onAssigned?.();
    } catch (error) {
      console.error("Error assigning course:", error);
      toast.error("Failed to assign course");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Course</DialogTitle>
          <DialogDescription>
            Send &ldquo;{course?.title}&rdquo; to participants. Learners will be auto-enrolled into any live class sessions included in the course.
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
          <Button onClick={handleAssign} disabled={assigning} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
            {assigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Assign Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}