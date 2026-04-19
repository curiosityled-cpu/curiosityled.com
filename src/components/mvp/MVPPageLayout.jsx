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
      <div className={`w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 transition-all duration-200 ${collapsed ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {/* Page header */}
        {(title || action) && (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && (
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            {action && (
              <div className="flex-shrink-0">{action}</div>
            )}
          </div>
        )}

        {/* Page content */}
        <div className="space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}