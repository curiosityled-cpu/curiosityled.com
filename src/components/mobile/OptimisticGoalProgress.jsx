import { useState, useCallback } from 'react';
import { base44 } from "@/api/base44Client";

/**
 * Hook for managing optimistic goal progress updates
 * Updates UI immediately and syncs with backend
 */
export function useOptimisticGoalProgress() {
  const [pendingUpdates, setPendingUpdates] = useState(new Map());

  const updateGoalProgress = useCallback(async (goalId, newProgress, onSuccess, onError) => {
    // Store pending update
    setPendingUpdates(prev => new Map(prev).set(goalId, newProgress));
    
    try {
      // Persist to backend
      await base44.entities.Goal.update(goalId, { progress: newProgress });
      
      // Remove from pending
      setPendingUpdates(prev => {
        const next = new Map(prev);
        next.delete(goalId);
        return next;
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      
      // Remove from pending on error
      setPendingUpdates(prev => {
        const next = new Map(prev);
        next.delete(goalId);
        return next;
      });
      
      if (onError) onError(error);
    }
  }, []);

  const updateGoalStatus = useCallback(async (goalId, newStatus, onSuccess, onError) => {
    // Similar optimistic update for status
    setPendingUpdates(prev => new Map(prev).set(`${goalId}_status`, newStatus));
    
    try {
      await base44.entities.Goal.update(goalId, { status: newStatus });
      
      setPendingUpdates(prev => {
        const next = new Map(prev);
        next.delete(`${goalId}_status`);
        return next;
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to update goal status:', error);
      
      setPendingUpdates(prev => {
        const next = new Map(prev);
        next.delete(`${goalId}_status`);
        return next;
      });
      
      if (onError) onError(error);
    }
  }, []);

  const completeGoal = useCallback(async (goalId, onSuccess, onError) => {
    // Optimistic completion
    const completionUpdate = {
      status: 'completed',
      progress: 100,
      completed_date: new Date().toISOString()
    };
    
    setPendingUpdates(prev => new Map(prev).set(`${goalId}_complete`, completionUpdate));
    
    try {
      await base44.entities.Goal.update(goalId, completionUpdate);
      
      setPendingUpdates(prev => {
        const next = new Map(prev);
        next.delete(`${goalId}_complete`);
        return next;
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to complete goal:', error);
      
      setPendingUpdates(prev => {
        const next = new Map(prev);
        next.delete(`${goalId}_complete`);
        return next;
      });
      
      if (onError) onError(error);
    }
  }, []);

  return {
    updateGoalProgress,
    updateGoalStatus,
    completeGoal,
    pendingUpdates,
    hasPendingUpdate: (goalId) => pendingUpdates.has(goalId)
  };
}