import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Clock, Search, Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ExperienceFormModal from "@/components/development/ExperienceFormModal";
import SessionLogModal from "@/components/coaching/SessionLogModal";
import ExperienceCard from "@/components/experience-mgmt/ExperienceCard";
import { loadEngagementMap } from "@/lib/coaching/engagementChildren";

const EXP_TYPE_LABELS = {
  leadership_coaching: "Leadership Coaching", stretch_project: "Stretch Project",
  leadership_opportunity: "Leadership Opportunity", mentorship: "Mentorship",
  conference_event: "Conference / Event", volunteer_leadership: "Volunteer Leadership",
  cross_functional_project: "Cross-Functional Project", speaking_opportunity: "Speaking Opportunity", other: "Other",
};

const STATUS_BADGE = {
  planned: "bg-purple-100 text-purple-700", active: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-gray-100 text-gray-500",
  paused: "bg-amber-100 text-amber-700",
};

export default function AdminExperiencesTab({ user, coacheeEmails }) {
  const scoped = (coacheeEmails || []).length > 0;
  const [experiences, setExperiences] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [assignToEmail, setAssignToEmail] = useState('');
  const [groupByEngagement, setGroupByEngagement] = useState(false);
  const [engagementMap, setEngagementMap] = useState({});
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionExp, setSessionExp] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [exps, allUsers] = await Promise.all([
        base44.entities.DevelopmentExperience.list('-created_date'),
        base44.entities.User.filter({ client_id: user.client_id })
      ]);
      let filteredExps;
      if (scoped) {
        // Leadership Coaches: only experiences belonging to their coachees
        filteredExps = exps.filter(e => coacheeEmails.includes(e.user_email));
        setUsers(allUsers.filter(u => coacheeEmails.includes(u.email)));
      } else {
        const adminRoles = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator'];
        const adminEmails = new Set(allUsers.filter(u => adminRoles.includes(u.app_role)).map(u => u.email));
        filteredExps = exps.filter(e => adminEmails.has(e.created_by));
        setUsers(allUsers);
      }
      setExperiences(filteredExps);
      const engMap = await loadEngagementMap(filteredExps.map(e => e.engagement_id));
      setEngagementMap(engMap);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user.client_id, coacheeEmails]);

  useEffect(() => { load(); }, [load]);

  const active = experiences.filter(e => e.status !== 'completed' && e.status !== 'cancelled');
  const completed = experiences.filter(e => e.status === 'completed');

  const filtered = (activeTab === 'active' ? active : completed).filter(e => {
    const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase());
    const matchUser = selectedUserEmail === 'all' || e.created_by === selectedUserEmail;
    return matchSearch && matchUser;
  });

  const handleDelete = async (id) => {
    await base44.entities.DevelopmentExperience.delete(id);
    toast.success('Experience deleted');
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: experiences.length, color: 'text-amber-600' },
          { label: 'Active', value: active.length, color: 'text-blue-600' },
          { label: 'Completed', value: completed.length, color: 'text-emerald-600' },
        ].map(s => (
          <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search experiences..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <select value={selectedUserEmail} onChange={e => setSelectedUserEmail(e.target.value)} className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30">
          <option value="all">All Users</option>
          {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1">
        <button onClick={() => setActiveTab("active")} className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${activeTab === "active" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>Active ({active.length})</button>
        <button onClick={() => setActiveTab("completed")} className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${activeTab === "completed" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>Completed ({completed.length})</button>
      </div>

      {/* Group-by toggle (coaches only) */}
      {scoped && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Group by engagement</span>
          <button
            onClick={() => setGroupByEngagement(g => !g)}
            className={`relative w-10 h-5 rounded-full transition-colors ${groupByEngagement ? 'bg-[#0202ff]' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${groupByEngagement ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      )}

      {/* User selector + Log buttons */}
      <div className="flex gap-2 items-center">
        <select value={assignToEmail} onChange={e => setAssignToEmail(e.target.value)} className="flex-1 h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30">
          <option value="">Log for user...</option>
          {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
        </select>
        <Button size="sm" variant="outline" className="border-[#0202ff]/30 text-[#0202ff]" onClick={() => { setSessionExp(null); setShowSessionModal(true); }}>
          <Calendar className="w-4 h-4 mr-1.5" /> Log Session
        </Button>
        <Button size="sm" className="bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => { setEditingExp(null); setShowModal(true); }} disabled={!assignToEmail}>
          <Plus className="w-4 h-4 mr-1.5" /> Log Experience
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardContent className="p-8 text-center">
            <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">No experiences found</p>
          </CardContent>
        </Card>
      ) : groupByEngagement && scoped ? (
        <div className="space-y-4">
          {Object.entries(
            filtered.reduce((acc, exp) => {
              const key = exp.engagement_id || '__unlinked__';
              (acc[key] = acc[key] || []).push(exp);
              return acc;
            }, {})
          ).map(([key, exps]) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <h3 className="text-sm font-semibold text-gray-700">
                  {key === '__unlinked__' ? 'Ad-hoc / Unlinked' : engagementMap[key]?.title || 'Unknown engagement'}
                </h3>
                <span className="text-xs text-gray-400">({exps.length})</span>
              </div>
              <div className="space-y-3">
                {exps.map((exp, i) => (
                  <ExperienceCard
                    key={exp.id}
                    exp={exp}
                    index={i}
                    onEdit={(e) => { setEditingExp(e); setAssignToEmail(e.user_email || e.created_by); setShowModal(true); }}
                    onDelete={handleDelete}
                    onLogSession={scoped ? (e) => { setSessionExp(e); setShowSessionModal(true); } : null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exp, i) => (
            <ExperienceCard
              key={exp.id}
              exp={exp}
              index={i}
              onEdit={(e) => { setEditingExp(e); setAssignToEmail(e.user_email || e.created_by); setShowModal(true); }}
              onDelete={handleDelete}
              onLogSession={scoped ? (e) => { setSessionExp(e); setShowSessionModal(true); } : null}
            />
          ))}
        </div>
      )}

      <ExperienceFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingExp(null); }}
        onSaved={() => { setShowModal(false); setEditingExp(null); load(); }}
        experience={editingExp}
        userEmail={assignToEmail || user?.email}
        coachMode={scoped}
        coachEmail={user?.email}
        clientId={user?.client_id}
      />

      <SessionLogModal
        open={showSessionModal}
        onClose={() => { setShowSessionModal(false); setSessionExp(null); }}
        onSaved={() => { setShowSessionModal(false); setSessionExp(null); load(); }}
        engagementId={sessionExp?.engagement_id}
        coachEmail={user?.email}
        coacheeEmail={sessionExp?.user_email}
        experienceId={sessionExp?.id}
        experienceTitle={sessionExp?.title}
      />
    </div>
  );
}