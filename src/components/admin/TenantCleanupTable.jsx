import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

const EFFECT = {
  purge: { label: "Removed", className: "bg-rose-50 text-rose-700 border-rose-200" },
  rehome: { label: "Test tenant only", className: "bg-blue-50 text-blue-700 border-blue-200" },
  preserve: { label: "Kept", className: "bg-gray-50 text-gray-600 border-gray-200" },
};

function rowCount(target) {
  if (target.action === "purge") {
    return (target.customerScoped || 0) + (target.harness || 0);
  }
  if (target.action === "rehome") return target.unscoped || 0;
  return 0;
}

/**
 * TenantCleanupTable — every record type in the plan, grouped by the product
 * area it belongs to. When a run has completed, the pre-run count travels
 * alongside the post-run count so the change is legible per record type.
 */
export default function TenantCleanupTable({ targets, previousByEntity }) {
  const groups = useMemo(() => {
    const byArea = new Map();
    for (const target of targets || []) {
      if (!byArea.has(target.area)) byArea.set(target.area, []);
      byArea.get(target.area).push(target);
    }
    return Array.from(byArea.entries());
  }, [targets]);

  return (
    <div className="space-y-4">
      {groups.map(([area, rows]) => (
        <div key={area} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-gray-600">
              {area}
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-400">
                <th className="text-left font-semibold px-4 py-2">Record type</th>
                <th className="text-left font-semibold px-4 py-2 hidden md:table-cell">Holds</th>
                <th className="text-left font-semibold px-4 py-2">Effect</th>
                <th className="text-right font-semibold px-4 py-2">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => {
                const effect = EFFECT[row.action] || EFFECT.preserve;
                const count = rowCount(row);
                const before = previousByEntity?.[row.entity];
                return (
                  <tr key={row.entity} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-900">{row.entity}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{row.note}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={`text-[10px] ${effect.className}`}>
                        {effect.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={count > 0 ? "font-semibold text-gray-900" : "text-gray-300"}>
                        {count}
                      </span>
                      {typeof before === "number" && before !== count && (
                        <span className="text-xs text-gray-400 ml-1.5">was {before}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}