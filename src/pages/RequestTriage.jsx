import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import RequestCard from "@/components/coaching-request/RequestCard";
import RequestDetailDrawer from "@/components/coaching-request/RequestDetailDrawer";
import { STATUS_CONFIG, CATEGORY_CONFIG } from "@/components/coaching-request/shared";
import { Loader2, KanbanSquare, List } from "lucide-react";

const COLUMN_ORDER = [
  "submitted", "intake_scheduled", "intake_complete", "approved",
  "assigned", "engagement_created", "in_progress", "completed", "rejected",
];

export default function RequestTriage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [layout, setLayout] = useState("kanban");
  const [filterCategory, setFilterCategory] = useState("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.CoachingRequest.list("-created_date", 200);
      setRequests(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user?.email]);

  const filtered = filterCategory === "all"
    ? requests
    : requests.filter((r) => r.request_category === filterCategory);

  const byStatus = (status) => filtered.filter((r) => r.status === status);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Request Triage</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, intake, approve, and assign incoming coaching and consulting requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
          >
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setLayout("kanban")}
              className={`p-2 ${layout === "kanban" ? "bg-[#0202ff] text-white" : "bg-card text-muted-foreground"}`}
            >
              <KanbanSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout("list")}
              className={`p-2 ${layout === "list" ? "bg-[#0202ff] text-white" : "bg-card text-muted-foreground"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : layout === "kanban" ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {COLUMN_ORDER.map((status) => {
              const items = byStatus(status);
              if (filterCategory === "all" && items.length === 0 && !["submitted", "assigned", "engagement_created"].includes(status)) return null;
              const cfg = STATUS_CONFIG[status] || {};
              const Icon = cfg.icon;
              return (
                <div key={status} className="w-72 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[60px]">
                    {items.map((r) => (
                      <RequestCard key={r.id} request={r} onClick={(req) => setSelected(req)} showRole />
                    ))}
                    {items.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">Empty</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">No requests found.</div>
          ) : (
            filtered.map((r) => (
              <RequestCard key={r.id} request={r} onClick={(req) => setSelected(req)} showRole />
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