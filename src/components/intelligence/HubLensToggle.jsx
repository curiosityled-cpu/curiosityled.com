import React from "react";
import { ShieldCheck, Brain, Users, Heart } from "lucide-react";

/**
 * Segmented lens toggle for the Leadership Intelligence Hub.
 * Groups the Hub's cards into focused views so only one group renders at a time.
 * "Management Health" is HR-specific (Admin Level 2 only) and is hidden otherwise.
 */
const LENSES = [
  { id: "leadership-health", label: "Leadership Health", icon: Brain, hint: "Org-wide leadership capability, trends & coaching matrix", roles: null },
  { id: "management-health", label: "Management Health", icon: ShieldCheck, hint: "HR oversight: BU heat map, HRBP engagement & support risk", roles: ["Admin Level 2"] },
  { id: "talent", label: "Talent", icon: Users, hint: "Succession pipeline & leader triage", roles: null },
  { id: "workforce", label: "Workforce", icon: Heart, hint: "Retention, stability & engagement", roles: null },
];

export default function HubLensToggle({ activeLens, onLensChange, appRole }) {
  const visibleLenses = LENSES.filter((lens) => !lens.roles || (appRole && lens.roles.includes(appRole)));
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-1.5 flex flex-wrap items-center gap-1">
      {visibleLenses.map((lens) => {
        const Icon = lens.icon;
        const active = activeLens === lens.id;
        return (
          <button
            key={lens.id}
            onClick={() => onLensChange(lens.id)}
            title={lens.hint}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all select-none ${
              active
                ? "bg-[#0202ff] text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{lens.label}</span>
          </button>
        );
      })}
    </div>
  );
}