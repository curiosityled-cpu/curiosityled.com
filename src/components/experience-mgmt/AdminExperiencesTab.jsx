import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Clock, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ExperienceFormModal from "@/components/development/ExperienceFormModal";

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

export default function AdminExperiencesTab({ user }) {
  const [experiences, setExperiences] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [assignToEmail, setAssignToEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [exps, allUsers] = await Promise.all([
        base44.entities.DevelopmentExperience.list('-created_date'),
        base44.entities.User.filter({ client_id: user.client_id })
      ]);
      setExperiences(exps);
      setUsers(allUsers);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user.client_id]);

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

      {/* User selector + Log button */}
      <div className="flex gap-2 items-center">
        <select value={assignToEmail} onChange={e => setAssignToEmail(e.target.value)} className="flex-1 h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30">
          <option value="">Log for user...</option>
          {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
        </select>
        <Button size="sm" className="bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => { setEditingExp(null); setShowModal(true); }} disabled={!assignToEmail}>
          <Plus className="w-4 h-4 mr-1.5" /> Log Experience
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-8 text-center">
              <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-800">No experiences found</p>
            </CardContent>
          </Card>
        ) : filtered.map((exp, i) => (
          <motion.div key={exp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-gray-900 leading-snug">{exp.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[exp.status] || 'bg-gray-100 text-gray-600'}`}>{exp.status}</span>
                    </div>
                    <p className="text-xs text-[#0202ff] mb-1">{exp.created_by}</p>
                    {exp.type && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full inline-block mb-2">{EXP_TYPE_LABELS[exp.type] || exp.type}</p>}
                    {exp.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{exp.description}</p>}
                    <div className="flex flex-wrap gap-1">
                      {exp.competencies?.slice(0, 3).map(c => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => { setEditingExp(exp); setAssignToEmail(exp.created_by); setShowModal(true); }} className="text-gray-400 hover:text-[#0202ff] transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(exp.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <ExperienceFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingExp(null); }}
        onSaved={() => { setShowModal(false); setEditingExp(null); load(); }}
        experience={editingExp}
        userEmail={assignToEmail || user?.email}
      />
    </div>
  );
}