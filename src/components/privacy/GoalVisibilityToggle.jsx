/**
 * GoalVisibilityToggle — per-item visibility control for individual goals.
 * Renders a compact toggle that updates the goal's `visibility` field.
 * "private" = only you can see it; "shared" = visible to manager (default).
 */
import React, { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function GoalVisibilityToggle({ goal, onUpdated }) {
  const isPrivate = goal?.visibility === 'private';
  const [saving, setSaving] = useState(false);

  const toggle = async (e) => {
    e.stopPropagation();
    if (saving || !goal?.id) return;
    setSaving(true);
    const next = isPrivate ? 'shared' : 'private';
    try {
      await base44.entities.Goal.update(goal.id, { visibility: next });
      onUpdated?.({ ...goal, visibility: next });
      toast.success(next === 'private' ? 'Goal set to private — only visible to you' : 'Goal shared with your manager');
    } catch {
      toast.error('Could not update visibility');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={saving}
      title={isPrivate ? 'Private — tap to share with manager' : 'Visible to manager — tap to make private'}
      className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-colors ${
        isPrivate
          ? 'bg-violet-50 text-violet-600 hover:bg-violet-100'
          : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
      }`}
    >
      {saving ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      ) : isPrivate ? (
        <EyeOff className="w-2.5 h-2.5" />
      ) : (
        <Eye className="w-2.5 h-2.5" />
      )}
      {isPrivate ? 'Private' : 'Shared'}
    </button>
  );
}