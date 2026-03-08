import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import FormAssistant from "@/components/ai/FormAssistant";

export default function CareerPathModal({ path, roles, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    from_role_id: "",
    to_role_id: "",
    path_type: "vertical",
    title: "",
    description: "",
    brief_description: "",
    typical_duration_months: 12,
    difficulty_level: "moderate",
    core_competencies: [],
    prerequisites: [],
    development_focus: [],
    learning_resource_ids: [],
    experiential_opportunities: [],
    mentorship_suggestions: [],
    success_indicators: []
  });
  const [newPrerequisite, setNewPrerequisite] = useState("");
  const [newOpportunity, setNewOpportunity] = useState("");
  const [newMentorship, setNewMentorship] = useState("");
  const [newIndicator, setNewIndicator] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (path) {
      setFormData({
        from_role_id: path.from_role_id || "",
        to_role_id: path.to_role_id || "",
        path_type: path.path_type || "vertical",
        title: path.title || "",
        description: path.description || "",
        brief_description: path.brief_description || "",
        typical_duration_months: path.typical_duration_months || 12,
        difficulty_level: path.difficulty_level || "moderate",
        core_competencies: path.core_competencies || [],
        prerequisites: path.prerequisites || [],
        development_focus: path.development_focus || [],
        learning_resource_ids: path.learning_resource_ids || [],
        experiential_opportunities: path.experiential_opportunities || [],
        mentorship_suggestions: path.mentorship_suggestions || [],
        success_indicators: path.success_indicators || []
      });
    } else {
      setFormData({
        from_role_id: "",
        to_role_id: "",
        path_type: "vertical",
        title: "",
        description: "",
        brief_description: "",
        typical_duration_months: 12,
        difficulty_level: "moderate",
        core_competencies: [],
        prerequisites: [],
        development_focus: [],
        learning_resource_ids: [],
        experiential_opportunities: [],
        mentorship_suggestions: [],
        success_indicators: []
      });
    }
  }, [path, isOpen]);

  const addItem = (field, value, setter) => {
    if (value.trim()) {
      setFormData({
        ...formData,
        [field]: [...formData[field], value.trim()]
      });
      setter("");
    }
  };

  const removeItem = (field, index) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.from_role_id || !formData.to_role_id || !formData.title || !formData.brief_description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      if (path) {
        await base44.entities.CareerPath.update(path.id, formData);
        toast.success("Career path updated successfully");
      } else {
        await base44.entities.CareerPath.create(formData);
        toast.success("Career path created successfully");
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving career path:", error);
      toast.error(error.message || "Failed to save career path");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!path || !confirm("Are you sure you want to delete this career path?")) return;
    
    setSaving(true);
    try {
      await base44.entities.CareerPath.delete(path.id);
      toast.success("Career path deleted successfully");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error deleting career path:", error);
      toast.error(error.message || "Failed to delete career path");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{path ? "Edit Career Path" : "Create New Career Path"}</DialogTitle>
        </DialogHeader>

        {!path && (
          <FormAssistant
            formSchema={{
              type: "object",
              properties: {
                title: { type: "string" },
                brief_description: { type: "string" },
                path_type: { type: "string", enum: ["vertical", "lateral"] },
                typical_duration_months: { type: "number" },
                difficulty_level: { type: "string", enum: ["easy", "moderate", "challenging", "high_stretch"] }
              }
            }}
            onApply={(data) => setFormData(prev => ({ ...prev, ...data }))}
            formType="career_path"
            placeholder="Describe the career path, e.g., 'A vertical path from Product Manager to Senior Product Manager over 18 months, requiring advanced stakeholder management and strategic thinking'"
            compact={true}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>From Role *</Label>
            <Select value={formData.from_role_id} onValueChange={(value) => setFormData({ ...formData, from_role_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select starting role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>To Role *</Label>
            <Select value={formData.to_role_id} onValueChange={(value) => setFormData({ ...formData, to_role_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select target role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Path Type *</Label>
            <Select value={formData.path_type} onValueChange={(value) => setFormData({ ...formData, path_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical">Vertical (Promotion)</SelectItem>
                <SelectItem value="lateral">Lateral (Career Change)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Product Manager to Senior Product Manager"
              required
            />
          </div>

          <div>
            <Label>Brief Description *</Label>
            <Textarea
              value={formData.brief_description}
              onChange={(e) => setFormData({ ...formData, brief_description: e.target.value })}
              placeholder="Short summary (1-2 sentences)..."
              rows={2}
              required
            />
          </div>

          <div>
            <Label>Full Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of this career path..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Prerequisites</Label>
            <div className="flex gap-2">
              <Input
                value={newPrerequisite}
                onChange={(e) => setNewPrerequisite(e.target.value)}
                placeholder="Add prerequisite..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('prerequisites', newPrerequisite, setNewPrerequisite))}
              />
              <Button type="button" onClick={() => addItem('prerequisites', newPrerequisite, setNewPrerequisite)} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {formData.prerequisites.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                  <span>{item}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem('prerequisites', idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Experiential Opportunities</Label>
            <div className="flex gap-2">
              <Input
                value={newOpportunity}
                onChange={(e) => setNewOpportunity(e.target.value)}
                placeholder="Add hands-on opportunity..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('experiential_opportunities', newOpportunity, setNewOpportunity))}
              />
              <Button type="button" onClick={() => addItem('experiential_opportunities', newOpportunity, setNewOpportunity)} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {formData.experiential_opportunities.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                  <span>{item}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem('experiential_opportunities', idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mentorship Suggestions</Label>
            <div className="flex gap-2">
              <Input
                value={newMentorship}
                onChange={(e) => setNewMentorship(e.target.value)}
                placeholder="Add mentorship suggestion..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('mentorship_suggestions', newMentorship, setNewMentorship))}
              />
              <Button type="button" onClick={() => addItem('mentorship_suggestions', newMentorship, setNewMentorship)} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {formData.mentorship_suggestions.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                  <span>{item}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem('mentorship_suggestions', idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Success Indicators</Label>
            <div className="flex gap-2">
              <Input
                value={newIndicator}
                onChange={(e) => setNewIndicator(e.target.value)}
                placeholder="Add success indicator..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('success_indicators', newIndicator, setNewIndicator))}
              />
              <Button type="button" onClick={() => addItem('success_indicators', newIndicator, setNewIndicator)} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {formData.success_indicators.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                  <span>{item}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem('success_indicators', idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Typical Duration (Months)</Label>
            <Input
              type="number"
              value={formData.typical_duration_months}
              onChange={(e) => setFormData({ ...formData, typical_duration_months: parseInt(e.target.value) || 12 })}
              min="1"
            />
          </div>

          <div>
            <Label>Difficulty Level</Label>
            <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="challenging">Challenging</SelectItem>
                <SelectItem value="high_stretch">High Stretch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            {path && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : path ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}