import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarPlus, Video } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AttendeeSelector from "./AttendeeSelector";

/**
 * ScheduleMeetingModal — creates a real calendar event (Outlook or Google)
 * for a 1:1 and links it to a new MeetingRecord.
 *
 * Props:
 *  - open, onOpenChange
 *  - managerEmail
 *  - directReports, rollupReports
 *  - onCreated: (record) => void   // called with the new MeetingRecord
 */
export default function ScheduleMeetingModal({ open, onOpenChange, managerEmail, directReports, rollupReports, onCreated }) {
  const [attendee, setAttendee] = useState({ email: "", name: "", isUser: false });
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const effectiveTitle = useMemo(() => {
    if (title) return title;
    const name = attendee?.name || attendee?.email;
    return name ? `1:1 with ${name}` : "1:1 Meeting";
  }, [title, attendee]);

  const canSubmit = attendee?.name && date && time && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const startISO = new Date(`${date}T${time}`).toISOString();

      // 1) Create the calendar event
      const calRes = await base44.functions.invoke('createOneOnOneCalendarEvent', {
        attendee_email: attendee.email || undefined,
        attendee_name: attendee.name,
        title: effectiveTitle,
        description: "",
        start_time: startISO,
        duration_minutes: duration,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
      });
      const cal = calRes.data || calRes;

      if (!cal.success) {
        setError(cal.error || "Could not create the calendar event. Is your calendar connected?");
        setSaving(false);
        return;
      }

      // 2) Create the MeetingRecord linked to the calendar event
      const record = await base44.entities.MeetingRecord.create({
        manager_email: managerEmail,
        employee_email: attendee.email || '',
        attendee_name: attendee.name,
        meeting_date: startISO.split('T')[0],
        start_time: startISO,
        calendar_event_id: cal.event_id,
        calendar_source: cal.source,
        title: effectiveTitle,
        status: 'scheduled',
        agenda_items: [],
        commitments: [],
      });

      onCreated?.(record);
      // reset
      setAttendee({ email: "", name: "", isUser: false });
      setTitle(""); setDate(""); setTime(""); setDuration(30); setError("");
      onOpenChange(false);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-primary" /> Schedule 1:1
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Attendee */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">With</label>
            <div className="mt-1">
              <AttendeeSelector
                value={attendee}
                onChange={setAttendee}
                directReports={directReports}
                rollupReports={rollupReports}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
            <input
              value={effectiveTitle}
              onChange={e => setTitle(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="1:1 with…"
            />
          </div>

          {/* Date / Time / Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Duration</label>
            <div className="mt-1 flex gap-2">
              {[30, 45, 60].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    duration === d
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Video className="w-3 h-3" />
            {attendee?.email
              ? "A calendar invite with an online meeting link will be sent to the attendee."
              : "An event will be created on your calendar. Add an email to send an invite."}
          </p>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Scheduling…</> : <CalendarPlus className="w-4 h-4 mr-1.5" />}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}