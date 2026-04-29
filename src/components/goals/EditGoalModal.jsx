import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Lock, Globe, Users, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import AtreusGoalRefiner from "@/components/goals/AtreusGoalRefiner";

const colorOptions = [
  { name: 'Ocean Blue', value: '#0202ff' },
  { name: 'Success Green', value: '#00C875' },
  { name: 'Warning Orange', value: '#FFCB00' },
  { name: 'Danger Red', value: '#E2445C' },
  { name: 'Purple', value: '#A25DDC' },
  { name: 'Teal', value: '#00D9FF' }
];

export default function EditGoalModal({ isOpen, onClose, onSubmit, goal }) {
  const { isManagerOfManagers } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color: '#0202ff',
    visibility: 'private',
    assigned_to_emails: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const [openCount, setOpenCount] = useState(0);
  // Separate refs to independently track the false→true transition for each effect.
  // wasOpenRef: guards form-seed effect. wasOpenForTeamRef: guards team-load effect.
  const wasOpenRef = useRef(false);
  const wasOpenForTeamRef = useRef(false);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (justOpened && goal) {
      setOpenCount(c => c + 1);
      setIsSubmitting(false);
      setFormData({
        title: goal.title || '',
        description: goal.description || '',
        color: goal.color || '#0202ff',
        visibility: goal.visibility || 'private',
        assigned_to_emails: goal.assigned_to_emails || []
      });
    }
  }, [isOpen, goal]);

  // Load team members only when the modal first opens.
  useEffect(() => {
    const justOpened = isOpen && !wasOpenForTeamRef.current;
    wasOpenForTeamRef.current = isOpen;
    if (justOpened && isManagerOfManagers) {
      loadTeamMembers();
    }
  }, [isOpen, isManagerOfManagers]);

  const loadTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.subordinate_emails && currentUser.subordinate_emails.length > 0) {
        const teamUsers = await base44.entities.User.filter({
          email: { $in: currentUser.subordinate_emails }
        });
        setTeamMembers(teamUsers);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const toggleTeamMember = (email) => {
    setFormData(prev => ({
      ...prev,
      assigned_to_emails: prev.assigned_to_emails.includes(email)
        ? prev.assigned_to_emails.filter(e => e !== email)
        : [...prev.assigned_to_emails, email]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !goal) return;

    setIsSubmitting(true);
    try {
      await onSubmit(goal.id, formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!goal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#323338]">
            Edit Goal: {goal.title}
          </DialogTitle>
          <DialogDescription>
            Update the details for your goal.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[#323338] font-medium">
              Goal Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter goal title..."
              className="rounded-xl border-[#E1E5F3] h-12 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(2, 2, 255, 0.2)' }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[#323338] font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What's this goal about?"
              className="rounded-xl border-[#E1E5F3] min-h-20 focus:ring-2"
              style={{ '--tw-ring-color': 'rgba(2, 2, 255, 0.2)' }}
            />
          </div>

          {/* Atreus refinement — shown when title or description has content */}
          {(formData.title.trim().length > 3 || formData.description.trim().length > 0) && (
            <AtreusGoalRefiner
              title={formData.title}
              description={formData.description}
              resetKey={openCount}
              onAccept={({ title, description }) =>
                setFormData(prev => ({ ...prev, title, description }))
              }
            />
          )}

          <div className="space-y-2">
            <Label className="text-[#323338] font-medium">Goal Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    formData.color === color.value 
                      ? 'border-[#323338] scale-110' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#323338] font-medium">Visibility</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value) => setFormData(prev => ({ ...prev, visibility: value }))}
            >
              <SelectTrigger className="rounded-xl border-[#E1E5F3] h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Private</span>
                  </div>
                </SelectItem>
                <SelectItem value="shared">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>Shared</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isManagerOfManagers && (loadingTeam || teamMembers.length > 0) && (
            <div className="space-y-3">
              <Label className="text-[#323338] font-medium">
                <Users className="w-4 h-4 inline mr-2" />
                Assign to Team Members (Optional)
              </Label>
              <div className="p-4 border border-[#E1E5F3] rounded-xl max-h-48 overflow-y-auto space-y-2">
                {loadingTeam ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : (
                  <>
                    {teamMembers.map((member) => (
                      <div key={member.email} className="flex items-center gap-3">
                        <Checkbox
                          id={`member-${member.email}`}
                          checked={formData.assigned_to_emails.includes(member.email)}
                          onCheckedChange={() => toggleTeamMember(member.email)}
                        />
                        <label
                          htmlFor={`member-${member.email}`}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          {member.full_name}
                          <span className="text-gray-500 ml-2">({member.email})</span>
                        </label>
                      </div>
                    ))}
                  </>
                )}
              </div>
              {formData.assigned_to_emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.assigned_to_emails.map((email) => {
                    const member = teamMembers.find(m => m.email === email);
                    return (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {member?.full_name || email}
                        <button
                          type="button"
                          onClick={() => toggleTeamMember(email)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl h-12 px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.title.trim() || isSubmitting}
              className="text-white rounded-xl h-12 px-6 font-medium"
              style={{ backgroundColor: '#0202ff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}