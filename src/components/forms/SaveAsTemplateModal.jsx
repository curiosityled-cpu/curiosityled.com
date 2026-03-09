import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function SaveAsTemplateModal({ form, open, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [templateData, setTemplateData] = useState({
    title: `${form.title} Template`,
    description: form.description || "",
    tags: ""
  });

  const handleSave = async () => {
    if (!templateData.title) {
      toast.error("Please enter a template title");
      return;
    }

    setSaving(true);
    try {
      const user = await base44.auth.me();
      
      const template = {
        client_id: user.client_id,
        is_platform_default: false,
        title: templateData.title,
        description: templateData.description,
        form_type: form.form_type,
        form_category: form.form_category,
        tags: templateData.tags ? templateData.tags.split(',').map(t => t.trim()) : [],
        config: form.config,
        use_count: 0,
        is_editable: true
      };

      await base44.entities.CustomFormTemplate.create(template);
      toast.success("Template saved successfully");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Template Title *</Label>
            <Input
              id="title"
              value={templateData.title}
              onChange={(e) => setTemplateData({ ...templateData, title: e.target.value })}
              placeholder="e.g., Customer Satisfaction Survey Template"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={templateData.description}
              onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
              placeholder="Describe what this template is for..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={templateData.tags}
              onChange={(e) => setTemplateData({ ...templateData, tags: e.target.value })}
              placeholder="e.g., customer, satisfaction, feedback"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
              style={{ backgroundColor: '#0202ff' }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}