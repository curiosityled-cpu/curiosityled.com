import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, BookOpen, Users, Briefcase, Award, Target, Zap, FileText, CheckCircle2, XCircle } from "lucide-react";

const ACTION_TYPES = [
  { value: "learning", label: "Learning", icon: BookOpen },
  { value: "coaching", label: "Coaching", icon: Users },
  { value: "stretch_assignment", label: "Stretch Assignment", icon: Zap },
  { value: "critical_experience", label: "Critical Experience", icon: Briefcase },
  { value: "credential", label: "Credential", icon: Award },
  { value: "business_goal", label: "Business Goal", icon: Target },
  { value: "other", label: "Other", icon: FileText },
];

const STATUS_COLORS = {
  not_started: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function DevelopmentActionsView() {
  const { invoke, loading, error } = useSuccessionApi();
  const [planLinks, setPlanLinks] = useState([]);
  const [actions, setActions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlanLink, setSelectedPlanLink] = useState("");
  const [formData, setFormData] = useState({
    action_type: "learning",
    title: "",
    description: "",
    owner_profile_id: "",
    due_date: "",
    milestone_text: "",
    readiness_condition_id: "",
    effective_requirement_snapshot_id: "",
    linked_resource_id: "",
    linked_goal_id: "",
    linked_coaching_engagement_id: "",
  });
  const [completingAction, setCompletingAction] = useState(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const plansRes = await base44.functions.invoke("successionListDevelopmentPlans", {
        operation_id: `load-plans-actions-${Date.now()}`,
      });
      const plans = plansRes?.data?.plan_links || [];
      setPlanLinks(plans);

      // Load actions for all plan links
      if (plans.length > 0) {
        const allActions = await base44.entities.DevelopmentAction.list('-created_date', 200).catch(() => []);
        setActions(allActions || []);
      }
    } catch (e) {
      console.error("Failed to load data:", e);
      setActions([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!selectedPlanLink) return;
    const opId = `create-action-${Date.now()}`;
    const res = await invoke("successionCreateDevelopmentAction", {
      operation_id: opId,
      development_plan_link_id: selectedPlanLink,
      action_type: formData.action_type,
      title: formData.title,
      description: formData.description,
      owner_profile_id: formData.owner_profile_id,
      due_date: formData.due_date,
      milestone_text: formData.milestone_text,
      readiness_condition_id: formData.readiness_condition_id || undefined,
      effective_requirement_snapshot_id: formData.effective_requirement_snapshot_id || undefined,
      linked_resource_id: formData.linked_resource_id || undefined,
      linked_goal_id: formData.linked_goal_id || undefined,
      linked_coaching_engagement_id: formData.linked_coaching_engagement_id || undefined,
    });
    if (res) {
      setShowForm(false);
      setFormData({ action_type: "learning", title: "", description: "", owner_profile_id: "", due_date: "", milestone_text: "", readiness_condition_id: "", effective_requirement_snapshot_id: "", linked_resource_id: "", linked_goal_id: "", linked_coaching_engagement_id: "" });
      loadData();
    }
  };

  const handleStatusChange = async (actionId, newStatus) => {
    const opId = `update-action-${Date.now()}`;
    const res = await invoke("successionUpdateDevelopmentAction", {
      operation_id: opId,
      action_id: actionId,
      status: newStatus,
    });
    if (res) loadData();
  };

  const handleComplete = async () => {
    if (!completingAction) return;
    const opId = `complete-action-${Date.now()}`;
    const res = await invoke("successionCompleteDevelopmentAction", {
      operation_id: opId,
      action_id: completingAction,
      outcome_notes: outcomeNotes,
      create_suggested_evidence: true,
    });
    if (res) {
      setCompletingAction(null);
      setOutcomeNotes("");
      loadData();
    }
  };

  const getActionTypeIcon = (type) => {
    const t = ACTION_TYPES.find((a) => a.value === type);
    return t ? t.icon : FileText;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Development Actions</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track individual development actions. Completion creates suggested evidence requiring normal review — it never changes readiness automatically.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#0202ff] hover:bg-[#0101dd]">
          <Plus className="w-4 h-4 mr-1.5" />
          {showForm ? "Cancel" : "Add Action"}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">Create Development Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dev-action-planlink" className="text-sm font-medium">Plan Link *</Label>
              <select
                id="dev-action-planlink"
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                value={selectedPlanLink}
                onChange={(e) => setSelectedPlanLink(e.target.value)}
              >
                <option value="">Select plan link...</option>
                {planLinks.map((p) => (
                  <option key={p.plan_link_id} value={p.plan_link_id}>
                    {p.gap_summary?.slice(0, 40)}... ({p.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Action Type *</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {ACTION_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setFormData({ ...formData, action_type: t.value })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                        formData.action_type === t.value
                          ? "border-[#0202ff] bg-[#0202ff]/5 text-[#0202ff]"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Action title"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Owner Profile ID *</Label>
                <Input
                  value={formData.owner_profile_id}
                  onChange={(e) => setFormData({ ...formData, owner_profile_id: e.target.value })}
                  placeholder="Profile ID"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Due Date *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Milestone Text *</Label>
              <Input
                value={formData.milestone_text}
                onChange={(e) => setFormData({ ...formData, milestone_text: e.target.value })}
                placeholder="Milestone description"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Condition ID (optional)</Label>
                <Input
                  value={formData.readiness_condition_id}
                  onChange={(e) => setFormData({ ...formData, readiness_condition_id: e.target.value })}
                  placeholder="Condition ID"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Requirement ID (optional)</Label>
                <Input
                  value={formData.effective_requirement_snapshot_id}
                  onChange={(e) => setFormData({ ...formData, effective_requirement_snapshot_id: e.target.value })}
                  placeholder="Requirement snapshot ID"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Resource ID (optional)</Label>
                <Input
                  value={formData.linked_resource_id}
                  onChange={(e) => setFormData({ ...formData, linked_resource_id: e.target.value })}
                  placeholder="LearningResource ID"
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={loading || !selectedPlanLink} className="bg-[#0202ff] hover:bg-[#0101dd]">
              {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Create Action
            </Button>
          </CardContent>
        </Card>
      )}

      {completingAction && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-base">Complete Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Outcome Notes (not accepted evidence)</Label>
              <Textarea
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="Describe the outcome. A suggested EvidenceRecord will be created in draft status — it requires normal review before it can be cited."
                rows={3}
              />
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700">
                Completion does not change readiness, close conditions, or change candidacy status.
                The suggested evidence is draft and not decision-eligible until reviewed.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleComplete} disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                Complete Action
              </Button>
              <Button variant="outline" onClick={() => { setCompletingAction(null); setOutcomeNotes(""); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {dataLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : actions.length === 0 ? (
        <Card className="border-gray-200">
          <CardContent className="py-12 text-center">
            <Zap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No development actions yet. Add an action to a plan link to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {actions.map((a) => {
            const Icon = getActionTypeIcon(a.action_type);
            return (
              <Card key={a.id} className="border-gray-200">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[#0202ff]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                          <Badge className={STATUS_COLORS[a.status] || "bg-gray-100"}>{a.status}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">{a.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {a.status === "not_started" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(a.id, "in_progress")}>
                          Start
                        </Button>
                      )}
                      {a.status === "in_progress" && (
                        <Button size="sm" variant="outline" onClick={() => setCompletingAction(a.id)}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                        </Button>
                      )}
                      {(a.status === "not_started" || a.status === "in_progress") && (
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(a.id, "cancelled")}>
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 ml-12">
                    <span>Due: {a.due_date}</span>
                    <span>Milestone: {a.milestone_text}</span>
                    {a.evidence_record_id && (
                      <Badge variant="outline" className="text-xs">
                        Suggested Evidence: {a.evidence_record_id?.slice(0, 8)}... (draft)
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}