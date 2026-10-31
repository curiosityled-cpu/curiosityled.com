/**
 * MVPPageLayout — consistent page shell for all MVP pages.
 * Expands/contracts fluidly as the sidebar collapses/expands.
 */
import React from "react";
import { useSidebar } from "./MVPLayout";

export default function MVPPageLayout({ title, subtitle, action, children }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50 transition-all duration-200">
      <div className="w-full min-w-0 overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6 space-y-4 transition-all duration-200">
        {/* Page header */}
        {(title || action) && (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && (
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-[1.15]">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-[0.9375rem] text-gray-600 mt-1.5 leading-relaxed">{subtitle}</p>
              )}
            </div>
            {action && (
              <div className="flex-shrink-0">{action}</div>
            )}
          </div>
        )}

        {/* Page content */}
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}