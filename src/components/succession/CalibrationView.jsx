import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Eye, EyeOff, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

const JUDGMENT_VALUES = [
  { value: "ready_now", label: "Ready Now" },
  { value: "ready_with_conditions", label: "Ready with Conditions" },
  { value: "emerging", label: "Emerging" },
  { value: "insufficient_evidence", label: "Insufficient Evidence" },
  { value: "not_aligned_now", label: "Not Aligned Now" },
];

export default function CalibrationView() {
  const { invoke, loading, error } = useSuccessionApi();
  const [sessions, setSessions] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [judgmentValue, setJudgmentValue] = useState("");
  const [coiDisclosed, setCoiDisclosed] = useState(false);
  const [judgmentNotes, setJudgmentNotes] = useState("");
  const [dataLoading, setDataLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setDataLoading(true);
    try {
      // Load calibration sessions via direct entity read (RLS-gated)
      const res = await base44.entities.CalibrationSession.filter({ integrity_status: "active" }, "-created_at", 20);
      setSessions(res || []);
      if (res && res.length > 0 && !selectedSession) setSelectedSession(res[0].id);
    } catch (e) {
      console.error("Failed to load sessions:", e);
    } finally {
      setDataLoading(false);
    }
  }, [selectedSession]);

  const loadCases = useCallback(async () => {
    if (!selectedSession) { setCases([]); return; }
    try {
      const res = await base44.functions.invoke("successionListDeliberationCases", {
        operation_id: `load-cases-${Date.now()}`,
        session_id: selectedSession,
        list_type: "calibration_cases",
      });
      setCases(res?.data?.cases || []);
    } catch (e) {
      setCases([]);
    }
  }, [selectedSession]);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { loadCases(); }, [loadCases]);

  const handleRecordJudgment = async (caseId) => {
    if (!coiDisclosed && !judgmentValue) return;
    await invoke("successionRecordCalibrationJudgment", {
      operation_id: `record-judgment-${Date.now()}`,
      calibration_case_id: caseId,
      coi_disclosed: coiDisclosed,
      judgment_value: coiDisclosed ? undefined : judgmentValue,
      judgment_notes: judgmentNotes,
    });
    setJudgmentValue("");
    setCoiDisclosed(false);
    setJudgmentNotes("");
    loadCases();
  };

  const handleFinalize = async (caseId) => {
    await invoke("successionFinalizeCalibrationCase", {
      operation_id: `finalize-case-${Date.now()}`,
      calibration_case_id: caseId,
    });
    loadCases();
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
        <h3 className="text-base font-semibold text-gray-900">Calibration</h3>
        <p className="text-sm text-gray-500 mt-0.5">Blind panel judgments with quorum and concurrence</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No calibration sessions yet. Create one from a proposed readiness conclusion.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Session selector */}
          <div>
            <Label className="text-xs">Calibration Session</Label>
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select session" /></SelectTrigger>
              <SelectContent>
                {sessions.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {new Date(s.scheduled_at).toLocaleDateString()} — {s.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cases */}
          <div className="space-y-3">
            {cases.map(c => (
              <Card key={c.case_id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{c.status?.replace(/_/g, " ")}</Badge>
                        {c.is_panelist && <Badge variant="secondary" className="text-xs">You are a panelist</Badge>}
                        {c.has_my_judgment && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                      </div>
                      <p className="text-xs text-gray-500">Conclusion: {c.readiness_conclusion_id?.slice(-8)}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>Panel: {c.panel_member_count} | Quorum: {c.minimum_panel_size}</p>
                      <p>Eligible: {c.eligible_judgment_count} | Abstained: {c.abstention_count}</p>
                    </div>
                  </div>

                  {/* Panel determination (if finalized) */}
                  {c.panel_determination && (
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-center gap-2">
                        {c.panel_determination === "no_quorum" ? (
                          <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm font-medium text-red-700">No Quorum</span></>
                        ) : c.panel_determination === "no_concurrence" ? (
                          <><XCircle className="w-4 h-4 text-amber-500" /><span className="text-sm font-medium text-amber-700">No Concurrence</span></>
                        ) : (
                          <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-sm font-medium text-green-700">Determination: {JUDGMENT_VALUES.find(v => v.value === c.panel_determination)?.label}</span></>
                        )}
                        <Badge variant="outline" className="text-xs ml-auto">{c.concurrence_met ? "Concurrence Met" : "No Concurrence"}</Badge>
                      </div>
                    </div>
                  )}

                  {/* Judgment form (if panelist and case is open) */}
                  {c.is_panelist && !c.has_my_judgment && c.status === "open" && (
                    <div className="space-y-2 p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                      <div className="flex items-center gap-2 text-xs text-blue-700">
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Blind judgment — your value is hidden from other panelists</span>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={coiDisclosed} onChange={e => setCoiDisclosed(e.target.checked)} />
                        I have a conflict of interest (abstain)
                      </label>
                      {!coiDisclosed && (
                        <Select value={judgmentValue} onValueChange={setJudgmentValue}>
                          <SelectTrigger><SelectValue placeholder="Your judgment" /></SelectTrigger>
                          <SelectContent>
                            {JUDGMENT_VALUES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      <Textarea placeholder="Notes (optional)" value={judgmentNotes} onChange={e => setJudgmentNotes(e.target.value)} rows={2} />
                      <Button size="sm" onClick={() => handleRecordJudgment(c.case_id)} disabled={loading || (!coiDisclosed && !judgmentValue)}>
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                        Record Judgment
                      </Button>
                    </div>
                  )}

                  {/* Finalize button (for admin) */}
                  {c.status === "open" && c.eligible_judgment_count > 0 && !c.panel_determination && (
                    <Button size="sm" variant="outline" onClick={() => handleFinalize(c.case_id)} disabled={loading}>
                      Finalize Case (Reveal & Determine)
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}