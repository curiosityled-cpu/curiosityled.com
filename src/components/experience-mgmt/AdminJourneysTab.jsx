import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layers, Briefcase, BookOpen, Clock, CheckCircle2, Search, Plus, Pencil, Trash2, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import CreateDevelopmentPlanModal from "@/components/development/CreateDevelopmentPlanModal";
import DeleteJourneyDialog from "@/components/development/DeleteJourneyDialog";

const STATUS_BADGE = {
  active: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  draft: "bg-gray-100 text-gray-600",
};

export default function AdminJourneysTab({ user }) {
  const [plans, setPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allPlans, allUsers] = await Promise.all([
        base44.entities.DevelopmentPlan.list("-created_date"),
        base44.entities.User.filter({ client_id: user.client_id })
      ]);
      const adminRoles = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator'];
      const adminEmails = new Set(allUsers.filter(u => adminRoles.includes(u.app_role)).map(u => u.email));
      setPlans(allPlans.filter(p => adminEmails.has(p.created_by)));
      setUsers(allUsers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.client_id]);

  useEffect(() => { load(); }, [load]);

  const filtered = plans.filter(p => {
    const matchStatus = activeTab === 'active'
      ? p.status === 'active' || p.status === 'paused'
      : p.status === 'completed';
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchUser = selectedUserEmail === 'all' || p.created_by === selectedUserEmail;
    return matchStatus && matchSearch && matchUser;
  });

  const activePlans = plans.filter(p => p.status === 'active' || p.status === 'paused');
  const completedPlans = plans.filter(p => p.status === 'completed');

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Journeys', value: plans.length, color: 'text-[#0202ff]' },
          { label: 'Active', value: activePlans.length, color: 'text-blue-600' },
          { label: 'Completed', value: completedPlans.length, color: 'text-emerald-600' },
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
          <Input placeholder="Search journeys..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <select
          value={selectedUserEmail}
          onChange={e => setSelectedUserEmail(e.target.value)}
          className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30"
        >
          <option value="all">All Users</option>
          {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
        </select>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1">
        <button onClick={() => setActiveTab("active")} className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${activeTab === "active" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          Active ({activePlans.length})
        </button>
        <button onClick={() => setActiveTab("completed")} className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${activeTab === "completed" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          Completed ({completedPlans.length})
        </button>
      </div>

      <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => { setEditingPlan(null); setShowModal(true); }}>
        <Plus className="w-4 h-4 mr-1.5" /> New Journey
      </Button>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-8 text-center">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-800">No journeys found</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-gray-900 leading-snug">{plan.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[plan.status] || 'bg-gray-100 text-gray-600'}`}>{plan.status}</span>
                      </div>
                      {plan.created_by && <p className="text-xs text-[#0202ff] mb-1">{plan.created_by}</p>}
                      {plan.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{plan.description}</p>}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {plan.target_competencies?.slice(0, 3).map(c => (
                          <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{c}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {plan.experiences?.length > 0 && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {plan.experiences.length} exp</span>}
                        {plan.learning_items?.length > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {plan.learning_items.length} resources</span>}
                        {plan.target_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due {new Date(plan.target_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => { setEditingPlan(plan); setShowModal(true); }} className="text-gray-400 hover:text-[#0202ff] transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeletingPlan(plan)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <CreateDevelopmentPlanModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingPlan(null); }}
        onSaved={() => { setShowModal(false); setEditingPlan(null); load(); }}
        userEmail={editingPlan?.created_by || user?.email}
        plan={editingPlan}
      />

      <DeleteJourneyDialog
        open={!!deletingPlan}
        onClose={() => setDeletingPlan(null)}
        plan={deletingPlan}
        onDeleted={() => { setDeletingPlan(null); load(); }}
      />
    </div>
  );
}