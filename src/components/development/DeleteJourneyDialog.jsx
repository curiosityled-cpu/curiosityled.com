import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, BookOpen, Briefcase } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DeleteJourneyDialog({ open, onClose, plan, onDeleted }) {
  const [deleteExperiences, setDeleteExperiences] = useState(false);
  const [unassignLearning, setUnassignLearning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasExperiences = plan?.experiences?.length > 0;
  const hasLearning = plan?.learning_items?.length > 0;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Unassign learning resources linked in this journey if requested
      if (unassignLearning && plan.learning_items?.length > 0) {
        const resourceIds = plan.learning_items
          .map(item => item.resource_id)
          .filter(Boolean);

        if (resourceIds.length > 0) {
          // Find and delete AssignedLearning records for these resources
          const assignments = await base44.entities.AssignedLearning.filter({
            user_email: plan.user_email,
          });
          const toDelete = assignments.filter(a => resourceIds.includes(a.learning_resource_id));
          await Promise.all(toDelete.map(a => base44.entities.AssignedLearning.delete(a.id)));
        }
      }

      // Delete standalone experiences linked to this journey if requested
      if (deleteExperiences && plan.experiences?.length > 0) {
        const externalIds = plan.experiences
          .map(e => e.external_id)
          .filter(Boolean);
        await Promise.all(externalIds.map(id => base44.entities.DevelopmentExperience.delete(id)));
      }

      // Delete the journey itself
      await base44.entities.DevelopmentPlan.delete(plan.id);
      toast.success("Journey deleted");
      onDeleted();
    } catch (err) {
      console.error("Delete journey error:", err);
      toast.error("Failed to delete journey");
    } finally {
      setDeleting(false);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Journey</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <span className="font-semibold text-gray-900">"{plan.title}"</span>?
          </p>

          {hasExperiences && (
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={deleteExperiences}
                onChange={e => setDeleteExperiences(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-[#0202ff]"
              />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                  <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                  Also delete {plan.experiences.length} linked experience{plan.experiences.length !== 1 ? "s" : ""}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Permanently removes experiences that were added to this journey from your log.</p>
              </div>
            </label>
          )}

          {hasLearning && (
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={unassignLearning}
                onChange={e => setUnassignLearning(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-[#0202ff]"
              />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  Also unassign {plan.learning_items.length} learning resource{plan.learning_items.length !== 1 ? "s" : ""}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Removes these courses from your Learning Progress. Your progress on them will be lost.</p>
              </div>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={onClose} disabled={deleting}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Delete Journey
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}