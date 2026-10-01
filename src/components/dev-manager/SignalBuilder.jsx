import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Globe, Lock, Settings2, ListChecks } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useAuth } from "@/components/useAuth";
import FormBuilderEditor from "@/components/forms/FormBuilderEditor";
import SignalAIAssist from "./SignalAIAssist";
import { SIGNAL_TYPE_CONFIG, configToSections, sectionsToConfig } from "./signalTemplateConfig";

/**
 * SignalBuilder — visual builder for a Signal.
 * Embeds FormBuilderEditor (sections + questions) plus a settings sidebar
 * and an AI Assist panel. Replaces the former raw-JSON config textarea.
 *
 * Props:
 *   signalType    — one of the SIGNAL_TYPE_CONFIG keys
 *   editingSignal — optional existing signal record to edit
 *   onClose       — called after a successful save (closes the dialog)
 *   users         — user list for assignment
 *   showChrome    — when true, renders its own header/footer (standalone page)
 *
 * Imperative handle exposes save() so the parent dialog can trigger save.
 */
const SignalBuilder = forwardRef(function SignalBuilder(
  { signalType, editingSignal, onClose, users, showChrome = false },
  ref
) {
  const config = SIGNAL_TYPE_CONFIG[signalType];
  const isAssessment = config?.entity === "CustomAssessment";
  const { isAnyAdmin } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "draft",
    access_mode: "closed",
    assigned_user_emails: [],
    passing_score_percentage: config?.defaultData?.passing_score_percentage ?? 70,
    form_type: config?.defaultData?.form_type,
    form_category: config?.defaultData?.form_category,
  });
  const [sections, setSections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const saveRef = useRef(null);

  useImperativeHandle(ref, () => ({
    save: () => saveRef.current?.(),
  }));

  useEffect(() => {
    if (editingSignal) {
      const r = editingSignal.entityRef || editingSignal;
      setFormData({
        title: r.title || "",
        description: r.description || "",
        status: r.status || "draft",
        access_mode: r.access_mode || "closed",
        assigned_user_emails: r.assigned_user_emails || r.assigned_to_emails || [],
        passing_score_percentage: r.passing_score_percentage ?? config?.defaultData?.passing_score_percentage ?? 70,
        form_type: r.form_type || config?.defaultData?.form_type,
        form_category: r.form_category || config?.defaultData?.form_category,
      });
      setSections(configToSections(r.config));
    } else {
      setFormData((prev) => ({
        ...prev,
        ...config?.defaultData,
        passing_score_percentage: config?.defaultData?.passing_score_percentage ?? prev.passing_score_percentage,
      }));
      setSections([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSignal, signalType]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!sections.length || sections.every((s) => !s.questions?.length)) {
      toast.error("Add at least one question before saving");
      return;
    }

    setSaving(true);
    try {
      const extraConfig = { scoring_enabled: !!config?.scoringEnabled };
      const builtConfig = sectionsToConfig(sections, isAssessment, extraConfig);

      if (isAssessment) {
        const saveData = {
          title: formData.title,
          description: formData.description,
          type: config.defaultData.type,
          status: formData.status,
          access_mode: formData.access_mode,
          assigned_user_emails: formData.assigned_user_emails,
          passing_score_percentage: formData.passing_score_percentage,
          competency_ids: editingSignal?.entityRef?.competency_ids || [],
          config: builtConfig,
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
          access_mode: formData.access_mode,
          assigned_to_emails: formData.assigned_user_emails,
          config: builtConfig,
        };
        if (editingSignal) {
          await base44.entities.CustomForm.update(editingSignal.id, saveData);
          toast.success("Signal updated");
        } else {
          await base44.entities.CustomForm.create(saveData);
          toast.success("Signal created");
        }
      }
      onClose?.();
    } catch (error) {
      console.error("Error saving signal:", error);
      toast.error("Failed to save signal");
    } finally {
      setSaving(false);
    }
  };
  saveRef.current = handleSave;

  const handleApplyAI = (aiSections, recommendedPassingScore) => {
    // Merge: append AI sections after existing ones
    setSections((prev) => [...prev, ...aiSections]);
    if (recommendedPassingScore != null && config?.showPassingScore) {
      setFormData((prev) => ({ ...prev, passing_score_percentage: recommendedPassingScore }));
    }
    toast.success("AI questions added — review and edit before saving");
  };

  const questionCount = sections.reduce((n, s) => n + (s.questions?.length || 0), 0);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Main editor column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {sections.length} section{sections.length !== 1 ? "s" : ""} · {questionCount} question{questionCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <FormBuilderEditor sections={sections} onChange={setSections} />
        </div>
      </div>

      {/* Settings sidebar */}
      <div className="lg:w-80 lg:flex-shrink-0 space-y-4 lg:overflow-y-auto lg:max-h-full">
        <div className="space-y-3 bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 pb-1">
            <Settings2 className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-900">Signal Settings</h4>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={isAssessment ? "e.g., Sales Leadership Assessment" : "e.g., Post-Program Feedback Survey"}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the purpose and content of this signal"
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Access</Label>
              <Select
                value={formData.access_mode}
                onValueChange={(v) => setFormData({ ...formData, access_mode: v })}
                disabled={!isAnyAdmin}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open"><div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Open</div></SelectItem>
                  <SelectItem value="closed"><div className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Closed</div></SelectItem>
                </SelectContent>
              </Select>
              {!isAnyAdmin && (
                <p className="text-[11px] text-gray-400 leading-tight">Enterprise-wide (Open) access requires a Program Administrator or above.</p>
              )}
            </div>
          </div>

          {config?.showPassingScore && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Passing Score (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.passing_score_percentage}
                onChange={(e) => setFormData({ ...formData, passing_score_percentage: parseInt(e.target.value) || 0 })}
                className="h-9 text-sm"
              />
            </div>
          )}

          {formData.access_mode === "closed" && (
            <div className="space-y-1.5">
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
              <Button variant="outline" size="sm" className="h-8 text-xs w-full" onClick={() => setShowUserSelector(true)}>
                <Users className="w-3.5 h-3.5 mr-1.5" /> Select Users
              </Button>
            </div>
          )}
        </div>

        <SignalAIAssist
          signalType={signalType}
          title={formData.title}
          description={formData.description}
          onApply={handleApplyAI}
        />
      </div>

      {/* Standalone chrome (legacy page usage) */}
      {showChrome && (
        <div className="flex justify-end gap-2 lg:col-span-2">
          <Button variant="outline" size="sm" onClick={() => onClose?.()}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
            {saving ? "Saving…" : editingSignal ? "Update" : "Create"}
          </Button>
        </div>
      )}

      {/* User selector dialog */}
      {showUserSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowUserSelector(false)}>
          <div className="max-w-2xl w-full max-h-[80vh] overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Select Users to Assign</h3>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {(users || []).map((u) => (
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default SignalBuilder;