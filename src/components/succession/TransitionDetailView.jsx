import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Plus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const RISK_SEVERITY_COLORS = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const RISK_STATUS_COLORS = {
  open: "bg-gray-100 text-gray-700",
  monitoring: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  accepted: "bg-indigo-100 text-indigo-700",
};

export default function TransitionDetailView({ initiationId, onBack }) {
  const { invoke, loading, error } = useSuccessionApi();
  const [initiation, setInitiation] = useState(null);
  const [ktPlan, setKtPlan] = useState(null);
  const [transitionPlan, setTransitionPlan] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [ktForm, setKtForm] = useState({ incumbent_profile_id: "", owner_profile_id: "", start_date: "", target_completion_date: "", access_handoffs: "", stakeholder_handoffs: "", documentation_locations: "", knowledge_areas: [] });
  const [tpForm, setTpForm] = useState({ transition_type: "promotion", start_date: "", review_date: "", target_completion_date: "", ramp_plan: "", success_outcomes: "", milestone_summary: "", risks: [] });
  const [newRisk, setNewRisk] = useState({ risk: "", severity: "medium", mitigation: "", owner_profile_id: "", status: "open" });
  const [newKtArea, setNewKtArea] = useState({ title: "", description: "", transfer_method: "", owner_profile_id: "", target_date: "", status: "not_started", waiver_reason: "" });

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await base44.functions.invoke("successionListTransitions", {
        operation_id: `load-detail-${Date.now()}`,
      });
      const all = res?.data?.transitions || [];
      const found = all.find((t) => t.initiation_id === initiationId);
      setInitiation(found || null);

      // Load KT and transition plans via direct entity reads
      const [ktRes, tpRes] = await Promise.all([
        base44.entities.KnowledgeTransferPlan.filter({ transition_initiation_id: initiationId }),
        base44.entities.TransitionPlan.filter({ transition_initiation_id: initiationId }),
      ]);
      const kt = ktRes && ktRes.length > 0 ? ktRes[0] : null;
      const tp = tpRes && tpRes.length > 0 ? tpRes[0] : null;
      setKtPlan(kt);
      setTransitionPlan(tp);

      if (kt) {
        setKtForm({
          incumbent_profile_id: kt.incumbent_profile_id || "",
          owner_profile_id: kt.owner_profile_id || "",
          start_date: kt.start_date || "",
          target_completion_date: kt.target_completion_date || "",
          access_handoffs: kt.access_handoffs || "",
          stakeholder_handoffs: kt.stakeholder_handoffs || "",
          documentation_locations: kt.documentation_locations || "",
          knowledge_areas: kt.knowledge_areas || [],
        });
      }
      if (tp) {
        setTpForm({
          transition_type: tp.transition_type || "promotion",
          start_date: tp.start_date || "",
          review_date: tp.review_date || "",
          target_completion_date: tp.target_completion_date || "",
          ramp_plan: tp.ramp_plan || "",
          success_outcomes: tp.success_outcomes || "",
          milestone_summary: tp.milestone_summary || "",
          risks: tp.risks || [],
        });
      }
    } catch (e) {
      console.error("Failed to load detail:", e);
    } finally {
      setDataLoading(false);
    }
  }, [initiationId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveKt = async () => {
    const result = await invoke("successionSaveKnowledgeTransferPlan", {
      operation_id: `save-kt-${Date.now()}`,
      transition_initiation_id: initiationId,
      plan_id: ktPlan?.id || null,
      incumbent_profile_id: ktForm.incumbent_profile_id || null,
      owner_profile_id: ktForm.owner_profile_id,
      knowledge_areas: ktForm.knowledge_areas,
      access_handoffs: ktForm.access_handoffs,
      stakeholder_handoffs: ktForm.stakeholder_handoffs,
      documentation_locations: ktForm.documentation_locations,
      start_date: ktForm.start_date,
      target_completion_date: ktForm.target_completion_date,
      status: ktPlan?.status || "draft",
    });
    if (result) loadData();
  };

  const handleSaveTp = async () => {
    const result = await invoke("successionSaveTransitionPlan", {
      operation_id: `save-tp-${Date.now()}`,
      transition_initiation_id: initiationId,
      plan_id: transitionPlan?.id || null,
      transition_type: tpForm.transition_type,
      start_date: tpForm.start_date,
      review_date: tpForm.review_date,
      target_completion_date: tpForm.target_completion_date,
      ramp_plan: tpForm.ramp_plan,
      success_outcomes: tpForm.success_outcomes,
      risks: tpForm.risks,
      milestone_summary: tpForm.milestone_summary,
      status: transitionPlan?.status || "draft",
    });
    if (result) loadData();
  };

  const addRisk = () => {
    if (!newRisk.risk || !newRisk.mitigation) return;
    setTpForm({ ...tpForm, risks: [...tpForm.risks, { ...newRisk }] });
    setNewRisk({ risk: "", severity: "medium", mitigation: "", owner_profile_id: "", status: "open" });
  };

  const addKtArea = () => {
    if (!newKtArea.title || !newKtArea.description) return;
    setKtForm({ ...ktForm, knowledge_areas: [...ktForm.knowledge_areas, { ...newKtArea }] });
    setNewKtArea({ title: "", description: "", transfer_method: "", owner_profile_id: "", target_date: "", status: "not_started", waiver_reason: "" });
  };

  if (dataLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  if (!initiation) {
    return <Card><CardContent className="py-8 text-center text-gray-500">Transition not found.</CardContent></Card>;
  }

  const canEdit = initiation.status === "approved" || initiation.status === "in_progress";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back to transitions">← Back</Button>
        <h2 className="text-lg font-semibold text-gray-900">Transition Detail</h2>
      </div>

      {/* Initiation summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Initiation Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="font-medium text-gray-600">Successor:</span> {initiation.successor_profile_id}</div>
            <div><span className="font-medium text-gray-600">Position:</span> {initiation.org_position_id}</div>
            <div><span className="font-medium text-gray-600">Critical Role:</span> {initiation.critical_role_id}</div>
            <div><span className="font-medium text-gray-600">Sponsor:</span> {initiation.sponsor_profile_id}</div>
            <div><span className="font-medium text-gray-600">Type:</span> {initiation.initiation_type}</div>
            <div><span className="font-medium text-gray-600">Basis:</span> {initiation.initiation_basis}</div>
            <div><span className="font-medium text-gray-600">Target Start:</span> {initiation.target_start_date}</div>
            <div><span className="font-medium text-gray-600">Status:</span> {initiation.status}</div>
          </div>
          {initiation.readiness_conclusion_id && (
            <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800"><strong>Approved Readiness Reference:</strong> {initiation.readiness_conclusion_id}</p>
              <p className="text-xs text-blue-600 mt-1">Candidacy: {initiation.candidacy_id}</p>
            </div>
          )}
          {initiation.external_authorization_reference && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800"><strong>Exception Authorization:</strong> {initiation.external_authorization_reference}</p>
              <p className="text-xs text-amber-700 mt-1">{initiation.exception_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Transfer Plan */}
      <Card>
        <CardHeader><CardTitle className="text-base">Knowledge Transfer Plan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!canEdit && <p className="text-sm text-gray-500">Plans can only be edited when initiation is approved or in progress.</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Incumbent Profile ID</Label>
              <Input value={ktForm.incumbent_profile_id} onChange={(e) => setKtForm({ ...ktForm, incumbent_profile_id: e.target.value })} disabled={!canEdit} />
            </div>
            <div>
              <Label className="text-xs">Owner Profile ID</Label>
              <Input value={ktForm.owner_profile_id} onChange={(e) => setKtForm({ ...ktForm, owner_profile_id: e.target.value })} disabled={!canEdit} />
            </div>
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={ktForm.start_date} onChange={(e) => setKtForm({ ...ktForm, start_date: e.target.value })} disabled={!canEdit} />
            </div>
            <div>
              <Label className="text-xs">Target Completion Date</Label>
              <Input type="date" value={ktForm.target_completion_date} onChange={(e) => setKtForm({ ...ktForm, target_completion_date: e.target.value })} disabled={!canEdit} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Access Handoffs</Label>
              <Textarea aria-label="Access Handoffs" value={ktForm.access_handoffs} onChange={(e) => setKtForm({ ...ktForm, access_handoffs: e.target.value })} disabled={!canEdit} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Stakeholder Handoffs</Label>
              <Textarea aria-label="Stakeholder Handoffs" value={ktForm.stakeholder_handoffs} onChange={(e) => setKtForm({ ...ktForm, stakeholder_handoffs: e.target.value })} disabled={!canEdit} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Documentation Locations</Label>
              <Textarea aria-label="Documentation Locations" value={ktForm.documentation_locations} onChange={(e) => setKtForm({ ...ktForm, documentation_locations: e.target.value })} disabled={!canEdit} />
            </div>
          </div>

          {/* Knowledge areas */}
          <div>
            <Label className="text-xs font-medium">Knowledge Areas</Label>
            {ktForm.knowledge_areas.length > 0 && (
              <div className="mt-2 space-y-2">
                {ktForm.knowledge_areas.map((area, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{area.title}</span>
                      <Badge variant="outline">{area.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{area.description}</p>
                    {area.status === "waived" && area.waiver_reason && (
                      <p className="text-xs text-amber-700 mt-1"><strong>Waiver:</strong> {area.waiver_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <div className="mt-2 p-3 rounded-lg border border-dashed border-gray-300 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Area title" value={newKtArea.title} onChange={(e) => setNewKtArea({ ...newKtArea, title: e.target.value })} />
                  <Input placeholder="Transfer method" value={newKtArea.transfer_method} onChange={(e) => setNewKtArea({ ...newKtArea, transfer_method: e.target.value })} />
                </div>
                <Textarea aria-label="Description" placeholder="Description" value={newKtArea.description} onChange={(e) => setNewKtArea({ ...newKtArea, description: e.target.value })} />
                <div className="grid grid-cols3 gap-2">
                  <Input placeholder="Owner Profile ID" value={newKtArea.owner_profile_id} onChange={(e) => setNewKtArea({ ...newKtArea, owner_profile_id: e.target.value })} />
                  <Input type="date" value={newKtArea.target_date} onChange={(e) => setNewKtArea({ ...newKtArea, target_date: e.target.value })} />
                  <select value={newKtArea.status} onChange={(e) => setNewKtArea({ ...newKtArea, status: e.target.value })} aria-label="New knowledge area status" className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white">
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="waived">Waived</option>
                  </select>
                </div>
                {newKtArea.status === "waived" && (
                  <Input placeholder="Waiver reason (required)" value={newKtArea.waiver_reason} onChange={(e) => setNewKtArea({ ...newKtArea, waiver_reason: e.target.value })} />
                )}
                <Button size="sm" variant="outline" onClick={addKtArea}><Plus className="w-3.5 h-3.5 mr-1" /> Add Area</Button>
              </div>
            )}
          </div>

          {canEdit && (
            <Button onClick={handleSaveKt} disabled={loading} className="bg-[#0202ff] hover:bg-[#0101dd]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save KT Plan
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Transition Plan */}
      <Card>
        <CardHeader><CardTitle className="text-base">Transition Plan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!canEdit && <p className="text-sm text-gray-500">Plans can only be edited when initiation is approved or in progress.</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Transition Type</Label>
              <select value={tpForm.transition_type} onChange={(e) => setTpForm({ ...tpForm, transition_type: e.target.value })} disabled={!canEdit} aria-label="Transition type" className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white">
                <option value="promotion">Promotion</option>
                <option value="lateral">Lateral</option>
                <option value="acting">Acting</option>
                <option value="interim">Interim</option>
                <option value="external_appointment">External Appointment</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><Label className="text-xs">Start Date</Label><Input type="date" value={tpForm.start_date} onChange={(e) => setTpForm({ ...tpForm, start_date: e.target.value })} disabled={!canEdit} /></div>
            <div><Label className="text-xs">Review Date</Label><Input type="date" value={tpForm.review_date} onChange={(e) => setTpForm({ ...tpForm, review_date: e.target.value })} disabled={!canEdit} /></div>
            <div><Label className="text-xs">Target Completion</Label><Input type="date" value={tpForm.target_completion_date} onChange={(e) => setTpForm({ ...tpForm, target_completion_date: e.target.value })} disabled={!canEdit} /></div>
            <div className="col-span-2"><Label className="text-xs">Ramp Plan</Label><Textarea aria-label="Ramp Plan" value={tpForm.ramp_plan} onChange={(e) => setTpForm({ ...tpForm, ramp_plan: e.target.value })} disabled={!canEdit} /></div>
            <div className="col-span-2"><Label className="text-xs">Success Outcomes</Label><Textarea aria-label="Success Outcomes" value={tpForm.success_outcomes} onChange={(e) => setTpForm({ ...tpForm, success_outcomes: e.target.value })} disabled={!canEdit} /></div>
            <div className="col-span-2"><Label className="text-xs">Milestone Summary</Label><Textarea aria-label="Milestone Summary" value={tpForm.milestone_summary} onChange={(e) => setTpForm({ ...tpForm, milestone_summary: e.target.value })} disabled={!canEdit} /></div>
          </div>

          {/* Risks */}
          <div>
            <Label className="text-xs font-medium">Risks & Mitigations</Label>
            {tpForm.risks.length > 0 && (
              <div className="mt-2 space-y-2">
                {tpForm.risks.map((r, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{r.risk}</span>
                      <div className="flex gap-1">
                        <Badge className={RISK_SEVERITY_COLORS[r.severity]}>{r.severity}</Badge>
                        <Badge className={RISK_STATUS_COLORS[r.status]}>{r.status}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{r.mitigation}</p>
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <div className="mt-2 p-3 rounded-lg border border-dashed border-gray-300 space-y-2">
                <Input placeholder="Risk description" value={newRisk.risk} onChange={(e) => setNewRisk({ ...newRisk, risk: e.target.value })} />
                <Textarea aria-label="Mitigation" placeholder="Mitigation" value={newRisk.mitigation} onChange={(e) => setNewRisk({ ...newRisk, mitigation: e.target.value })} />
                <div className="grid grid-cols-3 gap-2">
                  <select value={newRisk.severity} onChange={(e) => setNewRisk({ ...newRisk, severity: e.target.value })} aria-label="New risk severity" className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <Input placeholder="Owner Profile ID" value={newRisk.owner_profile_id} onChange={(e) => setNewRisk({ ...newRisk, owner_profile_id: e.target.value })} />
                  <select value={newRisk.status} onChange={(e) => setNewRisk({ ...newRisk, status: e.target.value })} aria-label="New risk status" className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white">
                    <option value="open">Open</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="resolved">Resolved</option>
                    <option value="accepted">Accepted</option>
                  </select>
                </div>
                <Button size="sm" variant="outline" onClick={addRisk}><Plus className="w-3.5 h-3.5 mr-1" /> Add Risk</Button>
              </div>
            )}
          </div>

          {canEdit && (
            <Button onClick={handleSaveTp} disabled={loading} className="bg-[#0202ff] hover:bg-[#0101dd]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save Transition Plan
            </Button>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}