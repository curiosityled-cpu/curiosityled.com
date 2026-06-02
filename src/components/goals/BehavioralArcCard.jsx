/**
 * BehavioralArcCard — Surfaces the 5-part behavioral development arc for a goal.
 * Arc: Growth theme → Commitment → Practice tie-in → Experience → Follow-up
 * Reads from the goal's fields and renders each stage with completion state.
 */
import React, { useState } from "react";
import { Target, BookmarkCheck, Layers, Compass, RotateCcw, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ARC_STAGES = [
  {
    key: "theme",
    label: "Growth theme",
    icon: Target,
    color: "text-[#0202ff] bg-[#0202ff]/10",
    placeholder: "What you're deliberately developing",
    field: "title",
  },
  {
    key: "commitment",
    label: "Commitment",
    icon: BookmarkCheck,
    color: "text-emerald-700 bg-emerald-50",
    placeholder: "The specific behavior you're committing to",
    field: "commitment",
  },
  {
    key: "practice",
    label: "Practice tie-in",
    icon: Layers,
    color: "text-violet-700 bg-violet-50",
    placeholder: "A flow or reflection to deepen this",
    field: "practice_link",
  },
  {
    key: "experience",
    label: "Experience",
    icon: Compass,
    color: "text-sky-700 bg-sky-50",
    placeholder: "A real-world experiment to try",
    field: "experience_note",
  },
  {
    key: "followup",
    label: "Follow-up",
    icon: RotateCcw,
    color: "text-amber-700 bg-amber-50",
    placeholder: "How you'll close the loop",
    field: "followup_note",
  },
];

export default function BehavioralArcCard({ goal, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  if (!goal) return null;

  const completedCount = ARC_STAGES.filter(s => goal[s.field]?.trim()).length;
  const pct = Math.round((completedCount / ARC_STAGES.length) * 100);

  const saveField = async (field) => {
    if (!draft.trim() || !goal.id) return;
    setSaving(true);
    try {
      await base44.entities.Goal.update(goal.id, { [field]: draft.trim() });
      onUpdated?.({ ...goal, [field]: draft.trim() });
      setEditing(null);
      setDraft("");
      toast.success("Saved");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
      {/* Header — arc progress summary */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Behavioral arc</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pct === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {completedCount}/{ARC_STAGES.length}
            </span>
          </div>
          {/* Mini progress bar */}
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : '#0202ff' }}
            />
          </div>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {ARC_STAGES.map((stage) => {
            const Icon = stage.icon;
            const value = goal[stage.field];
            const hasValue = value?.trim();
            const isEditing = editing === stage.key;

            return (
              <div key={stage.key} className="px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${stage.color}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[10px] font-semibold text-gray-500">{stage.label}</p>
                      {hasValue && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    </div>

                    {isEditing ? (
                      <div className="space-y-1.5 mt-1">
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          placeholder={stage.placeholder}
                          rows={2}
                          className="w-full text-xs text-gray-800 placeholder:text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/20"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => saveField(stage.field)}
                            disabled={saving || !draft.trim()}
                            className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-[#0202ff] text-white hover:bg-[#0101dd] disabled:opacity-50"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onClick={() => { setEditing(null); setDraft(""); }}
                            className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : hasValue ? (
                      <button
                        className="text-xs text-gray-700 leading-relaxed text-left hover:text-[#0202ff] transition-colors w-full"
                        onClick={() => { setEditing(stage.key); setDraft(value); }}
                      >
                        {value}
                      </button>
                    ) : (
                      <button
                        className="text-[10px] text-gray-400 hover:text-[#0202ff] transition-colors italic"
                        onClick={() => { setEditing(stage.key); setDraft(""); }}
                      >
                        + {stage.placeholder}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}