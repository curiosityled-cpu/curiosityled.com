/**
 * CheckInHistory — daily check-in history for the current user and their team.
 *
 * Replaces the old weekly check-in form view in the Check-ins & 1:1s > Check-In
 * sub-tab. Pulls data from the getCheckInHistory backend function (service
 * role) so managers can see their direct reports' daily check-ins despite
 * owner-only RLS on DailyCheckIn.
 */
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CalendarDays,
  Sunrise,
  Moon,
  Users,
  Filter,
  Pencil,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RetroactiveCheckInCard from "@/components/checkin/RetroactiveCheckInCard";

const MEASURES = [
  { key: "energy_score", label: "Energy", color: "#0202ff" },
  { key: "confidence_score", label: "Confidence", color: "#22c55e" },
  { key: "focus_score", label: "Focus", color: "#f97316" },
  { key: "load_score", label: "Load", color: "#eab308" },
  { key: "growth_score", label: "Growth", color: "#8b5cf6" },
];

function shiftET(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function ScorePill({ label, score, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {score ?? "–"}
      </span>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}

function CustomAnswers({ answers }) {
  const entries = Object.entries(answers || {});
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        KPIs
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="text-[11px]">
            <span className="text-gray-500">{k}: </span>
            <span className="font-medium text-gray-700">
              {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function groupByDate(records) {
  const map = new Map();
  for (const r of records) {
    const d = r.check_in_date || "";
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(r);
  }
  return Array.from(map.entries()).sort((a, b) =>
    new Date(b[0]) - new Date(a[0])
  );
}

export default function CheckInHistory({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [lookback, setLookback] = useState(7);
  const [editing, setEditing] = useState(null);

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

  const filtered =
    filter === "all"
      ? checkIns
      : checkIns.filter(
          (c) => (c.owner_email || c.user_email || "").toLowerCase() === filter.toLowerCase()
        );

  const grouped = groupByDate(filtered);

  const todayET = shiftET(0);
  const minEditableDate = shiftET(-Math.max(0, lookback));
  const myEmail = (user?.email || "").toLowerCase();
  const isEditable = (r) => {
    const owner = (r.owner_email || r.user_email || "").toLowerCase();
    if (!owner || owner !== myEmail) return false;
    const d = r.check_in_date || "";
    return d >= minEditableDate && d <= todayET;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-900">Check-In History</h3>
          <p className="text-xs text-gray-500">
            {isManager
              ? "Daily check-ins from you and your team"
              : "Your daily check-in history"}
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

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No check-ins recorded yet
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {isManager
                ? "Once you and your team start daily check-ins, they'll appear here."
                : "Complete a morning or evening check-in from My Rhythm to see it here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, rows]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {date
                    ? format(parseISO(date + "T00:00:00"), "EEEE, MMM d, yyyy")
                    : "Undated"}
                </h4>
              </div>
              <div className="space-y-2">
                {rows.map((r) => {
                  const isMorning = r.check_in_type === "morning";
                  const ownerName =
                    r.owner_name ||
                    r.user_email ||
                    user?.email ||
                    "";
                  return (
                    <Card key={r.id} className="border border-gray-100 shadow-sm rounded-xl">
                      <CardContent className="p-3.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                isMorning
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              }`}
                            >
                              {isMorning ? (
                                <Sunrise className="w-3 h-3" />
                              ) : (
                                <Moon className="w-3 h-3" />
                              )}
                              {isMorning ? "Morning" : "Evening"}
                            </span>
                            {isManager && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                                <Users className="w-3 h-3" />
                                {ownerName}
                              </span>
                            )}
                          </div>
                          {isEditable(r) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setEditing(r)}
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {MEASURES.map((m) => (
                            <ScorePill
                              key={m.key}
                              label={m.label}
                              score={r[m.key]}
                              color={m.color}
                            />
                          ))}
                        </div>
                        <CustomAnswers answers={r.custom_answers} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit check-in</DialogTitle>
          </DialogHeader>
          {editing && (
            <RetroactiveCheckInCard
              initialDate={editing.check_in_date}
              initialType={editing.check_in_type}
              editMode
              onSaved={() => {
                setEditing(null);
                load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}