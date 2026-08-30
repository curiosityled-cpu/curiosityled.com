import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  ArrowLeft,
  Loader2,
  Edit,
  Trash2,
  Bell,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Target,
  MessageSquare,
  Link as LinkIcon
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/components/useAuth";
import { canEditGoal, canDeleteGoal, buildGoalPermissionContext } from "@/components/utils/goalPermissions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import GoalHeader from "@/components/goal/GoalHeader";
import CreateTaskModal from "@/components/goal/CreateTaskModal";
import GoalAnalyticsModal from "@/components/goal/GoalAnalyticsModal";
import TaskCommentsModal from "@/components/goal/TaskCommentsModal";
import KanbanView from "@/components/goal/views/KanbanView";
import CalendarView from "@/components/goal/views/CalendarView";
import TimelineView from "@/components/goal/views/TimelineView";
import UnassignedView from "@/components/goal/views/UnassignedView";

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const priorityColors = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200"
};

const statusColors = {
  not_started: "bg-gray-100 text-gray-800 border-gray-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  on_hold: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

const automationRecipes = [
  {
    id: 1,
    title: "Notify on Status Change",
    category: "Notifications",
    description: 'When a task status changes to "Done", notify the project manager.',
    icon: Bell,
    color: "bg-blue-500"
  },
  {
    id: 2,
    title: "Due Date Reminder",
    category: "Reminders",
    description: "24 hours before a task is due, send a reminder to the assignee.",
    icon: Clock,
    color: "bg-yellow-500"
  },
  {
    id: 3,
    title: "Assign New Item",
    category: "Assignments",
    description: "When a new item is created, assign it to the team lead.",
    icon: Users,
    color: "bg-green-500"
  },
  {
    id: 4,
    title: "Priority Escalation",
    category: "Workflow",
    description: 'If a "High Priority" task is overdue by 2 days, change its status to "Critical".',
    icon: AlertTriangle,
    color: "bg-red-500"
  },
  {
    id: 5,
    title: "Subitem Completion Update",
    category: "Workflow",
    description: 'When all subitems of a task are "Done", update parent task status to "Review".',
    icon: CheckCircle2,
    color: "bg-purple-500"
  }
];

export default function GoalPage() {
  const [searchParams] = useSearchParams();
  const goalId = searchParams.get('id');
  const { user: currentUser, appRole } = useAuth();
  
  const [goal, setGoal] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMilestones, setSelectedMilestones] = useState(new Set());
  const [currentView, setCurrentView] = useState("table");
  
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#0202ff");

  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupTitle, setEditGroupTitle] = useState("");
  const [editGroupColor, setEditGroupColor] = useState("#0202ff");

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAutomations, setShowAutomations] = useState(false);
  const [activeAutomations, setActiveAutomations] = useState({});
  
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentingTask, setCommentingTask] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, data: null });

  // Permission context
  const [permissionContext, setPermissionContext] = useState({});

  useEffect(() => {
    if (currentUser) {
      setPermissionContext(buildGoalPermissionContext(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    if (goalId) {
      loadGoalAndMilestones();
    }
  }, [goalId]);

  const calculateGoalProgress = (milestones) => {
    if (!milestones || milestones.length === 0) return 0;
    const completedTasks = milestones.filter(milestone => milestone.data?.status === 'completed').length;
    return Math.round((completedTasks / milestones.length) * 100);
  };

  const loadGoalAndMilestones = async () => {
    setIsLoading(true);
    const goalDataPromise = base44.entities.Goal.filter({ id: goalId });
    const milestonesDataPromise = base44.entities.Milestone.filter({ goal_id: goalId }, "order_index");
    
    const [goalResponse, milestonesData] = await Promise.all([
      goalDataPromise, 
      milestonesDataPromise
    ]);
    
    if (goalResponse.length > 0) {
      const goalData = goalResponse[0];
      const calculatedProgress = calculateGoalProgress(milestonesData);
      
      if (goalData.progress !== calculatedProgress) {
        await base44.entities.Goal.update(goalData.id, { progress: calculatedProgress });
        goalData.progress = calculatedProgress;
      }
      
      setGoal(goalData);
      setCurrentView(goalData.view_type || "table");
    } else {
      setGoal(null);
    }
    setMilestones(milestonesData);
    setIsLoading(false);
  };

  const canEdit = () => {
    if (!goal || !currentUser || !appRole) return false;
    return canEditGoal(appRole, goal, currentUser, permissionContext);
  };

  const canDelete = () => {
    if (!goal || !currentUser || !appRole) return false;
    return canDeleteGoal(appRole, goal, currentUser, permissionContext);
  };

  const handleAddGroup = async () => {
    if (!goal || !newGroupTitle.trim() || !canEdit()) return;
    
    const newGroup = { 
      id: generateId(), 
      title: newGroupTitle.trim(),
      color: newGroupColor,
      collapsed: false 
    };
    const updatedGroups = [...(goal.groups || []), newGroup];
    await base44.entities.Goal.update(goal.id, { groups: updatedGroups });
    setGoal(prev => ({ ...prev, groups: updatedGroups }));
    setShowNewGroupModal(false);
    setNewGroupTitle("");
    setNewGroupColor("#0073EA");
  };

  const handleEditGroup = (group) => {
    if (!canEdit()) return;
    setEditingGroup(group);
    setEditGroupTitle(group.title);
    setEditGroupColor(group.color || "#0202ff");
    setShowEditGroupModal(true);
  };

  const handleUpdateGroup = async () => {
    if (!goal || !editingGroup || !editGroupTitle.trim() || !canEdit()) return;
    
    const updatedGroups = goal.groups.map(group => 
      group.id === editingGroup.id 
        ? { ...group, title: editGroupTitle.trim(), color: editGroupColor }
        : group
    );
    await base44.entities.Goal.update(goal.id, { groups: updatedGroups });
    setGoal(prev => ({ ...prev, groups: updatedGroups }));
    setShowEditGroupModal(false);
    setEditingGroup(null);
    setEditGroupTitle("");
    setEditGroupColor("#0073EA");
  };

  const handleDeleteGroup = async (groupIdToDelete) => {
    if (!goal || !canEdit()) return;
    setConfirmDialog({
      isOpen: true,
      action: 'deleteGroup',
      data: groupIdToDelete
    });
  };

  const confirmDeleteGroup = async () => {
    const groupIdToDelete = confirmDialog.data;
    const updatedGroups = goal.groups.filter(group => group.id !== groupIdToDelete);
    const milestonesOfDeletedGroup = milestones.filter(milestone => milestone.group_id === groupIdToDelete);
    const milestoneDeletePromises = milestonesOfDeletedGroup.map(milestone => base44.entities.Milestone.delete(milestone.id));

    await base44.entities.Goal.update(goal.id, { groups: updatedGroups });
    await Promise.all(milestoneDeletePromises);
    setGoal(prevGoal => ({ ...prevGoal, groups: updatedGroups }));
    setMilestones(prevMilestones => prevMilestones.filter(milestone => milestone.group_id !== groupIdToDelete));
    setConfirmDialog({ isOpen: false, action: null, data: null });
  };

  const handleOpenTaskModal = (groupId, task = null) => {
    setCurrentGroupId(groupId);
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleSubmitTask = async (taskData) => {
    if (editingTask) {
      const oldStatus = editingTask.data?.status;
      const newStatus = taskData.data?.status;
      
      await base44.entities.Milestone.update(editingTask.id, taskData);
      const updatedMilestones = milestones.map(milestone => 
        milestone.id === editingTask.id ? { ...milestone, ...taskData } : milestone
      );
      setMilestones(updatedMilestones);
      
      // Send notifications on status change
      if (oldStatus !== newStatus && taskData.assignees?.length > 0) {
        for (const assignee of taskData.assignees) {
          // Only send notification if the assignee is not the current user who made the change
          if (assignee.user_email !== currentUser?.email) {
            await base44.entities.Notification.create({
              user_email: assignee.user_email,
              type: "task_status_change",
              title: "Task Status Changed",
              message: `Task "${taskData.title}" status changed to ${newStatus?.replace('_', ' ')}.`,
              related_entity_type: "Milestone",
              related_entity_id: editingTask.id,
              priority: "low"
            });
          }
        }
      }
      
      const newProgress = calculateGoalProgress(updatedMilestones);
      if (goal.progress !== newProgress) {
        await base44.entities.Goal.update(goal.id, { progress: newProgress });
        setGoal(prev => ({ ...prev, progress: newProgress }));
      }
    } else {
      const maxOrder = Math.max(
        0,
        ...milestones.filter(milestone => milestone.group_id === currentGroupId).map(milestone => milestone.order_index || 0)
      );
      
      const newMilestone = await base44.entities.Milestone.create({
        goal_id: goalId,
        group_id: currentGroupId,
        ...taskData,
        order_index: maxOrder + 1
      });
      
      // Notify assignees about new task
      if (taskData.assignees?.length > 0) {
        for (const assignee of taskData.assignees) {
          await base44.entities.Notification.create({
            user_email: assignee.user_email,
            type: "task_assignment",
            title: "Task Assigned",
            message: `You've been assigned to task "${taskData.title}".`,
            related_entity_type: "Milestone",
            related_entity_id: newMilestone.id,
            priority: "medium"
          });
        }
      }
      
      const updatedMilestones = [...milestones, newMilestone].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setMilestones(updatedMilestones);
      
      const newProgress = calculateGoalProgress(updatedMilestones);
      if (goal.progress !== newProgress) {
        await base44.entities.Goal.update(goal.id, { progress: newProgress });
        setGoal(prev => ({ ...prev, progress: newProgress }));
      }
    }
    
    setShowTaskModal(false);
    setEditingTask(null);
    setCurrentGroupId(null);
  };

  const handleDeleteItem = async (milestoneId) => {
    if (!canEdit()) return;
    setConfirmDialog({
      isOpen: true,
      action: 'deleteItem',
      data: milestoneId
    });
  };

  const confirmDeleteItem = async () => {
    const milestoneId = confirmDialog.data;
    await base44.entities.Milestone.delete(milestoneId);
    const updatedMilestones = milestones.filter(milestone => milestone.id !== milestoneId);
    setMilestones(updatedMilestones);
    
    const newProgress = calculateGoalProgress(updatedMilestones);
    if (goal.progress !== newProgress) {
      await base44.entities.Goal.update(goal.id, { progress: newProgress });
      setGoal(prev => ({ ...prev, progress: newProgress }));
    }
    setConfirmDialog({ isOpen: false, action: null, data: null });
  };

  const handleViewChange = async (newView) => {
    setCurrentView(newView);
    if (goal) {
      await base44.entities.Goal.update(goal.id, { view_type: newView });
      setGoal(prev => ({ ...prev, view_type: newView }));
    }
  };

  const handleToggleAutomation = (recipeId) => {
    setActiveAutomations(prev => ({
      ...prev,
      [recipeId]: !prev[recipeId]
    }));
  };

  const handleOpenComments = (task) => {
    setCommentingTask(task);
    setShowCommentsModal(true);
  };

  const handleMembersUpdated = (updatedMembers) => {
    setGoal(prev => ({ ...prev, members: updatedMembers }));
  };

  const filteredMilestones = milestones.filter(milestone => {
    if (searchQuery && !milestone.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const groupedMilestones = goal?.groups?.reduce((acc, group) => {
    acc[group.id] = filteredMilestones.filter(milestone => milestone.group_id === group.id);
    return acc;
  }, {}) || {};

  const progress = goal?.progress || 0;
  const completedTasks = milestones.filter(milestone => milestone.data?.status === 'completed').length;
  const totalTasks = milestones.length;

  const getProgressColor = () => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 50) return '';
    if (progress >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBgColor = () => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return '';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const hasBlockedDependencies = (task) => {
    if (!task.depends_on || task.depends_on.length === 0) return false;
    return task.depends_on.some(depId => {
      const depMilestone = milestones.find(t => t.id === depId);
      return depMilestone && depMilestone.data?.status !== 'completed';
    });
  };

  if (isLoading && !goal) {
    return (
      <div className="p-8 bg-[#F5F6F8] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#0202ff' }} />
          <p className="text-lg text-[#323338]">Loading goal...</p>
        </div>
      </div>
    );
  }
  
  if (!goal) {
    return (
      <div className="p-8 bg-[#F5F6F8] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-[#323338] mb-4">Goal not found</h2>
            <Link to={createPageUrl("Performance")}>
              <Button className="text-white rounded-xl" style={{ backgroundColor: '#0202ff' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Performance
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const renderTasksView = () => {
    if (currentView === 'kanban') {
      return (
        <KanbanView
          milestones={filteredMilestones}
          goal={goal}
          onEditTask={(task) => handleOpenTaskModal(task.group_id, task)}
          onDeleteTask={handleDeleteItem}
          onOpenTaskModal={handleOpenTaskModal}
          onRefresh={loadGoalAndMilestones}
          canEdit={canEdit()}
        />
      );
    }

    if (currentView === 'calendar') {
      return (
        <CalendarView
          milestones={filteredMilestones}
          onEditTask={(task) => handleOpenTaskModal(task.group_id, task)}
          onDeleteTask={handleDeleteItem}
          canEdit={canEdit()}
        />
      );
    }

    if (currentView === 'timeline') {
      return (
        <TimelineView
          milestones={filteredMilestones}
          onEditTask={(task) => handleOpenTaskModal(task.group_id, task)}
          onDeleteTask={handleDeleteItem}
          canEdit={canEdit()}
        />
      );
    }

    if (currentView === 'unassigned') {
      return (
        <UnassignedView
          milestones={filteredMilestones}
          onEditTask={(task) => handleOpenTaskModal(task.group_id, task)}
          onDeleteTask={handleDeleteItem}
          canEdit={canEdit()}
        />
      );
    }

    // Default table view
    return (
      <div className="bg-white rounded-xl shadow-sm border border-[#E1E5F3] p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#323338]">Tasks</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#676879]" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-[#F5F6F8] border-none rounded-lg h-10 focus:bg-white focus:ring-2"
                style={{ '--tw-ring-color': 'rgba(2, 2, 255, 0.2)' }}
              />
            </div>
            
            {canEdit() && (
              <Button 
                variant="outline" 
                className="rounded-lg h-10 px-4"
                onClick={() => setShowNewGroupModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Group
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {goal.groups?.map((group) => (
            <div key={group.id} className="border border-[#E1E5F3] rounded-xl overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 bg-gray-50"
                style={{ borderLeft: `4px solid ${group.color || '#0202ff'}` }}
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-[#323338]">{group.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {groupedMilestones[group.id]?.length || 0} tasks
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit() && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditGroup(group)}
                        className="text-gray-600"
                        style={{ 
                          '--hover-text-color': '#0202ff',
                          '--hover-bg-color': 'rgba(2, 2, 255, 0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#0202ff';
                          e.currentTarget.style.backgroundColor = 'rgba(2, 2, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '';
                          e.currentTarget.style.backgroundColor = '';
                        }}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenTaskModal(group.id)}
                        style={{ color: '#0202ff' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(2, 2, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Task
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Delete Group
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-2">
                {groupedMilestones[group.id]?.map((milestone) => {
                  const isBlocked = hasBlockedDependencies(milestone);
                  
                  return (
                    <div
                      key={milestone.id}
                      className={`flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow ${
                        isBlocked ? 'opacity-60' : ''
                      }`}
                      style={{ borderLeft: `3px solid ${milestone.color || '#0202ff'}` }}
                    >
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[#323338] font-medium">{milestone.title}</p>
                            {isBlocked && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                                <LinkIcon className="w-3 h-3 mr-1" />
                                Blocked
                              </Badge>
                            )}
                          </div>
                          
                          {milestone.assignees?.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {milestone.assignees.slice(0, 3).map((assignee, idx) => (
                                <div
                                  key={idx}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs border-2 border-white"
                                  style={{ backgroundColor: '#0202ff' }}
                                  title={assignee.user_name}
                                >
                                  {getInitials(assignee.user_name)}
                                </div>
                              ))}
                              {milestone.assignees.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                                  +{milestone.assignees.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {milestone.data?.notes && (
                            <p className="text-sm text-gray-500 mt-1">{milestone.data.notes}</p>
                          )}
                          {milestone.data?.progress !== undefined && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[200px]">
                                <div 
                                  className="h-full transition-all"
                                  style={{ backgroundColor: '#0202ff', width: `${milestone.data.progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{milestone.data.progress}%</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {milestone.data?.status && (
                            <Badge className={`${statusColors[milestone.data.status]} border text-xs`}>
                              {milestone.data.status.replace('_', ' ')}
                            </Badge>
                          )}
                          <Badge className={`${priorityColors[milestone.priority]} border text-xs`}>
                            {milestone.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenComments(milestone)}
                          className="text-gray-400 h-8 w-8 p-0 relative"
                          onMouseEnter={(e) => e.currentTarget.style.color = '#0202ff'}
                          onMouseLeave={(e) => e.currentTarget.style.color = ''}
                        >
                          <MessageSquare className="w-4 h-4" />
                          {milestone.comments_count > 0 && (
                            <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center" style={{ backgroundColor: '#0202ff' }}>
                              {milestone.comments_count}
                            </span>
                          )}
                        </Button>
                        {canEdit() && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenTaskModal(group.id, milestone)}
                              className="text-gray-400 h-8 w-8 p-0"
                              onMouseEnter={(e) => e.currentTarget.style.color = '#0202ff'}
                              onMouseLeave={(e) => e.currentTarget.style.color = ''}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(milestone.id)}
                              className="text-gray-400 hover:text-red-600 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!groupedMilestones[group.id] || groupedMilestones[group.id].length === 0) && (
                  <div className="text-center py-8 text-gray-400">
                    <p>No tasks in this group yet</p>
                    {canEdit() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenTaskModal(group.id)}
                        className="mt-2"
                        style={{ color: '#0202ff' }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add First Task
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {(!goal.groups || goal.groups.length === 0) && !isLoading && (
            <div className="p-8 text-center text-[#676879]">
              <h3 className="text-xl font-medium mb-2">No groups yet!</h3>
              <p className="mb-4">Start by adding your first group to organize your tasks.</p>
              {canEdit() && (
                <Button
                  className="text-white rounded-lg h-10 px-4 font-medium"
                  style={{ backgroundColor: '#0202ff' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
                  onClick={() => setShowNewGroupModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Group
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#F5F6F8] min-h-screen">
      <div className="max-w-full">
        <div className="sticky top-0 z-10 bg-[#F5F6F8]">
          <GoalHeader 
            goal={goal}
            milestones={milestones}
            milestonesCount={milestones.length}
            selectedCount={selectedMilestones.size}
            currentView={currentView}
            onViewChange={handleViewChange}
            onShowAnalytics={() => setShowAnalytics(true)}
            onShowAutomations={() => setShowAutomations(true)}
            onMembersUpdated={handleMembersUpdated}
            canEdit={canEdit()}
          />
          
          {/* Goal Progress Section */}
          <div className="px-6 pt-4 pb-2">
            <motion.div 
              className="rounded-xl p-4 shadow-sm"
              style={{ background: 'linear-gradient(to right, #eff6ff, #faf5ff)', borderWidth: '1px', borderColor: 'rgba(2, 2, 255, 0.2)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Target className="w-5 h-5" style={{ color: '#0202ff' }} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Goal Progress</p>
                    <p className={`text-2xl font-bold`} style={progress >= 50 && progress < 80 ? { color: '#0202ff' } : { color: getProgressColor().replace('text-', '') }}>
                      {progress}%
                    </p>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      className={`h-full`}
                      style={progress >= 80 ? { backgroundColor: '#10b981' } : progress >= 50 ? { backgroundColor: '#0202ff' } : progress >= 25 ? { backgroundColor: '#eab308' } : { backgroundColor: '#ef4444' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 text-right">
                    {completedTasks} of {totalTasks} tasks completed
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="px-6 py-6">
          {renderTasksView()}
        </div>

        {/* New Group Modal */}
        {showNewGroupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Add New Group</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Group Name</label>
                  <Input
                    value={newGroupTitle}
                    onChange={(e) => setNewGroupTitle(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Color</label>
                  <div className="flex gap-2">
                    {['#0073EA', '#00C875', '#FFCB00', '#E2445C', '#9D99B9', '#FF5AC4'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewGroupColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${newGroupColor === color ? 'border-gray-800' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewGroupModal(false);
                      setNewGroupTitle("");
                      setNewGroupColor("#0202ff");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddGroup}
                    className="flex-1 bg-[#0073EA] hover:bg-[#0056B3]"
                    disabled={!newGroupTitle.trim()}
                  >
                    Add Group
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Group Modal */}
        {showEditGroupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Edit Group</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Group Name</label>
                  <Input
                    value={editGroupTitle}
                    onChange={(e) => setEditGroupTitle(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Color</label>
                  <div className="flex gap-2">
                    {['#0202ff', '#00C875', '#FFCB00', '#E2445C', '#A25DDC', '#FF5AC4'].map(color => (
                      <button
                        key={color}
                        onClick={() => setEditGroupColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${editGroupColor === color ? 'border-gray-800' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditGroupModal(false);
                      setEditingGroup(null);
                      setEditGroupTitle("");
                      setEditGroupColor("#0202ff");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateGroup}
                    className="flex-1 bg-[#0073EA] hover:bg-[#0056B3]"
                    disabled={!editGroupTitle.trim()}
                  >
                    Update Group
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Automations Modal */}
        {showAutomations && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-[#323338]">Automations Center</h2>
                    <p className="text-sm text-gray-500 mt-1">Automate repetitive tasks for {goal.title}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowAutomations(false)} className="text-2xl">
                    ×
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-semibold text-[#323338] mb-4">Popular Automation Recipes</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {automationRecipes.map((recipe) => {
                    const IconComponent = recipe.icon;
                    const isActive = activeAutomations[recipe.id];
                    
                    return (
                      <div 
                        key={recipe.id} 
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-12 h-12 ${recipe.color} rounded-lg flex items-center justify-center`}>
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          <div 
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                              isActive ? '' : 'bg-gray-300'
                            }`}
                            style={isActive ? { backgroundColor: '#0202ff' } : {}}
                            onClick={() => handleToggleAutomation(recipe.id)}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </div>
                        </div>
                        
                        <h4 className="font-semibold text-[#323338] mb-1">{recipe.title}</h4>
                        <p className="text-xs text-gray-500 mb-2">{recipe.category}</p>
                        <p className="text-sm text-gray-600 mb-3">{recipe.description}</p>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-xs"
                          style={{ color: '#0202ff' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(2, 2, 255, 0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Customize
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <GoalAnalyticsModal
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
          goal={goal}
          milestones={milestones}
        />

        <CreateTaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
            setCurrentGroupId(null);
          }}
          onSubmit={handleSubmitTask}
          groupId={currentGroupId}
          task={editingTask}
          goalId={goalId}
          goalMembers={goal?.members || []}
        />

        <TaskCommentsModal
          isOpen={showCommentsModal}
          onClose={() => {
            setShowCommentsModal(false);
            setCommentingTask(null);
            loadGoalAndMilestones();
          }}
          task={commentingTask}
        />

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, action: null, data: null })}
          onConfirm={() => {
            if (confirmDialog.action === 'deleteGroup') {
              confirmDeleteGroup();
            } else if (confirmDialog.action === 'deleteItem') {
              confirmDeleteItem();
            }
          }}
          title={confirmDialog.action === 'deleteGroup' ? "Delete Group" : "Delete Task"}
          description={
            confirmDialog.action === 'deleteGroup' 
              ? "Are you sure you want to delete this group and all its tasks? This action cannot be undone."
              : "Are you sure you want to delete this task? This action cannot be undone."
          }
          confirmText="Delete"
        />
      </div>
    </div>
  );
}