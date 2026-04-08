/**
 * MVPPageLayout — consistent page shell for all MVP pages.
 * - Fluid width (no hard max-w) so it breathes with collapsed/expanded sidebar in Teams.
 * - Clean header slot + optional action slot.
 * - Consistent padding, background, and spacing.
 */
import React from "react";

export default function MVPPageLayout({ title, subtitle, action, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
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