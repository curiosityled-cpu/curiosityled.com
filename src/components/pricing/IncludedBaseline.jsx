import React from "react";
import { Check, Minus } from "lucide-react";
import { INCLUDED_EVERYWHERE, MATRIX_ROWS, MODULES, BUNDLES, PRICING_BASIS } from "@/components/pricing/pricingContent";

const COVERAGE = {
  essentials: ["lead", "team", "practice", "intelligence"],
  growth: ["lead", "team", "practice", "intelligence", "development", "performance"],
  organization: ["lead", "team", "practice", "intelligence", "development", "performance", "talent"],
};

export default function IncludedBaseline() {
  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-7">
        <h3 className="text-lg font-bold text-gray-900">In every bundle</h3>
        <p className="text-sm text-gray-600 mt-1">{PRICING_BASIS}</p>
        <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {INCLUDED_EVERYWHERE.map((item) => (
            <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-gray-700">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#0202ff" }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">What's in the bundle</th>
                {BUNDLES.map((b) => (
                  <th key={b.key} className="px-5 py-3 font-semibold whitespace-nowrap">
                    {b.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MATRIX_ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="px-5 py-3 font-medium text-gray-900">{row.label}</td>
                  {BUNDLES.map((b, i) => {
                    if (row.module) {
                      const included = COVERAGE[b.key]?.includes(row.module);
                      return (
                        <td key={b.key} className="px-5 py-3 text-gray-600">
                          {b.custom ? (
                            <span className="text-xs text-gray-500">Your choice</span>
                          ) : included ? (
                            <Check className="w-4 h-4" style={{ color: "#0202ff" }} />
                          ) : (
                            <Minus className="w-4 h-4 text-gray-300" />
                          )}
                        </td>
                      );
                    }
                    return (
                      <td key={b.key} className="px-5 py-3 text-xs text-gray-600">
                        {row.values[i]}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-gray-500">
        Module count is the only thing that differs between bundles; the modules themselves are whole.{" "}
        {MODULES.length} modules, four bundles, one platform.
      </p>
    </>
  );
}