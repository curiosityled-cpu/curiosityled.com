import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, BookOpen, Target, Calendar, Mail, AlertTriangle, Flag, ArrowUpCircle } from "lucide-react";

export default function InterventionActionsMenu({ 
  user, 
  onAssignLearning, 
  onCreateGoal, 
  onSchedule1on1, 
  onSendNudge,
  onEscalate,
  onMarkAtRisk,
  viewContext = "manager"
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssignLearning(user); }}>
          <BookOpen className="w-4 h-4 mr-2 text-purple-600" />
          Assign Learning
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateGoal(user); }}>
          <Target className="w-4 h-4 mr-2 text-green-600" />
          Create Goal
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSchedule1on1(user); }}>
          <Calendar className="w-4 h-4 mr-2 text-blue-600" />
          Schedule 1:1
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSendNudge(user); }}>
          <Mail className="w-4 h-4 mr-2 text-orange-600" />
          Send Nudge
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {viewContext === "program" && user.manager_email && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEscalate(user); }}>
            <ArrowUpCircle className="w-4 h-4 mr-2 text-red-600" />
            Escalate to Manager
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMarkAtRisk(user); }}>
          <Flag className="w-4 h-4 mr-2 text-red-600" />
          Mark as At Risk
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}