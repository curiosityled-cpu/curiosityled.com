/**
 * OutcomeTiles — a small row of the numbers that answer "how are we doing?"
 * without turning the page into a dashboard.
 */
import React from "react";
import LeadCard from "@/components/lead/ui/LeadCard";

export default function OutcomeTiles({ tiles = [] }) {
  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tiles.map((tile) => (
        <LeadCard key={tile.label} padded={false} className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ld-muted)]">
            {tile.label}
          </p>
          <p className="text-xl font-bold text-[var(--ld-text)] mt-1 tabular-nums">{tile.value}</p>
          {tile.hint && <p className="text-[11px] text-[var(--ld-muted)] mt-0.5">{tile.hint}</p>}
        </LeadCard>
      ))}
    </div>
  );
}