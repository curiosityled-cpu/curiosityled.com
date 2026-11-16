import React from "react";
import { Check } from "lucide-react";
import { INCLUDED_EVERYWHERE, DIFFERENCES } from "@/components/pricing/pricingContent";

export default function IncludedBaseline() {
  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-7">
        <h3 className="text-lg font-bold text-gray-900">In every package</h3>
        <p className="text-sm text-gray-600 mt-1">The manager experience is never split up or sold in pieces.</p>
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
                <th className="px-5 py-3 font-semibold">What differs</th>
                <th className="px-5 py-3 font-semibold">Essentials</th>
                <th className="px-5 py-3 font-semibold">Growth</th>
                <th className="px-5 py-3 font-semibold">Organization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {DIFFERENCES.map((row) => (
                <tr key={row.capability}>
                  <td className="px-5 py-3 font-medium text-gray-900">{row.capability}</td>
                  <td className="px-5 py-3 text-gray-600">{row.essentials}</td>
                  <td className="px-5 py-3 text-gray-600">{row.growth}</td>
                  <td className="px-5 py-3 text-gray-600">{row.organization}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}