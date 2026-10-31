import React from "react";
import GuidedRail from "./GuidedRail";
import GuidedAllViews from "./GuidedAllViews";

/**
 * GuidedShell — the one guided workspace shell, shared by Succession and
 * Reviews. Succession was the reference and this is its layout, made generic.
 *
 * The shell owns the frame only:
 *   left rail + All views (desktop, and stacked above the content on mobile)
 *   toolbar → next steps → header → stage tabs → content
 *
 * What sits in the content area is entirely the caller's choice, which is how
 * Reviews swaps its own content as the selected stage changes.
 */
export default function GuidedShell({
  ariaLabel = "Stages",
  stages = [],
  currentStage = null,
  activeStage = null,
  onStageSelect,
  views = [],
  activeView = null,
  onViewSelect,
  toolbar = null,
  nextSteps = null,
  header = null,
  tabs = null,
  children,
}) {
  return (
    <div className="flex gap-5">
      {/* Left rail — desktop */}
      <aside className="hidden lg:block w-56 flex-shrink-0 space-y-3">
        <GuidedRail
          stages={stages}
          currentStage={currentStage}
          activeStage={activeStage}
          onSelect={onStageSelect}
          ariaLabel={ariaLabel}
        />
        <GuidedAllViews
          views={views}
          stages={stages}
          activeView={activeView}
          onSelect={onViewSelect}
        />
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="lg:hidden space-y-3">
          <GuidedRail
            stages={stages}
            activeStage={activeStage}
            onSelect={onStageSelect}
            ariaLabel={ariaLabel}
            horizontal
          />
          <GuidedAllViews
            views={views}
            stages={stages}
            activeView={activeView}
            onSelect={onViewSelect}
          />
        </div>

        {toolbar}
        {nextSteps}
        {header}
        {tabs}
        {children}
      </div>
    </div>
  );
}