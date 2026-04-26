import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Trash2, BookOpen, Briefcase } from "lucide-react";
import { toast } from "sonner";

export default function DeleteJourneyDialog({ open, onClose, onDeleted, plan, userEmail }) {
  const [deleteExperiences, setDeleteExperiences] = useState(false);
  const [unassignLearning, setUnassignLearning] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasExperiences = plan?.experiences?.length > 0;
  const hasLearning = plan?.learning_items?.length > 0;

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Optionally delete attached experiences from DevelopmentExperience entity
      if (deleteExperiences && hasExperiences) {
        const expIds = plan.experiences
          .map(e => e.external_id)
          .filter(Boolean);
        await Promise.all(expIds.map(id => base44.entities.DevelopmentExperience.delete(id)));
      }

      // Optionally unassign (delete) learning assignments for the resources in this journey
      if (unassignLearning && hasLearning) {
        const email = userEmail;
        const resourceIds = plan.learning_items.map(l => l.resource_id).filter(Boolean);
        if (resourceIds.length > 0 && email) {
          const assignments = await base44.entities.AssignedLearning.filter({ user_email: email });
          const toDelete = assignments.filter(a => resourceIds.includes(a.learning_resource_id));
          await Promise.all(toDelete.map(a => base44.entities.AssignedLearning.delete(a.id)));
        }
      }

      // Delete the journey itself
      await base44.entities.DevelopmentPlan.delete(plan.id);
      toast.success("Journey deleted");
      onDeleted();
    } catch (err) {
      console.error("DeleteJourneyDialog error:", err);
      toast.error("Failed to delete journey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-4 h-4" /> Delete Journey
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete <span className="font-semibold">"{plan?.title}"</span>?
          </p>

          {(hasExperiences || hasLearning) && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2">Also do the following:</p>

              {hasExperiences && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteExperiences}
                    onChange={e => setDeleteExperiences(e.target.checked)}
                    className="w-4 h-4 rounded accent-red-500"
                  />
                  <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-sm text-gray-700">
                    Delete attached experiences ({plan.experiences.length})
                  </span>
                </label>
              )}

              {hasLearning && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unassignLearning}
                    onChange={e => setUnassignLearning(e.target.checked)}
                    className="w-4 h-4 rounded accent-red-500"
                  />
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-sm text-gray-700">
                    Unassign learning resources ({plan.learning_items.length})
                  </span>
                </label>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button
              size="sm"
              disabled={loading}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Delete Journey
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}