
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, LayoutGrid, Calendar as CalendarIcon, BarChart3, List } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/components/useAuth";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { usePageContext } from "../Layout";
import BoardTableView from "@/components/goals/board/BoardTableView";
import BoardKanbanView from "@/components/goals/board/BoardKanbanView";
import BoardCalendarView from "@/components/goals/board/BoardCalendarView";
import BoardTimelineView from "@/components/goals/board/BoardTimelineView";
import ColumnManager from "@/components/goals/board/ColumnManager";
import GroupManager from "@/components/goals/board/GroupManager";

function GoalBoard() {
  const location = useLocation();
  const { user } = useAuth();
  const { updatePageContext } = usePageContext();
  
  const [goal, setGoal] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("table");
  const [showNewMilestoneModal, setShowNewMilestoneModal] = useState(false);
  const [newMilestoneGroupId, setNewMilestoneGroupId] = useState(null);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const goalId = searchParams.get('goalId');

  useEffect(() => {
    if (goalId) {
      loadGoalAndMilestones();
    }
  }, [goalId]);

  const loadGoalAndMilestones = async () => {
    if (!goalId) return;

    setLoading(true);
    try {
      const goals = await base44.entities.Goal.filter({ id: goalId });
      if (goals.length === 0) {
        toast.error('Goal not found');
        return;
      }
      
      const loadedGoal = goals[0];
      setGoal(loadedGoal);

      if (!loadedGoal.goal_config) {
        const defaultConfig = {
          columns: [
            { id: 'title', title: 'Milestone', type: 'text', width: 300 },
            { id: 'status', title: 'Status', type: 'status', width: 150, options: ['not_started', 'working_on_it', 'done', 'stuck'] },
            { id: 'priority', title: 'Priority', type: 'priority', width: 120, options: ['low', 'medium', 'high', 'critical'] },
            { id: 'due_date', title: 'Due Date', type: 'date', width: 150 },
            { id: 'owner', title: 'Owner', type: 'people', width: 150 }
          ],
          groups: [
            { id: 'group-1', title: 'Phase 1', color: '#3b82f6', collapsed: false, hidden_columns: [] }
          ],
          view_type: 'table'
        };

        await base44.entities.Goal.update(goalId, { goal_config: defaultConfig });
        loadedGoal.goal_config = defaultConfig;
        setGoal(loadedGoal);
      }

      setCurrentView(loadedGoal.goal_config?.view_type || 'table');

      const goalMilestones = await base44.entities.Milestone.filter({ goal_id: goalId }, 'order_index');
      setMilestones(goalMilestones);

      updatePageContext({
        viewing_focus: 'goal_board',
        visible_data_summary: {
          goal_id: goalId,
          goal_title: loadedGoal.title,
          milestone_count: goalMilestones.length,
          current_view: currentView
        }
      });

    } catch (error) {
      console.error('Error loading goal:', error);
      toast.error('Failed to load goal');
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = async (newView) => {
    setCurrentView(newView);
    
    if (goal) {
      try {
        await base44.entities.Goal.update(goal.id, {
          goal_config: {
            ...goal.goal_config,
            view_type: newView
          }
        });
      } catch (error) {
        console.error('Error updating view:', error);
      }
    }
  };

  const handleCreateMilestone = async (milestoneData, groupId = null) => {
    try {
      const targetGroupId = groupId || newMilestoneGroupId || goal.goal_config?.groups[0]?.id || 'group-1';
      const groupMilestones = milestones.filter(m => m.group_id === targetGroupId);

      const newMilestone = await base44.entities.Milestone.create({
        goal_id: goal.id,
        group_id: targetGroupId,
        title: milestoneData.title,
        order_index: groupMilestones.length,
        data: milestoneData.data || {},
        priority: milestoneData.priority || 'medium',
        status: milestoneData.status || 'not_started'
      });

      setMilestones([...milestones, newMilestone]);
      setShowNewMilestoneModal(false);
      setNewMilestoneGroupId(null);
      toast.success('Milestone created successfully');
    } catch (error) {
      console.error('Error creating milestone:', error);
      toast.error('Failed to create milestone');
    }
  };

  const handleUpdateMilestone = async (milestoneId, updates) => {
    try {
      await base44.entities.Milestone.update(milestoneId, updates);
      setMilestones(milestones.map(m => 
        m.id === milestoneId ? { ...m, ...updates } : m
      ));
      toast.success('Milestone updated');
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast.error('Failed to update milestone');
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    if (!confirm('Delete this milestone?')) return;

    try {
      await base44.entities.Milestone.delete(milestoneId);
      setMilestones(milestones.filter(m => m.id !== milestoneId));
      toast.success('Milestone deleted');
    } catch (error) {
      console.error('Error deleting milestone:', error);
      toast.error('Failed to delete milestone');
    }
  };

  const handleReorderMilestone = async (milestoneId, updates) => {
    try {
      await base44.entities.Milestone.update(milestoneId, updates);
      
      // Optimistically update UI
      setMilestones(prevMilestones => {
        const updated = prevMilestones.map(m => 
          m.id === milestoneId ? { ...m, ...updates } : m
        );
        return updated;
      });

      // Reload to get correct order
      await loadGoalAndMilestones();
    } catch (error) {
      console.error('Error reordering milestone:', error);
      toast.error('Failed to reorder milestone');
    }
  };

  const handleAddMilestoneToGroup = (groupId) => {
    setNewMilestoneGroupId(groupId);
    setShowNewMilestoneModal(true);
  };

  const handleSaveColumns = async (newColumns) => {
    try {
      await base44.entities.Goal.update(goal.id, {
        goal_config: {
          ...goal.goal_config,
          columns: newColumns
        }
      });
      setGoal({
        ...goal,
        goal_config: {
          ...goal.goal_config,
          columns: newColumns
        }
      });
      toast.success('Columns updated');
    } catch (error) {
      console.error('Error updating columns:', error);
      toast.error('Failed to update columns');
    }
  };

  const handleSaveGroups = async (newGroups) => {
    try {
      await base44.entities.Goal.update(goal.id, {
        goal_config: {
          ...goal.goal_config,
          groups: newGroups
        }
      });
      setGoal({
        ...goal,
        goal_config: {
          ...goal.goal_config,
          groups: newGroups
        }
      });
      toast.success('Groups updated');
    } catch (error) {
      console.error('Error updating groups:', error);
      toast.error('Failed to update groups');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading goal board...</p>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Goal Not Found</h2>
          <p className="text-gray-600 mb-6">The goal you're looking for doesn't exist or you don't have access to it.</p>
          <Link to={createPageUrl('Goals')}>
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Goals
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const viewButtons = [
    { id: 'table', label: 'Table', icon: List },
    { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'timeline', label: 'Timeline', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl('Goals')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Goals
          </Link>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{goal.title}</h1>
              {goal.description && (
                <p className="text-gray-600">{goal.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Badge className="bg-blue-100 text-blue-800">{goal.category}</Badge>
                <Badge className="bg-green-100 text-green-800">{goal.status}</Badge>
                {goal.due_date && (
                  <Badge variant="outline">Due: {new Date(goal.due_date).toLocaleDateString()}</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Switcher */}
              <div className="flex bg-white rounded-lg border shadow-sm">
                {viewButtons.map((view) => {
                  const Icon = view.icon;
                  return (
                    <button
                      key={view.id}
                      onClick={() => handleViewChange(view.id)}
                      className={`px-3 py-2 flex items-center gap-2 transition-all ${
                        currentView === view.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      } ${view.id === 'table' ? 'rounded-l-lg' : ''} ${view.id === 'timeline' ? 'rounded-r-lg' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden md:inline text-sm">{view.label}</span>
                    </button>
                  );
                })}
              </div>

              <Button onClick={() => setShowNewMilestoneModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Milestone
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {currentView === 'table' && (
            <BoardTableView
              milestones={milestones}
              columns={goal.goal_config?.columns || []}
              groups={goal.goal_config?.groups || []}
              onUpdateMilestone={handleUpdateMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onReorderMilestone={handleReorderMilestone}
              onAddMilestone={handleAddMilestoneToGroup}
              onManageColumns={() => setShowColumnManager(true)}
              onManageGroups={() => setShowGroupManager(true)}
            />
          )}

          {currentView === 'kanban' && (
            <BoardKanbanView
              milestones={milestones}
              columns={goal.goal_config?.columns || []} // Kanban needs column defs for status/priority options
              onUpdateMilestone={handleUpdateMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onAddMilestone={() => setShowNewMilestoneModal(true)} // Allow adding milestones from Kanban
              onReorderMilestone={handleReorderMilestone}
              groupByColumn="status" // Default grouping
            />
          )}

          {currentView === 'calendar' && (
            <BoardCalendarView
              milestones={milestones}
              onUpdateMilestone={handleUpdateMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onAddMilestone={() => setShowNewMilestoneModal(true)}
            />
          )}

          {currentView === 'timeline' && (
            <BoardTimelineView
              milestones={milestones}
              onUpdateMilestone={handleUpdateMilestone}
              onDeleteMilestone={handleDeleteMilestone}
            />
          )}
        </motion.div>

        {/* Modals */}
        {showNewMilestoneModal && (
          <NewMilestoneModal
            onClose={() => {
              setShowNewMilestoneModal(false);
              setNewMilestoneGroupId(null);
            }}
            onCreate={handleCreateMilestone}
            targetGroupId={newMilestoneGroupId}
          />
        )}

        <ColumnManager
          open={showColumnManager}
          onClose={() => setShowColumnManager(false)}
          columns={goal?.goal_config?.columns || []}
          onSave={handleSaveColumns}
        />

        <GroupManager
          open={showGroupManager}
          onClose={() => setShowGroupManager(false)}
          groups={goal?.goal_config?.groups || []}
          onSave={handleSaveGroups}
        />
      </div>
    </div>
  );
}

// Simple New Milestone Modal Component
function NewMilestoneModal({ onClose, onCreate, targetGroupId }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("not_started");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a milestone title');
      return;
    }

    onCreate({
      title: title.trim(),
      priority,
      status,
      data: {}
    }, targetGroupId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
      >
        <h2 className="text-2xl font-bold mb-4">New Milestone</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Milestone Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter milestone title..."
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="not_started">Not Started</option>
              <option value="working_on_it">Working On It</option>
              <option value="done">Done</option>
              <option value="stuck">Stuck</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Create Milestone
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default withAuthProtection(GoalBoard, ['User Level 1', 'User Level 2', 'User Level 3', 'Admin Level 1', 'Admin Level 2', 'Admin Level 3']);
