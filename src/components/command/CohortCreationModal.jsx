import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search, Loader2 } from "lucide-react";
import { Cohort } from "@/entities/Cohort";
import { User as UserEntity } from "@/entities/User";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";

export default function CohortCreationModal({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    program_type: '',
    description: '',
    start_date: '',
    end_date: '',
    participant_emails: []
  });
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      loadUsers();
      setFormData({
        name: '',
        program_type: '',
        description: '',
        start_date: '',
        end_date: '',
        participant_emails: []
      });
      setSearchTerm('');
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(allUsers.slice(0, 50));
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = allUsers.filter(u => 
        u.full_name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.department?.toLowerCase().includes(term)
      );
      setFilteredUsers(filtered.slice(0, 50));
    }
  }, [searchTerm, allUsers]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const users = await UserEntity.list();
      const nonAdminUsers = users
        .filter(u => !u.app_role?.startsWith('Admin Level'))
        .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
      setAllUsers(nonAdminUsers);
      setFilteredUsers(nonAdminUsers.slice(0, 50));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a cohort name');
      return;
    }

    if (!formData.program_type) {
      toast.error('Program type is required');
      return;
    }

    if (!formData.start_date) {
      toast.error('Please select a start date');
      return;
    }

    if (formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate <= startDate) {
        toast.error('End date must be after start date');
        return;
      }
    }

    if (formData.participant_emails.length === 0) {
      toast.error('Please select at least one participant');
      return;
    }

    setSubmitting(true);
    try {
      const cohortData = {
        name: formData.name,
        program_type: formData.program_type,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        participant_emails: formData.participant_emails,
        manager_email: user.email,
        status: 'active'
      };

      await Cohort.create(cohortData);
      
      toast.success('Cohort created successfully');
      
      if (onSuccess) {
        await onSuccess();
      }
      
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      console.error('Error creating cohort:', error);
      toast.error('Failed to create cohort');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleParticipant = (email) => {
    setFormData(prev => ({
      ...prev,
      participant_emails: prev.participant_emails.includes(email)
        ? prev.participant_emails.filter(e => e !== email)
        : [...prev.participant_emails, email]
    }));
  };

  const removeParticipant = (email) => {
    setFormData(prev => ({
      ...prev,
      participant_emails: prev.participant_emails.filter(e => e !== email)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Cohort</DialogTitle>
          <DialogDescription>
            Set up a new leadership development program cohort
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Program Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Q1 2025 Leadership Program"
                required
              />
            </div>

            <div>
              <Label htmlFor="program_type">Program Type *</Label>
              <Select
                value={formData.program_type}
                onValueChange={(value) => setFormData({...formData, program_type: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select program type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emerging_leaders">Emerging Leaders</SelectItem>
                  <SelectItem value="executive_development">Executive Development</SelectItem>
                  <SelectItem value="new_manager_bootcamp">New Manager Bootcamp</SelectItem>
                  <SelectItem value="custom">Custom Program</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the program goals and content..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  min={formData.start_date}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Participants ({formData.participant_emails.length} selected)</Label>
              
              {formData.participant_emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 mb-3 p-3 bg-blue-50 rounded-lg">
                  {formData.participant_emails.map(email => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => removeParticipant(email)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-64 border rounded-lg p-2">
                {usersLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No users found matching your search' : 'No users available'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map(u => (
                      <button
                        key={u.email}
                        type="button"
                        onClick={() => toggleParticipant(u.email)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          formData.participant_emails.includes(u.email)
                            ? 'bg-blue-50 border-blue-300'
                            : 'hover:bg-gray-50 border-transparent'
                        }`}
                      >
                        <div className="font-medium">{u.full_name || u.email}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <span>{u.email}</span>
                          {u.department && (
                            <>
                              <span>•</span>
                              <span>{u.department}</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                    {allUsers.length > 50 && filteredUsers.length === 50 && (
                      <div className="text-center py-2 text-sm text-gray-500">
                        Showing first 50 results. Use search to find more users.
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Cohort'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}