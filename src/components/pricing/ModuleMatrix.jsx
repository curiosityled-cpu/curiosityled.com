import React from "react";
import {
  Sparkles,
  Compass,
  Users,
  Repeat,
  BarChart3,
  Gauge,
  GraduationCap,
  Network,
  Check,
} from "lucide-react";
import { MODULES, TIERS } from "@/components/pricing/pricingContent";

const ICONS = {
  atreus: Sparkles,
  lead: Compass,
  team: Users,
  practice: Repeat,
  intelligence: BarChart3,
  performance: Gauge,
  development: GraduationCap,
  talent: Network,
};

function Cell({ value }) {
  if (value === "full") {
    return <Check className="w-4 h-4 mx-auto" style={{ color: "#0202ff" }} />;
  }
  if (value === "none") {
    return <span className="text-gray-300">—</span>;
  }
  return <span className="text-[11px] font-medium leading-snug text-gray-600">{value}</span>;
}

export default function ModuleMatrix() {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Platform</th>
              {TIERS.map((tier) => (
                <th key={tier.key} className="px-4 py-3 font-semibold text-center whitespace-nowrap">
                  {tier.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MODULES.map((module) => {
              const Icon = ICONS[module.key];
              return (
                <tr key={module.key} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#0202ff" }} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{module.name}</p>
                        <p className="text-[11px] text-gray-500 leading-tight">{module.label}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center align-middle">
                    <Cell value={module.essentials} />
                  </td>
                  <td className="px-4 py-3.5 text-center align-middle">
                    <Cell value={module.growth} />
                  </td>
                  <td className="px-4 py-3.5 text-center align-middle">
                    <Cell value={module.organization} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}