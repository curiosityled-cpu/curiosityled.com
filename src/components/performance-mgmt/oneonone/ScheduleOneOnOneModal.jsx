import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Calendar, Clock, Link2, Repeat, ChevronRight, ChevronLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const CADENCE_OPTIONS = [
  { value: "none", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

function generateCalendarLinks(form, participantName) {
  const start = new Date(form.date + "T" + form.start_time);
  const end = new Date(form.date + "T" + form.end_time);
  const title = encodeURIComponent(`1-on-1: ${participantName}`);
  const details = encodeURIComponent(form.agenda || "");
  const location = encodeURIComponent(form.meeting_link || "");

  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${details}&location=${location}`;
  const ics = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${fmt(start)}%0ADTEND:${fmt(end)}%0ASUMMARY:${title}%0ADESCRIPTION:${details}%0ALOCATION:${location}%0AEND:VEVENT%0AEND:VCALENDAR`;

  return { google, outlook, ics };
}

// Page 1: Logistics
function LogisticsPage({ form, setForm, users, onNext, onClose }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAgenda, setAiAgenda] = useState("");

  const participant = users.find(u => u.email === form.participant_email);

  const generateAIAgenda = async () => {
    if (!form.participant_email) {
      toast.error("Please select a participant first");
      return;
    }
    setAiLoading(true);
    try {
      const [goals, checkIns] = await Promise.all([
        base44.entities.Goal.filter({ assigned_to_emails: { $in: [form.participant_email] } }, "-updated_date", 5).catch(() => []),
        base44.entities.WeeklyCheckIn.filter({ employee_email: form.participant_email }, "-week_of", 3).catch(() => []),
      ]);

      const context = [
        goals.length > 0 ? `Active goals: ${goals.map(g => g.title).join(", ")}` : "",
        checkIns.length > 0 ? `Recent check-in blockers: ${checkIns.filter(c => c.blockers).map(c => c.blockers).join("; ")}` : "",
        checkIns.length > 0 ? `Recent priorities: ${checkIns.filter(c => c.next_priority).map(c => c.next_priority).join("; ")}` : "",
      ].filter(Boolean).join("\n");

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an executive coach. Generate a concise 1-on-1 meeting agenda for a manager meeting with ${participant?.full_name || form.participant_email}.\n\nContext:\n${context || "No context available."}\n\nGenerate 4-5 agenda items as a bullet list. Be specific and actionable. Keep it under 150 words.`,
      });

      setAiAgenda(res);
      setForm(p => ({ ...p, agenda: res }));
      toast.success("AI agenda generated");
    } catch {
      toast.error("Could not generate agenda");
    } finally {
      setAiLoading(false);
    }
  };

  const canNext = form.participant_email && form.date && form.start_time && form.end_time;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-[#0202ff] text-white text-xs flex items-center justify-center font-bold">1</div>
        <span className="text-sm font-semibold text-gray-700">Meeting Logistics</span>
        <div className="flex-1 h-px bg-gray-200" />
        <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center font-bold">2</div>
        <span className="text-sm text-gray-400">Check-In</span>
      </div>

      {/* Participant */}
      <div className="space-y-1.5">
        <Label>Participant *</Label>
        <Select value={form.participant_email} onValueChange={v => setForm(p => ({ ...p, participant_email: v }))}>
          <SelectTrigger><SelectValue placeholder="Select team member..." /></SelectTrigger>
          <SelectContent>{users.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Date + Times */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date *</Label>
          <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Start *</Label>
          <Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> End *</Label>
          <Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
        </div>
      </div>

      {/* Cadence */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1"><Repeat className="w-3.5 h-3.5" /> Cadence</Label>
        <Select value={form.cadence} onValueChange={v => setForm(p => ({ ...p, cadence: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CADENCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Meeting Link */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Meeting Link</Label>
        <Input placeholder="https://teams.microsoft.com/..." value={form.meeting_link} onChange={e => setForm(p => ({ ...p, meeting_link: e.target.value }))} />
      </div>

      {/* Agenda with AI Assist */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Agenda</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={generateAIAgenda}
            disabled={aiLoading || !form.participant_email}
            className="h-7 text-xs gap-1 border-[#0202ff] text-[#0202ff] hover:bg-blue-50"
          >
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI Suggest Agenda
          </Button>
        </div>
        <Textarea
          rows={4}
          placeholder="Topics to discuss in this 1-on-1..."
          value={form.agenda}
          onChange={e => setForm(p => ({ ...p, agenda: e.target.value }))}
          className="text-sm resize-none"
        />
        {aiAgenda && (
          <p className="text-xs text-[#0202ff] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI-suggested agenda applied — feel free to edit
          </p>
        )}
      </div>

      {/* Calendar Links */}
      {form.date && form.start_time && form.end_time && form.participant_email && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Add to Calendar</p>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const links = generateCalendarLinks(form, participant?.full_name || form.participant_email);
              return (
                <>
                  <a href={links.google} target="_blank" rel="noreferrer">
                    <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-blue-50 text-xs"><ExternalLink className="w-3 h-3" /> Google Calendar</Badge>
                  </a>
                  <a href={links.outlook} target="_blank" rel="noreferrer">
                    <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-blue-50 text-xs"><ExternalLink className="w-3 h-3" /> Outlook</Badge>
                  </a>
                  <a href={links.ics} download="1on1.ics">
                    <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-blue-50 text-xs"><ExternalLink className="w-3 h-3" /> iOS / iCal</Badge>
                  </a>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          disabled={!canNext}
          onClick={onNext}
          className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1"
        >
          Next: Check-In <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Page 2: Check-In prework toggle (manager side)
function CheckInPage({ includeCheckIn, setIncludeCheckIn, onBack, onSubmit, submitting, participantName }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center font-bold">1</div>
        <span className="text-sm text-gray-400">Logistics</span>
        <div className="flex-1 h-px bg-gray-200" />
        <div className="w-6 h-6 rounded-full bg-[#0202ff] text-white text-xs flex items-center justify-center font-bold">2</div>
        <span className="text-sm font-semibold text-gray-700">Check-In Prework</span>
      </div>

      <div className="rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900 text-sm">Add Check-In as Prework</p>
            <p className="text-xs text-gray-500 mt-1">
              {participantName} will receive a notification to complete a check-in before the 1-on-1. Their submission will be visible to you in the Check-In tab.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIncludeCheckIn(!includeCheckIn)}
            className="flex-shrink-0 w-11 h-6 rounded-full transition-colors relative"
            style={{ backgroundColor: includeCheckIn ? "#0202ff" : "#d1d5db" }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ transform: includeCheckIn ? "translateX(20px)" : "translateX(0)" }}
            />
          </button>
        </div>

        {includeCheckIn && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-blue-700">What happens next:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>{participantName}</strong> will be notified to submit their weekly check-in</li>
              <li>• The check-in will be linked to this 1-on-1 session</li>
              <li>• You can review it in the Check-In tab before the meeting</li>
              <li>• You can also add private notes after reviewing their submission</li>
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={onSubmit} disabled={submitting} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Schedule 1-on-1
        </Button>
      </div>
    </div>
  );
}

const EMPTY_LOGISTICS = {
  participant_email: "",
  date: "",
  start_time: "",
  end_time: "",
  cadence: "none",
  agenda: "",
  meeting_link: "",
};

export default function ScheduleOneOnOneModal({ isOpen, onClose, onCreated, users, user }) {
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ ...EMPTY_LOGISTICS });
  const [includeCheckIn, setIncludeCheckIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setPage(1);
    setForm({ ...EMPTY_LOGISTICS });
    setIncludeCheckIn(false);
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const sessionDate = new Date(form.date + "T" + form.start_time).toISOString();
      const durationMs = form.end_time && form.start_time
        ? (new Date("1970-01-01T" + form.end_time) - new Date("1970-01-01T" + form.start_time)) / 60000
        : 30;

      const newSession = await base44.entities.CoachingSession.create({
        client_id: user.client_id,
        coach_email: user.email,
        coachee_email: form.participant_email,
        scheduled_date: sessionDate,
        session_date: sessionDate,
        duration_minutes: durationMs > 0 ? durationMs : 30,
        pre_session_notes: form.agenda,
        meeting_link: form.meeting_link || "",
        cadence: form.cadence,
        status: "scheduled",
        session_type: "1on1_coaching",
        location_type: "virtual",
        check_in_requested: includeCheckIn,
      });

      // If check-in prework requested, send a notification to the direct report
      if (includeCheckIn) {
        try {
          await base44.entities.Notification.create({
            user_email: form.participant_email,
            title: "Check-In Requested Before Your 1-on-1",
            message: `${user.full_name || user.email} has requested a check-in before your upcoming 1-on-1 on ${format(new Date(form.date), "MMMM d")}. Please submit your check-in in the Performance tab.`,
            type: "1on1_scheduled",
            is_read: false,
            scheduled_for: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("Could not send notification:", e);
        }
      }

      toast.success("1-on-1 scheduled" + (includeCheckIn ? " — check-in request sent" : ""));
      onCreated?.(newSession);
      handleClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to schedule 1-on-1");
    } finally {
      setSubmitting(false);
    }
  };

  const participant = users.find(u => u.email === form.participant_email);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Schedule 1-on-1
            {participant && <Badge variant="outline" className="font-normal text-xs">{participant.full_name || participant.email}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {page === 1 && (
          <LogisticsPage
            form={form}
            setForm={setForm}
            users={users}
            onNext={() => setPage(2)}
            onClose={handleClose}
          />
        )}
        {page === 2 && (
          <CheckInPage
            includeCheckIn={includeCheckIn}
            setIncludeCheckIn={setIncludeCheckIn}
            onBack={() => setPage(1)}
            onSubmit={handleSubmit}
            submitting={submitting}
            participantName={participant?.full_name || form.participant_email}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}