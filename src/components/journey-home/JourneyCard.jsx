import React from "react";
import { CheckCircle2, Clock, Layers, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { dueMeta, DUE_TONE_CLASSES } from "@/lib/learning";

/** One journey card in the Journey Home carousel. */
export default function JourneyCard({ item, onOpen, onEdit, onDelete }) {
  const journey = item.launch?.journey || {};
  const percent = Math.min(100, item.percent || 0);
  const due = dueMeta(item.due_date);
  const complete = item.status === "completed";

  return (
    <div className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0202ff]/30 hover:shadow-md">
      <button type="button" onClick={() => onOpen(item)} className="flex flex-1 flex-col text-left">
        <div className="relative h-28 w-full overflow-hidden">
          {journey.thumbnail_url ? (
            <img
              src={journey.thumbnail_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0202ff] to-[#4b2dff]">
              <Layers className="h-8 w-8 text-white/80" />
            </div>
          )}
          {complete && (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">
              <CheckCircle2 className="h-3 w-3" /> Done
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {item.status === "in_progress" && (
              <span className="rounded-full border border-[#0202ff]/20 bg-[#0202ff]/5 px-2 py-0.5 text-[11px] font-medium text-[#0202ff]">
                In progress
              </span>
            )}
            {item.status === "not_started" && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Not started
              </span>
            )}
            {due && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                  DUE_TONE_CLASSES[due.tone]
                )}
              >
                <Clock className="h-3 w-3" /> {due.label}
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold leading-snug text-foreground line-clamp-2">{item.title}</h3>
          {journey.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{journey.description}</p>
          )}

          <div className="mt-auto pt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", complete ? "bg-emerald-500" : "bg-[#0202ff]")}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate pr-2">{item.meta}</span>
              <span className="font-medium text-foreground">{percent}%</span>
            </div>
          </div>
        </div>
      </button>

      {(onEdit || onDelete) && (
        <div className="flex items-center justify-end gap-1 border-t border-border px-3 py-1.5">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              title="Edit journey"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#0202ff]"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              title="Delete journey"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}