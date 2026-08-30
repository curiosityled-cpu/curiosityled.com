import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  CategoryBadge,
  PriorityBadge,
} from "@/components/coaching-request/RequestBadges";
import {
  Briefcase,
  Check,
  X,
  Loader2,
  Users,
  Calendar,
  TrendingUp,
  Building2,
} from "lucide-react";

const CONSULTING_CATEGORIES = ["workshop", "consultation", "assessment"];

export default function ConsultantWorkspace() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [declineDialog, setDeclineDialog] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [activeTab, setActiveTab] = useState("assignments");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqs, engs] = await Promise.all([
        base44.entities.CoachingRequest.filter({ assigned_practitioner_email: user.email }, "-created_date", 100),
        base44.entities.CoachingEngagement.filter({ coach_email: user.email }, "-created_date", 100),
      ]);
      setAssignments(reqs.filter(r => CONSULTING_CATEGORIES.includes(r.request_category)));
      setEngagements(engs);
    } catch (e) {
      console.error("Failed to load consultant workspace:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.email]);

  const pendingAssignments = assignments.filter(r => r.status === "assigned" || r.status === "declined");

  const stats = useMemo(() => {
    const active = engagements.filter(e => e.status === "active" || e.status === "pending").length;
    const completed = engagements.filter(e => e.status === "completed").length;
    const totalParticipants = engagements.reduce((sum, e) => sum + (e.team_member_emails?.length || (e.coachee_email ? 1 : 0)), 0);
    return { active, completed, totalParticipants };
  }, [engagements]);

  const handleAccept = async (requestId) => {
    setActionLoading(requestId);
    try {
      await base44.functions.invoke("manageCoachingRequest", { action: "accept", request_id: requestId });
      await fetchData();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to accept");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!declineDialog) return;
    setActionLoading(declineDialog.id);
    try {
      await base44.functions.invoke("manageCoachingRequest", {
        action: "decline",
        request_id: declineDialog.id,
        payload: { decline_reason: declineReason },
      });
      setDeclineDialog(null);
      setDeclineReason("");
      await fetchData();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to decline");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Consulting Workspace</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Your assigned workshops, consultations, and assessments — tracked at the cohort, team, and department level.
        </p>
      </div>

      {/* Stats — cohort/team/department level, no individual breakdown */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard icon={Briefcase} label="Pending Assignments" value={pendingAssignments.length} color="text-orange-600" />
        <StatCard icon={Building2} label="Active Engagements" value={stats.active} color="text-emerald-600" />
        <StatCard icon={Check} label="Completed" value={stats.completed} color="text-teal-600" />
        <StatCard icon={Users} label="Participants Reached" value={stats.totalParticipants} color="text-violet-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        <TabButton active={activeTab === "assignments"} onClick={() => setActiveTab("assignments")}>
          Pending Assignments ({pendingAssignments.length})
        </TabButton>
        <TabButton active={activeTab === "active"} onClick={() => setActiveTab("active")}>
          Active Engagements ({engagements.filter(e => e.status !== "completed").length})
        </TabButton>
      </div>

      {/* Pending Assignments */}
      {activeTab === "assignments" && (
        <div className="space-y-3">
          {pendingAssignments.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No pending assignments"
              message="When a Program Admin assigns you a workshop, consultation, or assessment request, it will appear here."
            />
          ) : (
            pendingAssignments.map(req => (
              <Card key={req.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CategoryBadge category={req.request_category} />
                        <PriorityBadge priority={req.priority} />
                      </div>
                      <h3 className="font-semibold">{req.title}</h3>
                      <p className="text-sm text-muted-foreground">{req.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {req.participant_scope === "individual" ? <Users className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                          {req.participant_scope === "individual" ? req.participant_email : `${req.participant_emails?.length || 0} participants`}
                        </span>
                        <span>From: {req.requested_by_email}</span>
                        {req.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {req.due_date}</span>}
                      </div>
                      {req.intake_notes && (
                        <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
                          <span className="font-medium">Intake notes:</span> {req.intake_notes}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => handleAccept(req.id)} disabled={actionLoading === req.id}>
                        {actionLoading === req.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setDeclineDialog(req); setDeclineReason(""); }} disabled={actionLoading === req.id}>
                        <X className="w-3.5 h-3.5 mr-1.5" /> Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Active Engagements */}
      {activeTab === "active" && (
        <div className="space-y-3">
          {engagements.filter(e => e.status !== "completed").length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No active engagements"
              message="Accepted assignments will create engagements that appear here. Track delivery at the cohort, team, or department level."
            />
          ) : (
            engagements.filter(e => e.status !== "completed").map(eng => (
              <Card key={eng.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                      eng.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}>
                      {eng.status === "active" ? "Active" : "Pending"}
                    </span>
                    <span className="text-xs text-muted-foreground">{eng.engagement_type.replace(/_/g, " ")}</span>
                  </div>
                  <h3 className="font-semibold">{eng.title}</h3>
                  <p className="text-sm text-muted-foreground">{eng.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {eng.team_member_emails?.length > 0 && (
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {eng.team_member_emails.length} participants</span>
                    )}
                    <span>Sessions: {eng.sessions_completed || 0} / {eng.total_sessions_planned || "?"}</span>
                  </div>
                  {eng.total_sessions_planned > 0 && (
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, ((eng.sessions_completed || 0) / eng.total_sessions_planned) * 100)}%` }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Decline Dialog */}
      <Dialog open={!!declineDialog} onOpenChange={(open) => { if (!open) setDeclineDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              The request will be returned to the Program Admin for reassignment. Please provide a reason.
            </p>
            <div>
              <Label className="mb-1.5 block">Reason for declining</Label>
              <Textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} rows={3} placeholder="e.g. Scheduling conflict, expertise mismatch..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDecline} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center ${color}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-[#0202ff] text-[#0202ff]" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
    </div>
  );
}