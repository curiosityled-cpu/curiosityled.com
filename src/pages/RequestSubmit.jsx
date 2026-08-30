import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import SubmitRequestForm from "@/components/coaching-request/SubmitRequestForm";
import RequestCard from "@/components/coaching-request/RequestCard";
import RequestDetailDrawer from "@/components/coaching-request/RequestDetailDrawer";
import { CATEGORY_CONFIG, STATUS_CONFIG } from "@/components/coaching-request/shared";
import { Loader2, Inbox, FilePlus2 } from "lucide-react";

export default function RequestSubmit() {
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("form");

  const loadData = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const clientId = user?.client_id || user?.data?.client_id;
      let clientRecord = null;
      if (clientId) {
        try {
          const clients = await base44.entities.Client.filter({ id: clientId });
          clientRecord = clients[0] || null;
        } catch (e) {}
      }
      setClient(clientRecord);
      const myRequests = await base44.entities.CoachingRequest.filter(
        { requested_by_email: user.email },
        "-created_date",
        50
      );
      setRequests(myRequests);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user?.email]);

  const handleSubmitted = () => {
    setView("list");
    loadData();
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Request Coaching or Consulting</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit a request and track its progress through intake, assignment, and delivery.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setView("form")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            view === "form" ? "border-[#0202ff] text-[#0202ff]" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FilePlus2 className="w-4 h-4" /> New Request
        </button>
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            view === "list" ? "border-[#0202ff] text-[#0202ff]" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="w-4 h-4" /> My Requests {requests.length > 0 && `(${requests.length})`}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : view === "form" ? (
        <div className="max-w-2xl">
          <SubmitRequestForm user={user} client={client} onSubmitted={handleSubmitted} />
        </div>
      ) : (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No requests yet. Submit your first request to get started.</p>
            </div>
          ) : (
            requests.map((r) => (
              <RequestCard key={r.id} request={r} onClick={(req) => setSelected(req)} />
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