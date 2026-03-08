import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, Target, Calendar, Users, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import CreateGoalModal from "../goals/CreateGoalModal";
import EditGoalModal from "../goals/EditGoalModal";
import GoalCard from "../goals/GoalCard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function TeamGoalsSection({ user, refreshTrigger, onRefresh }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamGoals, setTeamGoals] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedMemberEmail, setSelectedMemberEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMembers, setExpandedMembers] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, goalId: null, goalTitle: null });

  useEffect(() => {
    if (user?.subordinate_emails && user.subordinate_emails.length > 0) {
      loadTeamGoals();
    } else {
      setIsLoading(false);
    }
  }, [user, refreshTrigger]);

  const loadTeamGoals = async () => {
    if (!user?.subordinate_emails || user.subordinate_emails.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Loading team members for:', user.subordinate_emails);
      
      // Get team members
      const members = await base44.entities.User.filter({
        email: { $in: user.subordinate_emails }
      });
      
      console.log('Found team members:', members);
      setTeamMembers(members);

      // Get goals for each team member
      const goalsByMember = {};
      
      for (const member of members) {
        const memberGoals = await base44.entities.Goal.filter({
          created_by: member.email
        }, "-updated_date");
        goalsByMember[member.email] = memberGoals || [];
        console.log(`Goals for ${member.email}:`, memberGoals);
      }
      
      setTeamGoals(goalsByMember);
      
      // Auto-expand first member
      if (members.length > 0) {
        setExpandedMembers({ [members[0].email]: true });
      }
    } catch (error) {
      console.error('Error loading team goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMember = (email) => {
    setExpandedMembers(prev => ({
      ...prev,
      [email]: !prev[email]
    }));
  };

  const handleCreateGoal = async (goalData) => {
    // If creating for a specific member, override the created_by
    const newGoal = await base44.entities.Goal.create({
      ...goalData,
      assigned_to_emails: selectedMemberEmail ? [selectedMemberEmail] : goalData.assigned_to_emails
    });
    
    await loadTeamGoals();
    setShowCreateModal(false);
    setSelectedMemberEmail(null);
    onRefresh?.();
  };

  const handleOpenEditModal = (goal) => {
    setEditingGoal(goal);
    setShowEditModal(true);
  };

  const handleUpdateGoal = async (goalId, updatedData) => {
    await base44.entities.Goal.update(goalId, updatedData);
    await loadTeamGoals();
    setShowEditModal(false);
    setEditingGoal(null);
    onRefresh?.();
  };

  const handleDeleteGoal = async (goalId, goalTitle) => {
    setConfirmDialog({ isOpen: true, goalId, goalTitle });
  };

  const confirmDeleteGoal = async () => {
    await base44.entities.Goal.delete(confirmDialog.goalId);
    await loadTeamGoals();
    onRefresh?.();
    setConfirmDialog({ isOpen: false, goalId: null, goalTitle: null });
  };

  const getFilteredMembers = () => {
    if (!searchQuery) return teamMembers;
    
    const query = searchQuery.toLowerCase();
    return teamMembers.filter(member => 
      member.full_name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      (teamGoals[member.email] || []).some(goal =>
        goal.title.toLowerCase().includes(query)
      )
    );
  };

  const getTotalGoals = (memberEmail) => {
    return (teamGoals[memberEmail] || []).length;
  };

  const getInProgressGoals = (memberEmail) => {
    return (teamGoals[memberEmail] || []).filter(g => g.status === 'active').length;
  };

  const filteredMembers = getFilteredMembers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  if (!user?.subordinate_emails || teamMembers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(to bottom right, #dbeafe, #e0e7ff)' }}>
          <Users className="w-12 h-12" style={{ color: '#0202ff' }} />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Team Members
        </h3>
        <p className="text-gray-600">
          You don't have any team members assigned yet
        </p>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <Button 
          onClick={() => {
            setSelectedMemberEmail(null);
            setShowCreateModal(true);
          }}
          className="text-white"
          style={{ backgroundColor: '#0202ff' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Team Goal
        </Button>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search team members or goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Team Members List */}
      <div className="space-y-3">
        {filteredMembers.map((member, index) => {
          const memberGoals = teamGoals[member.email] || [];
          const isExpanded = expandedMembers[member.email];

          return (
            <motion.div
              key={member.email}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleMember(member.email)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: 'linear-gradient(to bottom right, #0202ff, #A25DDC)' }}>
                            {member.full_name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{member.full_name}</h3>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Target className="w-4 h-4" style={{ color: '#0202ff' }} />
                              <span className="font-medium text-gray-900">{getTotalGoals(member.email)}</span>
                              <span className="text-gray-500">goals</span>
                            </div>
                            {getInProgressGoals(member.email) > 0 && (
                              <Badge variant="secondary" style={{ backgroundColor: 'rgba(2, 2, 255, 0.1)', color: '#0202ff' }}>
                                {getInProgressGoals(member.email)} active
                              </Badge>
                            )}
                          </div>
                          
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      {memberGoals.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Target className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 mb-3">No goals yet</p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedMemberEmail(member.email);
                              setShowCreateModal(true);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-2" />
                            Add Goal for {member.full_name.split(' ')[0]}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {memberGoals.map((goal) => (
                            <div key={goal.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                              <Link to={createPageUrl(`Goal?id=${goal.id}`)} className="block">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 transition-colors hover:text-[#0202ff]">
                                      {goal.title}
                                    </h4>
                                    {goal.description && (
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {goal.description}
                                      </p>
                                    )}
                                  </div>
                                  <Badge
                                    className="ml-2 flex-shrink-0"
                                    style={{
                                      backgroundColor: `${goal.color}20`,
                                      color: goal.color,
                                      border: 'none'
                                    }}
                                  >
                                    {goal.progress || 0}%
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>{formatDistanceToNow(new Date(goal.updated_date), { addSuffix: true })}</span>
                                    </div>
                                    {goal.goal_type === 'okr_objective' && (
                                      <Badge variant="outline" className="text-xs">OKR</Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleOpenEditModal(goal);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleDeleteGoal(goal.id, goal.title);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Modals */}
      <CreateGoalModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedMemberEmail(null);
        }}
        onSubmit={handleCreateGoal}
      />
      {editingGoal && (
        <EditGoalModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingGoal(null);
          }}
          onSubmit={handleUpdateGoal}
          goal={editingGoal}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, goalId: null, goalTitle: null })}
        onConfirm={confirmDeleteGoal}
        title="Delete Goal"
        description={`Are you sure you want to delete "${confirmDialog.goalTitle}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}