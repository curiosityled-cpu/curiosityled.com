import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Eye, Clock, ShieldAlert } from "lucide-react";

const SEVERITY_COLORS = {
  informational: "bg-blue-100 text-blue-700",
  attention: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_COLORS = {
  open: "bg-red-100 text-red-700",
  acknowledged: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
};

const ALERT_TYPE_LABELS = {
  critical_role_uncovered: "Critical Role Uncovered",
  no_active_candidacy: "No Active Candidacy",
  current_readiness_missing: "Current Readiness Missing",
  readiness_review_due: "Readiness Review Due",
  readiness_expired: "Readiness Expired",
  development_review_due: "Development Review Due",
  development_action_overdue: "Development Action Overdue",
  transition_start_overdue: "Transition Start Overdue",
  knowledge_transfer_overdue: "Knowledge Transfer Overdue",
  unresolved_high_transition_risk: "Unresolved High Transition Risk",
  integrity_attention_required: "Integrity Attention Required",
  other: "Other",
};

export default function OperationalMonitorView() {
  const { invoke, loading, error } = useSuccessionApi();
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);
  const [filters, setFilters] = useState({ alert_type: "", severity: "", status: "", due_within_days: "" });
  const [actionAlert, setActionAlert] = useState(null);
  const [actionForm, setActionForm] = useState({ new_status: "", resolution_note: "", dismissal_reason: "", assigned_to_profile_id: "" });

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [dashRes, alertRes] = await Promise.all([
        base44.functions.invoke("successionGetOperationalDashboard", { operation_id: `load-dash-${Date.now()}` }),
        base44.functions.invoke("successionListMonitorAlerts", {
          operation_id: `load-alerts-${Date.now()}`,
          ...filters,
        }),
      ]);
      setDashboard(dashRes);
      setAlerts(alertRes?.alerts || []);
    } catch (e) {
      console.error("Failed to load monitor data:", e);
    } finally {
      setDataLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await invoke("successionRefreshMonitorAlerts", {
        operation_id: `refresh-${Date.now()}`,
      });
      if (result) {
        setRefreshResult(result);
        loadData();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleAction = async () => {
    if (!actionAlert || !actionForm.new_status) return;
    const result = await invoke("successionUpdateMonitorAlert", {
      operation_id: `update-alert-${Date.now()}`,
      alert_id: actionAlert.alert_id,
      new_status: actionForm.new_status,
      resolution_note: actionForm.resolution_note || null,
      dismissal_reason: actionForm.dismissal_reason || null,
      assigned_to_profile_id: actionForm.assigned_to_profile_id || null,
    });
    if (result) {
      setActionAlert(null);
      setActionForm({ new_status: "", resolution_note: "", dismissal_reason: "", assigned_to_profile_id: "" });
      loadData();
    }
  };

  const counts = dashboard?.counts || {};

  return (
    <div className="space-y-5">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <ShieldAlert className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <strong>Operational monitoring identifies workflow exceptions and review obligations.</strong>{" "}
          It does not score candidates, recommend successors, change readiness, or make employment decisions.
        </p>
      </div>

      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={handleRefresh} disabled={refreshing} className="bg-[#0202ff] hover:bg-[#0101dd]">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Refresh Alerts
          </Button>
          {refreshResult && (
            <div className="text-sm text-gray-600">
              <span className="text-green-600">+{refreshResult.created} created</span>, {" "}
              <span className="text-blue-600">{refreshResult.updated} updated</span>, {" "}
              <span className="text-amber-600">{refreshResult.reopened} reopened</span>, {" "}
              <span className="text-gray-600">{refreshResult.resolved} resolved</span>
            </div>
          )}
        </div>
      </div>

      {/* Count cards */}
      {dataLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3">
            <CountCard label="Active Critical Roles" value={counts.active_critical_roles || 0} icon={Eye} color="text-blue-600" />
            <CountCard label="No Active Candidacy" value={counts.critical_roles_no_candidacy || 0} icon={AlertTriangle} color="text-amber-600" />
            <CountCard label="Missing Readiness" value={counts.candidacies_without_current_readiness || 0} icon={AlertTriangle} color="text-amber-600" />
            <CountCard label="Open Alerts" value={counts.open_alerts || 0} icon={AlertTriangle} color="text-red-600" />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <CountCard label="Review Due ≤30d" value={counts.readiness_review_due_30_days || 0} icon={Clock} color="text-orange-600" />
            <CountCard label="Review Due ≤60d" value={counts.readiness_review_due_60_days || 0} icon={Clock} color="text-amber-600" />
            <CountCard label="Review Due ≤90d" value={counts.readiness_review_due_90_days || 0} icon={Clock} color="text-blue-600" />
            <CountCard label="Expired Readiness" value={counts.expired_readiness_conclusions || 0} icon={XCircle} color="text-red-600" />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <CountCard label="Overdue Dev Reviews" value={counts.overdue_dev_plan_reviews || 0} icon={Clock} color="text-amber-600" />
            <CountCard label="Overdue Dev Actions" value={counts.overdue_dev_actions || 0} icon={Clock} color="text-amber-600" />
            <CountCard label="Overdue Transitions" value={counts.overdue_transitions || 0} icon={Clock} color="text-orange-600" />
            <CountCard label="Overdue KT Plans" value={counts.overdue_kt_plans || 0} icon={Clock} color="text-amber-600" />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <CountCard label="Unresolved High Risks" value={counts.unresolved_high_transition_risks || 0} icon={AlertTriangle} color="text-red-600" />
            <CountCard label="Integrity Alerts" value={counts.open_integrity_alerts || 0} icon={ShieldAlert} color="text-red-600" />
            <CountCard label="Scheduled Reviews" value={counts.scheduled_reviews || 0} icon={CheckCircle2} color="text-blue-600" />
            <CountCard label="Overdue Reviews" value={counts.overdue_reviews || 0} icon={Clock} color="text-red-600" />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-sm text-gray-600">Filter:</Label>
            <select value={filters.alert_type} onChange={(e) => setFilters({ ...filters, alert_type: e.target.value })} className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white">
              <option value="">All Types</option>
              {Object.entries(ALERT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })} className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white">
              <option value="">All Severities</option>
              <option value="informational">Informational</option>
              <option value="attention">Attention</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white">
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <select value={filters.due_within_days} onChange={(e) => setFilters({ ...filters, due_within_days: e.target.value })} className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white">
              <option value="">Any Due Date</option>
              <option value="7">Due ≤7 days</option>
              <option value="30">Due ≤30 days</option>
              <option value="60">Due ≤60 days</option>
              <option value="90">Due ≤90 days</option>
            </select>
          </div>

          {/* Alerts list */}
          {alerts.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-500">No alerts match the current filters.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <Card key={a.alert_id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={SEVERITY_COLORS[a.severity]}>{a.severity}</Badge>
                          <Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge>
                          <Badge variant="outline">{ALERT_TYPE_LABELS[a.alert_type] || a.alert_type}</Badge>
                          {a.due_date && (
                            <span className="text-xs text-gray-500">Due: {a.due_date}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{a.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{a.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Detected: {a.detected_at?.split("T")[0]} · Last seen: {a.last_detected_at?.split("T")[0]}
                        </p>
                      </div>
                      {(a.status === "open" || a.status === "acknowledged") && (
                        <div className="flex gap-1 ml-4">
                          <Button size="sm" variant="outline" onClick={() => {
                            setActionAlert(a);
                            setActionForm({ ...actionForm, new_status: "acknowledged" });
                          }}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Acknowledge
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setActionAlert(a);
                            setActionForm({ ...actionForm, new_status: "resolved" });
                          }}>
                            Resolve
                          </Button>
                          {a.severity !== "critical" && (
                            <Button size="sm" variant="outline" onClick={() => {
                              setActionAlert(a);
                              setActionForm({ ...actionForm, new_status: "dismissed" });
                            }}>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Dismiss
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Action dialog */}
      {actionAlert && (
        <Card className="border-2 border-blue-300">
          <CardHeader><CardTitle className="text-base">Update Alert: {actionAlert.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Action</Label>
              <select value={actionForm.new_status} onChange={(e) => setActionForm({ ...actionForm, new_status: e.target.value })} className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white">
                <option value="acknowledged">Acknowledge</option>
                <option value="resolved">Resolve</option>
                {actionAlert.severity !== "critical" && <option value="dismissed">Dismiss</option>}
              </select>
            </div>
            {actionForm.new_status === "resolved" && (
              <div>
                <Label className="text-xs">Resolution Note (required)</Label>
                <Textarea value={actionForm.resolution_note} onChange={(e) => setActionForm({ ...actionForm, resolution_note: e.target.value })} />
              </div>
            )}
            {actionForm.new_status === "dismissed" && (
              <div>
                <Label className="text-xs">Dismissal Reason (required)</Label>
                <Textarea value={actionForm.dismissal_reason} onChange={(e) => setActionForm({ ...actionForm, dismissal_reason: e.target.value })} />
              </div>
            )}
            <div>
              <Label className="text-xs">Assign To (Profile ID, optional)</Label>
              <Input value={actionForm.assigned_to_profile_id} onChange={(e) => setActionForm({ ...actionForm, assigned_to_profile_id: e.target.value })} placeholder="Profile ID" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAction} disabled={loading} className="bg-[#0202ff] hover:bg-[#0101dd]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
              </Button>
              <Button variant="outline" onClick={() => setActionAlert(null)}>Cancel</Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CountCard({ label, value, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}