/**
 * DensityToggle — segmented control for Compact / Detailed UI density.
 * Used in the Today page top bar and the Atreus settings panel.
 */
import React from "react";
import { cn } from "@/lib/utils";

export default function DensityToggle({ value, onChange, className }) {
  return (
    <div className={cn("inline-flex items-center rounded-lg bg-slate-100 p-0.5", className)}>
      {[
        { id: "compact", label: "Compact" },
        { id: "detailed", label: "Detailed" },
      ].map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-semibold transition-all select-none",
            value === opt.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}