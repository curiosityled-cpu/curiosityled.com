import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { SuccessionSection, SuccessionLoading, SuccessionEmpty } from "@/components/succession/SuccessionSection";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileBarChart, Eye, Plus, CheckCircle2, AlertTriangle, Info } from "lucide-react";

/**
 * AssessmentEvidenceView — embedded in the candidacy evidence area.
 * Displays eligible completed Leadership Index assessments, previews
 * competency-to-requirement mappings, and creates suggested evidence drafts.
 *
 * This is an evidence bridge, not a readiness engine. It does not score,
 * rank, or recommend candidates.
 */
export default function AssessmentEvidenceView({ candidacy }) {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [selectedMappingIds, setSelectedMappingIds] = useState([]);
  const [createResult, setCreateResult] = useState(null);

  const canManage = hasPermission("succession.evidence.manage");
  const canView = hasPermission("succession.evidence.view") || canManage;

  const fetchAssessments = useCallback(async () => {
    if (!candidacy?.id) return;
    setDataLoading(true);
    try {
      const result = await base44.functions.invoke("successionListEligibleLeadershipIndexAssessments", {
        candidacy_id: candidacy.id,
      });
      setAssessments(result?.assessments || []);
    } catch (e) {
      setAssessments([]);
    } finally {
      setDataLoading(false);
    }
  }, [candidacy?.id]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  if (!canView) return null;

  const handlePreview = async (assessmentId) => {
    setSelectedAssessment(assessmentId);
    setPreviewLoading(true);
    setPreviewData(null);
    setSelectedMappingIds([]);
    try {
      const result = await base44.functions.invoke("successionPreviewLeadershipIndexEvidence", {
        candidacy_id: candidacy.id,
        assessment_id: assessmentId,
      });
      setPreviewData(result);
    } catch (e) {
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleToggleMapping = (mappingId) => {
    setSelectedMappingIds(prev =>
      prev.includes(mappingId) ? prev.filter(id => id !== mappingId) : [...prev, mappingId]
    );
  };

  const handleCreateEvidence = async () => {
    if (!selectedAssessment || selectedMappingIds.length === 0) return;
    const opId = `li-evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await invoke("successionCreateLeadershipIndexEvidenceDrafts", {
      operation_id: opId,
      candidacy_id: candidacy.id,
      assessment_id: selectedAssessment,
      selected_mapping_ids: selectedMappingIds,
    });
    if (result) {
      setCreateResult(result);
      setSelectedMappingIds([]);
      fetchAssessments();
    }
  };

  return (
    <SuccessionSection icon={FileBarChart} title="Leadership Index Assessment Evidence"
      subtitle="Bridge completed assessment competency results to frozen role requirements as suggested evidence">
      {/* Disclaimer */}
      <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          <strong>Leadership Index results are assessment evidence only.</strong>{" "}
          They do not determine readiness, rank candidates, or replace human review.
          All suggested evidence requires normal evidence review before becoming decision-eligible.
        </p>
      </div>

      {dataLoading ? (
        <SuccessionLoading />
      ) : assessments.length === 0 ? (
        <SuccessionEmpty icon={FileBarChart}
          title="No eligible Leadership Index assessments"
          subtitle="Completed and finalized Leadership Index assessments for this candidate will appear here." />
      ) : (
        <div className="space-y-3">
          {/* Assessment list */}
          <div className="space-y-2">
            {assessments.map((a) => (
              <div key={a.assessment_id}
                className={`p-3 rounded-lg border transition-colors ${
                  selectedAssessment === a.assessment_id
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">{a.assessment_definition_title || "Assessment"}</p>
                      {a.already_linked && (
                        <Badge className="bg-green-50 text-green-700 text-xs">{a.linked_evidence_count} linked</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                      <div><span className="font-medium">Framework:</span> {a.framework_version}</div>
                      <div><span className="font-medium">Level:</span> {a.leadership_level}</div>
                      <div><span className="font-medium">Completed:</span> {a.completion_date || "—"}</div>
                      <div><span className="font-medium">Status:</span> {a.result_status}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Competency results:</span> {a.competency_result_count}
                    </div>
                  </div>
                  <Button size="sm" variant="outline"
                    onClick={() => handlePreview(a.assessment_id)}
                    disabled={previewLoading && selectedAssessment === a.assessment_id}>
                    {previewLoading && selectedAssessment === a.assessment_id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Eye className="w-3.5 h-3.5 mr-1" />}
                    Preview
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Preview table */}
          {previewData && (
            <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Evidence Preview</h4>
                <div className="flex gap-2 text-xs">
                  <Badge className="bg-green-100 text-green-700">Matched: {previewData.counts.matched}</Badge>
                  <Badge className="bg-amber-100 text-amber-700">Unmapped: {previewData.counts.unmapped}</Badge>
                  <Badge className="bg-red-100 text-red-700">Rejected: {previewData.counts.rejected}</Badge>
                </div>
              </div>

              {/* Matched rows */}
              {previewData.matched.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-green-700 mb-1">Matched (eligible for suggested evidence)</p>
                  <div className="space-y-1">
                    {previewData.matched.map((m, i) => (
                      <div key={i} className="p-2 rounded bg-white border border-green-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-900">{m.competency_name} ({m.competency_key})</p>
                            <p className="text-xs text-gray-500">Result: {m.observed_result} · Scale: {m.source_scale}</p>
                            <p className="text-xs text-gray-500">Target: {m.target_frozen_requirement_language}</p>
                            <p className="text-xs text-gray-400">Mapping v{m.mapping_version} · {m.framework_version} · {m.leadership_level}</p>
                          </div>
                          {canManage && (
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                              <input type="checkbox"
                                checked={selectedMappingIds.includes(m.mapping_id)}
                                onChange={() => handleToggleMapping(m.mapping_id)}
                                className="w-4 h-4" />
                              Select
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmapped rows */}
              {previewData.unmapped.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">Unmapped (no approved mapping)</p>
                  <div className="space-y-1">
                    {previewData.unmapped.map((m, i) => (
                      <div key={i} className="p-2 rounded bg-white border border-amber-200">
                        <p className="text-xs font-medium text-gray-900">{m.competency_name} ({m.competency_key})</p>
                        <p className="text-xs text-gray-500">Result: {m.observed_result} · {m.reason_code}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejected rows */}
              {previewData.rejected.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1">Rejected</p>
                  <div className="space-y-1">
                    {previewData.rejected.map((m, i) => (
                      <div key={i} className="p-2 rounded bg-white border border-red-200">
                        <p className="text-xs font-medium text-gray-900">{m.competency_name || m.competency_id}</p>
                        <p className="text-xs text-red-600">{m.reason_code}: {m.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create button */}
              {canManage && selectedMappingIds.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={handleCreateEvidence} disabled={loading}
                    className="bg-[#0202ff] hover:bg-[#0101dd]">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                    Create {selectedMappingIds.length} Suggested Evidence {selectedMappingIds.length > 1 ? "Drafts" : "Draft"}
                  </Button>
                </div>
              )}

              {/* Create result */}
              {createResult && (
                <div className="mt-3 p-2 rounded border border-gray-200 bg-white">
                  <p className="text-xs text-green-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                    Created {createResult.created_count} evidence draft(s), skipped {createResult.skipped_count}
                  </p>
                  {createResult.skipped.length > 0 && (
                    <div className="mt-1">
                      {createResult.skipped.map((s, i) => (
                        <p key={i} className="text-xs text-amber-600">Skipped: {s.reason}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-2 p-2 rounded bg-red-50 border border-red-200">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>
      )}
    </SuccessionSection>
  );
}