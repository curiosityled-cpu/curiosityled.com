import React from "react";
import { Building2, Brain, Users, Heart } from "lucide-react";

/**
 * Segmented lens toggle for the Leadership Intelligence Hub.
 * Groups the Hub's cards into focused views so only one group renders at a time.
 */
const LENSES = [
  { id: "enterprise", label: "Enterprise", icon: Building2, hint: "Org-wide management health & wellbeing" },
  { id: "capability", label: "Capability", icon: Brain, hint: "Leadership health, trends & coaching matrix" },
  { id: "talent", label: "Talent", icon: Users, hint: "Succession pipeline & leader triage" },
  { id: "workforce", label: "Workforce", icon: Heart, hint: "Retention, stability & engagement" },
];

export default function HubLensToggle({ activeLens, onLensChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-1.5 flex flex-wrap items-center gap-1">
      {LENSES.map((lens) => {
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