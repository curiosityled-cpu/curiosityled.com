/**
 * PeopleList — the concise context section: who is in scope, how their goals
 * and check-ins stand, and who needs a conversation first.
 */
import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";
import LeadCard from "@/components/lead/ui/LeadCard";

export default function PeopleList({ people = [], emptyTitle, emptyHint, footer }) {
  if (people.length === 0) {
    return (
      <LeadCard>
        <p className="text-sm font-semibold text-[var(--ld-text)]">
          {emptyTitle || "No individual results in this scope"}
        </p>
        <p className="text-xs text-[var(--ld-muted)] mt-1 leading-relaxed">
          {emptyHint || "Results are shown as aggregates at this level."}
        </p>
      </LeadCard>
    );
  }

  return (
    <LeadCard padded={false} className="overflow-hidden">
      {people.map((person) => (
        <div
          key={person.id}
          className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ld-border)]"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--ld-panel)] flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-[var(--ld-muted)]">
              {(person.name || "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--ld-text)] truncate">{person.name}</p>
            <p className="text-[11px] text-[var(--ld-muted)] truncate">
              {[person.role, person.detail].filter(Boolean).join(" · ")}
            </p>
          </div>
          {person.atRisk && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex-shrink-0">
              <AlertTriangle className="w-2.5 h-2.5" /> Needs attention
            </span>
          )}
        </div>
      ))}
      {footer && (
        <div className="px-4 py-2.5">
          <Link
            to={footer.to}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0202ff]"
          >
            {footer.label} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </LeadCard>
  );
}