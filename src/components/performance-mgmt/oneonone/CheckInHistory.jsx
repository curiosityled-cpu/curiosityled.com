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
  Plus,
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

const QUESTION_KEYS = [
  { key: "energy", label: "Energy", color: "#0202ff" },
  { key: "confidence", label: "Confidence", color: "#22c55e" },
  { key: "focus", label: "Focus", color: "#f97316" },
  { key: "load", label: "Load", color: "#eab308" },
  { key: "growth", label: "Growth", color: "#8b5cf6" },
];

function QuestionsUsed({ questions }) {
  const entries = Object.entries(questions || {});
  if (entries.length === 0) return null;
  const measureKeys = new Set(QUESTION_KEYS.map((m) => m.key));
  const customEntries = entries.filter(([k]) => !measureKeys.has(k));
  return (
    <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        Questions
      </p>
      <div className="space-y-1">
        {QUESTION_KEYS.map((m) => {
          const text = questions?.[m.key];
          if (!text) return null;
          return (
            <div key={m.key} className="flex items-start gap-1.5 text-[11px]">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: m.color }}
              />
              <span className="text-gray-600">
                <span className="font-medium text-gray-700">{m.label}:</span>{" "}
                {text}
              </span>
            </div>
          );
        })}
        {customEntries.map(([k, text]) => (
          <div key={k} className="flex items-start gap-1.5 text-[11px]">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: "#0202ff" }}
            />
            <span className="text-gray-600">
              <span className="font-medium text-gray-700">Custom:</span> {text}
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
  return Array.from(map.entries()).sort((a, b) => new Date(b[0]) - new Date(a[0]));
}

// Per-person day-by-day timeline over the lookback window.
function PersonTimeline({ personName, records, lookback, isSelf, onAdd, onEdit }) {
  const windowDays = Math.max(1, Math.min(lookback, 90) + 1);
  const dates = Array.from({ length: windowDays }, (_, i) => shiftET(-i));
  const minDate = shiftET(-Math.max(0, lookback));

  const byDate = new Map();
  for (const r of records) {
    if (r.check_in_date && !byDate.has(r.check_in_date)) byDate.set(r.check_in_date, r);
  }
  const older = records
    .filter((r) => r.check_in_date && r.check_in_date < minDate)
    .sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date));

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        {lookback > 0
          ? `Showing the last ${lookback} day${lookback === 1 ? "" : "s"} for ${personName}. Missing days can be backfilled.`
          : `Retroactive check-ins are disabled for this organization.`}
      </p>

      <div className="space-y-2">
        {dates.map((date) => {
          const record = byDate.get(date);
          const morningDone =
            record?.morning_completed || record?.check_in_type === "morning";
          const eveningDone =
            record?.evening_completed || record?.check_in_type === "evening";
          return (
            <Card key={date} className="border border-gray-100 shadow-sm rounded-xl">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                    <h4 className="text-xs font-semibold text-gray-700">
                      {format(parseISO(date + "T00:00:00"), "EEEE, MMM d")}
                    </h4>
                  </div>
                  {record ? (
                    isSelf ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => onEdit(record)}
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                    ) : null
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => onAdd(date)}
                    >
                      <Plus className="w-3 h-3" /> Add check-in
                    </Button>
                  )}
                </div>

                {record ? (
                  <>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {MEASURES.map((m) => (
                        <ScorePill
                          key={m.key}
                          label={m.label}
                          score={record[m.key]}
                          color={m.color}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                          morningDone
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-gray-50 text-gray-400 border border-gray-200"
                        }`}
                      >
                        <Sunrise className="w-3 h-3" />
                        {morningDone ? "Morning done" : "Morning missed"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                          eveningDone
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-gray-50 text-gray-400 border border-gray-200"
                        }`}
                      >
                        <Moon className="w-3 h-3" />
                        {eveningDone ? "Evening done" : "Evening missed"}
                      </span>
                    </div>
                    <QuestionsUsed questions={record.questions_used} />
                    <CustomAnswers answers={record.custom_answers} />
                  </>
                ) : (
                  <p className="text-xs text-gray-400">
                    No check-in recorded for this day.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {older.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Earlier check-ins
          </h4>
          <div className="space-y-2">
            {older.map((r) => (
              <Card key={r.id} className="border border-gray-100 shadow-sm rounded-xl">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">
                      {format(parseISO(r.check_in_date + "T00:00:00"), "MMM d, yyyy")}
                    </span>
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
                  <QuestionsUsed questions={r.questions_used} />
                  <CustomAnswers answers={r.custom_answers} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const todayET = shiftET(0);
  const minEditableDate = shiftET(-Math.max(0, lookback));
  const isEditable = (r) => {
    const owner = (r.owner_email || r.user_email || "").toLowerCase();
    if (!owner || owner !== myEmail) return false;
    const d = r.check_in_date || "";
    return d >= minEditableDate && d <= todayET;
  };

  const isSelfFilter = filter === "all" ? false : filter.toLowerCase() === myEmail;
  const personName =
    filter === "all"
      ? ""
      : isSelfFilter
        ? myName
        : teamMembers.find(
            (m) => m.email.toLowerCase() === filter.toLowerCase()
          )?.name || filter;

  const personRecords =
    filter === "all"
      ? []
      : checkIns.filter(
          (c) =>
            (c.owner_email || c.user_email || "").toLowerCase() ===
            filter.toLowerCase()
        );

  const filtered =
    filter === "all"
      ? checkIns
      : personRecords;
  const grouped = groupByDate(filtered);

  const openAdd = (date) => {
    setEditor({
      kind: "add",
      date,
      targetEmail: filter,
      targetName: personName,
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

      {filter === "all" ? (
        grouped.length === 0 ? (
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
                    const ownerName = r.owner_name || r.user_email || user?.email || "";
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
                                {isMorning ? <Sunrise className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
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
                                onClick={() => openEdit(r)}
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
                          <QuestionsUsed questions={r.questions_used} />
                          <CustomAnswers answers={r.custom_answers} />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <PersonTimeline
          personName={personName}
          records={personRecords}
          lookback={lookback}
          isSelf={isSelfFilter}
          onAdd={openAdd}
          onEdit={openEdit}
        />
      )}

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
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}