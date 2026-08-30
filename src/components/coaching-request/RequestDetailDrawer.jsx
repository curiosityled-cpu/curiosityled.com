import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CATEGORY_CONFIG, STATUS_CONFIG, SCOPE_CONFIG, URGENCY_CONFIG, formatTimeAgo } from "./shared";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, CalendarClock, Forward, Ban } from "lucide-react";
import { toast } from "sonner";

export default function RequestDetailDrawer({ request, open, onClose, userRole, onAction }) {
  const [busy, setBusy] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [intakeDate, setIntakeDate] = useState("");
  const [assignEmail, setAssignEmail] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  if (!request) return null;

  const cat = CATEGORY_CONFIG[request.request_category] || {};
  const status = STATUS_CONFIG[request.status] || {};
  const scope = SCOPE_CONFIG[request.participant_scope] || {};
  const urgency = URGENCY_CONFIG[request.urgency] || {};
  const CatIcon = cat.icon;
  const StatusIcon = status.icon;

  const invoke = async (action, extra = {}) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("manageCoachingRequest", {
        action,
        request_id: request.id,
        ...extra,
      });
      toast.success("Action completed.");
      if (onAction) onAction();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const isPractitioner = userRole === "Leadership Coach" || userRole === "Consultant";
  const isProgramAdmin = userRole === "Admin Level 1" || userRole === "Admin Level 2" || userRole === "Super Administrator" || userRole === "Platform Admin";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-1">
            {CatIcon && <CatIcon className="w-5 h-5 text-muted-foreground" />}
            <SheetTitle className="text-lg">{request.title}</SheetTitle>
          </div>
          <SheetDescription className="sr-only">Request details</SheetDescription>
        </SheetHeader>

        <div className="px-1 py-4 space-y-4">
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={status.badge}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">{cat.label}</Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">{scope.label}</Badge>
            {request.urgency && request.urgency !== "standard" && (
              <Badge variant="outline" className={`text-xs ${urgency.badge}`}>{urgency.label}</Badge>
            )}
          </div>

          {/* Meta */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requestor</span>
              <span className="font-medium text-foreground">{request.requested_by_name || request.requested_by_email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Participant</span>
              <span className="font-medium text-foreground">{request.participant_name || request.participant_identifier || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span className="font-medium text-foreground">{formatTimeAgo(request.created_date)}</span>
            </div>
            {request.requested_start_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested start</span>
                <span className="font-medium text-foreground">{request.requested_start_date}</span>
              </div>
            )}
            {request.assigned_practitioner_email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned to</span>
                <span className="font-medium text-[#0202ff]">{request.assigned_practitioner_role || ""}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {request.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          {/* Intake info */}
          {request.intake_conversation_required && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Intake Conversation</p>
              {request.intake_bypassed ? (
                <p className="text-sm text-amber-600">Bypassed by Program Admin</p>
              ) : request.intake_scheduled_date ? (
                <p className="text-sm text-foreground">Scheduled: {new Date(request.intake_scheduled_date).toLocaleString()}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Required — not yet scheduled</p>
              )}
              {request.intake_notes && <p className="text-sm text-foreground mt-2">{request.intake_notes}</p>}
            </div>
          )}

          {/* Decline reason */}
          {request.decline_reason && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs font-medium text-red-700 uppercase tracking-wide mb-1">Decline Reason</p>
              <p className="text-sm text-red-800">{request.decline_reason}</p>
            </div>
          )}

          {/* Practitioner actions */}
          {isPractitioner && request.status === "assigned" && request.assigned_practitioner_email && (
            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-sm font-medium">Decline reason (if declining)</Label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={2}
                placeholder="Why you can't take this request..."
              />
              <div className="flex gap-2">
                <Button onClick={() => invoke("accept")} disabled={busy} className="flex-1" style={{ backgroundColor: "#0202ff" }}>
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Accept & Create Engagement
                </Button>
                <Button onClick={() => invoke("decline", { decline_reason: declineReason })} disabled={busy} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  <X className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </div>
            </div>
          )}

          {/* Program Admin actions */}
          {isProgramAdmin && (
            <div className="space-y-4 pt-2 border-t border-border">
              {/* Intake stage */}
              {request.status === "submitted" && request.intake_conversation_required && !request.intake_bypassed && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Schedule intake conversation</Label>
                  <Input type="datetime-local" value={intakeDate} onChange={(e) => setIntakeDate(e.target.value)} />
                  <div className="flex gap-2">
                    <Button onClick={() => invoke("scheduleIntake", { intake_scheduled_date: intakeDate })} disabled={busy} size="sm" variant="outline">
                      <CalendarClock className="w-4 h-4 mr-2" /> Schedule
                    </Button>
                    <Button onClick={() => invoke("bypassIntake")} disabled={busy} size="sm" variant="ghost">
                      <Forward className="w-4 h-4 mr-2" /> Bypass Intake
                    </Button>
                  </div>
                </div>
              )}

              {request.status === "intake_scheduled" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Intake notes</Label>
                  <Textarea value={intakeNotes} onChange={(e) => setIntakeNotes(e.target.value)} rows={3} placeholder="Notes from the intake conversation..." />
                  <Button onClick={() => invoke("completeIntake", { intake_notes: intakeNotes })} disabled={busy} size="sm" style={{ backgroundColor: "#0202ff" }} className="text-white">
                    <Check className="w-4 h-4 mr-2" /> Mark Intake Complete
                  </Button>
                </div>
              )}

              {/* Approval stage */}
              {(request.status === "intake_complete" || (request.status === "submitted" && (!request.intake_conversation_required || request.intake_bypassed))) && (
                <div className="flex gap-2">
                  <Button onClick={() => invoke("approve")} disabled={busy} size="sm" style={{ backgroundColor: "#0202ff" }} className="text-white">
                    <Check className="w-4 h-4 mr-2" /> Approve
                  </Button>
                  <Button onClick={() => invoke("reject", { rejection_reason: rejectReason })} disabled={busy} size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                    <Ban className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              )}

              {/* Assignment stage */}
              {request.status === "approved" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Assign to {cat.role}</Label>
                  <Input value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} placeholder={`${cat.role} email address`} />
                  <Button onClick={() => invoke("assign", { assigned_practitioner_email: assignEmail })} disabled={busy || !assignEmail} size="sm" style={{ backgroundColor: "#0202ff" }} className="text-white">
                    <Forward className="w-4 h-4 mr-2" /> Assign Request
                  </Button>
                </div>
              )}

              {/* Reassignment on decline */}
              {request.status === "assigned" && request.decline_reason && (
                <div className="space-y-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">This request was declined. Reassign below.</p>
                  <Input value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} placeholder={`New ${cat.role} email`} />
                  <Button onClick={() => invoke("assign", { assigned_practitioner_email: assignEmail })} disabled={busy || !assignEmail} size="sm" style={{ backgroundColor: "#0202ff" }} className="text-white">
                    <Forward className="w-4 h-4 mr-2" /> Reassign
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}