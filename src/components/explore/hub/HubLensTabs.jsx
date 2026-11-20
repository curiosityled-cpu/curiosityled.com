import React from "react";
import { Building2, Users, Heart } from "lucide-react";

const LENSES = [
  { id: "enterprise", label: "Enterprise", icon: Building2 },
  { id: "talent", label: "Talent", icon: Users },
  { id: "workforce", label: "Workforce", icon: Heart },
];

export default function HubLensTabs({ activeLens, onLensChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-1.5 flex flex-wrap items-center gap-1">
      {LENSES.map((lens) => {
        const Icon = lens.icon;
        const active = activeLens === lens.id;
        return (
          <button
            key={lens.id}
            onClick={() => onLensChange(lens.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              active ? "bg-[#0202ff] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
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