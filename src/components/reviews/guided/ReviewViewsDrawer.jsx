import React, { useState } from "react";
import { LayoutGrid, ChevronDown } from "lucide-react";

/**
 * ReviewViewsDrawer — the discreet "All views" escape hatch, collapsed by
 * default, listing every view the viewer is allowed into.
 */
export default function ReviewViewsDrawer({ views = [], activeView, onSelect, className = "" }) {
  const [open, setOpen] = useState(false);
  if (!views.length) return null;

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <LayoutGrid className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-600 flex-1 text-left">All views</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-200 px-2 py-2 space-y-0.5">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => {
                  onSelect(view.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                  isActive
                    ? "bg-[#0202ff]/5 text-[#0202ff] font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                {view.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}