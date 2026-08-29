import React, { useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Editor for goals captured during a coaching experience.
 * Goals are stored on the experience — not assigned to the coachee.
 * The coachee opts in to adopt them into their own goal list.
 *
 * @param {Array} value - captured_goals array
 * @param {Function} onChange - receives updated array
 */
export default function CapturedGoalsEditor({ value = [], onChange }) {
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const addGoal = () => {
    if (!title.trim()) return;
    const newGoal = {
      id: `cg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      target_date: targetDate || "",
      status: "not_started",
      adopted_by_coachee: false,
    };
    onChange([...value, newGoal]);
    setTitle("");
    setTargetDate("");
  };

  const removeGoal = (id) => {
    onChange(value.filter((g) => g.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-[#0202ff]" />
        <p className="text-xs font-semibold text-gray-700">
          Agreed-Upon Goals <span className="text-gray-400 font-normal">(captured here — coachee chooses to add to their goals)</span>
        </p>
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((g) => (
            <div key={g.id} className="flex items-center gap-2 bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2">
              <Target className="w-3.5 h-3.5 text-[#0202ff] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{g.title}</p>
                {g.target_date && (
                  <p className="text-[10px] text-gray-500">Target: {new Date(g.target_date).toLocaleDateString()}</p>
                )}
              </div>
              {g.adopted_by_coachee && (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                  Adopted
                </span>
              )}
              <button
                type="button"
                onClick={() => removeGoal(g.id)}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGoal(); } }}
          placeholder="Goal title..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30"
        />
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addGoal}
          disabled={!title.trim()}
          className="border-[#0202ff]/30 text-[#0202ff] hover:bg-blue-50"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}