import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, ChevronDown, ChevronRight, TrendingUp, Target, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CreateGoalModal from "@/components/goals/CreateGoalModal";
import EditGoalModal from "@/components/goals/EditGoalModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const YEARS = [2024, 2025, 2026, 2027];

function ProgressBar({ value, color = "#0202ff" }) {
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

function OKRCard({ goal, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        {/* Objective header */}
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
              <div className="mt-2">
                <ProgressBar value={goal.progress} />
              </div>
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

        {/* Key Results (child goals linked by OKR type or members) */}
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
                      <div className="w-32 flex-shrink-0">
                        <ProgressBar value={50} />
                      </div>
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

export default function OKRsTab({ user }) {
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState("Q2");
  const [selectedYear, setSelectedYear] = useState(2026);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { loadOKRs(); }, [user, selectedQuarter, selectedYear]);

  const loadOKRs = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Goal.filter({
        client_id: user.client_id,
        goal_type: "okr_objective",
        status: "active",
      }, "-created_date");
      setObjectives(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (goalData) => {
    const newGoal = await base44.entities.Goal.create({
      ...goalData,
      goal_type: "okr_objective",
      client_id: user.client_id,
    });
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

  const avgProgress = objectives.length > 0
    ? Math.round(objectives.reduce((s, g) => s + (g.progress || 0), 0) / objectives.length)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-2">
          {/* Quarter selector */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {QUARTERS.map(q => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${selectedQuarter === q ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                {q}
              </button>
            ))}
          </div>
          {/* Year selector */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {YEARS.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${selectedYear === y ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
          <Plus className="w-4 h-4" /> New Objective
        </Button>
      </div>

      {/* Overall progress */}
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

      {/* OKR list */}
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

      {/* Modals */}
      <CreateGoalModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      {editingGoal && (
        <EditGoalModal
          isOpen={!!editingGoal}
          onClose={() => setEditingGoal(null)}
          onSubmit={handleUpdate}
          goal={editingGoal}
        />
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