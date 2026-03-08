import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";

const TEMPLATE_CATEGORIES = [
  { value: 'technical', label: 'Technical' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'general', label: 'General' },
  { value: 'custom', label: 'Custom' }
];

export default function SaveAsTemplateModal({ isOpen, onClose, plan, onSuccess }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [templateData, setTemplateData] = useState({
    title: plan?.title || '',
    description: plan?.description || '',
    category: 'general',
    tags: []
  });
  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    if (newTag.trim() && !templateData.tags.includes(newTag.trim())) {
      setTemplateData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setTemplateData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSaveAsTemplate = async () => {
    if (!templateData.title || !templateData.category) {
      toast.error("Please provide a title and category");
      return;
    }

    setSaving(true);
    try {
      const templatePlan = {
        ...plan,
        title: templateData.title,
        description: templateData.description,
        is_template: true,
        status: 'template',
        template_category: templateData.category,
        template_tags: templateData.tags,
        use_count: 0,
        assigned_to_email: null,
        assigned_by: user.email,
        completion_percentage: 0,
        started_date: null,
        completed_date: null,
        milestones: plan.milestones?.map(m => ({
          ...m,
          status: 'not_started',
          related_goal_id: null,
          related_assigned_learning_id: null
        })) || []
      };

      if (plan.id) {
        delete templatePlan.id;
      }

      const newTemplate = await base44.entities.OnboardingPlan.create(templatePlan);
      
      toast.success('Template saved successfully!');
      onSuccess?.(newTemplate);
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save this onboarding plan as a reusable template for future hires
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="mb-2 block">Template Name *</Label>
            <Input
              value={templateData.title}
              onChange={(e) => setTemplateData({ ...templateData, title: e.target.value })}
              placeholder="e.g., Software Engineer Onboarding Template"
            />
          </div>

          <div>
            <Label className="mb-2 block">Description</Label>
            <Textarea
              value={templateData.description}
              onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
              placeholder="Describe what this template is for and when to use it..."
              rows={3}
            />
          </div>

          <div>
            <Label className="mb-2 block">Category *</Label>
            <Select value={templateData.category} onValueChange={(value) => setTemplateData({ ...templateData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tags (e.g., remote, engineering, manager)"
              />
              <Button type="button" onClick={addTag} variant="outline" size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {templateData.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {templateData.tags.map((tag, idx) => (
                  <Badge key={idx} className="bg-purple-100 text-purple-700">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-purple-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>What gets saved:</strong> This template will include all milestones, learning resources, 
              and structure from the current plan. Personal data and completion status will be reset.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveAsTemplate} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}