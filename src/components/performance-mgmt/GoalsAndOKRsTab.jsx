import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Plus, Search, GitBranch, Users, Target, Calendar,
  MoreHorizontal, Trash2, Edit3, TrendingUp, ChevronDown, ChevronRight, UserPlus,
  Grid3X3, LayoutList, BarChart3, TrendingDown, Minus
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CreateGoalModal from "@/components/goals/CreateGoalModal";
import EditGoalModal from "@/components/goals/EditGoalModal";
import CascadeGoalDialog from "@/components/goals/CascadeGoalDialog";
import GoalCard from "@/components/goals/GoalCard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const STATUS_COLORS = {
  active: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  draft: "bg-gray-50 text-gray-700 border-gray-200",
  archived: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const TYPE_LABELS = {
  standard: "Standard",
  okr_objective: "OKR",
  coaching_goal: "Coaching",
  action_item: "Action Item",
};

function ProgressBar({ value }) {
  const clamp = Math.min(100, Math.max(0, value || 0));
  const barColor = clamp >= 80 ? "#00C875" : clamp >= 50 ? "#0202ff" : clamp >= 25 ? "#FFCB00" : "#E2445C";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${clamp}%`, backgroundColor: barColor }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{clamp}%</span>
    </div>
  );
}

// ─── Goals sub-view ────────────────────────────────────────────────────────────

function GoalsView({ user }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showCreate, setShowCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  useEffect(() => { loadGoals(); }, [user?.email]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Goal.list("-updated_date");
      setGoals(data);
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (goalData) => {
    const newGoal = await base44.entities.Goal.create(goalData);
    setGoals(prev => [newGoal, ...prev]);
    setShowCreate(false);
    toast.success("Goal created");
  };

  const handleUpdate = async (goalId, data) => {
    await base44.entities.Goal.update(goalId, data);
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...data } : g));
    setEditingGoal(null);
    toast.success("Goal updated");
  };

  const handleDelete = async (goalId) => {
    await base44.entities.Goal.delete(goalId);
    setGoals(prev => prev.filter(g => g.id !== goalId));
    toast.success("Goal deleted");
  };

  const filtered = goals.filter(g => {
    if (!search) return true;
    return g.title?.toLowerCase().includes(search.toLowerCase()) || g.description?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3">
        <Button onClick={() => setShowCreate(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
          <Plus className="w-4 h-4" /> Create Goal
        </Button>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search goals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}>
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
            <LayoutList className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{search ? "No goals found" : "No goals yet"}</p>
          {!search && (
            <Button onClick={() => setShowCreate(true)} className="mt-4 bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
              <Plus className="w-4 h-4" /> Create Your First Goal
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
          {filtered.map((goal, i) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              viewMode={viewMode}
              index={i}
              onDelete={handleDelete}
              onEdit={setEditingGoal}
              onRefresh={loadGoals}
            />
          ))}
        </div>
      )}

      <CreateGoalModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      {editingGoal && (
        <EditGoalModal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} onSubmit={handleUpdate} goal={editingGoal} />
      )}
    </div>
  );
}

// ─── OKRs sub-view ─────────────────────────────────────────────────────────────

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const YEARS = [2024, 2025, 2026, 2027];

function OKRCard({ goal, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <div
          className="p-4 cursor-pointer select-none"
          style={{ background: `linear-gradient(to right, ${goal.color || "#0202ff"}10, white)` }}
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${goal.color || "#0202ff"}20` }}>
              <TrendingUp className="w-4 h-4" style={{ color: goal.color || "#0202ff" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 text-sm">{goal.title}</h3>
                <Badge variant="outline" className="text-xs border border-blue-200 text-blue-700 bg-blue-50">Objective</Badge>
              </div>
              {goal.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{goal.description}</p>}
              <div className="mt-2"><ProgressBar value={goal.progress} /></div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit(goal); }}>
                <Edit3 className="w-3.5 h-3.5 text-gray-400" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDelete(goal); }}>
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </Button>
              {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </div>
          </div>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              {goal.groups?.length > 0 ? (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {goal.groups.map((kr, i) => (
                    <div key={kr.id || i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                      <Target className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium truncate">{kr.title || `Key Result ${i + 1}`}</p>
                      </div>
                      <div className="w-32 flex-shrink-0"><ProgressBar value={50} /></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">
                  No key results defined. Edit this objective to add key results.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function OKRsView({ user }) {
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState("Q2");
  const [selectedYear, setSelectedYear] = useState(2026);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [bulkAssigning, setBulkAssigning] = useState(false);

  useEffect(() => { loadOKRs(); }, [user?.email, selectedQuarter, selectedYear]);

  const loadOKRs = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Goal.filter({ client_id: user.client_id, goal_type: "okr_objective", status: "active" }, "-created_date");
      setObjectives(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (goalData) => {
    const newGoal = await base44.entities.Goal.create({ ...goalData, goal_type: "okr_objective", client_id: user.client_id });
    setObjectives(prev => [newGoal, ...prev]);
    setShowCreate(false);
    toast.success("Objective created");
  };

  const handleUpdate = async (goalId, data) => {
    await base44.entities.Goal.update(goalId, data);
    setObjectives(prev => prev.map(g => g.id === goalId ? { ...g, ...data } : g));
    setEditingGoal(null);
    toast.success("Objective updated");
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await base44.entities.Goal.delete(confirmDelete.id);
    setObjectives(prev => prev.filter(g => g.id !== confirmDelete.id));
    setConfirmDelete(null);
    toast.success("Objective deleted");
  };

  const handleBulkAssign = async () => {
    setBulkAssigning(true);
    try {
      await base44.functions.invoke("bulkAssignGoals", { client_id: user.client_id, goal_type: "okr_objective" });
      toast.success("OKR objectives bulk assigned to team members");
    } catch {
      toast.error("Failed to bulk assign OKRs");
    } finally {
      setBulkAssigning(false);
    }
  };

  const avgProgress = objectives.length > 0
    ? Math.round(objectives.reduce((s, g) => s + (g.progress || 0), 0) / objectives.length)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {QUARTERS.map(q => (
              <button key={q} onClick={() => setSelectedQuarter(q)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${selectedQuarter === q ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {YEARS.map(y => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${selectedYear === y ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {y}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBulkAssign} disabled={bulkAssigning} className="gap-1.5">
            {bulkAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Bulk Assign
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
            <Plus className="w-4 h-4" /> New Objective
          </Button>
        </div>
      </div>

      {objectives.length > 0 && (
        <Card className="border border-gray-100 shadow-sm rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Overall OKR Progress — {selectedQuarter} {selectedYear}</p>
              <span className="text-2xl font-bold text-[#0202ff]">{avgProgress}%</span>
            </div>
            <ProgressBar value={avgProgress} />
            <p className="text-xs text-gray-500 mt-2">{objectives.length} active objective{objectives.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
      ) : objectives.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No OKR objectives for {selectedQuarter} {selectedYear}</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Create your first objective to get started</p>
          <Button onClick={() => setShowCreate(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
            <Plus className="w-4 h-4" /> New Objective
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {objectives.map(obj => (
            <OKRCard key={obj.id} goal={obj} onEdit={setEditingGoal} onDelete={setConfirmDelete} />
          ))}
        </div>
      )}

      <CreateGoalModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} defaultGoalType="okr_objective" />
      {editingGoal && (
        <EditGoalModal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} onSubmit={handleUpdate} goal={editingGoal} />
      )}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Objective"
        description={`Delete "${confirmDelete?.title}"? This cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}

// ─── KPIs sub-view ──────────────────────────────────────────────────────────────

const KPI_DIRECTION_CONFIG = {
  higher_better: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
  lower_better: { icon: TrendingDown, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
  maintain: { icon: Minus, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
};

function KpiCard({ kpi, onEdit, onDelete, goals }) {
  const direction = KPI_DIRECTION_CONFIG[kpi.direction] || KPI_DIRECTION_CONFIG.higher_better;
  const DirIcon = direction.icon;
  const progress = kpi.current_value != null && kpi.target_value != null
    ? Math.min(100, Math.max(0, Math.round((kpi.current_value / kpi.target_value) * 100)))
    : 0;
  const onTrack = kpi.direction === "higher_better"
    ? (kpi.current_value || 0) >= (kpi.target_value || 0)
    : kpi.direction === "lower_better"
      ? (kpi.current_value || 0) <= (kpi.target_value || 0)
      : Math.abs((kpi.current_value || 0) - (kpi.target_value || 0)) <= ((kpi.target_value || 1) * 0.05);
  const linkedGoals = (goals || []).filter(g => (kpi.linked_goal_ids || []).includes(g.id));

  return (
    <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${direction.bg}`}>
              <DirIcon className={`w-4 h-4 ${direction.color}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{kpi.title}</h3>
              {kpi.description && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{kpi.description}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"><MoreHorizontal className="w-4 h-4 text-gray-400" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(kpi)}><Edit3 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => onDelete(kpi)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-medium">CURRENT</span>
              <span className="text-[10px] text-gray-400 font-medium">TARGET</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">{kpi.current_value != null ? kpi.current_value.toLocaleString() : "—"}{kpi.unit ? <span className="text-xs font-normal text-gray-400 ml-0.5">{kpi.unit}</span> : null}</span>
              <span className="text-sm text-gray-400">{kpi.target_value != null ? kpi.target_value.toLocaleString() : "—"}{kpi.unit ? <span className="text-[10px] ml-0.5">{kpi.unit}</span> : null}</span>
            </div>
          </div>
          <div className={`flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium ${onTrack ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
            {onTrack ? "On track" : "Off track"}
          </div>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: onTrack ? "#00C875" : "#FFCB00" }}
          />
        </div>

        {kpi.department && (
          <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-200 mb-2">
            {kpi.department}
          </Badge>
        )}

        {linkedGoals.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100">
            <span className="text-[10px] text-gray-400 mr-1">Supports:</span>
            {linkedGoals.map(g => (
              <Badge key={g.id} className="text-[10px] bg-blue-50 text-blue-700 border-blue-100">
                {g.title}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function KPIsView({ user }) {
  const [kpis, setKpis] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { loadData(); }, [user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kpiData, goalData] = await Promise.all([
        base44.entities.KPI.filter({ status: "active" }, "-updated_date"),
        base44.entities.Goal.filter({ status: "active" }, "title")
      ]);
      setKpis(kpiData);
      setGoals(goalData);
    } catch {
      toast.error("Failed to load KPIs");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    const created = await base44.entities.KPI.create(data);
    setKpis(prev => [created, ...prev]);
    setShowCreate(false);
    toast.success("KPI created");
  };

  const handleUpdate = async (kpiId, data) => {
    await base44.entities.KPI.update(kpiId, data);
    setKpis(prev => prev.map(k => k.id === kpiId ? { ...k, ...data } : k));
    setEditingKpi(null);
    toast.success("KPI updated");
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await base44.entities.KPI.delete(confirmDelete.id);
    setKpis(prev => prev.filter(k => k.id !== confirmDelete.id));
    setConfirmDelete(null);
    toast.success("KPI deleted");
  };

  const filtered = kpis.filter(k => {
    if (!search) return true;
    return k.title?.toLowerCase().includes(search.toLowerCase())
      || k.description?.toLowerCase().includes(search.toLowerCase())
      || k.department?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3">
        <Button onClick={() => setShowCreate(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
          <Plus className="w-4 h-4" /> Add KPI
        </Button>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search KPIs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{search ? "No KPIs found" : "No KPIs yet"}</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Track operational metrics that support your goals</p>
          {!search && (
            <Button onClick={() => setShowCreate(true)} className="mt-2 bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
              <Plus className="w-4 h-4" /> Add Your First KPI
            </Button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(kpi => (
            <KpiCard key={kpi.id} kpi={kpi} goals={goals} onEdit={setEditingKpi} onDelete={setConfirmDelete} />
          ))}
        </div>
      )}

      <KpiFormModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} goals={goals} />
      {editingKpi && (
        <KpiFormModal isOpen={!!editingKpi} onClose={() => setEditingKpi(null)} onSubmit={(data) => handleUpdate(editingKpi.id, data)} goals={goals} initial={editingKpi} />
      )}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete KPI"
        description={`Delete "${confirmDelete?.title}"? This cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}

// ─── KPI Form Modal ───────────────────────────────────────────────────────────

function KpiFormModal({ isOpen, onClose, onSubmit, goals, initial }) {
  const [form, setForm] = useState({ title: "", description: "", current_value: null, target_value: null, unit: "%", direction: "higher_better", department: "", linked_goal_ids: [] });

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || "",
        description: initial.description || "",
        current_value: initial.current_value ?? null,
        target_value: initial.target_value ?? null,
        unit: initial.unit || "%",
        direction: initial.direction || "higher_better",
        department: initial.department || "",
        linked_goal_ids: initial.linked_goal_ids || [],
      });
    } else {
      setForm({ title: "", description: "", current_value: null, target_value: null, unit: "%", direction: "higher_better", department: "", linked_goal_ids: [] });
    }
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const canSave = form.title.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit KPI" : "Add KPI"}</h2>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">KPI Name</label>
            <Input placeholder="e.g., SLA Adherence" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Description</label>
            <Input placeholder="What does this measure?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Current</label>
              <Input type="number" placeholder="0" value={form.current_value ?? ""} onChange={e => setForm(f => ({ ...f, current_value: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Target</label>
              <Input type="number" placeholder="0" value={form.target_value ?? ""} onChange={e => setForm(f => ({ ...f, target_value: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Unit</label>
              <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="%">%</SelectItem>
                  <SelectItem value="hrs">hrs</SelectItem>
                  <SelectItem value="count">count</SelectItem>
                  <SelectItem value="$">$</SelectItem>
                  <SelectItem value="pts">pts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Direction</label>
              <Select value={form.direction} onValueChange={v => setForm(f => ({ ...f, direction: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="higher_better">Higher is better</SelectItem>
                  <SelectItem value="lower_better">Lower is better</SelectItem>
                  <SelectItem value="maintain">Maintain range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Department</label>
              <Input placeholder="e.g., Operations" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
            </div>
          </div>

          {goals.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Linked Goals</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                {goals.filter(g => g.goal_type !== "kpi").map(g => (
                  <button
                    key={g.id}
                    onClick={() => setForm(f => ({
                      ...f,
                      linked_goal_ids: f.linked_goal_ids.includes(g.id)
                        ? f.linked_goal_ids.filter(id => id !== g.id)
                        : [...f.linked_goal_ids, g.id]
                    }))}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                      form.linked_goal_ids.includes(g.id)
                        ? "bg-[#0202ff] text-white border-[#0202ff]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => onSubmit(form)} disabled={!canSave}>
              {initial ? "Save Changes" : "Create KPI"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Combined tab ──────────────────────────────────────────────────────────────

const SUB_TABS = [
  { id: "goals", label: "Goals", icon: Target },
  { id: "kpis", label: "KPIs", icon: BarChart3 },
  { id: "okrs", label: "OKRs", icon: TrendingUp },
];

export default function GoalsAndOKRsTab({ user }) {
  const [subTab, setSubTab] = useState("goals");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit overflow-x-auto">
        {SUB_TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                subTab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {subTab === "goals" && <GoalsView user={user} />}
      {subTab === "kpis" && <KPIsView user={user} />}
      {subTab === "okrs" && <OKRsView user={user} />}
    </div>
  );
}