/**
 * CheckInHistory — daily check-in history for the current user and their team,
 * shown as a per-person day-by-day timeline over the org's retroactive lookback
 * window. Completed days show scores; missing days show an "Add check-in"
 * button so the user can backfill for themselves or a direct report.
 *
 * "Everyone" filter keeps the grouped completed-check-in list.
 */
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RetroactiveCheckInCard from "@/components/checkin/RetroactiveCheckInCard";
import CheckInCalendar from "./CheckInCalendar";

export default function CheckInHistory({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(user?.email || "all");
  const [lookback, setLookback] = useState(7);
  const [editor, setEditor] = useState(null); // { kind: 'edit'|'add', record?, date?, targetEmail?, targetName? }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("getCheckInHistory", {});
      const d = res?.data || res;
      setData(d);
    } catch (e) {
      setError(e.message || "Could not load check-in history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load org retroactive lookback window
  useEffect(() => {
    const clientId = user?.data?.client_id || user?.client_id;
    if (!clientId) return;
    base44.entities.Client.get(clientId)
      .then((c) => {
        const lb = c?.settings?.check_in_config?.retroactive_lookback_days;
        if (typeof lb === "number") setLookback(lb);
      })
      .catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  const checkIns = data?.check_ins || [];
  const teamMembers = data?.team_members || [];
  const isManager = data?.is_manager || teamMembers.length > 0;
  const myEmail = (user?.email || "").toLowerCase();
  const myName =
    user?.data?.display_name || user?.full_name || user?.email || "you";

  const isSelfFilter = filter === "all" ? false : filter.toLowerCase() === myEmail;
  const personName =
    filter === "all"
      ? ""
      : isSelfFilter
        ? myName
        : teamMembers.find(
            (m) => m.email.toLowerCase() === filter.toLowerCase()
          )?.name || filter;

  const openAdd = (date, email, name) => {
    setEditor({
      kind: "add",
      date,
      targetEmail: email || filter,
      targetName: name || personName,
    });
  };
  const openEdit = (record) => {
    setEditor({
      kind: "edit",
      record,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-900">Check-In History</h3>
          <p className="text-xs text-gray-500">
            {isManager
              ? "Daily check-ins for you and your team — backfill any missed day"
              : "Your daily check-in history — backfill any missed day"}
          </p>
        </div>
        {isManager && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-52 h-8 text-xs">
                <SelectValue placeholder="Filter by person…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone (incl. me)</SelectItem>
                <SelectItem value={user?.email || "me"}>Just me</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.email} value={m.email}>
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <CheckInCalendar
        filter={filter}
        checkIns={checkIns}
        teamMembers={teamMembers}
        myEmail={myEmail}
        myName={myName}
        lookback={lookback}
        onAdd={openAdd}
        onEdit={openEdit}
      />

      <Dialog open={!!editor} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {editor?.kind === "edit" ? "Edit check-in" : "Add check-in"}
            </DialogTitle>
          </DialogHeader>
          {editor?.kind === "edit" && (
            <RetroactiveCheckInCard
              initialDate={editor.record.check_in_date}
              initialType={editor.record.check_in_type || "morning"}
              editMode
              onSaved={() => {
                setEditor(null);
                load();
              }}
              onCancel={() => setEditor(null)}
            />
          )}
          {editor?.kind === "add" && (
            <RetroactiveCheckInCard
              initialDate={editor.date}
              initialType="morning"
              targetEmail={editor.targetEmail}
              targetName={editor.targetName}
              onSaved={() => {
                setEditor(null);
                load();
              }}
              onCancel={() => setEditor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}