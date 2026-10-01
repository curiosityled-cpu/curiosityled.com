import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
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

const SignalBuilder = forwardRef(function SignalBuilder({ signalType, editingSignal, onClose, onBack, users, showChrome = true }, ref) {
  const config = TYPE_CONFIG[signalType];
  const isAssessment = config?.entity === "CustomAssessment";

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "draft",
    access_mode: "closed",
    assigned_user_emails: [],
    config: "{}",
    passing_score_percentage: 70,
    form_type: "feedback_survey",
    form_category: "survey",
  });
  const [saving, setSaving] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const saveRef = useRef(null);

  useImperativeHandle(ref, () => ({
    save: () => saveRef.current?.()
  }));

  useEffect(() => {
    if (editingSignal) {
      const refData = editingSignal.entityRef;
      setFormData({
        title: refData.title || "",
        description: refData.description || "",
        status: refData.status || "draft",
        access_mode: refData.access_mode || "closed",
        assigned_user_emails: refData.assigned_user_emails || refData.assigned_to_emails || [],
        config: JSON.stringify(refData.config || {}, null, 2),
        passing_score_percentage: refData.passing_score_percentage || 70,
        form_type: refData.form_type || config.defaultData.form_type,
        form_category: refData.form_category || config.defaultData.form_category,
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
  saveRef.current = handleSave;

  return (
    <div className="space-y-4">
      {showChrome && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack || onClose}>
            <ArrowLeft className="w-4 h-4 mr-1" /> {onBack ? "Back to signal types" : "Back to library"}
          </Button>
          <h3 className="text-sm font-semibold">
            {editingSignal ? "Edit" : "Create"} {config.label}
          </h3>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={`e.g., ${isAssessment ? "Sales Leadership Assessment" : "Post-Program Feedback Survey"}`}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the purpose and content of this signal"
            rows={2}
            className="text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Access Mode</Label>
            <Select value={formData.access_mode} onValueChange={(v) => setFormData({ ...formData, access_mode: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open"><div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Open</div></SelectItem>
                <SelectItem value="closed"><div className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Closed</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isAssessment && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Passing Score (%)</Label>
            <Input
              type="number" min="0" max="100"
              value={formData.passing_score_percentage}
              onChange={(e) => setFormData({ ...formData, passing_score_percentage: parseInt(e.target.value) || 0 })}
              className="h-9 text-sm"
            />
          </div>
        )}

        {formData.access_mode === "closed" && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Assigned Users ({formData.assigned_user_emails.length})</Label>
            <div className="flex flex-wrap gap-1.5 p-2.5 border border-gray-100 rounded-xl min-h-[44px] bg-gray-50/50">
              {formData.assigned_user_emails.length === 0 ? (
                <p className="text-xs text-gray-400 self-center">No users assigned yet</p>
              ) : (
                formData.assigned_user_emails.map((email) => (
                  <Badge key={email} variant="secondary" className="text-xs">
                    {email}
                    <button
                      onClick={() => setFormData({ ...formData, assigned_user_emails: formData.assigned_user_emails.filter((e) => e !== email) })}
                      className="ml-1.5 hover:text-red-600"
                    >×</button>
                  </Badge>
                ))
              )}
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowUserSelector(true)}>
              <Users className="w-3.5 h-3.5 mr-1.5" /> Select Users
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-medium">Configuration (JSON)</Label>
          <Textarea
            value={formData.config}
            onChange={(e) => setFormData({ ...formData, config: e.target.value })}
            placeholder='{"questions": [], "scoring": {}}'
            rows={4} className="font-mono text-xs"
          />
          <p className="text-xs text-gray-500">Define questions, options, and scoring logic in JSON format</p>
        </div>
      </div>

      {showChrome && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
            {editingSignal ? "Update" : "Create"}
          </Button>
        </div>
      )}

      {/* User selector dialog */}
      {showUserSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowUserSelector(false)}>
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Select Users to Assign</h3>
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
                <Button size="sm" onClick={() => setShowUserSelector(false)}>Done</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
});

export default SignalBuilder;