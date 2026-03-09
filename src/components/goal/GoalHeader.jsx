import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft,
  Star,
  Table2,
  ChevronDown,
  TrendingUp,
  UserPlus,
  UserMinus,
  Shield,
  Crown,
  Eye
} from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import InviteMemberModal from "./InviteMemberModal";

export default function GoalHeader({
  goal,
  milestonesCount,
  currentView,
  onViewChange,
  onShowAnalytics,
  onMembersUpdated,
  canEdit = true // Added canEdit prop with default value
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadUser = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const goalColor = goal?.color || '#0073EA';
  const members = goal?.members || [];
  
  const userRole = members.find(m => m.user_email === currentUser?.email)?.role || 
    (goal?.created_by === currentUser?.email ? 'owner' : null);

  const canInvite = canEdit && (userRole === 'owner' || userRole === 'editor'); // Modified canInvite to use canEdit prop

  const getRoleIcon = (role) => {
    switch(role) {
      case 'owner': return <Crown className="w-3 h-3 text-yellow-600" />;
      case 'editor': return <Shield className="w-3 h-3 text-blue-600" />;
      case 'viewer': return <Eye className="w-3 h-3 text-gray-500" />;
      default: return null;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'owner': return 'bg-yellow-100 text-yellow-700';
      case 'editor': return 'bg-blue-100 text-blue-700';
      case 'viewer': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleRemoveMember = async (memberEmail) => {
    if (!canEdit) return;
    if (!window.confirm("Remove this member from the goal?")) return;

    const updatedMembers = members.filter(m => m.user_email !== memberEmail);
    await base44.entities.Goal.update(goal.id, { members: updatedMembers });
    onMembersUpdated(updatedMembers);
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  return (
    <TooltipProvider>
      <div className="bg-white sticky top-16 z-40 shadow-sm border-b border-[#E1E5F3]">
        <motion.div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: goalColor }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isScrolled ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut", originX: 0 }}
        />

        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={createPageUrl("Performance")}>
                    <Button variant="ghost" size="icon" className="hover:bg-[#E1E5F3] rounded-lg h-9 w-9">
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Back to Goals</TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: goalColor }}
                >
                  <Table2 className="w-5 h-5 text-white" />
                </div>

                <div className="space-y-1">
                  <h1 className="text-xl font-bold text-[#323338]">
                    {goal?.title}
                  </h1>

                  <div className="flex items-center gap-3 text-xs">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          <Table2 className="w-3 h-3 mr-1" />
                          {currentView === 'table' ? 'Main table' :
                           currentView === 'kanban' ? 'Kanban' :
                           currentView === 'calendar' ? 'Calendar' :
                           currentView === 'timeline' ? 'Timeline' :
                           currentView === 'unassigned' ? 'Unassigned' : 'Main table'}
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onViewChange('table')}>
                          <Table2 className="w-4 h-4 mr-2" />
                          Main Table
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewChange('kanban')}>
                          <Table2 className="w-4 h-4 mr-2" />
                          Kanban Board
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewChange('calendar')}>
                          <Table2 className="w-4 h-4 mr-2" />
                          Calendar View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewChange('timeline')}>
                          <Table2 className="w-4 h-4 mr-2" />
                          Timeline
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewChange('unassigned')}>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Unassigned Tasks
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <span className="text-[#A0A0A0]">|</span>
                    <span className="text-[#A0A0A0]">{milestonesCount} items</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={onShowAnalytics}
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                Analytics
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <div className="flex items-center -space-x-2 cursor-pointer">
                    {members.slice(0, 3).map((member, index) => (
                      <Tooltip key={member.user_email}>
                        <TooltipTrigger asChild>
                          <div
                            className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium ${
                              index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-purple-500'
                            }`}
                          >
                            {getInitials(member.user_name)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{member.user_name} ({member.role})</TooltipContent>
                      </Tooltip>
                    ))}
                    {members.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-xs">
                        +{members.length - 3}
                      </div>
                    )}
                    {members.length === 0 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-400 text-xs">
                        <UserPlus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Team ({members.length})</h4>
                      {canInvite && (
                        <Button size="sm" variant="outline" onClick={() => setShowInviteModal(true)}>
                          <UserPlus className="w-3 h-3 mr-1" />
                          Invite
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {members.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No team members yet
                        </div>
                      ) : (
                        members.map((member) => (
                          <div key={member.user_email} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                {getInitials(member.user_name)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{member.user_name}</p>
                                <div className="flex items-center gap-1">
                                  {getRoleIcon(member.role)}
                                  <Badge className={`text-xs ${getRoleBadgeColor(member.role)}`}>
                                    {member.role}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            {canEdit && member.user_email !== currentUser?.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.user_email)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        goal={goal}
        onMemberAdded={onMembersUpdated}
      />
    </TooltipProvider>
  );
}