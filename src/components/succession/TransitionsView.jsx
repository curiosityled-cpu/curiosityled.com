import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, ArrowRightCircle, CheckCircle2, XCircle, Play, AlertTriangle, Info } from "lucide-react";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  requested: "bg-blue-100 text-blue-700",
  approved: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const BASIS_LABELS = {
  succession_process: "Succession Process",
  external_authorization: "External Authorization",
  emergency_coverage: "Emergency Coverage",
  other: "Other",
};

const TYPE_LABELS = {
  promotion: "Promotion",
  lateral: "Lateral",
  acting: "Acting",
  interim: "Interim",
  external_appointment: "External Appointment",
  other: "Other",
};

export default function TransitionsView() {
  const { invoke, loading, error } = useSuccessionApi();
  const [transitions, setTransitions] = useState([]);
  const [candidacies, setCandidacies] = useState([]);
  const [criticalRoles, setCriticalRoles] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [formData, setFormData] = useState({
    cycle_id: "",
    critical_role_id: "",
    org_position_id: "",
    successor_profile_id: "",
    candidacy_id: "",
    readiness_conclusion_id: "",
    initiation_type: "promotion",
    initiation_basis: "succession_process",
    external_authorization_reference: "",
    exception_reason: "",
    target_start_date: "",
    sponsor_profile_id: "",
  });

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [transRes, candRes, rolesRes] = await Promise.all([
        base44.functions.invoke("successionListTransitions", {
          operation_id: `load-trans-${Date.now()}`,
        }),
        base44.functions.invoke("successionListCandidacies", {
          operation_id: `load-cand-${Date.now()}`,
        }),
        base44.functions.invoke("successionListCriticalRoles", {
          operation_id: `load-roles-${Date.now()}`,
        }),
      ]);
      setTransitions(transRes?.data?.transitions || []);
      setCandidacies(candRes?.data?.candidacies || []);
      setCriticalRoles(rolesRes?.data?.critical_roles || []);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    const result = await invoke("successionCreateTransitionInitiation", {
      operation_id: `create-trans-${Date.now()}`,
      cycle_id: formData.cycle_id,
      critical_role_id: formData.critical_role_id,
      org_position_id: formData.org_position_id,
      successor_profile_id: formData.successor_profile_id,
      candidacy_id: formData.candidacy_id || null,
      readiness_conclusion_id: formData.readiness_conclusion_id || null,
      initiation_type: formData.initiation_type,
      initiation_basis: formData.initiation_basis,
      external_authorization_reference: formData.external_authorization_reference || null,
      exception_reason: formData.exception_reason || null,
      target_start_date: formData.target_start_date,
      sponsor_profile_id: formData.sponsor_profile_id,
    });
    if (result) {
      setShowForm(false);
      setFormData({
        cycle_id: "", critical_role_id: "", org_position_id: "", successor_profile_id: "",
        candidacy_id: "", readiness_conclusion_id: "", initiation_type: "promotion",
        initiation_basis: "succession_process", external_authorization_reference: "",
        exception_reason: "", target_start_date: "", sponsor_profile_id: "",
      });
      loadData();
    }
  };

  const handleStatusChange = async (initiationId, newStatus, reason = null) => {
    const result = await invoke("successionChangeTransitionStatus", {
      operation_id: `change-status-${Date.now()}`,
      initiation_id: initiationId,
      new_status: newStatus,
      cancellation_reason: reason,
    });
    if (result) loadData();
  };

  const handleApprove = async (initiationId) => {
    const result = await invoke("successionUpdateTransitionInitiation", {
      operation_id: `approve-${Date.now()}`,
      initiation_id: initiationId,
      new_status: "approved",
    });
    if (result) loadData();
  };

  const handleComplete = async (initiationId) => {
    const summary = prompt("Enter completion summary (optional):");
    if (summary === null) return;
    const result = await invoke("successionCompleteTransition", {
      operation_id: `complete-${Date.now()}`,
      initiation_id: initiationId,
      completion_summary: summary || null,
    });
    if (result) loadData();
  };

  const handleCancel = async (initiationId) => {
    const reason = prompt("Enter cancellation reason:");
    if (!reason) return;
    const result = await invoke("successionChangeTransitionStatus", {
      operation_id: `cancel-${Date.now()}`,
      initiation_id: initiationId,
      new_status: "cancelled",
      cancellation_reason: reason,
    });
    if (result) loadData();
  };

  const filteredTransitions = statusFilter
    ? transitions.filter((t) => t.status === statusFilter)
    : transitions;

  return (
    <div className="space-y-5">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <strong>Transition approval records a succession workflow decision.</strong> It does not
          itself change employment status, compensation, position assignment or create an
          employment guarantee.
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-600">Filter:</Label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#0202ff] hover:bg-[#0101dd]">
          <Plus className="w-4 h-4 mr-1" />
          New Transition
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Transition Initiation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Cycle ID</Label>
                <Input value={formData.cycle_id} onChange={(e) => setFormData({ ...formData, cycle_id: e.target.value })} placeholder="Cycle ID" />
              </div>
              <div>
                <Label className="text-xs">Critical Role ID</Label>
                <Input value={formData.critical_role_id} onChange={(e) => setFormData({ ...formData, critical_role_id: e.target.value })} placeholder="Critical Role ID" />
              </div>
              <div>
                <Label className="text-xs">Org Position ID</Label>
                <Input value={formData.org_position_id} onChange={(e) => setFormData({ ...formData, org_position_id: e.target.value })} placeholder="Position ID" />
              </div>
              <div>
                <Label className="text-xs">Successor Profile ID</Label>
                <Input value={formData.successor_profile_id} onChange={(e) => setFormData({ ...formData, successor_profile_id: e.target.value })} placeholder="Successor Profile ID" />
              </div>
              <div>
                <Label className="text-xs">Initiation Type</Label>
                <select
                  value={formData.initiation_type}
                  onChange={(e) => setFormData({ ...formData, initiation_type: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Initiation Basis</Label>
                <select
                  value={formData.initiation_basis}
                  onChange={(e) => setFormData({ ...formData, initiation_basis: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
                >
                  {Object.entries(BASIS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {formData.initiation_basis === "succession_process" && (
                <>
                  <div>
                    <Label className="text-xs">Candidacy ID</Label>
                    <Input value={formData.candidacy_id} onChange={(e) => setFormData({ ...formData, candidacy_id: e.target.value })} placeholder="Candidacy ID" />
                  </div>
                  <div>
                    <Label className="text-xs">Readiness Conclusion ID</Label>
                    <Input value={formData.readiness_conclusion_id} onChange={(e) => setFormData({ ...formData, readiness_conclusion_id: e.target.value })} placeholder="Conclusion ID" />
                  </div>
                </>
              )}
              {formData.initiation_basis !== "succession_process" && (
                <>
                  <div className="col-span-2">
                    <Label className="text-xs">External Authorization Reference</Label>
                    <Input value={formData.external_authorization_reference} onChange={(e) => setFormData({ ...formData, external_authorization_reference: e.target.value })} placeholder="Authorization reference" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Exception Reason</Label>
                    <Textarea value={formData.exception_reason} onChange={(e) => setFormData({ ...formData, exception_reason: e.target.value })} placeholder="Reason for exception" />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs">Target Start Date</Label>
                <Input type="date" value={formData.target_start_date} onChange={(e) => setFormData({ ...formData, target_start_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Sponsor Profile ID</Label>
                <Input value={formData.sponsor_profile_id} onChange={(e) => setFormData({ ...formData, sponsor_profile_id: e.target.value })} placeholder="Sponsor Profile ID" />
              </div>
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

      {/* Transitions list */}
      {dataLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredTransitions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No transitions found. Click "New Transition" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTransitions.map((t) => (
            <Card key={t.initiation_id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={STATUS_COLORS[t.status]}>{t.status.replace("_", " ")}</Badge>
                      <Badge variant="outline">{TYPE_LABELS[t.initiation_type]}</Badge>
                      <Badge variant="outline">{BASIS_LABELS[t.initiation_basis]}</Badge>
                      {t.unresolved_high_risks > 0 && (
                        <Badge className="bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {t.unresolved_high_risks} high risk{t.unresolved_high_risks > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div><span className="font-medium">Successor:</span> {t.successor_profile_id}</div>
                      <div><span className="font-medium">Position:</span> {t.org_position_id}</div>
                      <div><span className="font-medium">Critical Role:</span> {t.critical_role_id}</div>
                      <div><span className="font-medium">Sponsor:</span> {t.sponsor_profile_id}</div>
                      <div><span className="font-medium">Target Start:</span> {t.target_start_date}</div>
                      <div><span className="font-medium">Initiated:</span> {t.initiated_at?.split("T")[0]}</div>
                    </div>
                    {t.initiation_basis !== "succession_process" && t.exception_reason && (
                      <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200">
                        <p className="text-xs text-amber-800"><strong>Exception:</strong> {t.exception_reason}</p>
                        <p className="text-xs text-amber-700 mt-0.5"><strong>Auth Ref:</strong> {t.external_authorization_reference}</p>
                      </div>
                    )}
                    {/* Progress indicators */}
                    <div className="mt-3 flex gap-4">
                      {t.kt_plan_id && (
                        <div className="text-xs text-gray-500">
                          KT: {t.kt_progress.completed}/{t.kt_progress.total} areas ({t.kt_plan_status})
                        </div>
                      )}
                      {t.transition_plan_id && (
                        <div className="text-xs text-gray-500">
                          Plan: {t.transition_plan_status}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 ml-4">
                    {t.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(t.initiation_id, "requested")}>
                        <ArrowRightCircle className="w-3.5 h-3.5 mr-1" /> Request
                      </Button>
                    )}
                    {t.status === "requested" && (
                      <Button size="sm" className="bg-[#0202ff] hover:bg-[#0101dd]" onClick={() => handleApprove(t.initiation_id)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                    )}
                    {t.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(t.initiation_id, "in_progress")}>
                        <Play className="w-3.5 h-3.5 mr-1" /> Start
                      </Button>
                    )}
                    {t.status === "in_progress" && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleComplete(t.initiation_id)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                      </Button>
                    )}
                    {["draft", "requested", "approved", "in_progress"].includes(t.status) && (
                      <Button size="sm" variant="outline" onClick={() => handleCancel(t.initiation_id)}>
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                    )}
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