import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, CheckCircle2, XCircle, Clock, Play } from "lucide-react";

const REVIEW_TYPE_LABELS = {
  operational: "Operational",
  readiness_reassessment: "Readiness Reassessment",
  development: "Development",
  transition: "Transition",
  integrity: "Integrity",
  pilot: "Pilot",
  other: "Other",
};

const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function ReviewQueueView() {
  const { invoke, loading, error } = useSuccessionApi();
  const [reviews, setReviews] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeReview, setActiveReview] = useState(null);
  const [formData, setFormData] = useState({
    review_type: "operational",
    title: "",
    review_scope: "",
    owner_profile_id: "",
    scheduled_for: "",
    cycle_id: "",
    critical_role_id: "",
    candidacy_id: "",
    participant_profile_ids: "",
    source_alert_ids: "",
  });
  const [completeForm, setCompleteForm] = useState({
    operational_notes: "",
    follow_up_actions: "",
    next_review_date: "",
    cancellation_reason: "",
  });

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      // Reviews are loaded via direct entity reads (RLS-scoped)
      const res = await base44.entities.SuccessionReviewRecord.list("-scheduled_for", 50);
      setReviews(res || []);
    } catch (e) {
      console.error("Failed to load reviews:", e);
      // Fallback: try via asServiceRole through a function if available
      setReviews([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    const result = await invoke("successionCreateReviewRecord", {
      operation_id: `create-review-${Date.now()}`,
      review_type: formData.review_type,
      title: formData.title,
      review_scope: formData.review_scope,
      owner_profile_id: formData.owner_profile_id,
      scheduled_for: formData.scheduled_for,
      cycle_id: formData.cycle_id || null,
      critical_role_id: formData.critical_role_id || null,
      candidacy_id: formData.candidacy_id || null,
      participant_profile_ids: formData.participant_profile_ids
        ? formData.participant_profile_ids.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      source_alert_ids: formData.source_alert_ids
        ? formData.source_alert_ids.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    });
    if (result) {
      setShowForm(false);
      setFormData({
        review_type: "operational", title: "", review_scope: "", owner_profile_id: "",
        scheduled_for: "", cycle_id: "", critical_role_id: "", candidacy_id: "",
        participant_profile_ids: "", source_alert_ids: "",
      });
      loadData();
    }
  };

  const handleStart = async (reviewId) => {
    const result = await invoke("successionUpdateReviewRecord", {
      operation_id: `start-review-${Date.now()}`,
      review_id: reviewId,
      new_status: "in_progress",
    });
    if (result) loadData();
  };

  const handleComplete = async (reviewId) => {
    const result = await invoke("successionCompleteReviewRecord", {
      operation_id: `complete-review-${Date.now()}`,
      review_id: reviewId,
      action: "complete",
      operational_notes: completeForm.operational_notes || null,
      follow_up_actions: completeForm.follow_up_actions || null,
      next_review_date: completeForm.next_review_date || null,
    });
    if (result) {
      setActiveReview(null);
      setCompleteForm({ operational_notes: "", follow_up_actions: "", next_review_date: "", cancellation_reason: "" });
      loadData();
    }
  };

  const [cancelError, setCancelError] = useState("");

  const handleCancel = async (reviewId) => {
    if (!completeForm.cancellation_reason.trim()) {
      setCancelError("Cancellation requires a reason.");
      return;
    }
    setCancelError("");
    const result = await invoke("successionCompleteReviewRecord", {
      operation_id: `cancel-review-${Date.now()}`,
      review_id: reviewId,
      action: "cancel",
      cancellation_reason: completeForm.cancellation_reason,
    });
    if (result) {
      setActiveReview(null);
      setCompleteForm({ operational_notes: "", follow_up_actions: "", next_review_date: "", cancellation_reason: "" });
      loadData();
    }
  };

  const now = new Date();

  return (
    <div className="space-y-5">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <strong>Operational monitoring identifies workflow exceptions and review obligations.</strong>{" "}
          It does not score candidates, recommend successors, change readiness, or make employment decisions.
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Review Records</h3>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#0202ff] hover:bg-[#0101dd]">
          <Plus className="w-4 h-4 mr-1" /> New Review
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Review Record</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Review Type</Label>
                <select value={formData.review_type} onChange={(e) => setFormData({ ...formData, review_type: e.target.value })} className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white">
                  {Object.entries(REVIEW_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><Label className="text-xs">Title</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
              <div className="col-span-2"><Label className="text-xs">Review Scope</Label><Textarea value={formData.review_scope} onChange={(e) => setFormData({ ...formData, review_scope: e.target.value })} /></div>
              <div><Label className="text-xs">Owner Profile ID</Label><Input value={formData.owner_profile_id} onChange={(e) => setFormData({ ...formData, owner_profile_id: e.target.value })} /></div>
              <div><Label className="text-xs">Scheduled For</Label><Input type="datetime-local" value={formData.scheduled_for} onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })} /></div>
              <div><Label className="text-xs">Cycle ID (optional)</Label><Input value={formData.cycle_id} onChange={(e) => setFormData({ ...formData, cycle_id: e.target.value })} /></div>
              <div><Label className="text-xs">Critical Role ID (optional)</Label><Input value={formData.critical_role_id} onChange={(e) => setFormData({ ...formData, critical_role_id: e.target.value })} /></div>
              <div><Label className="text-xs">Candidacy ID (optional)</Label><Input value={formData.candidacy_id} onChange={(e) => setFormData({ ...formData, candidacy_id: e.target.value })} /></div>
              <div><Label className="text-xs">Participant Profile IDs (comma-separated)</Label><Input value={formData.participant_profile_ids} onChange={(e) => setFormData({ ...formData, participant_profile_ids: e.target.value })} /></div>
              <div className="col-span-2"><Label className="text-xs">Source Alert IDs (comma-separated)</Label><Input value={formData.source_alert_ids} onChange={(e) => setFormData({ ...formData, source_alert_ids: e.target.value })} /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={loading} className="bg-[#0202ff] hover:bg-[#0101dd]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Reviews list */}
      {dataLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : reviews.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No review records found.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => {
            const isOverdue = r.status === "scheduled" && r.scheduled_for && new Date(r.scheduled_for) < now;
            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={STATUS_COLORS[r.status]}>{r.status.replace("_", " ")}</Badge>
                        <Badge variant="outline">{REVIEW_TYPE_LABELS[r.review_type] || r.review_type}</Badge>
                        {isOverdue && <Badge className="bg-red-100 text-red-700"><Clock className="w-3 h-3 mr-1" />Overdue</Badge>}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{r.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{r.review_scope}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mt-2">
                        <div><span className="font-medium">Owner:</span> {r.owner_profile_id}</div>
                        <div><span className="font-medium">Scheduled:</span> {r.scheduled_for?.split("T")[0]}</div>
                        <div><span className="font-medium">Linked Alerts:</span> {r.source_alert_ids?.length || 0}</div>
                      </div>
                      {r.next_review_date && (
                        <div className="text-xs text-gray-500 mt-1"><span className="font-medium">Next Review:</span> {r.next_review_date}</div>
                      )}
                      {r.operational_notes && (
                        <div className="mt-2 p-2 rounded bg-gray-50 border border-gray-200">
                          <p className="text-xs text-gray-700"><strong>Notes:</strong> {r.operational_notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 ml-4">
                      {r.status === "scheduled" && (
                        <Button size="sm" variant="outline" onClick={() => handleStart(r.id)}>
                          <Play className="w-3.5 h-3.5 mr-1" /> Start
                        </Button>
                      )}
                      {r.status === "in_progress" && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
                            setActiveReview({ ...r, action: "complete" });
                            setCompleteForm({ operational_notes: r.operational_notes || "", follow_up_actions: r.follow_up_actions || "", next_review_date: r.next_review_date || "", cancellation_reason: "" });
                          }}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setActiveReview({ ...r, action: "cancel" });
                            setCompleteForm({ operational_notes: "", follow_up_actions: "", next_review_date: "", cancellation_reason: "" });
                          }}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Complete/Cancel dialog */}
      {activeReview && (
        <Card className="border-2 border-blue-300">
          <CardHeader><CardTitle className="text-base">{activeReview.action === "complete" ? "Complete" : "Cancel"} Review: {activeReview.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activeReview.action === "complete" ? (
              <>
                <div>
                  <Label className="text-xs">Operational Notes</Label>
                  <Textarea value={completeForm.operational_notes} onChange={(e) => setCompleteForm({ ...completeForm, operational_notes: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Follow-up Actions</Label>
                  <Textarea value={completeForm.follow_up_actions} onChange={(e) => setCompleteForm({ ...completeForm, follow_up_actions: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Next Review Date (optional)</Label>
                  <Input type="date" value={completeForm.next_review_date} onChange={(e) => setCompleteForm({ ...completeForm, next_review_date: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleComplete(activeReview.id)} disabled={loading} className="bg-green-600 hover:bg-green-700">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />} Complete
                  </Button>
                  <Button variant="outline" onClick={() => setActiveReview(null)}>Close</Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Cancellation Reason (required)</Label>
                  <Textarea value={completeForm.cancellation_reason} onChange={(e) => setCompleteForm({ ...completeForm, cancellation_reason: e.target.value })} />
                </div>
                {cancelError && <p className="text-sm text-red-600" role="alert">{cancelError}</p>}
                <div className="flex gap-2">
                  <Button onClick={() => handleCancel(activeReview.id)} disabled={loading} variant="outline">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />} Confirm Cancel
                  </Button>
                  <Button variant="outline" onClick={() => setActiveReview(null)}>Close</Button>
                </div>
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}