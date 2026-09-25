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
import { Loader2, Plus, FileText, AlertCircle, CheckCircle2, Clock } from "lucide-react";

const READINESS_VALUES = [
  { value: "ready_now", label: "Ready Now" },
  { value: "ready_with_conditions", label: "Ready with Conditions" },
  { value: "emerging", label: "Emerging" },
  { value: "insufficient_evidence", label: "Insufficient Evidence" },
  { value: "not_aligned_now", label: "Not Aligned Now" },
];

const TRANSITION_HORIZONS = [
  { value: "immediate", label: "Immediate" },
  { value: "0_6_months", label: "0-6 Months" },
  { value: "6_12_months", label: "6-12 Months" },
  { value: "12_24_months", label: "12-24 Months" },
  { value: "24_plus_months", label: "24+ Months" },
];

export default function ReadinessProposalsView() {
  const { invoke, loading, error } = useSuccessionApi();
  const [conclusions, setConclusions] = useState([]);
  const [candidacies, setCandidacies] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCandidacy, setSelectedCandidacy] = useState("");
  const [proposedValue, setProposedValue] = useState("insufficient_evidence");
  const [rationale, setRationale] = useState("");
  const [missingEvidence, setMissingEvidence] = useState("");
  const [conflictingEvidence, setConflictingEvidence] = useState("");
  const [transitionHorizon, setTransitionHorizon] = useState("");
  const [citations, setCitations] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [conclRes, candRes] = await Promise.all([
        base44.functions.invoke("successionListDeliberationCases", {
          operation_id: `load-conclusions-${Date.now()}`,
          list_type: "ratification_queue",
        }),
        base44.functions.invoke("successionListCandidacies", {
          operation_id: `load-candidacies-${Date.now()}`,
        }),
      ]);
      setConclusions(conclRes?.data?.conclusions || []);
      setCandidacies(candRes?.data?.candidacies || []);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadEvidenceForCandidacy = async (candidacyId) => {
    try {
      const res = await base44.functions.invoke("successionListCandidacyEvidence", {
        operation_id: `load-evidence-${Date.now()}`,
        candidacy_id: candidacyId,
      });
      setEvidence(res?.data?.evidence || []);
    } catch (e) {
      setEvidence([]);
    }
  };

  useEffect(() => {
    if (selectedCandidacy) loadEvidenceForCandidacy(selectedCandidacy);
  }, [selectedCandidacy]);

  const addCitation = () => {
    setCitations([...citations, { evidence_record_id: "", effective_requirement_snapshot_id: "", citation_role: "supporting", citation_notes: "" }]);
  };

  const updateCitation = (idx, field, value) => {
    const updated = [...citations];
    updated[idx][field] = value;
    setCitations(updated);
  };

  const removeCitation = (idx) => {
    setCitations(citations.filter((_, i) => i !== idx));
  };

  const addCondition = () => {
    setConditions([...conditions, { condition_text: "", owner_profile_id: "", required_by_date: "" }]);
  };

  const updateCondition = (idx, field, value) => {
    const updated = [...conditions];
    updated[idx][field] = value;
    setCitations(updated);
  };

  const removeCondition = (idx) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!selectedCandidacy || !proposedValue || !rationale) return;
    const candidacy = candidacies.find(c => c.candidacy_id === selectedCandidacy || c.id === selectedCandidacy);
    if (!candidacy) return;

    await invoke("successionSaveReadinessDraft", {
      operation_id: `save-draft-${Date.now()}`,
      candidacy_id: selectedCandidacy,
      effective_blueprint_snapshot_id: candidacy.effective_blueprint_snapshot_id || candidacy.snapshot_id,
      proposed_value: proposedValue,
      rationale,
      missing_evidence: missingEvidence,
      conflicting_evidence: conflictingEvidence,
      transition_horizon: transitionHorizon || undefined,
      citations: citations.filter(c => c.evidence_record_id && c.effective_requirement_snapshot_id),
      conditions: conditions.filter(c => c.condition_text && c.owner_profile_id && c.required_by_date),
    });

    setShowForm(false);
    setSelectedCandidacy("");
    setProposedValue("insufficient_evidence");
    setRationale("");
    setMissingEvidence("");
    setConflictingEvidence("");
    setTransitionHorizon("");
    setCitations([]);
    setConditions([]);
    loadData();
  };

  const handleSubmitProposal = async (conclusionId) => {
    await invoke("successionSubmitReadinessProposal", {
      operation_id: `submit-proposal-${Date.now()}`,
      conclusion_id: conclusionId,
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Readiness Proposals</h3>
          <p className="text-sm text-gray-500 mt-0.5">Draft and submit readiness conclusions for calibration</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} disabled={loading}>
          {showForm ? "Cancel" : <><Plus className="w-4 h-4 mr-1" /> New Proposal</>}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Create Readiness Draft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Candidacy</Label>
              <Select value={selectedCandidacy} onValueChange={setSelectedCandidacy}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select candidacy" /></SelectTrigger>
                <SelectContent>
                  {candidacies.map(c => (
                    <SelectItem key={c.candidacy_id || c.id} value={c.candidacy_id || c.id}>
                      {c.candidate_name || c.user_profile_id || c.candidacy_id || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Proposed Value</Label>
              <Select value={proposedValue} onValueChange={setProposedValue}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {READINESS_VALUES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Rationale</Label>
              <Textarea className="mt-1" value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Explain the proposed readiness..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Missing Evidence</Label>
                <Textarea className="mt-1" value={missingEvidence} onChange={e => setMissingEvidence(e.target.value)} placeholder="Describe evidence gaps..." rows={2} />
              </div>
              <div>
                <Label className="text-xs">Conflicting Evidence</Label>
                <Textarea className="mt-1" value={conflictingEvidence} onChange={e => setConflictingEvidence(e.target.value)} placeholder="Describe contrary evidence..." rows={2} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Transition Horizon</Label>
              <Select value={transitionHorizon} onValueChange={setTransitionHorizon}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {TRANSITION_HORIZONS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Citations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Evidence Citations</Label>
                <Button size="sm" variant="outline" onClick={addCitation}><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
              {citations.map((c, idx) => (
                <div key={idx} className="flex gap-2 items-start p-2 rounded-lg border border-gray-200">
                  <Select value={c.evidence_record_id} onValueChange={v => updateCitation(idx, "evidence_record_id", v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Evidence" /></SelectTrigger>
                    <SelectContent>
                      {evidence.map(e => <SelectItem key={e.evidence_id || e.id} value={e.evidence_id || e.id}>{e.title || e.evidence_id || e.id}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={c.citation_role} onValueChange={v => updateCitation(idx, "citation_role", v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supporting">Supporting</SelectItem>
                      <SelectItem value="contrary">Contrary</SelectItem>
                      <SelectItem value="contextual">Contextual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => removeCitation(idx)}>Remove</Button>
                </div>
              ))}
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Conditions</Label>
                <Button size="sm" variant="outline" onClick={addCondition}><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
              {conditions.map((c, idx) => (
                <div key={idx} className="flex gap-2 items-start p-2 rounded-lg border border-gray-200">
                  <Input className="flex-1" placeholder="Condition text" value={c.condition_text} onChange={e => updateCondition(idx, "condition_text", e.target.value)} />
                  <Input className="w-40" type="date" value={c.required_by_date} onChange={e => updateCondition(idx, "required_by_date", e.target.value)} />
                  <Button size="sm" variant="ghost" onClick={() => removeCondition(idx)}>Remove</Button>
                </div>
              ))}
            </div>

            <Button onClick={handleSubmit} disabled={loading || !selectedCandidacy || !rationale} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Draft
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing conclusions */}
      <div className="space-y-3">
        {conclusions.length === 0 && !showForm && (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No readiness proposals yet. Create one to get started.</p>
            </CardContent>
          </Card>
        )}
        {conclusions.map(c => (
          <Card key={c.conclusion_id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{READINESS_VALUES.find(v => v.value === c.proposed_value)?.label || c.proposed_value}</Badge>
                    {c.calibrated_value && <Badge variant="secondary" className="text-xs">Calibrated: {READINESS_VALUES.find(v => v.value === c.calibrated_value)?.label}</Badge>}
                    <Badge variant="outline" className="text-xs">v{c.version}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{c.rationale}</p>
                  {c.missing_evidence && <p className="text-xs text-amber-700"><AlertCircle className="w-3 h-3 inline mr-1" />Missing: {c.missing_evidence}</p>}
                  {c.conflicting_evidence && <p className="text-xs text-orange-700"><AlertCircle className="w-3 h-3 inline mr-1" />Conflicting: {c.conflicting_evidence}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="text-xs">{c.workflow_status?.replace(/_/g, " ")}</Badge>
                  {c.workflow_status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => handleSubmitProposal(c.conclusion_id)} disabled={loading}>
                      Submit for Calibration
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}