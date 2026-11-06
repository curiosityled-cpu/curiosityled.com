import React from "react";
import { Badge } from "@/components/ui/badge";

/**
 * TenantCleanupSummary — the headline numbers of a cleanup run, so the
 * reviewer can see the size of the change before approving it and confirm it
 * afterwards without reading the table.
 */
export default function TenantCleanupSummary({ totals, previousTotals }) {
  const cards = [
    {
      key: "purgeCustomer",
      label: "Removed from customer tenants",
      value: totals?.purgeCustomer ?? 0,
      before: previousTotals?.purgeCustomer,
      tone: "bg-rose-50 text-rose-700 border-rose-100",
    },
    {
      key: "purgeHarness",
      label: "Orphaned test-harness records",
      value: totals?.purgeHarness ?? 0,
      before: previousTotals?.purgeHarness,
      tone: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      key: "rehome",
      label: "Seed content moved to test tenant",
      value: totals?.rehome ?? 0,
      before: previousTotals?.rehome,
      tone: "bg-blue-50 text-blue-700 border-blue-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.key} className={`rounded-xl border p-4 ${card.tone}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-80">
            {card.label}
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-extrabold tabular-nums">{card.value}</span>
            {typeof card.before === "number" && card.before !== card.value && (
              <Badge variant="outline" className="text-[10px] bg-white/70">
                was {card.before}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}