import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Calendar, Clock, ChevronRight, Plus, CheckCircle2,
  Circle, AlertCircle, StickyNote, Inbox, Loader2, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AttendeeSelector from "@/components/oneonone/AttendeeSelector";
import PrepSection from "@/components/oneonone/PrepSection";
import ScheduleSection from "@/components/oneonone/ScheduleSection";
import PracticeRolePlay from "@/components/oneonone/PracticeRolePlay";

// ── Helpers ──
function formatMeetingDate(dateStr, startTime) {
  const d = startTime ? new Date(startTime) : new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  if (isToday) return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  if (isTomorrow) return `Tomorrow, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatRelativeDate(dateStr, startTime) {
  const d = startTime ? new Date(startTime) : new Date(dateStr);
  const now = new Date();
  const diffHrs = (now - d) / 3600000;
  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOneOnOne(event) {
  const title = (event.title || '').toLowerCase();
  const hasKeyword = title.includes('1:1') || title.includes('1 on 1') || title.includes('one on one') || title.includes('1-on-1');
  const twoAttendees = event.attendees === 2;
  return hasKeyword || twoAttendees;
}

// ── Upcoming 1:1 Card ──
function UpcomingCard({ meeting, record, onPrepare, onOpenRecord }) {
  const hasRecord = !!record;
  const prepStarted = hasRecord && (record.status === 'preparing' || record.agenda_items?.length > 0);

  const handleClick = () => {
    if (hasRecord) onOpenRecord(record);
    else onPrepare(meeting);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left p-4 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all group active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-sky-50 dark:bg-sky-950/40">
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-card-foreground truncate">{meeting.title || '1:1 Meeting'}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatMeetingDate(meeting.start_date || meeting.start, meeting.start)}
              </p>
            </div>
          </div>
          {hasRecord && (
            <div className="flex items-center gap-1.5 mt-2 ml-10">
              {prepStarted && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Prep started</Badge>}
              {!prepStarted && <Badge variant="outline" className="text-[10px] py-0 px-1.5">Scheduled</Badge>}
            </div>
          )}
          {!hasRecord && <p className="text-xs text-muted-foreground mt-2 ml-10">Tap to start preparing</p>}
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform mt-1" />
      </div>
    </button>
  );
}

// ── Pending Debrief Card ──
function DebriefCard({ record, onOpen }) {
  return (
    <button
      onClick={() => onOpen(record)}
      className="w-full text-left p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm hover:shadow-md transition-all group active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100 dark:bg-amber-900/40">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-card-foreground truncate">
                {record.attendee_name || record.employee_email || record.title || '1:1 Meeting'}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeDate(record.meeting_date, record.start_time)} · Awaiting debrief
              </p>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform mt-1" />
      </div>
    </button>
  );
}

// ── Past 1:1 Card ──
function PastCard({ record, onOpen }) {
  const openCommitments = (record.commitments || []).filter(c => c.status === 'open').length;
  return (
    <button
      onClick={() => onOpen(record)}
      className="w-full text-left p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-all group active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-card-foreground truncate">
            {record.attendee_name || record.employee_email || record.title || '1:1 Meeting'}
          </p>
          <p className="text-xs text-muted-foreground">{formatRelativeDate(record.meeting_date, record.start_time)}</p>
        </div>
        {openCommitments > 0 && (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-amber-600 border-amber-300">
            {openCommitments} open
          </Badge>
        )}
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

// ── Main Hub ──
export default function OneOnOneHub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentRecord, setCurrentRecord] = useState(null); // loaded into Prep + Schedule sections
  const [debriefRecord, setDebriefRecord] = useState(null);  // past meeting opened for notes/debrief
  const [practiceRecord, setPracticeRecord] = useState(null);

  // Fetch the manager's team hierarchy (direct reports + rollup) for the attendee selector.
  const { data: hierarchyData } = useQuery({
    queryKey: ['ooo-team-hierarchy', user?.email],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getTeamHierarchy', { manager_email: user.email });
        return res.data?.data || res.data || null;
      } catch { return null; }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { directReports, rollupReports } = useMemo(() => {
    const subs = hierarchyData?.subordinates || [];
    const direct = subs.filter(s => s.manager_email === user.email);
    const directEmails = new Set(direct.map(d => d.email));
    const rollup = subs.filter(s => !directEmails.has(s.email));
    return { directReports: direct, rollupReports: rollup };
  }, [hierarchyData, user?.email]);

  // Fetch upcoming calendar events (to know if a calendar is connected)
  const { data: calendarData, isLoading: loadingCalendar } = useQuery({
    queryKey: ['ooo-upcoming-meetings', user?.email],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getUpcomingMeetings', {});
        return res.data || { events: [], connected: false };
      } catch { return { events: [], connected: false }; }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const calendarConnected = calendarData?.connected ?? false;

  // Fetch MeetingRecords where user is the manager
  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['ooo-records', user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.MeetingRecord.filter(
          { manager_email: user.email },
          '-meeting_date',
          50
        );
      } catch { return []; }
    },
    enabled: !!user?.email,
    staleTime: 60 * 1000,
  });

  // Keep the currentRecord in sync with backend updates
  useEffect(() => {
    if (!currentRecord?.id) return;
    const fresh = records.find(r => r.id === currentRecord.id);
    if (fresh && JSON.stringify(fresh) !== JSON.stringify(currentRecord)) {
      setCurrentRecord(fresh);
    }
  }, [records, currentRecord?.id]);

  // Separate records into upcoming, pending debriefs, and past
  const now = new Date();
  const { upcomingRecords, pendingDebriefs, pastRecords } = useMemo(() => {
    const upcoming = [];
    const pending = [];
    const past = [];
    for (const r of records) {
      const meetingDate = new Date(r.start_time || r.meeting_date);
      if (meetingDate >= now) {
        upcoming.push(r);
      } else if (!r.debrief_completed && (r.meeting_notes || r.discussion_points?.length || r.commitments?.length)) {
        pending.push(r);
      } else if (!r.debrief_completed && meetingDate < now && meetingDate > new Date(now - 7 * 86400000)) {
        pending.push(r);
      } else {
        past.push(r);
      }
    }
    return { upcomingRecords: upcoming, pendingDebriefs: pending, pastRecords: past.slice(0, 6) };
  }, [records]);

  // Filter calendar events to 1:1s only and match with records
  const upcomingOneOnOnes = useMemo(() => {
    const events = (calendarData?.events || []).filter(isOneOnOne);
    return events.map(event => {
      const record = records.find(r => r.calendar_event_id === event.id);
      return { ...event, record };
    });
  }, [calendarData, records]);

  // ── Handlers ──
  const handleCreate = async (attendee) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const newRecord = await base44.entities.MeetingRecord.create({
        manager_email: user.email,
        employee_email: attendee.email || '',
        attendee_name: attendee.name || '',
        meeting_date: today,
        title: attendee.name ? `1:1 with ${attendee.name}` : '1:1 Meeting',
        status: 'preparing',
        calendar_source: 'manual',
        agenda_items: [],
        commitments: [],
        recurrence: 'none',
      });
      queryClient.invalidateQueries({ queryKey: ['ooo-records', user?.email] });
      setCurrentRecord(newRecord);
    } catch (e) {
      console.error('Error creating meeting record:', e);
    }
  };

  const handleUpdate = async (patch) => {
    if (!currentRecord) return;
    try {
      const updated = await base44.entities.MeetingRecord.update(currentRecord.id, patch);
      setCurrentRecord(prev => ({ ...prev, ...patch, ...updated }));
      queryClient.invalidateQueries({ queryKey: ['ooo-records', user?.email] });
    } catch (e) {
      console.error('Update failed:', e);
    }
  };

  const handleSchedule = async ({ date, time, duration, recurrence, addToCalendar }) => {
    if (!currentRecord) return;
    const startISO = new Date(`${date}T${time}`).toISOString();
    const patch = {
      meeting_date: date,
      start_time: startISO,
      duration_minutes: duration,
      recurrence,
      status: 'scheduled',
    };

    const hasExistingEvent = !!currentRecord.calendar_event_id;
    const calRes = await base44.functions.invoke('createOneOnOneCalendarEvent', {
      action: hasExistingEvent ? 'update' : 'create',
      event_id: hasExistingEvent ? currentRecord.calendar_event_id : undefined,
      calendar_source: hasExistingEvent ? currentRecord.calendar_source : undefined,
      attendee_email: currentRecord.employee_email || undefined,
      attendee_name: currentRecord.attendee_name || '',
      title: currentRecord.title || `1:1 with ${currentRecord.attendee_name || ''}`,
      start_time: startISO,
      duration_minutes: duration,
      recurrence,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    });
    const cal = calRes.data || calRes;
    if (!cal.success) throw new Error(cal.error || 'Could not create the calendar event. Is your calendar connected?');
    patch.calendar_event_id = cal.event_id;
    patch.calendar_source = cal.source;
    patch.calendar_join_link = cal.join_link || '';

    const updated = await base44.entities.MeetingRecord.update(currentRecord.id, patch);
    setCurrentRecord(prev => ({ ...prev, ...patch, ...updated }));
    queryClient.invalidateQueries({ queryKey: ['ooo-records', user?.email] });
  };

  const handlePrepare = async (event) => {
    if (!event?.id) return;
    const existing = records.find(r => r.calendar_event_id === event.id);
    if (existing) { setCurrentRecord(existing); return; }
    try {
      const meetingDate = event.start ? new Date(event.start) : new Date();
      const newRecord = await base44.entities.MeetingRecord.create({
        manager_email: user.email,
        employee_email: '',
        attendee_name: event.title?.replace(/1:1|1 on 1/i, '').trim() || 'Direct Report',
        meeting_date: meetingDate.toISOString().split('T')[0],
        start_time: event.start,
        calendar_event_id: event.id,
        calendar_source: event.source,
        title: event.title || '1:1 Meeting',
        status: 'preparing',
        agenda_items: [],
        commitments: [],
        recurrence: 'none',
      });
      queryClient.invalidateQueries({ queryKey: ['ooo-records', user?.email] });
      setCurrentRecord(newRecord);
    } catch (e) {
      console.error('Error creating meeting record:', e);
    }
  };

  const handleOpenUpcoming = (record) => setCurrentRecord(record);
  const handleOpenDebrief = (record) => setDebriefRecord(record);

  const handleNewOneOnOne = () => setCurrentRecord(null);

  const [cancelling, setCancelling] = useState(false);
  const handleCancel = async () => {
    if (!currentRecord) return;
    setCancelling(true);
    try {
      if (currentRecord.calendar_event_id && currentRecord.calendar_source) {
        await base44.functions.invoke('createOneOnOneCalendarEvent', {
          action: 'delete',
          event_id: currentRecord.calendar_event_id,
          calendar_source: currentRecord.calendar_source,
        });
      }
      await base44.entities.MeetingRecord.delete(currentRecord.id);
      queryClient.invalidateQueries({ queryKey: ['ooo-records', user?.email] });
      setCurrentRecord(null);
    } catch (e) {
      console.error('Cancel failed:', e);
    } finally {
      setCancelling(false);
    }
  };

  const handleCloseDebrief = () => {
    setDebriefRecord(null);
    queryClient.invalidateQueries({ queryKey: ['ooo-records', user?.email] });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-10">
      {/* Header */}
      <div className="pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">1:1s</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Prepare, schedule, and debrief your one-on-ones in one place.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1.5 flex-shrink-0"
          onClick={handleNewOneOnOne}
        >
          <Plus className="w-4 h-4" /> New 1:1
        </Button>
      </div>

      {/* ── Prep Section (top) ── */}
      <PrepSection
        record={currentRecord}
        directReports={directReports}
        rollupReports={rollupReports}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onPractice={() => setPracticeRecord(currentRecord)}
      />

      {/* ── Schedule Section (below) ── */}
      <div className="mt-4">
        <ScheduleSection
          record={currentRecord}
          calendarConnected={calendarConnected}
          onSave={handleSchedule}
          onCancel={handleCancel}
          cancelling={cancelling}
        />
      </div>

      {/* Practice role-play modal */}
      <PracticeRolePlay
        open={!!practiceRecord}
        onOpenChange={(o) => { if (!o) setPracticeRecord(null); }}
        record={practiceRecord}
      />

      {/* Debrief / notes panel for past meetings */}
      <AnimatePresence>
        {debriefRecord && (
          <RecordWorkspace
            key={debriefRecord.id}
            record={debriefRecord}
            userEmail={user?.email}
            managerEmail={user?.email}
            directReports={directReports}
            rollupReports={rollupReports}
            onClose={handleCloseDebrief}
          />
        )}
      </AnimatePresence>

      {/* ── Lists ── */}
      <div className="mt-8 space-y-8">
        {/* Upcoming 1:1s */}
        <section className="space-y-3">
          <div className="flex items-end justify-between px-1">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
              <p className="text-xs text-muted-foreground mt-0.5">Synced from your calendar. Tap to prepare.</p>
            </div>
            {!loadingCalendar && !calendarConnected && (
              <Badge variant="outline" className="text-[10px]">Calendar not connected</Badge>
            )}
          </div>
          {loadingCalendar ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : upcomingOneOnOnes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingOneOnOnes.map((meeting) => (
                <UpcomingCard
                  key={meeting.id}
                  meeting={meeting}
                  record={meeting.record}
                  onPrepare={handlePrepare}
                  onOpenRecord={handleOpenUpcoming}
                />
              ))}
            </div>
          ) : upcomingRecords.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingRecords.map((record) => (
                <UpcomingCard
                  key={record.id}
                  meeting={{ id: record.calendar_event_id, title: record.title, start: record.start_time, start_date: record.meeting_date }}
                  record={record}
                  onPrepare={() => handlePrepare({ id: record.calendar_event_id, start: record.start_time, title: record.title })}
                  onOpenRecord={handleOpenUpcoming}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <Inbox className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming 1:1s found.</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Connect your calendar or prepare a new one above.</p>
            </div>
          )}
        </section>

        {/* Pending Debriefs */}
        {pendingDebriefs.length > 0 && (
          <section className="space-y-3">
            <div className="px-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pending Debriefs</p>
              <p className="text-xs text-muted-foreground mt-0.5">Recent meetings that need your notes or follow-up.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingDebriefs.map((record) => (
                <DebriefCard key={record.id} record={record} onOpen={handleOpenDebrief} />
              ))}
            </div>
          </section>
        )}

        {/* Recent History */}
        {pastRecords.length > 0 && (
          <section className="space-y-3">
            <div className="px-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recent History</p>
            </div>
            <div className="space-y-2">
              {pastRecords.map((record) => (
                <PastCard key={record.id} record={record} onOpen={handleOpenDebrief} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loadingCalendar && !loadingRecords && upcomingOneOnOnes.length === 0 && upcomingRecords.length === 0 && pendingDebriefs.length === 0 && pastRecords.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-card-foreground">Your 1:1 hub is ready</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Start by choosing who you're meeting with in the Prep section above, then set a date and time below.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Record Workspace (inline panel for notes / debrief of past meetings) ──
function RecordWorkspace({ record, userEmail, managerEmail, directReports, rollupReports, onClose }) {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState(record);
  const [newCommitmentText, setNewCommitmentText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocal(record); }, [record]);

  const update = async (patch) => {
    setSaving(true);
    try {
      const updated = await base44.entities.MeetingRecord.update(local.id, patch);
      setLocal({ ...local, ...patch, ...updated });
      queryClient.invalidateQueries({ queryKey: ['ooo-records', userEmail] });
    } catch (e) {
      console.error('Update failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const addCommitment = () => {
    if (!newCommitmentText.trim()) return;
    const commitments = [...(local.commitments || []), { id: crypto.randomUUID(), action: newCommitmentText.trim(), owner: 'manager', status: 'open' }];
    update({ commitments });
    setNewCommitmentText('');
  };

  const toggleCommitment = (id) => {
    const commitments = (local.commitments || []).map(c => c.id === id ? { ...c, status: c.status === 'open' ? 'complete' : 'open' } : c);
    update({ commitments });
  };

  const completeDebrief = () => {
    update({ debrief_completed: true, status: 'debriefed' });
    setTimeout(onClose, 500);
  };

  const meetingDate = new Date(local.start_time || local.meeting_date);
  const isPast = meetingDate < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="mt-6 rounded-2xl border border-border bg-card shadow-sm p-5 space-y-5"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Back
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{local.title || local.attendee_name || '1:1 Meeting'}</h2>
            <p className="text-xs text-muted-foreground">{formatMeetingDate(local.meeting_date, local.start_time)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
          {isPast && !local.debrief_completed && (
            <Button size="sm" onClick={completeDebrief} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete Debrief
            </Button>
          )}
          {local.debrief_completed && (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Debriefed
            </Badge>
          )}
        </div>
      </div>

      {/* Attendee (read-only in debrief) */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">With</label>
        <p className="mt-1 text-sm font-medium text-card-foreground">
          {local.attendee_name || local.employee_email || '—'}
        </p>
      </div>

      {/* Meeting Notes */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <StickyNote className="w-3 h-3" /> Meeting Notes
        </label>
        <textarea
          value={local.meeting_notes || ''}
          onChange={e => setLocal({ ...local, meeting_notes: e.target.value })}
          onBlur={e => update({ meeting_notes: e.target.value })}
          placeholder="Take notes during the meeting, capture key points, decisions..."
          rows={6}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>

      {/* Commitments / Action Items */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Commitments & Action Items</label>
        <div className="mt-2 space-y-1.5">
          {(local.commitments || []).map(c => (
            <div key={c.id} className="flex items-center gap-2 group">
              <button onClick={() => toggleCommitment(c.id)} className="flex-shrink-0">
                {c.status === 'complete' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
              </button>
              <span className={`text-sm flex-1 ${c.status === 'complete' ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                {c.action}
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize">{c.owner}</Badge>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCommitmentText}
              onChange={e => setNewCommitmentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCommitment()}
              placeholder="Add a commitment or action item..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" variant="outline" onClick={addCommitment}>Add</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}