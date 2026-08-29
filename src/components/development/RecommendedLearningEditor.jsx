import React, { useState } from "react";
import { Plus, Trash2, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Editor for learning resources recommended by a coach as part of
 * a coaching experience. Recommendations are stored on the experience —
 * not assigned. The coachee opts in to add them to their own learning.
 *
 * @param {Array} value - recommended_learning array
 * @param {Function} onChange - receives updated array
 */
export default function RecommendedLearningEditor({ value = [], onChange }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");

  const addItem = () => {
    if (!title.trim()) return;
    const newItem = {
      id: `rl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      resource_title: title.trim(),
      resource_url: url.trim(),
      reason: reason.trim(),
      adopted_by_coachee: false,
    };
    onChange([...value, newItem]);
    setTitle("");
    setUrl("");
    setReason("");
  };

  const removeItem = (id) => {
    onChange(value.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-emerald-600" />
        <p className="text-xs font-semibold text-gray-700">
          Recommended Learning <span className="text-gray-400 font-normal">(coachee chooses to add to their learning)</span>
        </p>
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((r) => (
            <div key={r.id} className="flex items-start gap-2 bg-emerald-50/60 border border-emerald-100 rounded-lg px-3 py-2">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.resource_title}</p>
                  {r.resource_url && (
                    <a href={r.resource_url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-[#0202ff] flex-shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {r.reason && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{r.reason}</p>}
                {r.adopted_by_coachee && (
                  <span className="inline-block mt-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">
                    Adopted
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeItem(r.id)}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
            placeholder="Resource title..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-36 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addItem}
            disabled={!title.trim()}
            className="border-[#0202ff]/30 text-[#0202ff] hover:bg-blue-50"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why recommend this? (optional)"
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30"
        />
      </div>
    </div>
  );
}