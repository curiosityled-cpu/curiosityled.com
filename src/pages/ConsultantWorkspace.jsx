import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import RequestCard from "@/components/coaching-request/RequestCard";
import RequestDetailDrawer from "@/components/coaching-request/RequestDetailDrawer";
import { CONSULTING_CATEGORIES, STATUS_CONFIG } from "@/components/coaching-request/shared";
import { Loader2, Inbox, ClipboardList, Activity } from "lucide-react";

export default function ConsultantWorkspace() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("queue");

  const loadData = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const all = await base44.entities.CoachingRequest.list("-created_date", 100);
      const mine = all.filter(
        (r) => r.assigned_practitioner_email === user.email && CONSULTING_CATEGORIES.includes(r.request_category)
      );
      setRequests(mine);
      const myEngagements = await base44.entities.CoachingEngagement.filter(
        { coach_email: user.email },
        "-created_date",
        50
      );
      setEngagements(myEngagements);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user?.email]);

  const queue = requests.filter((r) => r.status === "assigned");
  const active = engagements.filter((e) => e.status === "active" || e.status === "pending");

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Consulting Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review assigned workshop, consultation, and assessment requests, accept or decline, and track delivery.
        </p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setTab("queue")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "queue" ? "border-[#0202ff] text-[#0202ff]" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="w-4 h-4" /> Request Queue {queue.length > 0 && `(${queue.length})`}
        </button>
        <button
          onClick={() => setTab("active")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "active" ? "border-[#0202ff] text-[#0202ff]" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="w-4 h-4" /> Active Engagements {active.length > 0 && `(${active.length})`}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tab === "queue" ? (
        <div className="space-y-3">
          {queue.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No requests waiting for your response.</p>
            </div>
          ) : (
            queue.map((r) => (
              <RequestCard key={r.id} request={r} onClick={(req) => setSelected(req)} />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {active.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No active engagements yet.</p>
            </div>
          ) : (
            active.map((e) => (
              <div key={e.id} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-foreground">{e.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {e.sessions_completed || 0}/{e.total_sessions_planned || "—"} sessions
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {e.team_member_emails?.join(", ") || e.coachee_email || "Group engagement"}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      <RequestDetailDrawer
        request={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        userRole={user?.app_role || user?.data?.app_role || user?.role}
        onAction={loadData}
      />
    </div>
  );
}