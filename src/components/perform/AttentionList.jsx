/**
 * AttentionList — the prioritized list at the top of Perform. Each row opens the
 * route that already completes that piece of work.
 */
import React from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight, ClipboardCheck, CalendarCheck, MessageSquare, Target, Gauge, Loader2,
} from "lucide-react";
import LeadCard from "@/components/lead/ui/LeadCard";

const KIND_ICON = {
  review: ClipboardCheck,
  checkin: CalendarCheck,
  conversation: MessageSquare,
  goal: Target,
  kpi: Gauge,
};

const TONE_STYLE = {
  overdue: "bg-rose-50 text-rose-600 dark:bg-rose-950/40",
  due: "bg-amber-50 text-amber-600 dark:bg-amber-950/40",
  open: "bg-sky-50 text-sky-600 dark:bg-sky-950/40",
};

export default function AttentionList({ items = [], loading, emptyTitle, emptyHint }) {
  if (loading) {
    return (
      <LeadCard className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--ld-accent)]" />
      </LeadCard>
    );
  }

  if (items.length === 0) {
    return (
      <LeadCard>
        <p className="text-sm font-semibold text-[var(--ld-text)]">
          {emptyTitle || "Nothing needs you right now"}
        </p>
        <p className="text-xs text-[var(--ld-muted)] mt-1 leading-relaxed">
          {emptyHint || "Reviews, check-ins and goal updates appear here when they are due."}
        </p>
      </LeadCard>
    );
  }

  return (
    <LeadCard padded={false} className="overflow-hidden">
      {items.map((item) => {
        const Icon = KIND_ICON[item.kind] || ClipboardCheck;
        return (
          <Link
            key={item.id}
            to={item.to}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--ld-border)] last:border-0 hover:bg-[var(--ld-panel)] transition-colors group"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                TONE_STYLE[item.tone] || TONE_STYLE.open
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--ld-text)] leading-snug">{item.title}</p>
              {item.meta && (
                <p className="text-xs text-[var(--ld-muted)] mt-0.5 truncate">{item.meta}</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-[var(--ld-muted)] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        );
      })}
    </LeadCard>
  );
}