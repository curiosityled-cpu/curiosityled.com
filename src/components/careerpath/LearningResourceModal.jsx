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
import { Badge } from "@/components/ui/badge";

export default function LearningResourceModal({ resource, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "course",
    provider: "",
    author: "",
    url: "",
    leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)",
    difficulty_level: "intermediate",
    year: new Date().getFullYear(),
    access: "Free",
    cost_string: "",
    duration_string: "",
    thumbnail_url: "",
    is_premium: false,
    is_active: true,
    tags: [],
    competencies: []
  });
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (resource) {
      setFormData({
        title: resource.title || "",
        description: resource.description || "",
        type: resource.type || "course",
        provider: resource.provider || "",
        author: resource.author || "",
        url: resource.url || "",
        leadership_level: resource.leadership_level || "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)",
        difficulty_level: resource.difficulty_level || "intermediate",
        year: resource.year || new Date().getFullYear(),
        access: resource.access || "Free",
        cost_string: resource.cost_string || "",
        duration_string: resource.duration_string || "",
        thumbnail_url: resource.thumbnail_url || "",
        is_premium: resource.is_premium || false,
        is_active: resource.is_active !== false,
        tags: resource.tags || [],
        competencies: resource.competencies || []
      });
    } else {
      setFormData({
        title: "",
        description: "",
        type: "course",
        provider: "",
        author: "",
        url: "",
        leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)",
        difficulty_level: "intermediate",
        year: new Date().getFullYear(),
        access: "Free",
        cost_string: "",
        duration_string: "",
        thumbnail_url: "",
        is_premium: false,
        is_active: true,
        tags: [],
        competencies: []
      });
    }
  }, [resource, isOpen]);

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag("");
    }
  };

  const removeTag = (index) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.url) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      if (resource) {
        await base44.entities.LearningResource.update(resource.id, formData);
        toast.success("Learning resource updated successfully");
      } else {
        await base44.entities.LearningResource.create(formData);
        toast.success("Learning resource created successfully");
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving learning resource:", error);
      toast.error(error.message || "Failed to save learning resource");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resource || !confirm("Are you sure you want to delete this learning resource?")) return;
    
    setSaving(true);
    try {
      await base44.entities.LearningResource.delete(resource.id);
      toast.success("Learning resource deleted successfully");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error deleting learning resource:", error);
      toast.error(error.message || "Failed to delete learning resource");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resource ? "Edit Learning Resource" : "Create New Learning Resource"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Leadership Fundamentals"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the resource..."
              rows={3}
            />
          </div>

          <div>
            <Label>Type *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="book">Book</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="whitepaper">Whitepaper</SelectItem>
                <SelectItem value="podcast">Podcast</SelectItem>
                <SelectItem value="assessment_tool">Assessment Tool</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Provider</Label>
            <Input
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="e.g., LinkedIn Learning, Harvard Business Review"
            />
          </div>

          <div>
            <Label>Author</Label>
            <Input
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="Content author or creator"
            />
          </div>

          <div>
            <Label>URL *</Label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://..."
              type="url"
              required
            />
          </div>

          <div>
            <Label>Leadership Level *</Label>
            <Select value={formData.leadership_level} onValueChange={(value) => setFormData({ ...formData, leadership_level: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)">
                  Entry-Level Leaders
                </SelectItem>
                <SelectItem value="Mid-Level Manager (managers of managers, experienced team leads, functional leads)">
                  Mid-Level Manager
                </SelectItem>
                <SelectItem value="Senior Manager / Business Unit Leader (leads larger teams, cross-functional groups, or business units)">
                  Senior Manager
                </SelectItem>
                <SelectItem value="Director / Senior Director (enterprise-level strategic oversight, multiple functions, major initiatives)">
                  Director Level
                </SelectItem>
                <SelectItem value="Executive / C-Suite (enterprise leadership, board-level strategy, organizational transformation)">
                  Executive / C-Suite
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Difficulty Level</Label>
            <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Year</Label>
            <Input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
              min="2000"
              max={new Date().getFullYear() + 1}
            />
          </div>

          <div>
            <Label>Access *</Label>
            <Select value={formData.access} onValueChange={(value) => setFormData({ ...formData, access: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Free">Free</SelectItem>
                <SelectItem value="Subscription">Subscription</SelectItem>
                <SelectItem value="Purchase">Purchase</SelectItem>
                <SelectItem value="Program">Program</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cost (e.g., "$15-25")</Label>
              <Input
                value={formData.cost_string}
                onChange={(e) => setFormData({ ...formData, cost_string: e.target.value })}
                placeholder="Free, $15-25, etc."
              />
            </div>
            <div>
              <Label>Duration</Label>
              <Input
                value={formData.duration_string}
                onChange={(e) => setFormData({ ...formData, duration_string: e.target.value })}
                placeholder="e.g., 2 hours, 6 weeks"
              />
            </div>
          </div>

          <div>
            <Label>Thumbnail URL</Label>
            <Input
              value={formData.thumbnail_url}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              placeholder="https://..."
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {tag}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(idx)} />
                </Badge>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            {resource && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : resource ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}