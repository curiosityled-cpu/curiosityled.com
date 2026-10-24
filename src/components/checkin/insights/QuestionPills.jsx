import React from "react";
import { Check, ListChecks, Sparkles, Users } from "lucide-react";

/** Multi-select pills for the check-in measures and questions on offer. */
export default function QuestionPills({ questions = [], selectedKeys = [], onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((question) => {
        const selected = selectedKeys.includes(question.key);
        const hasData = question.response_count > 0;
        const targeted = !!(
          question.target_role ||
          question.target_tiers?.length ||
          question.target_tracks?.length ||
          question.target_titles?.length
        );
        return (
          <button
            key={question.key}
            type="button"
            aria-pressed={selected}
            title={question.audience ? `For: ${question.audience}` : undefined}
            onClick={() => onToggle(question.key)}
            className={`text-xs font-medium py-1.5 px-3 rounded-lg border transition-all flex items-center gap-1.5 ${
              selected
                ? "bg-[#0202ff] text-white border-[#0202ff]"
                : hasData
                ? "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                : "bg-gray-50 text-gray-400 border-gray-100"
            }`}
          >
            {selected && <Check className="w-3 h-3" />}
            {question.emoji && <span>{question.emoji}</span>}
            {!question.is_active && question.type === "custom" && <ListChecks className="w-3 h-3" />}
            {question.is_ai_generated && <Sparkles className="w-3 h-3" />}
            {targeted && <Users className="w-3 h-3" />}
            <span className="max-w-[160px] truncate">{question.label}</span>
            {hasData && (
              <span className={`text-[10px] ${selected ? "text-white/70" : "text-gray-400"}`}>
                {question.response_count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}