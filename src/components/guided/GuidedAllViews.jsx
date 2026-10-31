import React, { useState } from "react";
import { LayoutGrid, ChevronDown } from "lucide-react";

/**
 * GuidedAllViews — the shared "All views" escape hatch under the stage rail.
 * Collapsed by default; expands to every view the caller passes, grouped by
 * the stage each view belongs to (a view with stage: null lands under
 * "General").
 */
export default function GuidedAllViews({
  views = [],
  stages = [],
  activeView,
  onSelect,
}) {
  const [open, setOpen] = useState(false);

  if (!views.length) return null;

  const handleSelect = (viewKey) => {
    onSelect?.(viewKey);
    setOpen(false);
  };

  const standalone = views.filter((v) => !v.stage);
  const byStage = stages
    .map((stage) => ({
      stage,
      views: views.filter((v) => v.stage === stage.key),
    }))
    .filter((group) => group.views.length > 0);

  const renderView = (view) => {
    const Icon = view.icon;
    const isActive = activeView === view.key;
    return (
      <button
        key={view.key}
        onClick={() => handleSelect(view.key)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
          isActive
            ? "bg-[#0202ff]/5 text-[#0202ff] font-medium"
            : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
        <span className="truncate">{view.label}</span>
      </button>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
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
        <div className="border-t border-gray-200 max-h-[60vh] overflow-y-auto">
          {standalone.length > 0 && (
            <div className="px-2 py-2 border-b border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-1.5 py-1">
                General
              </p>
              {standalone.map(renderView)}
            </div>
          )}

          {byStage.map(({ stage, views: stageViews }) => {
            const StageIcon = stage.icon;
            return (
              <div key={stage.key} className="px-2 py-2 border-b border-gray-100 last:border-b-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-1.5 py-1 flex items-center gap-1">
                  {StageIcon && <StageIcon className="w-3 h-3" />}
                  {stage.label}
                </p>
                {stageViews.map(renderView)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}