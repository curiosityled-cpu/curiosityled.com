import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck, Eye, CheckCircle, XCircle, RotateCcw,
  AlertTriangle, Lock, FileText,
} from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import {
  SuccessionSection, SuccessionLoading, SuccessionError, SuccessionEmpty,
} from "./SuccessionSection";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EvidenceDetailDrawer from "./EvidenceDetailDrawer";

const EVIDENCE_TYPES = {
  performance_outcome: "Performance Outcome",
  competency_behavior: "Competency Behavior",
  critical_experience: "Critical Experience",
  stretch_assignment: "Stretch Assignment",
  coaching_milestone: "Coaching Milestone",
  development_completion: "Development Completion",
  business_outcome: "Business Outcome",
  credential: "Credential",
  manager_observation: "Manager Observation",
  manual_other: "Manual / Other",
};

const STRENGTH_OPTIONS = [
  { value: "direct", label: "Direct" },
  { value: "transferable", label: "Transferable" },
  { value: "indicative", label: "Indicative" },
  { value: "developmental", label: "Developmental" },
  { value: "not_relevant", label: "Not Relevant" },
];

const CONFIDENCE_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const RELEVANCE_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function EvidenceReviewQueueView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission, user } = useAuth();
  const [evidence, setEvidence] = useState([]);
  const [reviewingItem, setReviewingItem] = useState(null);
  const [detailEvidence, setDetailEvidence] = useState(null);

  const canManage = hasPermission("succession.evidence.manage");
  const canView = hasPermission("succession.evidence.view") || canManage;

  const fetchQueue = useCallback(async () => {
    try {
      const data = await invoke("successionListCandidacyEvidence", {
        status_filter: ["submitted", "under_review"],
      });
      setEvidence(data?.evidence || []);
    } catch { setEvidence([]); }
  }, [invoke]);

  useEffect(() => { if (canView) fetchQueue(); }, [fetchQueue, canView]);

  if (!canView) {
    return (
      <SuccessionSection icon={Lock} title="Evidence Review Queue">
        <div className="flex items-center gap-2 p-4">
          <Lock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">You do not have permission to view the evidence review queue.</span>
        </div>
      </SuccessionSection>
    );
  }

  const handleReview = async (evidenceId, formData) => {
    const opId = `evidence-review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionReviewEvidence", {
        operation_id: opId,
        evidence_id: evidenceId,
        decision: formData.decision,
        evidence_strength: formData.evidence_strength,
        confidence: formData.confidence,
        relevance: formData.relevance,
        limitations: formData.limitations || null,
        contrary_evidence_indicator: formData.contrary_evidence_indicator,
        contrary_evidence_notes: formData.contrary_evidence_notes || null,
      });
      setReviewingItem(null);
      await fetchQueue();
    } catch { /* handled by hook */ }
  };

  return (
    <div className="space-y-4">
      <SuccessionError message={error} onDismiss={clearError} />

      <SuccessionSection icon={ClipboardCheck} title="Evidence Review Queue"
        action={
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={fetchQueue}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        }>

        <div className="mb-3 flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-xs text-blue-700">
            Review submitted evidence. Decisions are append-only and do not rank candidates, change readiness, or alter candidacy status.
          </span>
        </div>

        {loading && evidence.length === 0 ? <SuccessionLoading /> :
         evidence.length === 0 ? (
          <SuccessionEmpty icon={ClipboardCheck} title="No evidence awaiting review"
            subtitle="Submitted evidence will appear here for review." />
         ) : (
          <div className="space-y-2">
            {evidence.map(e => {
              const isSubmitter = e.submitted_by_profile_id === user?.id;
              return (
                <ReviewQueueRow
                  key={e.id}
                  evidence={e}
                  isSubmitter={isSubmitter}
                  canReview={canManage && !isSubmitter}
                  onReview={() => setReviewingItem(e)}
                  onDetail={() => setDetailEvidence(e)}
                />
              );
            })}
          </div>
        )}
      </SuccessionSection>

      {reviewingItem && (
        <SuccessionSection icon={ClipboardCheck} title={`Review: ${reviewingItem.title}`}>
          <ReviewForm
            evidence={reviewingItem}
            onSubmit={(formData) => handleReview(reviewingItem.id, formData)}
            loading={loading}
            onCancel={() => setReviewingItem(null)}
          />
        </SuccessionSection>
      )}

      {detailEvidence && (
        <EvidenceDetailDrawer
          evidenceId={detailEvidence.id}
          onClose={() => setDetailEvidence(null)}
        />
      )}
    </div>
  );
}

function ReviewQueueRow({ evidence, isSubmitter, canReview, onReview, onDetail }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onDetail}>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">{evidence.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              evidence.status === "submitted" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
            }`}>
              {evidence.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {EVIDENCE_TYPES[evidence.evidence_type] || evidence.evidence_type}
            {" · "}{new Date(evidence.source_date).toLocaleDateString()}
          </p>
          {evidence.latest_review && (
            <p className="text-xs text-gray-400 mt-1">
              Last review: {evidence.latest_review.decision.replace(/_/g, " ")} by{" "}
              {evidence.latest_review.reviewer_profile_id === evidence.submitted_by_profile_id ? "— (self)" : "reviewer"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onDetail}>
            <Eye className="w-3.5 h-3.5" /> Detail
          </Button>
          {isSubmitter ? (
            <span className="text-xs text-gray-400 flex items-center gap-1 px-2 py-1">
              <Lock className="w-3 h-3" /> Cannot review own
            </span>
          ) : canReview ? (
            <Button size="sm" className="h-7 text-xs" onClick={onReview}>
              <ClipboardCheck className="w-3 h-3 mr-1" /> Review
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReviewForm({ evidence, onSubmit, loading, onCancel }) {
  const [formData, setFormData] = useState({
    decision: "accepted",
    evidence_strength: "direct",
    confidence: "medium",
    relevance: "medium",
    limitations: "",
    contrary_evidence_indicator: false,
    contrary_evidence_notes: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.decision === "accepted_with_limitations" && !formData.limitations.trim()) return;
    if (formData.contrary_evidence_indicator && !formData.contrary_evidence_notes.trim()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-600">Decision *</Label>
          <select className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.decision} onChange={e => setFormData(d => ({ ...d, decision: e.target.value }))} required>
            <option value="accepted">Accepted</option>
            <option value="accepted_with_limitations">Accepted with Limitations</option>
            <option value="rejected">Rejected</option>
            <option value="returned_for_clarification">Returned for Clarification</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Evidence Strength *</Label>
          <select className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.evidence_strength} onChange={e => setFormData(d => ({ ...d, evidence_strength: e.target.value }))} required>
            {STRENGTH_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Confidence *</Label>
          <select className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.confidence} onChange={e => setFormData(d => ({ ...d, confidence: e.target.value }))} required>
            {CONFIDENCE_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Relevance *</Label>
          <select className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.relevance} onChange={e => setFormData(d => ({ ...d, relevance: e.target.value }))} required>
            {RELEVANCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs text-gray-600">
            Limitations {formData.decision === "accepted_with_limitations" ? "*" : "(optional)"}
          </Label>
          <textarea className="mt-1 w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 min-h-[60px]"
            placeholder="Describe any limitations..."
            value={formData.limitations} onChange={e => setFormData(d => ({ ...d, limitations: e.target.value }))}
            required={formData.decision === "accepted_with_limitations"} />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4"
              checked={formData.contrary_evidence_indicator}
              onChange={e => setFormData(d => ({ ...d, contrary_evidence_indicator: e.target.checked }))} />
            Contrary evidence indicator
          </label>
        </div>
        {formData.contrary_evidence_indicator && (
          <div className="sm:col-span-2">
            <Label className="text-xs text-gray-600">Contrary Evidence Notes *</Label>
            <textarea className="mt-1 w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 min-h-[60px]"
              placeholder="Describe the contrary evidence..."
              value={formData.contrary_evidence_notes}
              onChange={e => setFormData(d => ({ ...d, contrary_evidence_notes: e.target.value }))} required />
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm" disabled={loading ||
          (formData.decision === "accepted_with_limitations" && !formData.limitations.trim()) ||
          (formData.contrary_evidence_indicator && !formData.contrary_evidence_notes.trim())}>
          Submit Review
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}