import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid3X3, LayoutList, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import CreateGoalModal from "../goals/CreateGoalModal";
import EditGoalModal from "../goals/EditGoalModal";
import GoalCard from "../goals/GoalCard";

export default function GoalsSection({ user, refreshTrigger, onRefresh }) {
  const [goals, setGoals] = useState([]);
  const [filteredGoals, setFilteredGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    if (user?.email) {
      loadGoals();
    }
  }, [user, refreshTrigger]);

  useEffect(() => {
    filterGoals();
  }, [searchQuery, goals]);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.Goal.list("-updated_date");
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterGoals = () => {
    if (!searchQuery) {
      setFilteredGoals(goals);
      return;
    }

    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = goals.filter(goal =>
      goal.title.toLowerCase().includes(lowercasedQuery) ||
      goal.description?.toLowerCase().includes(lowercasedQuery)
    );
    setFilteredGoals(filtered);
  };

  const handleCreateGoal = async (goalData) => {
    const newGoal = await base44.entities.Goal.create(goalData);
    setGoals(prev => [newGoal, ...prev]);
    setShowCreateModal(false);
    onRefresh?.();
  };



  const handleOpenEditModal = (goal) => {
    setEditingGoal(goal);
    setShowEditModal(true);
  };

  const handleUpdateGoal = async (goalId, updatedData) => {
    await base44.entities.Goal.update(goalId, updatedData);
    setGoals(prevGoals => 
      prevGoals.map(g => 
        g.id === goalId ? { ...g, ...updatedData } : g
      )
    );
    setShowEditModal(false);
    setEditingGoal(null);
    onRefresh?.();
  };

  const handleDeleteGoal = async (goalId) => {
    await base44.entities.Goal.delete(goalId);
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
    onRefresh?.();
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="text-white"
          style={{ backgroundColor: '#0202ff' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Goal
        </Button>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            onClick={() => setViewMode("grid")}
            size="icon"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
            size="icon"
          >
            <LayoutList className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Goals Display */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
          </div>
        ) : filteredGoals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(to bottom right, #dbeafe, #e0e7ff)' }}>
              <Plus className="w-12 h-12" style={{ color: '#0202ff' }} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? "No goals found" : "No goals yet"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? "Try adjusting your search query" 
                : "Get started by creating your first goal"
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Goal
              </Button>
            )}
          </motion.div>
        ) : (
          <div className={viewMode === "grid" 
            ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-3"
          }>
            {filteredGoals.map((goal, index) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                viewMode={viewMode}
                index={index}
                onDelete={handleDeleteGoal}
                onEdit={handleOpenEditModal}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <CreateGoalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
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
    </div>
  );
}