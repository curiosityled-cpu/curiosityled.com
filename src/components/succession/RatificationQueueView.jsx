import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Gavel, AlertCircle, CheckCircle2, RotateCcw, FileWarning } from "lucide-react";

const READINESS_VALUES = [
  { value: "ready_now", label: "Ready Now" },
  { value: "ready_with_conditions", label: "Ready with Conditions" },
  { value: "emerging", label: "Emerging" },
  { value: "insufficient_evidence", label: "Insufficient Evidence" },
  { value: "not_aligned_now", label: "Not Aligned Now" },
];

export default function RatificationQueueView() {
  const { invoke, loading, error } = useSuccessionApi();
  const [conclusions, setConclusions] = useState([]);
  const [selectedConclusion, setSelectedConclusion] = useState(null);
  const [detail, setDetail] = useState(null);
  const [decision, setDecision] = useState("ratify");
  const [rationale, setRationale] = useState("");
  const [overrideValue, setOverrideValue] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await base44.functions.invoke("successionListDeliberationCases", {
        operation_id: `load-ratify-${Date.now()}`,
        list_type: "ratification_queue",
      });
      setConclusions(res?.data?.conclusions || []);
    } catch (e) {
      console.error("Failed to load:", e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadDetail = useCallback(async (conclusionId) => {
    try {
      const res = await base44.functions.invoke("successionGetDeliberationDetail", {
        operation_id: `load-detail-${Date.now()}`,
        conclusion_id: conclusionId,
      });
      setDetail(res?.data?.detail || null);
    } catch (e) {
      setDetail(null);
    }
  }, []);

  useEffect(() => {
    if (selectedConclusion) loadDetail(selectedConclusion);
    else setDetail(null);
  }, [selectedConclusion, loadDetail]);

  const handleRatify = async () => {
    if (!selectedConclusion || !decision || !rationale) return;
    if ((decision === "ratify" || decision === "override") && !nextReviewDate) return;
    if (decision === "override" && !overrideValue) return;

    await invoke("successionRatifyReadinessConclusion", {
      operation_id: `ratify-${Date.now()}`,
      conclusion_id: selectedConclusion,
      decision,
      rationale,
      override_value: decision === "override" ? overrideValue : undefined,
      next_review_date: (decision === "ratify" || decision === "override") ? nextReviewDate : undefined,
    });

    setSelectedConclusion(null);
    setDetail(null);
    setDecision("ratify");
    setRationale("");
    setOverrideValue("");
    setNextReviewDate("");
    loadData();
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Ratification Queue</h3>
        <p className="text-sm text-gray-500 mt-0.5">Review calibrated conclusions and ratify, return, or override</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {conclusions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Gavel className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No conclusions awaiting ratification.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Conclusion list */}
          <div className="space-y-3">
            {conclusions.map(c => (
              <Card key={c.conclusion_id} className={`cursor-pointer transition-colors ${selectedConclusion === c.conclusion_id ? "ring-2 ring-[#0202ff]" : ""}`}>
                <CardContent className="py-3" onClick={() => setSelectedConclusion(c.conclusion_id)}>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">v{c.version}</Badge>
                    <Badge variant="secondary" className="text-xs">{READINESS_VALUES.find(v => v.value === c.proposed_value)?.label}</Badge>
                  </div>
                  {c.calibrated_value && (
                    <p className="text-xs text-green-700 mt-1"><CheckCircle2 className="w-3 h-3 inline mr-1" />Calibrated: {READINESS_VALUES.find(v => v.value === c.calibrated_value)?.label}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.rationale}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detail + ratification form */}
          <div>
            {selectedConclusion && detail ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Ratification Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Proposed:</span>
                      <Badge variant="outline">{READINESS_VALUES.find(v => v.value === detail.conclusion.proposed_value)?.label}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Calibrated:</span>
                      <Badge variant="secondary">{detail.conclusion.calibrated_value ? READINESS_VALUES.find(v => v.value === detail.conclusion.calibrated_value)?.label : "—"}</Badge>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Rationale:</span>
                      <p className="text-xs text-gray-700 mt-0.5">{detail.conclusion.rationale}</p>
                    </div>
                    {detail.conclusion.missing_evidence && <p className="text-xs text-amber-700">Missing: {detail.conclusion.missing_evidence}</p>}
                    {detail.conclusion.conflicting_evidence && <p className="text-xs text-orange-700">Conflicting: {detail.conclusion.conflicting_evidence}</p>}
                  </div>

                  {/* Citations count */}
                  {detail.citations?.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {detail.citations.length} citation(s): {detail.citations.filter(c => c.citation_role === "supporting").length} supporting, {detail.citations.filter(c => c.citation_role === "contrary").length} contrary
                    </div>
                  )}

                  {/* Conditions */}
                  {detail.conditions?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500">Conditions:</span>
                      {detail.conditions.map(c => (
                        <div key={c.condition_id} className="text-xs flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{c.status}</Badge>
                          <span className="text-gray-700">{c.condition_text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Calibration dissent */}
                  {detail.calibration_case?.dissent && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-xs text-amber-700"><FileWarning className="w-3 h-3 inline mr-1" />Dissent: {detail.calibration_case.dissent}</p>
                    </div>
                  )}

                  {/* Decision form */}
                  <div className="space-y-3 border-t pt-3">
                    <div>
                      <Label className="text-xs">Decision</Label>
                      <Select value={decision} onValueChange={setDecision}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ratify">Ratify (use calibrated value)</SelectItem>
                          <SelectItem value="override">Override (different value)</SelectItem>
                          <SelectItem value="return_for_evidence">Return for Evidence</SelectItem>
                          <SelectItem value="return_for_recalibration">Return for Recalibration</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {decision === "override" && (
                      <div>
                        <Label className="text-xs">Override Value</Label>
                        <Select value={overrideValue} onValueChange={setOverrideValue}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select override value" /></SelectTrigger>
                          <SelectContent>
                            {READINESS_VALUES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs">Rationale</Label>
                      <Textarea className="mt-1" value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Required rationale..." rows={3} />
                    </div>

                    {(decision === "ratify" || decision === "override") && (
                      <div>
                        <Label className="text-xs">Next Review Date</Label>
                        <Input className="mt-1" type="date" value={nextReviewDate} onChange={e => setNextReviewDate(e.target.value)} />
                      </div>
                    )}

                    <Button onClick={handleRatify} disabled={loading || !rationale || (decision === "override" && !overrideValue) || ((decision === "ratify" || decision === "override") && !nextReviewDate)} className="w-full">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      {decision === "ratify" ? "Ratify" : decision === "override" ? "Override" : "Return"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <Gavel className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Select a conclusion to review and ratify.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}