import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { User, LearningResource as LearningResourceType, AssignedLearning } from "@/entities";
import { SendEmail } from "@/integrations/Core";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { Loader2, Calendar as CalendarIcon, X, Check } from "lucide-react";
import { format } from "date-fns";

// Email Template
const createAssignmentEmailBody = (assigneeName, resource, assignerName, dueDate, notes) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #0056b3;">New Learning Assigned to You</h2>
      <p>Hi ${assigneeName},</p>
      <p>A new learning resource has been assigned to you by <strong>${assignerName}</strong> to support your development.</p>
      <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${resource.title}</h3>
        <p><strong>Provider:</strong> ${resource.provider}</p>
        <p>${resource.description}</p>
        ${dueDate ? `<p><strong>Due Date:</strong> ${format(new Date(dueDate), "PPP")}</p>` : ""}
        ${notes ? `<p><strong>Notes from ${assignerName}:</strong><br/><em>${notes}</em></p>` : ""}
        <a href="${resource.url}" target="_blank" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          Start Learning
        </a>
      </div>
      <p>Happy learning!</p>
      <p><em>- The Curiosity Led Platform</em></p>
    </div>
  `;
};

export default function AssignmentModal({ resource, open, onClose }) {
  const { user: assigner } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [openUserSelector, setOpenUserSelector] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Form state
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState(null);
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const users = await User.list();
        setAllUsers(users.filter(u => u.email !== assigner?.email)); // Exclude self
      } catch (error) {
        toast.error("Failed to load users.");
        console.error("Failed to load users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    if (open) {
      fetchUsers();
    }
  }, [open, assigner]);

  const resetForm = () => {
    setSelectedUsers([]);
    setPriority("medium");
    setDueDate(null);
    setNotes("");
    setSendEmail(true);
  };

  const handleAssign = async () => {
    if (selectedUsers.length === 0) {
      toast.warning("Please select at least one user to assign the resource to.");
      return;
    }
    setIsAssigning(true);
    toast.loading(`Assigning to ${selectedUsers.length} user(s)...`, { id: 'assign-toast' });

    try {
      const assignmentPromises = selectedUsers.map(user => {
        return AssignedLearning.create({
          user_email: user.email,
          learning_resource_id: resource.id,
          assigned_by: assigner.email,
          title: resource.title,
          description: resource.description,
          priority: priority,
          due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
          status: "assigned",
          notes: notes,
        });
      });

      await Promise.all(assignmentPromises);

      if (sendEmail) {
        const emailPromises = selectedUsers.map(user => {
          return SendEmail({
            to: user.email,
            subject: `New Learning Assigned: ${resource.title}`,
            body: createAssignmentEmailBody(user.full_name || user.email, resource, assigner.full_name || assigner.email, dueDate, notes),
            from_name: `${assigner.full_name || 'Your Manager'} via Curiosity Led`,
          });
        });
        await Promise.all(emailPromises);
      }

      toast.success(`Assigned "${resource.title}" to ${selectedUsers.length} user(s).`, { id: 'assign-toast' });
      resetForm();
      onClose();
    } catch (error) {
      toast.error("Failed to assign learning resource.", { id: 'assign-toast' });
      console.error("Assignment error:", error);
    } finally {
      setIsAssigning(false);
    }
  };
  
  const toggleUser = (user) => {
    setSelectedUsers((prev) =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Assign Learning Resource</DialogTitle>
          <DialogDescription>Assign "{resource?.title}" to users in your organization.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* User Selector */}
          <div className="grid grid-cols-4 items-start gap-4">
            <label className="text-right pt-2 font-medium text-sm">Assign To</label>
            <div className="col-span-3">
              <Popover open={openUserSelector} onOpenChange={setOpenUserSelector}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start h-auto min-h-[40px]">
                    <div className="flex flex-wrap gap-1">
                      {selectedUsers.length > 0 ? (
                        selectedUsers.map(user => (
                          <Badge
                            key={user.id}
                            variant="secondary"
                            className="gap-1"
                            onClick={(e) => { e.stopPropagation(); toggleUser(user); }}
                          >
                            {user.full_name}
                            <X className="h-3 w-3" />
                          </Badge>
                        ))
                      ) : (
                        "Select users..."
                      )}
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      {loadingUsers ? (
                        <div className="p-4 text-center text-sm">Loading users...</div>
                      ) : (
                        <CommandEmpty>No users found.</CommandEmpty>
                      )}
                      <CommandGroup>
                        {allUsers.map((user) => {
                          const isSelected = selectedUsers.some(su => su.id === user.id);
                          return (
                            <CommandItem
                              key={user.id}
                              onSelect={() => toggleUser(user)}
                              className="flex justify-between"
                            >
                              <span>{user.full_name} ({user.email})</span>
                              {isSelected && <Check className="h-4 w-4" />}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Priority */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="priority" className="text-right font-medium text-sm">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Set priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="due-date" className="text-right font-medium text-sm">Due Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="col-span-3 justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-4 items-start gap-4">
            <label htmlFor="notes" className="text-right pt-2 font-medium text-sm">Notes</label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Add optional instructions or context for the user(s)."
            />
          </div>
          
          {/* Send Email */}
          <div className="grid grid-cols-4 items-center gap-4">
             <div/>
             <div className="col-span-3 flex items-center space-x-2">
                <Checkbox id="send-email" checked={sendEmail} onCheckedChange={setSendEmail} />
                <label htmlFor="send-email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Send email notification to user(s)
                </label>
             </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>Cancel</Button>
          <Button onClick={handleAssign} disabled={isAssigning}>
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Resource
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}