import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FeatureSuggestionModal({ 
  isOpen, 
  onClose, 
  userEmail, 
  uatCycle,
  relatedTestCaseId = null 
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'new_idea'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in title and description');
      return;
    }

    if (!userEmail) {
      toast.error('User email is required');
      return;
    }

    setSubmitting(true);
    try {
      const suggestion = await base44.entities.FeatureSuggestion.create({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        suggested_by_email: userEmail,
        uat_test_case_id: relatedTestCaseId,
        uat_cycle: uatCycle,
        status: 'pending'
      });

      if (!suggestion?.id) {
        throw new Error('Failed to create suggestion');
      }

      toast.success('Feature suggestion submitted!');
      
      // Reset form before closing to prevent flash of old data
      setTimeout(() => {
        setFormData({ title: '', description: '', category: 'new_idea' });
      }, 300);
      
      onClose();
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toast.error('Failed to submit suggestion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            Suggest a Feature
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="missing_feature">Missing Feature</SelectItem>
                <SelectItem value="gap">Gap in Functionality</SelectItem>
                <SelectItem value="new_idea">New Feature Idea</SelectItem>
                <SelectItem value="improvement">Improvement Suggestion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Title <span className="text-red-600">*</span></label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief title for your suggestion"
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description <span className="text-red-600">*</span></label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the feature, gap, or improvement idea in detail..."
              rows={6}
              maxLength={5000}
            />
          </div>

          {relatedTestCaseId && (
            <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
              💡 This suggestion will be linked to test case: {relatedTestCaseId}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !formData.title.trim() || !formData.description.trim()}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4 mr-2" />
                Submit Suggestion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}