import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CategoryBadge,
  StatusBadge,
  PriorityBadge,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "@/components/coaching-request/RequestBadges";
import {
  ClipboardList,
  Calendar,
  CheckCircle,
  XCircle,
  UserPlus,
  Settings,
  Loader2,
  ArrowRight,
} from "lucide-react";

const COLUMNS = [
  { status: "submitted", label: "Submitted" },
  { status: "intake_scheduled", label: "Intake" },
  { status: "approved", label: "Approved" },
  { status: "assigned", label: "Assigned" },
  { status: "engagement_created", label: "Active" },
  { status: "completed", label: "Completed" },
];

export default function RequestTriage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dialogMode, setDialogMode] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [intakeToggle, setIntakeToggle] = useState(true);
  const [bypassToggle, setBypassToggle] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const userRole = user?.app_role || user?.data?.app_role || user?.role;
  const clientId = user?.client_id;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqs, users, clients] = await Promise.all([
        base44.entities.CoachingRequest.filter({ client_id: clientId }, "-created_date", 200),
        base44.entities.User.list("-created_date', 100"),
        base44.entities.Client.filter({ id: clientId }),
      ]);
      setRequests(reqs);
      setPractitioners(users.filter(u => {
        const r = u.app_role || u.data?.app_role || u.role;
        return r === "Leadership Coach" || r === "Consultant";
      }));
      if (clients.length > 0) {
        setClient(clients[0]);
        setIntakeToggle(clients[0].settings?.require_intake_conversation ?? true);
        setBypassToggle(clients[0].settings?.intake_bypass_allowed ?? true);
      }
    } catch (e) {
      console.error("Failed to load triage data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [clientId]);

  const requestsByStatus = useMemo(() => {
    const map = {};
    COLUMNS.forEach(c => { map[c.status] = []; });
    // Also include intake_complete and in_progress in their logical columns
    requests.forEach(r => {
      if (r.status === "intake_complete") {
        map["approved"]?.push(r);
      } else if (r.status === "in_progress") {
        map["engagement_created"]?.push(r);
      } else if (r.status === "accepted" || r.status === "declined") {
        map["assigned"]?.push(r);
      } else if (map[r.status]) {
        map[r.status].push(r);
      }
    });
    return map;
  }, [requests]);

  const invoke = async (action, requestId, payload) => {
    setActionLoading(requestId);
    try {
      await base44.functions.invoke("manageCoachingRequest", { action, request_id: requestId, payload });
      await fetchData();
      setSelectedRequest(null);
      setDialogMode(null);
    } catch (e) {
      console.error("Action failed:", e);
      alert(e?.response?.data?.error || e.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await base44.entities.Client.update(client.id, {
        settings: {
          ...(client.settings || {}),
          require_intake_conversation: intakeToggle,
          intake_bypass_allowed: bypassToggle,
        },
      });
      setClient({ ...client, settings: { ...(client.settings || {}), require_intake_conversation: intakeToggle, intake_bypass_allowed: bypassToggle } });
      setSettingsOpen(false);
    } catch (e) {
      alert("Failed to save settings: " + e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const openDialog = (request, mode) => {
    setSelectedRequest(request);
    setDialogMode(mode);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Request Triage</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Review, approve, and assign coaching & consulting requests for {client?.name || "your organization"}.
          </p>
        </div>
        <Button variant="outline" onClick={() => setSettingsOpen(true)}>
          <Settings className="w-4 h-4 mr-2" /> Intake Settings
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-6 gap-3 overflow-x-auto">
        {COLUMNS.map(col => (
          <div key={col.status} className="flex flex-col gap-2 min-w-[200px]">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{col.label}</span>
              <span className="text-xs text-muted-foreground font-medium">{requestsByStatus[col.status]?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(requestsByStatus[col.status] || []).map(req => (
                <RequestTriageCard
                  key={req.id}
                  request={req}
                  onAction={openDialog}
                  actionLoading={actionLoading === req.id}
                />
              ))}
              {(requestsByStatus[col.status]?.length || 0) === 0 && (
                <div className="text-xs text-muted-foreground/50 text-center py-6 border border-dashed rounded-lg">
                  No requests
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => { if (!open) { setSelectedRequest(null); setDialogMode(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRequest && <CategoryBadge category={selectedRequest.request_category} />}
              {selectedRequest?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <ActionPanel
              request={selectedRequest}
              mode={dialogMode}
              practitioners={practitioners}
              actionLoading={actionLoading === selectedRequest.id}
              onAction={(action, payload) => invoke(action, selectedRequest.id, payload)}
              onSetMode={setDialogMode}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Intake Conversation Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Require Intake Conversation</Label>
                <p className="text-xs text-muted-foreground mt-0.5">When on, every request needs an intake conversation before approval.</p>
              </div>
              <Switch checked={intakeToggle} onCheckedChange={setIntakeToggle} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Allow Per-Request Bypass</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Let Program Admins skip intake on individual requests.</p>
              </div>
              <Switch checked={bypassToggle} onCheckedChange={setBypassToggle} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestTriageCard({ request, onAction, actionLoading }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onAction(request, "view")}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <CategoryBadge category={request.request_category} />
          {request.priority && request.priority !== "medium" && <PriorityBadge priority={request.priority} />}
        </div>
        <p className="text-sm font-medium leading-snug line-clamp-2">{request.title}</p>
        <p className="text-xs text-muted-foreground">From: {request.requested_by_email}</p>
        {request.assigned_practitioner_email && (
          <p className="text-xs text-muted-foreground">→ {request.assigned_practitioner_email}</p>
        )}
        {request.status === "declined" && (
          <p className="text-xs text-red-600">Declined: {request.decline_reason || "No reason given"}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ActionPanel({ request, mode, practitioners, actionLoading, onAction, onSetMode }) {
  const [intakeNotes, setIntakeNotes] = useState("");
  const [sessionsPlanned, setSessionsPlanned] = useState("");
  const [priority, setPriority] = useState(request.priority || "medium");
  const [declineReason, setDeclineReason] = useState("");
  const [selectedPractitioner, setSelectedPractitioner] = useState("");

  const isCoaching = ["1on1_coaching", "group_coaching", "team_coaching"].includes(request.request_category);
  const eligiblePractitioners = practitioners.filter(p => {
    const r = p.app_role || p.data?.app_role || p.role;
    return isCoaching ? r === "Leadership Coach" : r === "Consultant";
  });

  return (
    <div className="space-y-4">
      {/* Request summary */}
      <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <StatusBadge status={request.status} />
          <PriorityBadge priority={request.priority} />
        </div>
        <p className="text-sm text-muted-foreground">{request.description}</p>
        <p className="text-xs text-muted-foreground">Requested by: {request.requested_by_email}</p>
        {request.business_justification && (
          <p className="text-xs text-muted-foreground">Justification: {request.business_justification}</p>
        )}
        {request.intake_notes && (
          <p className="text-xs text-muted-foreground pt-1 border-t">Intake notes: {request.intake_notes}</p>
        )}
      </div>

      {/* Action buttons based on status */}
      {request.status === "submitted" && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onAction("schedule_intake", {})} disabled={actionLoading}>
            <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule Intake
          </Button>
          {request.intake_bypassed !== false && (
            <Button size="sm" variant="outline" onClick={() => onAction("bypass_intake", {})} disabled={actionLoading}>
              <ArrowRight className="w-3.5 h-3.5 mr-1.5" /> Bypass Intake
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={() => onAction("reject", {})} disabled={actionLoading}>
            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
          </Button>
        </div>
      )}

      {request.status === "intake_scheduled" && (
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-sm">Intake Notes</Label>
            <Textarea value={intakeNotes} onChange={e => setIntakeNotes(e.target.value)} rows={3} placeholder="Notes from the intake conversation..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Sessions Planned</Label>
              <Input type="number" value={sessionsPlanned} onChange={e => setSessionsPlanned(e.target.value)} placeholder="e.g. 6" />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAction("complete_intake", { intake_notes: intakeNotes, sessions_planned: sessionsPlanned ? Number(sessionsPlanned) : undefined, priority })} disabled={actionLoading}>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Complete Intake
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onAction("reject", {})} disabled={actionLoading}>
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
            </Button>
          </div>
        </div>
      )}

      {(request.status === "intake_complete" || request.status === "approved") && (
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-sm">Assign to {isCoaching ? "Coach" : "Consultant"}</Label>
            <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
              <SelectTrigger><SelectValue placeholder={`Select a ${isCoaching ? "Leadership Coach" : "Consultant"}...`} /></SelectTrigger>
              <SelectContent>
                {eligiblePractitioners.map(p => (
                  <SelectItem key={p.id} value={p.email}>{p.full_name || p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {request.status === "intake_complete" && (
            <Button size="sm" variant="outline" onClick={() => onAction("approve", {})} disabled={actionLoading}>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve Only
            </Button>
          )}
          <Button size="sm" onClick={() => onAction("assign", { assigned_practitioner_email: selectedPractitioner })} disabled={actionLoading || !selectedPractitioner}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Assign
          </Button>
        </div>
      )}

      {(request.status === "assigned" || request.status === "declined") && (
        <div className="space-y-3">
          {request.status === "declined" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              Previously declined: {request.decline_reason || "No reason given"}. Reassign below.
            </div>
          )}
          <div>
            <Label className="mb-1.5 block text-sm">Reassign to {isCoaching ? "Coach" : "Consultant"}</Label>
            <Select value={selectedPractitioner} onValueChange={setSelectedPractitioner}>
              <SelectTrigger><SelectValue placeholder={`Select a ${isCoaching ? "Leadership Coach" : "Consultant"}...`} /></SelectTrigger>
              <SelectContent>
                {eligiblePractitioners.map(p => (
                  <SelectItem key={p.id} value={p.email}>{p.full_name || p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => onAction("assign", { assigned_practitioner_email: selectedPractitioner })} disabled={actionLoading || !selectedPractitioner}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Reassign
          </Button>
        </div>
      )}

      {(request.status === "engagement_created" || request.status === "in_progress") && (
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-sm">Result Summary</Label>
            <Textarea rows={2} placeholder="Optional outcome summary..." onChange={() => {}} />
          </div>
          <div className="flex gap-2">
            {request.status === "engagement_created" && (
              <Button size="sm" variant="outline" onClick={() => onAction("start", {})} disabled={actionLoading}>
                Mark In Progress
              </Button>
            )}
            <Button size="sm" onClick={() => onAction("complete", {})} disabled={actionLoading}>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark Complete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}