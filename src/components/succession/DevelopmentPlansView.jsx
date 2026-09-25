import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Target, Calendar, Pause, CheckCircle2, Clock, RefreshCw } from "lucide-react";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function DevelopmentPlansView() {
  const { invoke, loading, error } = useSuccessionApi();
  const [planLinks, setPlanLinks] = useState([]);
  const [candidacies, setCandidacies] = useState([]);
  const [conclusions, setConclusions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    candidacy_id: "",
    readiness_conclusion_id: "",
    effective_blueprint_snapshot_id: "",
    gap_summary: "",
    owner_profile_id: "",
    review_date: "",
    reassessment_date: "",
    linked_development_plan_id: "",
  });

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [plansRes, candRes] = await Promise.all([
        base44.functions.invoke("successionListDevelopmentPlans", {
          operation_id: `load-plans-${Date.now()}`,
        }),
        base44.functions.invoke("successionListCandidacies", {
          operation_id: `load-cand-${Date.now()}`,
        }),
      ]);
      setPlanLinks(plansRes?.data?.plan_links || []);
      setCandidacies(candRes?.data?.candidacies || []);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    const opId = `create-plan-${Date.now()}`;
    const res = await invoke("successionCreateDevelopmentPlanLink", {
      operation_id: opId,
      candidacy_id: formData.candidacy_id,
      readiness_conclusion_id: formData.readiness_conclusion_id,
      effective_blueprint_snapshot_id: formData.effective_blueprint_snapshot_id,
      gap_summary: formData.gap_summary,
      owner_profile_id: formData.owner_profile_id,
      review_date: formData.review_date,
      reassessment_date: formData.reassessment_date || undefined,
      linked_development_plan_id: formData.linked_development_plan_id || undefined,
    });
    if (res) {
      setShowForm(false);
      setFormData({ candidacy_id: "", readiness_conclusion_id: "", effective_blueprint_snapshot_id: "", gap_summary: "", owner_profile_id: "", review_date: "", reassessment_date: "", linked_development_plan_id: "" });
      loadData();
    }
  };

  const handleStatusChange = async (planLinkId, newStatus) => {
    const opId = `update-plan-${Date.now()}`;
    const res = await invoke("successionUpdateDevelopmentPlanLink", {
      operation_id: opId,
      plan_link_id: planLinkId,
      status: newStatus,
    });
    if (res) loadData();
  };

  const handleScheduleReassessment = async (planLinkId, date) => {
    const opId = `sched-reassess-${Date.now()}`;
    const res = await invoke("successionScheduleReassessment", {
      operation_id: opId,
      plan_link_id: planLinkId,
      reassessment_date: date,
    });
    if (res) loadData();
  };

  const selectedCandidacy = candidacies.find((c) => c.id === formData.candidacy_id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Development Plans</h2>
          <p className="text-sm text-gray-500 mt-1">
            Accelerate candidate development by linking readiness conclusions to targeted actions.
            Completion never changes readiness automatically.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#0202ff] hover:bg-[#0101dd]">
          <Plus className="w-4 h-4 mr-1.5" />
          {showForm ? "Cancel" : "Create Plan Link"}
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
            <CardTitle className="text-base">Create Development Plan Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dev-plan-candidacy" className="text-sm font-medium">Candidacy *</Label>
              <select
                id="dev-plan-candidacy"
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                value={formData.candidacy_id}
                onChange={(e) => {
                  const cand = candidacies.find((c) => c.id === e.target.value);
                  setFormData({
                    ...formData,
                    candidacy_id: e.target.value,
                    effective_blueprint_snapshot_id: cand?.effective_blueprint_snapshot_id || "",
                  });
                }}
              >
                <option value="">Select candidacy...</option>
                {candidacies.map((c) => (
                  <option key={c.id} value={c.id}>{c.candidate_name || c.id}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Readiness Conclusion ID *</Label>
              <Input
                value={formData.readiness_conclusion_id}
                onChange={(e) => setFormData({ ...formData, readiness_conclusion_id: e.target.value })}
                placeholder="Conclusion ID (ratified, overridden, or returned)"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Gap Summary *</Label>
              <Textarea
                value={formData.gap_summary}
                onChange={(e) => setFormData({ ...formData, gap_summary: e.target.value })}
                placeholder="Development gaps identified from the readiness conclusion"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Owner Profile ID *</Label>
                <Input
                  value={formData.owner_profile_id}
                  onChange={(e) => setFormData({ ...formData, owner_profile_id: e.target.value })}
                  placeholder="Profile ID of responsible user"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Review Date *</Label>
                <Input
                  type="date"
                  value={formData.review_date}
                  onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Reassessment Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.reassessment_date}
                  onChange={(e) => setFormData({ ...formData, reassessment_date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Linked DevelopmentPlan ID (optional)</Label>
                <Input
                  value={formData.linked_development_plan_id}
                  onChange={(e) => setFormData({ ...formData, linked_development_plan_id: e.target.value })}
                  placeholder="Existing Curiosity Led DevelopmentPlan ID"
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={loading} className="bg-[#0202ff] hover:bg-[#0101dd]">
              {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Create Plan Link
            </Button>
          </CardContent>
        </Card>
      )}

      {dataLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : planLinks.length === 0 ? (
        <Card className="border-gray-200">
          <CardContent className="py-12 text-center">
            <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No development plans yet. Create a plan link to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {planLinks.map((pl) => (
            <Card key={pl.plan_link_id} className="border-gray-200">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">Development Plan</h3>
                      <Badge className={STATUS_COLORS[pl.status] || "bg-gray-100"}>{pl.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      Candidacy: {pl.candidacy_id?.slice(0, 8)}... · Ratified: {pl.ratified_value || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pl.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(pl.plan_link_id, "active")}>
                        Activate
                      </Button>
                    )}
                    {pl.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(pl.plan_link_id, "paused")}>
                        <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                      </Button>
                    )}
                    {pl.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(pl.plan_link_id, "completed")}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3">{pl.gap_summary}</p>

                {pl.linked_conditions.length > 0 && (
                  <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs font-medium text-amber-700 mb-1.5">Linked Conditions</p>
                    <div className="space-y-1">
                      {pl.linked_conditions.map((c) => (
                        <div key={c.condition_id} className="flex items-center gap-2 text-xs text-amber-800">
                          <Clock className="w-3 h-3" />
                          <span>{c.condition_text}</span>
                          <Badge variant="outline" className="text-xs">{c.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="text-center p-2 rounded-lg bg-gray-50">
                    <p className="text-lg font-bold text-gray-900">{pl.progress.total}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-blue-50">
                    <p className="text-lg font-bold text-blue-700">{pl.progress.in_progress}</p>
                    <p className="text-xs text-gray-500">In Progress</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-green-50">
                    <p className="text-lg font-bold text-green-700">{pl.progress.completed}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-gray-50">
                    <p className="text-lg font-bold text-gray-600">{pl.progress.not_started}</p>
                    <p className="text-xs text-gray-500">Not Started</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Review: {pl.review_date || "—"}
                  </div>
                  <div className="flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reassessment: {pl.reassessment_date || "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}