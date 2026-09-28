import React, { useState } from "react";
import { LayoutGrid, ChevronDown } from "lucide-react";
import { STAGES, ALL_VIEWS } from "./stageConfig";

/**
 * AllViewsDrawer — the power-user escape hatch. A discreet button that
 * expands a panel listing all 19 views grouped by stage, for direct
 * navigation once the user understands the process. Default collapsed.
 */
export default function AllViewsDrawer({ activeView, onSelect }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (viewKey) => {
    onSelect(viewKey);
    setOpen(false);
  };

  // Group views by stage
  const standalone = ALL_VIEWS.filter((v) => v.stage === null);
  const byStage = STAGES.map((stage) => ({
    stage,
    views: ALL_VIEWS.filter((v) => v.stage === stage.key),
  })).filter((g) => g.views.length > 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <LayoutGrid className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-600 flex-1 text-left">
          All views
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-200 max-h-[60vh] overflow-y-auto">
          {/* Standalone views (Overview, Governance) */}
          {standalone.length > 0 && (
            <div className="px-2 py-2 border-b border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-1.5 py-1">
                General
              </p>
              {standalone.map((v) => {
                const Icon = v.icon;
                const isActive = activeView === v.key;
                return (
                  <button
                    key={v.key}
                    onClick={() => handleSelect(v.key)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                      isActive
                        ? "bg-[#0202ff]/5 text-[#0202ff] font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {v.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Views grouped by stage */}
          {byStage.map(({ stage, views }) => (
            <div key={stage.key} className="px-2 py-2 border-b border-gray-100 last:border-b-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-1.5 py-1 flex items-center gap-1">
                <stage.icon className="w-3 h-3" />
                {stage.label}
              </p>
              {views.map((v) => {
                const Icon = v.icon;
                const isActive = activeView === v.key;
                return (
                  <button
                    key={v.key}
                    onClick={() => handleSelect(v.key)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                      isActive
                        ? "bg-[#0202ff]/5 text-[#0202ff] font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {v.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}