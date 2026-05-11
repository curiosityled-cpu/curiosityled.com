import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, Users, Calendar, CheckCircle2, Clock, Video, MessageSquare, ClipboardList, Zap, BarChart2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import WeeklyCheckInForm from "./oneonone/WeeklyCheckInForm";
import MeetingRecordModal from "./oneonone/MeetingRecordModal";
import ActionTracker from "./oneonone/ActionTracker";
import OneOnOneInsights from "./oneonone/OneOnOneInsights";

const STATUS_STYLES = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
  no_show: "bg-red-50 text-red-700 border-red-200",
};

const MANAGER_ROLES = ["User Level 2", "Admin Level 1", "Admin Level 2", "Super Administrator", "Platform Admin"];
function isManagerRole(role) { return MANAGER_ROLES.includes(role); }

function ScheduleModal({ isOpen, onClose, onSubmit, users }) {
  const [form, setForm] = useState({ participant_email: "", session_date: "", duration_minutes: 30, agenda: "", meeting_link: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.participant_email || !form.session_date) return;
    setSubmitting(true);
    try { await onSubmit(form); setForm({ participant_email: "", session_date: "", duration_minutes: 30, agenda: "", meeting_link: "" }); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Schedule 1-on-1</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Participant *</Label>
            <Select value={form.participant_email} onValueChange={v => setForm(p => ({ ...p, participant_email: v }))}>
              <SelectTrigger><SelectValue placeholder="Select participant..." /></SelectTrigger>
              <SelectContent>{users.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date & Time *</Label>
            <Input type="datetime-local" value={form.session_date} onChange={e => setForm(p => ({ ...p, session_date: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (minutes)</Label>
            <Select value={String(form.duration_minutes)} onValueChange={v => setForm(p => ({ ...p, duration_minutes: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[15, 30, 45, 60, 90].map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Agenda</Label>
            <Textarea placeholder="Topics to discuss..." rows={3} value={form.agenda} onChange={e => setForm(p => ({ ...p, agenda: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Meeting Link (optional)</Label>
            <Input placeholder="https://zoom.us/..." value={form.meeting_link} onChange={e => setForm(p => ({ ...p, meeting_link: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting || !form.participant_email || !form.session_date} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SessionsView({ user, users, isManager }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showSchedule, setShowSchedule] = useState(false);
  const [meetingSession, setMeetingSession] = useState(null);

  useEffect(() => { loadSessions(); }, [user]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const filter = isManager ? { client_id: user.client_id } : { coachee_email: user.email };
      const data = await base44.entities.CoachingSession.filter(filter, "-session_date");
      setSessions(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSchedule = async (form) => {
    try {
      const newSession = await base44.entities.CoachingSession.create({
        client_id: user.client_id,
        coach_email: user.email,
        coachee_email: form.participant_email,
        session_date: new Date(form.session_date).toISOString(),
        duration_minutes: form.duration_minutes,
        agenda: form.agenda,
        meeting_link: form.meeting_link,
        status: "scheduled",
        session_type: "1on1",
      });
      setSessions(prev => [newSession, ...prev]);
      setShowSchedule(false);
      toast.success("1-on-1 scheduled");
    } catch { toast.error("Failed to schedule session"); }
  };

  const markComplete = async (session) => {
    try {
      await base44.entities.CoachingSession.update(session.id, { status: "completed" });
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: "completed" } : s));
      toast.success("Session marked as completed");
    } catch { toast.error("Failed to update session"); }
  };

  const filtered = sessions.filter(s => {
    const participantEmail = s.coachee_email || s.participant_email || "";
    const matchSearch = !search || participantEmail.toLowerCase().includes(search.toLowerCase()) || s.agenda?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const upcoming = sessions.filter(s => s.status === "scheduled" && !isPast(new Date(s.session_date))).length;
  const completedCount = sessions.filter(s => s.status === "completed").length;
  const completionRate = sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Upcoming", value: upcoming, icon: Calendar, color: "#0202ff" },
          { label: "Completed", value: completedCount, icon: CheckCircle2, color: "#00C875" },
          { label: "Completion Rate", value: `${completionRate}%`, icon: Users, color: "#A25DDC" },
        ].map(s => (
          <Card key={s.label} className="border border-gray-100 shadow-sm rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}18` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        {isManager && (
          <Button onClick={() => setShowSchedule(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
            <Plus className="w-4 h-4" /> Schedule 1-on-1
          </Button>
        )}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search sessions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No 1-on-1 sessions found</p>
          {isManager && (
            <Button onClick={() => setShowSchedule(true)} className="mt-4 bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
              <Plus className="w-4 h-4" /> Schedule First 1-on-1
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((session, i) => {
            const participantEmail = session.coachee_email || session.participant_email || "—";
            const participant = users.find(u => u.email === participantEmail);
            const isPastSession = session.session_date && isPast(new Date(session.session_date));
            return (
              <motion.div key={session.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-[#0202ff]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 text-sm">{participant?.full_name || participantEmail}</p>
                          <Badge variant="outline" className={`text-xs border ${STATUS_STYLES[session.status] || STATUS_STYLES.scheduled}`}>
                            {session.status?.replace(/_/g, " ") || "scheduled"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {session.session_date && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(session.session_date), "MMM d, yyyy · h:mm a")}
                            </span>
                          )}
                          {session.duration_minutes && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />{session.duration_minutes} min
                            </span>
                          )}
                          {session.agenda && (
                            <span className="flex items-center gap-1 text-xs text-gray-400 truncate max-w-xs">
                              <MessageSquare className="w-3 h-3 flex-shrink-0" />{session.agenda}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {session.meeting_link && (
                          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => window.open(session.meeting_link, "_blank")}>
                            <Video className="w-3 h-3" /> Join
                          </Button>
                        )}
                        {session.status === "completed" && isManager && (
                          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setMeetingSession(session)}>
                            <ClipboardList className="w-3 h-3" /> Record
                          </Button>
                        )}
                        {session.status === "scheduled" && isPastSession && isManager && (
                          <Button size="sm" className="h-8 gap-1 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => markComplete(session)}>
                            <CheckCircle2 className="w-3 h-3" /> Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <ScheduleModal isOpen={showSchedule} onClose={() => setShowSchedule(false)} onSubmit={handleSchedule} users={users} />
      {meetingSession && (
        <MeetingRecordModal
          isOpen={!!meetingSession}
          onClose={() => setMeetingSession(null)}
          session={meetingSession}
          user={user}
          onSaved={() => setMeetingSession(null)}
        />
      )}
    </div>
  );
}

const SUB_TABS = [
  { id: "sessions", label: "1-on-1s", icon: Calendar },
  { id: "checkin", label: "Check-In", icon: Zap },
  { id: "actions", label: "Actions", icon: ClipboardList },
  { id: "insights", label: "Insights", icon: BarChart2 },
];

export default function OneOnOnesTab({ user }) {
  const [activeTab, setActiveTab] = useState("sessions");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await base44.functions.invoke("listAllUsers", {});
        if (res.data?.users) setUsers(res.data.users.filter(u => u.email !== user.email));
      } catch (e) { console.error(e); }
    };
    loadUsers();
  }, [user]);

  const teamMembers = users.filter(u =>
    u.manager_email === user.email ||
    (user.subordinate_emails || []).includes(u.email)
  );

  const isManager = isManagerRole(user?.app_role || user?.role) || teamMembers.length > 0;

  return (
    <div className="space-y-5">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: active ? "white" : "transparent",
                color: active ? "#0202ff" : "#6b7280",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "sessions" && (
        <SessionsView user={user} users={users} isManager={isManager} />
      )}
      {activeTab === "checkin" && (
        <WeeklyCheckInForm user={user} isManager={isManager} teamMembers={teamMembers} />
      )}
      {activeTab === "actions" && isManager && (
        <ActionTracker user={user} teamMembers={teamMembers} />
      )}
      {activeTab === "actions" && !isManager && (
        <div className="text-center py-12 text-gray-400 text-sm">Action tracking is available to managers.</div>
      )}
      {activeTab === "insights" && (
        <OneOnOneInsights user={user} teamMembers={teamMembers} isEmployee={!isManager} />
      )}
    </div>
  );
}