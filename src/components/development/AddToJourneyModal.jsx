import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Layers, Check, Plus } from "lucide-react";
import { toast } from "sonner";

export default function AddToJourneyModal({ open, onClose, resource }) {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // journey id being saved

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.auth.me().then(me => {
      if (!me?.email) { setLoading(false); return; }
      base44.entities.DevelopmentPlan.filter({ user_email: me.email, status: "active" })
        .then(setJourneys)
        .catch(() => setJourneys([]))
        .finally(() => setLoading(false));
    });
  }, [open]);

  const addToJourney = async (journey) => {
    setSaving(journey.id);
    try {
      const alreadyAdded = journey.learning_items?.some(item => item.resource_id === resource.id);
      if (alreadyAdded) {
        toast.info("Already in this journey");
        setSaving(null);
        return;
      }
      const updatedItems = [
        ...(journey.learning_items || []),
        {
          resource_id: resource.id,
          title: resource.title,
          provider: resource.provider || "",
          url: resource.url || "",
          status: "not_started",
        },
      ];
      await base44.entities.DevelopmentPlan.update(journey.id, { learning_items: updatedItems });
      toast.success(`Added to "${journey.title}"`);
      onClose();
    } catch (err) {
      toast.error("Failed to add to journey");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to Journey</DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5 truncate">"{resource?.title}"</p>
        </DialogHeader>
        <div className="space-y-2 pt-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : journeys.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-sm">
              <Layers className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              No active journeys. Create one in My Development first.
            </div>
          ) : (
            journeys.map(journey => {
              const alreadyAdded = journey.learning_items?.some(i => i.resource_id === resource?.id);
              return (
                <button
                  key={journey.id}
                  onClick={() => addToJourney(journey)}
                  disabled={saving === journey.id || alreadyAdded}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl border text-left transition-all
                    ${alreadyAdded
                      ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                      : "border-gray-200 hover:border-[#0202ff]/40 hover:bg-blue-50/50"
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800 truncate">{journey.title}</span>
                  </div>
                  {alreadyAdded ? (
                    <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0"><Check className="w-3 h-3" /> Added</span>
                  ) : saving === journey.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0202ff] flex-shrink-0" />
                  ) : (
                    <Plus className="w-4 h-4 text-[#0202ff] flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
          <div className="pt-2">
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}