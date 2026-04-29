import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Folder, Lock, Globe, MoreHorizontal, Calendar, Trash2, Edit3, Target, GitBranch, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import CascadeGoalModal from "./CascadeGoalModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function GoalCard({ goal, viewMode, index, onDelete, onEdit, onRefresh }) {
  const { isManagerOfManagers } = useAuth();
  const [showCascadeModal, setShowCascadeModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  // Derived: cascade button is disabled while the cascade modal is open
  const isProcessing = showCascadeModal;
  
  const handleDelete = (e) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    setShowConfirmDelete(true);
  };

  const confirmDelete = () => {
    onDelete(goal.id);
    setShowConfirmDelete(false);
  };

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(goal);
  };

  const handleCascade = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCascadeModal(true);
  };

  const handleCascadeSuccess = () => {
    toast.success('Goal cascaded successfully to selected teams');
    onRefresh?.();
  };

  const handleAssign = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Open edit modal which has assignment functionality
    onEdit(goal);
  };

  const goalColor = goal.color || '#0202ff';
  const progress = goal.progress || 0;

  const getProgressColor = () => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-600';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Shared modals — rendered regardless of viewMode so they work in both list and grid
  const sharedModals = (
    <>
      <CascadeGoalModal
        isOpen={showCascadeModal}
        onClose={() => setShowCascadeModal(false)}
        goal={goal}
        onSuccess={handleCascadeSuccess}
      />
      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={confirmDelete}
        title="Delete Goal"
        description={`Are you sure you want to delete "${goal.title}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </>
  );

  if (viewMode === "list") {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="bg-white border border-gray-200 hover:shadow-md transition-all duration-200 group rounded-lg overflow-hidden">
            <div className="flex items-center">
              <div
                className="w-1.5 h-16 flex-shrink-0"
                style={{ backgroundColor: goalColor }}
              />
              <CardContent className="p-3 flex-1">
                <div className="flex items-center justify-between">
                  <Link to={createPageUrl(`Goal?id=${goal.id}`)} className="flex items-center gap-3 flex-grow min-w-0">
                    <div 
                      className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${goalColor}20` }}
                    >
                      <Folder 
                        className="w-4 h-4"
                        style={{ color: goalColor }}
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold text-gray-800 transition-colors text-sm truncate group-hover:text-[#0202ff]">
                        {goal.title}
                      </h3>
                      <p className="text-gray-500 text-xs mt-0.5 truncate">
                        {goal.description || 'No description'}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    {/* Progress indicator */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Target className="w-3.5 h-3.5 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-700">{progress}%</span>
                        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden mt-0.5">
                          <div 
                            className={`h-full ${getProgressColor()} transition-all`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Badge 
                      variant="outline" 
                      className={`border-none text-xs px-2 py-0.5 rounded-full ${
                        goal.visibility === 'private' 
                          ? 'bg-rose-100 text-rose-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {goal.visibility === 'private' ? (
                        <Lock className="w-2.5 h-2.5 mr-1" />
                      ) : (
                        <Globe className="w-2.5 h-2.5 mr-1" />
                      )}
                      {goal.visibility}
                    </Badge>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(goal.updated_date), { addSuffix: true })}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:bg-gray-100 rounded-md" onClick={(e) => {e.preventDefault(); e.stopPropagation();}}>
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleEdit}>
                          <Edit3 className="w-3.5 h-3.5 mr-2" />
                          Edit Goal
                        </DropdownMenuItem>
                        {isManagerOfManagers && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleAssign}>
                              <UserPlus className="w-3.5 h-3.5 mr-2" />
                              Assign to Team
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCascade} disabled={isProcessing}>
                              <GitBranch className="w-3.5 h-3.5 mr-2" />
                              Cascade to Team
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete Goal
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </motion.div>
        {sharedModals}
      </>
    );
  }

  // Grid View
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="h-full"
      >
      <Card 
        className="bg-white border border-gray-200 hover:shadow-lg transition-all duration-300 group h-full flex flex-col rounded-xl overflow-hidden"
      >
        <div 
            className="h-2 w-full"
            style={{backgroundColor: goalColor}}
        />
        <Link to={createPageUrl(`Goal?id=${goal.id}`)} className="flex-grow block p-5">
          <div className="flex items-start justify-between mb-4">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${goalColor}20` }}
            >
              <Folder 
                className="w-5 h-5"
                style={{ color: goalColor }}
              />
            </div>
            <Badge 
              variant="outline" 
              className={`border-none text-xs px-2.5 py-1 rounded-full ${
                goal.visibility === 'private' 
                  ? 'bg-rose-100 text-rose-700' 
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {goal.visibility === 'private' ? (
                <Lock className="w-3 h-3 mr-1.5" />
              ) : (
                <Globe className="w-3 h-3 mr-1.5" />
              )}
              {goal.visibility}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-gray-800 text-lg mb-2 transition-colors group-hover:text-[#0202ff]">
            {goal.title}
          </h3>
          
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {goal.description || 'No description provided.'}
          </p>

          {/* Progress Section */}
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'linear-gradient(to right, #eff6ff, #faf5ff)', borderWidth: '1px', borderColor: '#dbeafe' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" style={{ color: '#0202ff' }} />
                <span className="text-xs font-medium text-gray-600">Progress</span>
              </div>
              <span className="text-sm font-bold" style={{ color: '#0202ff' }}>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${getProgressColor()}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDistanceToNow(new Date(goal.updated_date), { addSuffix: true })}</span>
            </div>
          </div>
        </Link>
        <div className="p-2 border-t border-gray-100 bg-gray-50/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-center text-xs text-gray-600 hover:bg-gray-200/70 hover:text-gray-800">
                  <MoreHorizontal className="w-4 h-4 mr-1.5" /> Options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg rounded-md">
                <DropdownMenuItem onClick={handleEdit} className="text-gray-700 hover:bg-gray-100">
                  <Edit3 className="w-3.5 h-3.5 mr-2" />
                  Edit Goal
                </DropdownMenuItem>
                {isManagerOfManagers && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleAssign} className="text-gray-700 hover:bg-gray-100">
                      <UserPlus className="w-3.5 h-3.5 mr-2" />
                      Assign to Team
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCascade} disabled={isProcessing} className="text-gray-700 hover:bg-gray-100">
                      <GitBranch className="w-3.5 h-3.5 mr-2" />
                      Cascade to Team
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-600 focus:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </Card>
      </motion.div>

      {sharedModals}
    </>
  );
}