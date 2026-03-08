import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { X, Plus, AlertCircle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import FormAssistant from "@/components/ai/FormAssistant";

const PROFICIENCY_LEVELS = [
  { value: 1, label: "Not Applicable" },
  { value: 2, label: "Awareness" },
  { value: 3, label: "Developing" },
  { value: 4, label: "Proficient" },
  { value: 5, label: "Mastery" }
];

const LEADERSHIP_LEVELS = [
  { key: "level_1_leading_self", label: "Level 1: Leading Self" },
  { key: "level_2_leading_others", label: "Level 2: Leading Others" },
  { key: "level_3_leading_managers", label: "Level 3: Leading Managers" },
  { key: "level_4_leading_functions", label: "Level 4: Leading Functions" },
  { key: "level_5_leading_organizations", label: "Level 5: Leading Organizations" }
];

export default function CompetencyModal({ competency, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    definition: "",
    key_components: [],
    evidence_base: "",
    leadership_level_requirements: {
      level_1_leading_self: 2,
      level_2_leading_others: 3,
      level_3_leading_managers: 4,
      level_4_leading_functions: 5,
      level_5_leading_organizations: 5
    },
    assessment_mapping: {
      assessment_ids: [],
      score_mapping: "",
      calculation_method: ""
    }
  });
  
  const [newComponent, setNewComponent] = useState({ name: "", weight: 0 });
  const [saving, setSaving] = useState(false);
  const [showEvidencePopup, setShowEvidencePopup] = useState(false);

  const CATEGORIES = ["Tactical", "Self Leadership", "People Leadership", "Situational Intelligence"];



  useEffect(() => {
    if (competency) {
      setFormData({
        name: competency.name || "",
        category: competency.category || "",
        definition: competency.definition || "",
        key_components: competency.key_components || [],
        evidence_base: competency.evidence_base || "",
        leadership_level_requirements: competency.leadership_level_requirements || {
          level_1_leading_self: 2,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        assessment_mapping: competency.assessment_mapping || {
          assessment_ids: [],
          score_mapping: "",
          calculation_method: ""
        }
      });
    } else {
      setFormData({
        name: "",
        category: "",
        definition: "",
        key_components: [],
        evidence_base: "",
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        assessment_mapping: {
          assessment_ids: [],
          score_mapping: "",
          calculation_method: ""
        }
      });
    }
  }, [competency, isOpen]);



  const addComponent = () => {
    if (newComponent.name.trim() && newComponent.weight > 0) {
      setFormData({
        ...formData,
        key_components: [...formData.key_components, { ...newComponent }]
      });
      setNewComponent({ name: "", weight: 0 });
    } else {
      toast.error("Please enter both component name and weight");
    }
  };

  const removeComponent = (index) => {
    setFormData({
      ...formData,
      key_components: formData.key_components.filter((_, i) => i !== index)
    });
  };

  const updateComponentWeight = (index, weight) => {
    const updated = [...formData.key_components];
    updated[index].weight = parseFloat(weight) || 0;
    setFormData({ ...formData, key_components: updated });
  };

  const getTotalWeight = () => {
    return formData.key_components.reduce((sum, comp) => sum + (comp.weight || 0), 0);
  };

  const isWeightValid = () => {
    const total = getTotalWeight();
    return formData.key_components.length === 0 || Math.abs(total - 100) < 0.01;
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.definition || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isWeightValid()) {
      toast.error("Key component weights must sum to 100%");
      return;
    }

    setSaving(true);
    try {
      if (competency) {
        await base44.entities.Competency.update(competency.id, formData);
        toast.success("Competency updated successfully");
      } else {
        await base44.entities.Competency.create(formData);
        toast.success("Competency created successfully");
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving competency:", error);
      toast.error(error.message || "Failed to save competency");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!competency || !confirm("Are you sure you want to delete this competency?")) return;
    
    setSaving(true);
    try {
      await base44.entities.Competency.delete(competency.id);
      toast.success("Competency deleted successfully");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error deleting competency:", error);
      toast.error(error.message || "Failed to delete competency");
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = getTotalWeight();
  const weightIsValid = isWeightValid();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {competency ? "Edit Competency" : "Create New Competency"}
            {formData.evidence_base && (
              <Popover open={showEvidencePopup} onOpenChange={setShowEvidencePopup}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <HelpCircle className="h-4 w-4 text-blue-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Evidence Base</h4>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{formData.evidence_base}</p>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </DialogTitle>
        </DialogHeader>

        {!competency && (
          <FormAssistant
            formSchema={{
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string", enum: ["Tactical", "Self Leadership", "People Leadership", "Situational Intelligence"] },
                definition: { type: "string" },
                evidence_base: { type: "string" }
              }
            }}
            onApply={(data) => setFormData(prev => ({ ...prev, ...data }))}
            formType="competency"
            placeholder="Describe the competency, e.g., 'Strategic Thinking - the ability to analyze complex situations and develop long-term plans aligned with organizational goals'"
            compact={true}
          />
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Basic Information</h3>
            
            <div>
              <Label>Competency Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Strategic Thinking"
                required
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Definition *</Label>
              <Textarea
                value={formData.definition}
                onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                placeholder="Define what this competency entails..."
                rows={4}
                required
              />
            </div>
          </div>

          {/* Key Components */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2 flex-1">Key Components</h3>
              {formData.key_components.length > 0 && (
                <Badge variant={weightIsValid ? "default" : "destructive"} className="ml-2">
                  Total: {totalWeight.toFixed(1)}%
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-7">
                <Input
                  value={newComponent.name}
                  onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                  placeholder="Component name (e.g., 'Planning & prioritization')"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addComponent())}
                />
              </div>
              <div className="col-span-4">
                <Input
                  type="number"
                  placeholder="Weight %"
                  value={newComponent.weight || ""}
                  onChange={(e) => setNewComponent({ ...newComponent, weight: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  step="1"
                />
              </div>
              <div className="col-span-1">
                <Button type="button" onClick={addComponent} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {!weightIsValid && formData.key_components.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Key component weights must sum to 100%. Current total: {totalWeight.toFixed(1)}%
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1 max-h-40 overflow-y-auto">
              {formData.key_components.map((comp, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded text-sm">
                  <div className="col-span-7">
                    <span className="text-gray-700">{comp.name}</span>
                  </div>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      value={comp.weight}
                      onChange={(e) => updateComponentWeight(idx, e.target.value)}
                      min="0"
                      max="100"
                      step="1"
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeComponent(idx)} className="h-8 w-8">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leadership Level Requirements */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Leadership Level Requirements</h3>
            <div className="grid grid-cols-2 gap-4">
              {LEADERSHIP_LEVELS.map((level) => (
                <div key={level.key}>
                  <Label className="text-xs">{level.label}</Label>
                  <Select
                    value={String(formData.leadership_level_requirements[level.key])}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      leadership_level_requirements: {
                        ...formData.leadership_level_requirements,
                        [level.key]: parseInt(value)
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFICIENCY_LEVELS.map((prof) => (
                        <SelectItem key={prof.value} value={String(prof.value)}>
                          {prof.value} - {prof.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Base */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Evidence Base</h3>
            <div>
              <Label>Research Evidence & Citations</Label>
              <Textarea
                value={formData.evidence_base}
                onChange={(e) => setFormData({ ...formData, evidence_base: e.target.value })}
                placeholder="Enter research evidence, studies, and citations supporting this competency..."
                rows={5}
              />
            </div>
          </div>

          {/* Assessment Mapping */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Assessment Mapping</h3>
            
            <div>
              <Label>Score Mapping</Label>
              <Textarea
                value={formData.assessment_mapping.score_mapping}
                onChange={(e) => setFormData({
                  ...formData,
                  assessment_mapping: {
                    ...formData.assessment_mapping,
                    score_mapping: e.target.value
                  }
                })}
                placeholder="Describe how assessment scores map to proficiency levels (e.g., '0-40: Awareness, 41-60: Developing, 61-80: Proficient, 81-100: Mastery')"
                rows={2}
              />
            </div>

            <div>
              <Label>Calculation Method</Label>
              <Textarea
                value={formData.assessment_mapping.calculation_method}
                onChange={(e) => setFormData({
                  ...formData,
                  assessment_mapping: {
                    ...formData.assessment_mapping,
                    calculation_method: e.target.value
                  }
                })}
                placeholder="Describe how competency scores are calculated from assessment data (e.g., 'Average of questions 5-12 in Leadership Assessment')"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t">
            {competency && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !weightIsValid}>
              {saving ? "Saving..." : competency ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}