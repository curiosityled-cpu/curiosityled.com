import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, CheckCircle, Users, Lock, Globe } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Maps signal types to entity + default form data
const TYPE_CONFIG = {
  assessment: {
    entity: "CustomAssessment",
    label: "Assessment",
    defaultData: { type: "custom_assessment", passing_score_percentage: 70 },
  },
  quiz: {
    entity: "CustomAssessment",
    label: "Quiz",
    defaultData: { type: "quiz", passing_score_percentage: 70 },
  },
  knowledge_check: {
    entity: "CustomAssessment",
    label: "Knowledge Check",
    defaultData: { type: "knowledge_check", passing_score_percentage: 100 },
  },
  survey: {
    entity: "CustomForm",
    label: "Survey",
    defaultData: { form_type: "feedback_survey", form_category: "survey" },
  },
  pulse: {
    entity: "CustomForm",
    label: "Pulse",
    defaultData: { form_type: "poll", form_category: "survey" },
  },
  feedback: {
    entity: "CustomForm",
    label: "Feedback",
    defaultData: { form_type: "satisfaction_survey", form_category: "evaluation" },
  },
};

export default function SignalBuilder({ signalType, editingSignal, onClose, users }) {
  const config = TYPE_CONFIG[signalType];
  const isAssessment = config?.entity === "CustomAssessment";

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "draft",
    access_mode: "closed",
    assigned_user_emails: [],
    config: "{}",
    // Assessment-specific
    passing_score_percentage: 70,
    // Form-specific
    form_type: "feedback_survey",
    form_category: "survey",
  });
  const [saving, setSaving] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);

  useEffect(() => {
    if (editingSignal) {
      const ref = editingSignal.entityRef;
      setFormData({
        title: ref.title || "",
        description: ref.description || "",
        status: ref.status || "draft",
        access_mode: ref.access_mode || "closed",
        assigned_user_emails: ref.assigned_user_emails || ref.assigned_to_emails || [],
        config: JSON.stringify(ref.config || {}, null, 2),
        passing_score_percentage: ref.passing_score_percentage || 70,
        form_type: ref.form_type || config.defaultData.form_type,
        form_category: ref.form_category || config.defaultData.form_category,
      });
    } else {
      setFormData(prev => ({
        ...prev,
        ...config.defaultData,
      }));
    }
  }, [editingSignal, signalType]);

  const handleSave = async () => {
    if (!formData.title.trim()) { toast.error("Please enter a title"); return; }
    let parsedConfig = {};
    try { parsedConfig = JSON.parse(formData.config || "{}"); } catch { toast.error("Invalid JSON in config field"); return; }

    setSaving(true);
    try {
      if (isAssessment) {
        const saveData = {
          title: formData.title,
          description: formData.description,
          type: config.defaultData.type,
          status: formData.status,
          access_mode: formData.access_mode,
          assigned_user_emails: formData.assigned_user_emails,
          passing_score_percentage: formData.passing_score_percentage,
          config: parsedConfig,
        };
        if (editingSignal) {
          await base44.entities.CustomAssessment.update(editingSignal.id, saveData);
          toast.success("Signal updated");
        } else {
          await base44.entities.CustomAssessment.create(saveData);
          toast.success("Signal created");
        }
      } else {
        const saveData = {
          title: formData.title,
          description: formData.description,
          form_type: formData.form_type,
          form_category: formData.form_category,
          status: formData.status,
          assigned_to_emails: formData.assigned_user_emails,
          config: { ...parsedConfig, questions: parsedConfig.questions || [] },
        };
        if (editingSignal) {
          await base44.entities.CustomForm.update(editingSignal.id, saveData);
          toast.success("Signal updated");
        } else {
          await base44.entities.CustomForm.create(saveData);
          toast.success("Signal created");
        }
      }
      onClose();
    } catch (error) {
      console.error("Error saving signal:", error);
      toast.error("Failed to save signal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to library
        </Button>
        <h3 className="text-sm font-semibold">
          {editingSignal ? "Edit" : "Create"} {config.label}
        </h3>
      </div>

      <Card><CardContent className="p-5 space-y-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={`e.g., ${isAssessment ? "Sales Leadership Assessment" : "Post-Program Feedback Survey"}`}
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the purpose and content of this signal"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Access Mode</Label>
            <Select value={formData.access_mode} onValueChange={(v) => setFormData({ ...formData, access_mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open"><div className="flex items-center gap-2"><Globe className="w-4 h-4" /> Open (Anyone can take)</div></SelectItem>
                <SelectItem value="closed"><div className="flex items-center gap-2"><Lock className="w-4 h-4" /> Closed (Assignment required)</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isAssessment && (
          <div className="space-y-2">
            <Label>Passing Score (%)</Label>
            <Input
              type="number" min="0" max="100"
              value={formData.passing_score_percentage}
              onChange={(e) => setFormData({ ...formData, passing_score_percentage: parseInt(e.target.value) || 0 })}
            />
          </div>
        )}

        {formData.access_mode === "closed" && (
          <div className="space-y-2">
            <Label>Assigned Users ({formData.assigned_user_emails.length})</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[50px]">
              {formData.assigned_user_emails.map((email) => (
                <Badge key={email} variant="secondary">
                  {email}
                  <button
                    onClick={() => setFormData({ ...formData, assigned_user_emails: formData.assigned_user_emails.filter((e) => e !== email) })}
                    className="ml-2 hover:text-red-600"
                  >×</button>
                </Badge>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowUserSelector(true)}>
              <Users className="w-4 h-4 mr-2" /> Select Users
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label>Configuration (JSON)</Label>
          <Textarea
            value={formData.config}
            onChange={(e) => setFormData({ ...formData, config: e.target.value })}
            placeholder='{"questions": [], "scoring": {}}'
            rows={5} className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500">Define questions, options, and scoring logic in JSON format</p>
        </div>
      </CardContent></Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          {editingSignal ? "Update" : "Create"}
        </Button>
      </div>

      {/* User selector dialog */}
      {showUserSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowUserSelector(false)}>
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Select Users to Assign</h3>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {users.map((u) => (
                    <div
                      key={u.email}
                      className="flex items-center gap-3 p-2 hover:bg-muted/40 rounded-lg cursor-pointer"
                      onClick={() => {
                        if (!formData.assigned_user_emails.includes(u.email)) {
                          setFormData({ ...formData, assigned_user_emails: [...formData.assigned_user_emails, u.email] });
                        }
                      }}
                    >
                      <Checkbox
                        checked={formData.assigned_user_emails.includes(u.email)}
                        onCheckedChange={(c) => {
                          if (c) setFormData({ ...formData, assigned_user_emails: [...formData.assigned_user_emails, u.email] });
                          else setFormData({ ...formData, assigned_user_emails: formData.assigned_user_emails.filter((e) => e !== u.email) });
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{u.full_name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex justify-end mt-3">
                <Button onClick={() => setShowUserSelector(false)}>Done</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}