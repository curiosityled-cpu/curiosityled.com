/**
 * BehavioralArcCard — The 5-part behavioral development arc per goal.
 * Parts: Theme → Commitment → Practice → Experience → Follow-up
 * Brief spec: "Growth theme + Commitment + Practice tie-in + Experience + Follow-up"
 */
import React, { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Pencil, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const ARC_PARTS = [
  {
    key: "commitment",
    label: "Commitment",
    placeholder: "What specific commitment am I making to work on this?",
    hint: "e.g. I will delegate one meaningful task each week before grabbing it myself.",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-100",
    dot: "bg-blue-400",
  },
  {
    key: "practice",
    label: "Practice",
    placeholder: "What deliberate practice will I use to build this?",
    hint: "e.g. End-of-day 3-min reflection on where I led vs. reacted.",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-100",
    dot: "bg-violet-400",
  },
  {
    key: "experience",
    label: "Experience",
    placeholder: "What real-world situation will I use to test and learn from?",
    hint: "e.g. My next performance review conversation with a team member.",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-100",
    dot: "bg-amber-400",
  },
  {
    key: "followup",
    label: "Follow-up",
    placeholder: "How will I know if this is working? What will I check?",
    hint: "e.g. Review at end of month: did delegation happen? Was there gap on follow-through?",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    dot: "bg-emerald-400",
  },
];

function getArcFromGoal(goal) {
  // Arc data stored in goal.metadata or on top-level fields
  const m = goal?.metadata || {};
  return {
    commitment: goal?.arc_commitment || m.arc_commitment || "",
    practice: goal?.arc_practice || m.arc_practice || "",
    experience: goal?.arc_experience || m.arc_experience || "",
    followup: goal?.arc_followup || m.arc_followup || "",
  };
}

function completedCount(arc) {
  return Object.values(arc).filter(v => v && v.trim().length > 0).length;
}

export default function BehavioralArcCard({ goal, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [arc, setArc] = useState(() => getArcFromGoal(goal));
  const [editing, setEditing] = useState(null); // key of part being edited
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const done = completedCount(arc);
  const total = ARC_PARTS.length;

  const startEdit = (key) => {
    setEditing(key);
    setDraft(arc[key] || "");
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

  const saveEdit = async (key) => {
    if (saving) return;
    setSaving(true);
    const newArc = { ...arc, [key]: draft.trim() };
    try {
      const metadata = { ...(goal?.metadata || {}), [`arc_${key}`]: draft.trim() };
      const updated = await base44.entities.Goal.update(goal.id, { metadata });
      setArc(newArc);
      onUpdated?.({ ...goal, metadata, ...updated });
    } catch {
      // best-effort
    }
    setSaving(false);
    setEditing(null);
    setDraft("");
  };

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex gap-0.5 items-center">
          {ARC_PARTS.map((p, i) => (
            <div
              key={p.key}
              className={`w-2 h-2 rounded-full ${arc[p.key] ? p.dot : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <p className="text-[11px] font-semibold text-gray-500 flex-1">
          Development arc — {done}/{total} parts defined
        </p>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      {/* Arc parts */}
      {expanded && (
        <div className="divide-y divide-gray-50">
          {ARC_PARTS.map((part) => {
            const value = arc[part.key];
            const isEditing = editing === part.key;

            return (
              <div key={part.key} className={`px-3 py-3 ${value ? part.bg : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {value
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      : <Circle className="w-3.5 h-3.5 text-gray-300" />
                    }
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${value ? part.color : 'text-gray-400'}`}>
                      {part.label}
                    </p>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(part.key)}
                      className="text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      placeholder={part.placeholder}
                      className="text-xs resize-none h-16 rounded-lg border-gray-200"
                      autoFocus
                    />
                    <p className="text-[10px] text-gray-400 italic">{part.hint}</p>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="text-[10px] h-6 px-2.5 bg-gray-900 hover:bg-gray-800 text-white"
                        onClick={() => saveEdit(part.key)}
                        disabled={saving}
                      >
                        <Save className="w-2.5 h-2.5 mr-1" />
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[10px] h-6 px-2.5 text-gray-500"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : value ? (
                  <p className={`text-xs leading-relaxed ${part.color}`}>{value}</p>
                ) : (
                  <button
                    onClick={() => startEdit(part.key)}
                    className="text-[10px] text-gray-400 hover:text-gray-600 italic transition-colors"
                  >
                    + Add {part.label.toLowerCase()}…
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}