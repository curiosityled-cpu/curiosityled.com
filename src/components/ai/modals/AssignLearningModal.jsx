
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Check, ChevronsUpDown } from "lucide-react"; // Added Check, ChevronsUpDown for combobox
import { User } from "@/entities/User";
import { LearningResource } from "@/entities/LearningResource";
import { AssignedLearning } from "@/entities/AssignedLearning";
import { SendEmail } from "@/integrations/Core";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Added Popover components for combobox
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"; // Added Command components for combobox
import { cn } from "@/lib/utils"; // Assuming cn utility is available for conditional classes

export default function AssignLearningModal({ open, onClose, currentUserEmail }) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [users, setUsers] = useState([]);
  const [resources, setResources] = useState([]);
  
  // State for resource combobox
  const [openResourceCombobox, setOpenResourceCombobox] = useState(false);
  const [resourceSearchValue, setResourceSearchValue] = useState(""); // For filtering resources in combobox
  
  const [assignmentData, setAssignmentData] = useState({
    user_email: '',
    learning_resource_id: '',
    priority: 'medium',
    notes: '',
    due_date: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
      // Reset form data when modal opens
      setAssignmentData({
        user_email: '',
        learning_resource_id: '',
        priority: 'medium',
        notes: '',
        due_date: ''
      });
      // Reset combobox search value
      setResourceSearchValue("");
    }
  }, [open]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [allUsers, allResources] = await Promise.all([
        User.list(),
        LearningResource.filter({ is_active: true }, '-created_date', 50)
      ]);
      
      setUsers(allUsers.filter(u => u.email !== currentUserEmail));
      setResources(allResources);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load users and resources');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAssign = async () => {
    if (!assignmentData.user_email || !assignmentData.learning_resource_id) {
      toast.error('Please select a user and learning resource');
      return;
    }

    setLoading(true);
    try {
      const selectedResource = resources.find(r => r.id === assignmentData.learning_resource_id);
      const selectedUser = users.find(u => u.email === assignmentData.user_email);

      // Defensive check: ensure selected resource and user exist before proceeding
      if (!selectedResource || !selectedUser) {
        toast.error('Selected user or resource not found. Please re-select.');
        setLoading(false);
        return;
      }

      // Create assignment
      await AssignedLearning.create({
        ...assignmentData,
        assigned_by: currentUserEmail,
        title: selectedResource.title,
        description: assignmentData.notes || `Assigned learning: ${selectedResource.title}`,
        status: 'assigned'
      });

      // Send email notification
      try {
        await SendEmail({
          to: assignmentData.user_email,
          subject: `New Learning Resource Assigned: ${selectedResource.title}`,
          body: `Hello ${selectedUser.full_name},

A new learning resource has been assigned to you:

Title: ${selectedResource.title}
Priority: ${assignmentData.priority}
${assignmentData.due_date ? `Due Date: ${new Date(assignmentData.due_date).toLocaleDateString()}` : ''}

${assignmentData.notes ? `Notes from your manager:\n${assignmentData.notes}` : ''}

You can access this resource in your dashboard.

Best regards,
Your Leadership Development Team`
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the entire operation if email fails, but notify user
        toast.warning('Learning assigned, but failed to send email notification.');
      }

      toast.success(`Learning assigned to ${selectedUser.full_name}`);
      onClose(); // This will trigger useEffect to reset the form
      
    } catch (error) {
      console.error('Error assigning learning:', error);
      toast.error('Failed to assign learning');
    } finally {
      setLoading(false);
    }
  };

  // Filter resources based on the combobox search value for advanced searching
  const filteredResources = resources.filter(r => 
    r.title.toLowerCase().includes(resourceSearchValue.toLowerCase()) ||
    r.description?.toLowerCase().includes(resourceSearchValue.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Learning Resource</DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user">Assign To *</Label>
              <Select 
                value={assignmentData.user_email} 
                onValueChange={(value) => setAssignmentData({ ...assignmentData, user_email: value })}
                disabled={loading}
              >
                <SelectTrigger id="user">
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name} ({user.app_role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Replaced old resource search Input and Select with a Combobox component */}
            <div className="space-y-2">
              <Label htmlFor="resource">Learning Resource *</Label>
              <Popover open={openResourceCombobox} onOpenChange={setOpenResourceCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openResourceCombobox}
                    className="w-full justify-between"
                    disabled={loading || loadingData}
                  >
                    {assignmentData.learning_resource_id
                      ? resources.find((resource) => resource.id === assignmentData.learning_resource_id)?.title
                      : "Select a resource..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search resources..."
                      value={resourceSearchValue}
                      onValueChange={setResourceSearchValue}
                    />
                    <CommandEmpty>No resource found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-y-auto">
                      {filteredResources.map((resource) => (
                        <CommandItem
                          key={resource.id}
                          // The value Command filters against. Using title provides good search UX.
                          value={resource.title} 
                          onSelect={(currentValue) => { 
                            const selected = resources.find(r => r.title.toLowerCase() === currentValue.toLowerCase());
                            if (selected) {
                                // If the clicked item is already selected, deselect it. Otherwise, select it.
                                if (selected.id === assignmentData.learning_resource_id) {
                                  setAssignmentData({ ...assignmentData, learning_resource_id: '' });
                                } else {
                                  setAssignmentData({ ...assignmentData, learning_resource_id: selected.id });
                                }
                            }
                            setOpenResourceCombobox(false); // Close the popover after selection
                            setResourceSearchValue(''); // Clear search input after selection/deselection
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              assignmentData.learning_resource_id === resource.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {resource.title} - {resource.type}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={assignmentData.priority} 
                  onValueChange={(value) => setAssignmentData({ ...assignmentData, priority: value })}
                  disabled={loading}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={assignmentData.due_date}
                  onChange={(e) => setAssignmentData({ ...assignmentData, due_date: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes for User</Label>
              <Textarea
                id="notes"
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData({ ...assignmentData, notes: e.target.value })}
                placeholder="Add context or instructions for this assignment..."
                rows={3}
                disabled={loading}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={loading || loadingData || !assignmentData.user_email || !assignmentData.learning_resource_id}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Learning'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
