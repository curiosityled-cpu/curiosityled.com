import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ZoneCard({
  title,
  icon: Icon,
  iconColor = "text-[#0202ff]",
  accentColor = "#0202ff",
  className,
  collapsible = false,
  defaultExpanded = true,
  children,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200/80 overflow-hidden", className)}>
      <div className="h-0.5 w-full" style={{ backgroundColor: accentColor }} />
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        {Icon && <Icon className={cn("w-4 h-4 flex-shrink-0", iconColor)} />}
        <p className="text-sm font-semibold text-slate-900 flex-1">{title}</p>
        {collapsible && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
      {(!collapsible || expanded) && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}