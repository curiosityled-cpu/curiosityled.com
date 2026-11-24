import React from "react";
import { Clock, Pencil, Trash2 } from "lucide-react";
import ExperienceAdoptionPanel from "@/components/development/ExperienceAdoptionPanel";
import { EXP_TYPE_LABELS } from "@/components/development/ExperienceCard";

const STATUS_BADGE = {
  assigned: "bg-muted text-muted-foreground",
  started: "bg-blue-50 text-blue-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
  planned: "bg-purple-50 text-purple-700",
  active: "bg-blue-50 text-blue-700",
  paused: "bg-amber-50 text-amber-700",
  cancelled: "bg-muted text-muted-foreground",
};

/** One logged development experience, sized for a shelf. */
export default function ExperienceShelfCard({ exp, onEdit, onDelete, onAdopt }) {
  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0202ff]/25 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        {exp.type && (
          <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            {EXP_TYPE_LABELS[exp.type] || exp.type}
          </span>
        )}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            title="Edit experience"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#0202ff]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete experience"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
            STATUS_BADGE[exp.status] || "bg-muted text-muted-foreground"
          }`}
        >
          {exp.status}
        </span>
        {exp.start_date && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(exp.start_date).toLocaleDateString()}
          </span>
        )}
      </div>

      <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground line-clamp-2">{exp.title}</h3>
      {exp.description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{exp.description}</p>
      )}

      {exp.competencies?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {exp.competencies.slice(0, 2).map((competency) => (
            <span
              key={competency}
              className="rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] text-purple-700"
            >
              {competency}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3">
        {exp.provider_or_sponsor && (
          <p className="text-[11px] text-muted-foreground line-clamp-1">{exp.provider_or_sponsor}</p>
        )}
        {exp.expected_impact ? (
          <p className="mt-0.5 text-[11px] text-emerald-600">+{exp.expected_impact}% projected</p>
        ) : null}
        {(exp.captured_goals?.length > 0 || exp.recommended_learning?.length > 0) && (
          <ExperienceAdoptionPanel exp={exp} onAdopted={onAdopt} />
        )}
      </div>
    </div>
  );
}