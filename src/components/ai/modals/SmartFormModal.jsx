import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Smart Form Modal - Dynamic form that pre-fills based on Atreus suggestions
 * Can be used for CreateGoal, AssignLearning, etc.
 */
export default function SmartFormModal({ isOpen, onClose, formType, prefilledData = {}, onSuccess }) {
  const [formData, setFormData] = useState(prefilledData);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      let result;
      
      switch (formType) {
        case 'CreateGoalModal':
          result = await base44.entities.Goal.create({
            title: formData.title,
            description: formData.description,
            timeframe_end: formData.timeframeEnd,
            assigned_to_emails: formData.assignedToEmails || [],
            status: 'active',
            progress: 0
          });
          toast.success('Goal created successfully!');
          break;

        case 'AssignLearningModal':
          // Bulk create assignments
          for (const email of formData.userEmails || []) {
            await base44.entities.AssignedLearning.create({
              user_email: email,
              learning_resource_id: formData.learningResourceId,
              assigned_by: (await base44.auth.me()).email,
              title: formData.title || 'Learning Assignment',
              due_date: formData.dueDate,
              priority: formData.priority || 'medium',
              status: 'assigned'
            });
          }
          toast.success(`Learning assigned to ${formData.userEmails?.length || 0} user(s)!`);
          break;

        default:
          toast.error('Form type not implemented');
          return;
      }

      if (onSuccess) onSuccess(result);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form');
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = () => {
    switch (formType) {
      case 'CreateGoalModal':
        return (
          <>
            <div>
              <Label htmlFor="title">Goal Title</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter goal title"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the goal"
                className="mt-2"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.timeframeEnd || ''}
                onChange={(e) => setFormData({ ...formData, timeframeEnd: e.target.value })}
                className="mt-2"
              />
            </div>
          </>
        );

      case 'AssignLearningModal':
        return (
          <>
            <div>
              <Label>Resource ID</Label>
              <Input
                value={formData.learningResourceId || ''}
                onChange={(e) => setFormData({ ...formData, learningResourceId: e.target.value })}
                placeholder="Learning resource ID"
                className="mt-2"
              />
            </div>
            <div>
              <Label>User Emails (comma-separated)</Label>
              <Textarea
                value={(formData.userEmails || []).join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  userEmails: e.target.value.split(',').map(email => email.trim()) 
                })}
                placeholder="user1@example.com, user2@example.com"
                className="mt-2"
                rows={3}
              />
            </div>
          </>
        );

      default:
        return <p className="text-gray-500">Form not implemented</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            {formType === 'CreateGoalModal' ? 'Create Goal' : 
             formType === 'AssignLearningModal' ? 'Assign Learning' : 
             'Smart Form'}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Pre-filled by Atreus based on your request
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {renderFormFields()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}