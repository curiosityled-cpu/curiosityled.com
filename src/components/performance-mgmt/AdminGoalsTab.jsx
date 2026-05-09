import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, GitBranch, Users, Target, Calendar, MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CreateGoalModal from "@/components/goals/CreateGoalModal";
import EditGoalModal from "@/components/goals/EditGoalModal";
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

export default function AdminGoalsTab({ user }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [cascading, setCascading] = useState(null);

  useEffect(() => { loadGoals(); }, [user]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Goal.filter({ client_id: user.client_id }, "-updated_date");
      setGoals(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (goalData) => {
    const newGoal = await base44.entities.Goal.create({ ...goalData, client_id: user.client_id });
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

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await base44.entities.Goal.delete(confirmDelete.id);
    setGoals(prev => prev.filter(g => g.id !== confirmDelete.id));
    setConfirmDelete(null);
    toast.success("Goal deleted");
  };

  const handleCascade = async (goal) => {
    setCascading(goal.id);
    try {
      await base44.functions.invoke("cascadeGoals", { goal_id: goal.id, client_id: user.client_id });
      toast.success("Goal cascaded to team members");
    } catch {
      toast.error("Failed to cascade goal");
    } finally {
      setCascading(null);
    }
  };

  const handleBulkAssign = async () => {
    try {
      await base44.functions.invoke("bulkAssignGoals", { client_id: user.client_id });
      toast.success("Bulk assignment triggered");
    } catch {
      toast.error("Failed to bulk assign goals");
    }
  };

  const filtered = goals.filter(g => {
    const matchSearch = !search || g.title?.toLowerCase().includes(search.toLowerCase()) || g.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || g.status === filterStatus;
    const matchType = filterType === "all" || g.goal_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <Button onClick={() => setShowCreate(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
          <Plus className="w-4 h-4" /> Create Goal
        </Button>
        <Button variant="outline" onClick={handleBulkAssign} className="gap-1.5">
          <Users className="w-4 h-4" /> Bulk Assign
        </Button>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search goals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="okr_objective">OKR</SelectItem>
            <SelectItem value="coaching_goal">Coaching</SelectItem>
            <SelectItem value="action_item">Action Item</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-500">{filtered.length} goal{filtered.length !== 1 ? "s" : ""} found</p>

      {/* Goals list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No goals match your filters</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {filtered.map((goal, i) => (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Color strip */}
                      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: goal.color || "#0202ff" }} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{goal.title}</h3>
                            {goal.description && (
                              <p className="text-sm text-gray-500 mt-0.5 truncate">{goal.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline" className={`text-xs border ${STATUS_COLORS[goal.status] || STATUS_COLORS.active}`}>
                                {goal.status || "active"}
                              </Badge>
                              <Badge variant="outline" className="text-xs border border-gray-200 text-gray-600">
                                {TYPE_LABELS[goal.goal_type] || "Standard"}
                              </Badge>
                              {goal.timeframe_end && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <Calendar className="w-3 h-3" />
                                  Due {format(new Date(goal.timeframe_end), "MMM d, yyyy")}
                                </span>
                              )}
                              {goal.assigned_to_emails?.length > 0 && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <Users className="w-3 h-3" />
                                  {goal.assigned_to_emails.length} assigned
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">{goal.progress || 0}%</p>
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1">
                                <div className="h-full rounded-full bg-[#0202ff]" style={{ width: `${goal.progress || 0}%` }} />
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingGoal(goal)}>
                                  <Edit3 className="w-3.5 h-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCascade(goal)} disabled={cascading === goal.id}>
                                  {cascading === goal.id
                                    ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                    : <GitBranch className="w-3.5 h-3.5 mr-2" />}
                                  Cascade to Team
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setConfirmDelete(goal)} className="text-red-600 focus:text-red-600">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
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
        title="Delete Goal"
        description={`Are you sure you want to delete "${confirmDelete?.title}"? This cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}