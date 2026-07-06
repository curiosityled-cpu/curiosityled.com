import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Calendar, Clock, ChevronRight, Plus, CheckCircle2,
  Circle, AlertCircle, CalendarPlus, StickyNote, ArrowRight, Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

// Determine if a calendar event looks like a 1:1 (2 attendees, or title contains "1:1" or "1 on 1")
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
  const hasNotes = hasRecord && !!record.meeting_notes;

  const handleClick = () => {
    if (hasRecord) {
      onOpenRecord(record);
    } else {
      onPrepare(meeting);
    }
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
              {hasNotes && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Notes added</Badge>}
              {!prepStarted && !hasNotes && <Badge variant="outline" className="text-[10px] py-0 px-1.5">Scheduled</Badge>}
            </div>
          )}
          {!hasRecord && (
            <p className="text-xs text-muted-foreground mt-2 ml-10">Tap to start preparing</p>
          )}
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
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Fetch upcoming calendar events
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
        // Recent past without any notes — also needs debrief
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

  // Create or open a record for a calendar event
  const handlePrepare = async (event) => {
    if (!event?.id) return;
    // Check if record already exists
    const existing = records.find(r => r.calendar_event_id === event.id);
    if (existing) {
      setSelectedRecord(existing);
      return;
    }
    // Create new record linked to this calendar event
    try {
      const meetingDate = event.start ? new Date(event.start) : new Date();
      const newRecord = await base44.entities.MeetingRecord.create({
        manager_email: user.email,
        employee_email: '', // Will be filled during prep
        attendee_name: event.title?.replace(/1:1|1 on 1/i, '').trim() || 'Direct Report',
        meeting_date: meetingDate.toISOString().split('T')[0],
        start_time: event.start,
        calendar_event_id: event.id,
        calendar_source: event.source,
        title: event.title || '1:1 Meeting',
        status: 'preparing',
        agenda_items: [],
        commitments: [],
      });
      queryClient.invalidateQueries({ queryKey: ['ooo-records', user?.email] });
      setSelectedRecord(newRecord);
    } catch (e) {
      console.error('Error creating meeting record:', e);
    }
  };

  const handleOpenRecord = (record) => setSelectedRecord(record);

  // Close record panel
  const handleCloseRecord = () => {
    setSelectedRecord(null);
    queryClient.invalidateQueries({ queryKey: ['ooo-records', user?.email] });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-10">
      {/* Header */}
      <div className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">1:1s</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Plan, prepare, and debrief your one-on-ones in one place.</p>
          </div>
          <Button
            size="sm"
            className="flex items-center gap-1.5 flex-shrink-0"
            onClick={() => {
              // Create a blank manual record
              const today = new Date().toISOString().split('T')[0];
              base44.entities.MeetingRecord.create({
                manager_email: user.email,
                employee_email: '',
                attendee_name: 'New 1:1',
                meeting_date: today,
                title: '1:1 Meeting',
                status: 'scheduled',
                calendar_source: 'manual',
                agenda_items: [],
                commitments: [],
              }).then(r => {
                queryClient.invalidateQueries({ queryKey: ['ooo-records', user?.email] });
                setSelectedRecord(r);
              });
            }}
          >
            <Plus className="w-4 h-4" /> New 1:1
          </Button>
        </div>
      </div>

      {/* Record Workspace Panel */}
      <AnimatePresence>
        {selectedRecord && (
          <RecordWorkspace
            key={selectedRecord.id}
            record={selectedRecord}
            userEmail={user?.email}
            onClose={handleCloseRecord}
          />
        )}
      </AnimatePresence>

      {/* Hub Content */}
      {!selectedRecord && (
        <div className="space-y-8">
          {/* Upcoming 1:1s */}
          <section className="space-y-3">
            <div className="flex items-end justify-between px-1">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
                <p className="text-xs text-muted-foreground mt-0.5">Synced from your calendar. Tap to prepare.</p>
              </div>
              {!loadingCalendar && !calendarData?.connected && (
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
                    onOpenRecord={handleOpenRecord}
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
                    onOpenRecord={handleOpenRecord}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <Inbox className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming 1:1s found.</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Connect your calendar or create a new 1:1 manually.</p>
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
                  <DebriefCard key={record.id} record={record} onOpen={handleOpenRecord} />
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
                  <PastCard key={record.id} record={record} onOpen={handleOpenRecord} />
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
                When you connect your calendar, upcoming 1:1s will appear here automatically. You can also create a new 1:1 manually to start preparing.
              </p>
              <Button className="mt-4" size="sm" onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                base44.entities.MeetingRecord.create({
                  manager_email: user.email,
                  employee_email: '',
                  attendee_name: 'New 1:1',
                  meeting_date: today,
                  title: '1:1 Meeting',
                  status: 'scheduled',
                  calendar_source: 'manual',
                  agenda_items: [],
                  commitments: [],
                }).then(r => {
                  queryClient.invalidateQueries({ queryKey: ['ooo-records', user?.email] });
                  setSelectedRecord(r);
                });
              }}>
                <Plus className="w-4 h-4" /> Create your first 1:1
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Record Workspace (inline panel for prep / notes / debrief) ──
function RecordWorkspace({ record, userEmail, onClose }) {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState(record);
  const [newAgendaText, setNewAgendaText] = useState('');
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

  const addAgendaItem = () => {
    if (!newAgendaText.trim()) return;
    const items = [...(local.agenda_items || []), { id: crypto.randomUUID(), text: newAgendaText.trim(), completed: false }];
    update({ agenda_items: items });
    setNewAgendaText('');
  };

  const toggleAgendaItem = (id) => {
    const items = (local.agenda_items || []).map(i => i.id === id ? { ...i, completed: !i.completed } : i);
    update({ agenda_items: items });
  };

  const removeAgendaItem = (id) => {
    const items = (local.agenda_items || []).filter(i => i.id !== id);
    update({ agenda_items: items });
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
      className="space-y-5"
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

      {/* Attendee field */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">With</label>
        <input
          type="text"
          value={local.attendee_name || ''}
          onChange={e => setLocal({ ...local, attendee_name: e.target.value })}
          onBlur={e => update({ attendee_name: e.target.value })}
          placeholder="Direct report name"
          className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Prep: Agenda Items */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> Prep Agenda
        </label>
        <div className="mt-2 space-y-1.5">
          {(local.agenda_items || []).map(item => (
            <div key={item.id} className="flex items-center gap-2 group">
              <button onClick={() => toggleAgendaItem(item.id)} className="flex-shrink-0">
                {item.completed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
              </button>
              <span className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                {item.text}
              </span>
              <button
                onClick={() => removeAgendaItem(item.id)}
                className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newAgendaText}
              onChange={e => setNewAgendaText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAgendaItem()}
              placeholder="Add a topic to discuss..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" variant="outline" onClick={addAgendaItem}>Add</Button>
          </div>
        </div>
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