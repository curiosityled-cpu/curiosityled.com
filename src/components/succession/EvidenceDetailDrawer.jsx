import React, { useState, useEffect, useCallback } from "react";
import { X, FileText, AlertTriangle, Lock } from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";

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

const DECISION_STYLES = {
  accepted: "bg-green-50 text-green-700 border-green-200",
  accepted_with_limitations: "bg-yellow-50 text-yellow-700 border-yellow-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  returned_for_clarification: "bg-amber-50 text-amber-700 border-amber-200",
};

/**
 * EvidenceDetailDrawer — read-only detail view for a single EvidenceRecord.
 * Shows the full evidence content, the linked frozen requirement, and the
 * complete append-only review history.
 *
 * Does NOT display readiness scores, rankings, or recommendations.
 */
export default function EvidenceDetailDrawer({ evidenceId, onClose }) {
  const { invoke, loading } = useSuccessionApi();
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!evidenceId) return;
    try {
      const data = await invoke("successionGetEvidenceDetail", { evidence_id: evidenceId });
      setDetail(data);
    } catch { setDetail(null); }
  }, [invoke, evidenceId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  if (!evidenceId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Evidence Detail</h3>
          </div>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {loading && !detail ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin mr-2" />
              Loading…
            </div>
          ) : !detail ? (
            <div className="text-center py-8 text-sm text-gray-500">Evidence not found.</div>
          ) : (
            <>
              {/* Evidence record */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">{detail.evidence.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    detail.evidence.status === "draft" ? "bg-gray-100 text-gray-600" :
                    detail.evidence.status === "submitted" ? "bg-blue-50 text-blue-700" :
                    detail.evidence.status === "accepted" ? "bg-green-50 text-green-700" :
                    detail.evidence.status === "rejected" ? "bg-red-50 text-red-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {detail.evidence.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DetailField label="Type" value={EVIDENCE_TYPES[detail.evidence.evidence_type] || detail.evidence.evidence_type} />
                  <DetailField label="Source System" value={detail.evidence.source_system} />
                  <DetailField label="Source Date" value={detail.evidence.source_date ? new Date(detail.evidence.source_date).toLocaleDateString() : "—"} />
                  <DetailField label="Submitted" value={detail.evidence.submitted_at ? new Date(detail.evidence.submitted_at).toLocaleDateString() : "Draft"} />
                  <DetailField label="Freshness Review" value={detail.evidence.freshness_review_date ? new Date(detail.evidence.freshness_review_date).toLocaleDateString() : "—"} />
                  <DetailField label="Expiration" value={detail.evidence.expiration_date ? new Date(detail.evidence.expiration_date).toLocaleDateString() : "—"} />
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Description</p>
                  <p className="text-sm text-gray-900 mt-1">{detail.evidence.description}</p>
                </div>
                {detail.evidence.supersedes_evidence_record_id && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                    <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="text-xs text-blue-700">Supersedes record: {detail.evidence.supersedes_evidence_record_id}</span>
                  </div>
                )}
                {detail.evidence.withdrawal_reason && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-xs text-gray-600">Withdrawal reason: {detail.evidence.withdrawal_reason}</span>
                  </div>
                )}
              </div>

              {/* Frozen requirement */}
              {detail.frozen_requirement && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">Linked Frozen Requirement</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <DetailField label="Type" value={detail.frozen_requirement.requirement_type} />
                    <DetailField label="Source" value={detail.frozen_requirement.source_type === "canonical" ? "Canonical" : "Position-Specific"} />
                    <DetailField label="Modification" value={detail.frozen_requirement.modification_type?.replace(/_/g, " ") || "—"} />
                    <DetailField label="Applicability" value={detail.frozen_requirement.applicability_status?.replace(/_/g, " ") || "—"} />
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Frozen Title</p>
                    <p className="text-sm text-gray-900 mt-1">{detail.frozen_requirement.frozen_title || "—"}</p>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Effective Language</p>
                    <p className="text-sm text-gray-900 mt-1">{detail.frozen_requirement.effective_language || "—"}</p>
                  </div>
                  {detail.frozen_requirement.effective_level && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Effective Level</p>
                      <p className="text-sm text-gray-900 mt-1">{detail.frozen_requirement.effective_level}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Review history (append-only) */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-3">Review History</h4>
                {detail.review_history.length === 0 ? (
                  <p className="text-sm text-gray-500">No reviews yet.</p>
                ) : (
                  <div className="space-y-3">
                    {detail.review_history.map((r, idx) => (
                      <div key={r.id} className={`border rounded-lg p-3 ${DECISION_STYLES[r.decision] || "border-gray-200"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {r.decision.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-gray-500">#{idx + 1}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <span>Strength: <strong>{r.evidence_strength}</strong></span>
                          <span>Confidence: <strong>{r.confidence}</strong></span>
                          <span>Relevance: <strong>{r.relevance}</strong></span>
                        </div>
                        {r.limitations && (
                          <p className="text-xs text-gray-600 mt-2">Limitations: {r.limitations}</p>
                        )}
                        {r.contrary_evidence_indicator && (
                          <div className="mt-2 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-red-700">Contrary evidence indicated</p>
                              {r.contrary_evidence_notes && (
                                <p className="text-xs text-red-600 mt-0.5">{r.contrary_evidence_notes}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {r.reviewer_profile_id === user?.id && (
                          <p className="text-xs text-gray-400 mt-1">Reviewed by you</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || "—"}</p>
    </div>
  );
}