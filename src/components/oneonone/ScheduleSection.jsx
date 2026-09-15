import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Clock, Repeat, Video, Loader2, CheckCircle2, ExternalLink } from "lucide-react";

const RECURRENCE_OPTIONS = [
  { value: "none", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

/**
 * ScheduleSection — standalone 1:1 scheduling area.
 * Set date, time, duration, and optional recurrence. Save in-app, with a
 * toggle to also create a real event on the connected calendar (Outlook/Google).
 *
 * Props:
 *  - record: MeetingRecord | null
 *  - calendarConnected: boolean
 *  - onSave({ date, time, duration, recurrence, addToCalendar })
 */
export default function ScheduleSection({ record, calendarConnected, onSave }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [recurrence, setRecurrence] = useState("none");
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Hydrate from record when it changes
  useEffect(() => {
    if (record?.start_time) {
      const d = new Date(record.start_time);
      setDate(d.toISOString().split("T")[0]);
      setTime(d.toTimeString().slice(0, 5));
    } else if (record?.meeting_date) {
      setDate(record.meeting_date);
    }
    setDuration(record?.duration_minutes || 30);
    setRecurrence(record?.recurrence || "none");
    setAddToCalendar(!!record?.calendar_event_id);
    setError("");
  }, [record?.id, record?.start_time, record?.meeting_date, record?.duration_minutes, record?.recurrence, record?.calendar_event_id]);

  const hasRecord = !!record;
  const canSave = hasRecord && date && time && !saving && calendarConnected;
  const isScheduled = !!record?.start_time;
  const hasCalendarEvent = !!record?.calendar_event_id;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await onSave({ date, time, duration, recurrence, addToCalendar });
    } catch (e) {
      setError(e.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <CalendarClock className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-card-foreground">Schedule</h2>
          <p className="text-[11px] text-muted-foreground">Set the date, time, and recurrence.</p>
        </div>
        {hasCalendarEvent && (
          <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> On calendar
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-4">
        {!hasRecord ? (
          <div className="text-center py-6">
            <CalendarClock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Add a person in the Prep section above to schedule this 1:1.</p>
          </div>
        ) : (
          <>
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Duration</label>
              <div className="flex gap-2">
                {[30, 45, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      duration === d
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Repeat className="w-3 h-3" /> Recurrence <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {RECURRENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecurrence(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      recurrence === opt.value
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar requirement notice */}
            <div className={`rounded-xl border p-3 ${calendarConnected ? "border-border bg-muted/30" : "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"}`}>
              <p className="text-sm font-medium text-card-foreground flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-muted-foreground" />
                {calendarConnected ? "Sends a real calendar invite" : "Calendar connection required"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {calendarConnected
                  ? "Creates a real event on your connected Outlook or Google calendar with a video link and invites the attendee."
                  : "Connect Outlook or Google Calendar in Settings to schedule 1:1s. In-app-only scheduling is not available."}
              </p>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* Existing calendar link */}
            {hasCalendarEvent && record.calendar_join_link && (
              <a
                href={record.calendar_join_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> Join link
              </a>
            )}

            {/* Save */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button onClick={handleSave} disabled={!canSave} className="min-w-[120px]">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…
                  </>
                ) : !calendarConnected ? (
                  "Connect calendar to schedule"
                ) : isScheduled ? (
                  "Update"
                ) : (
                  "Schedule"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}