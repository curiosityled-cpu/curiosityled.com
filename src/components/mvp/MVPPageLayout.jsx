/**
 * MVPPageLayout — consistent page shell for all MVP pages.
 * Expands/contracts fluidly as the sidebar collapses/expands.
 * Inherits dark theme from MVPLayout for manager role.
 */
import React from "react";
import { useSidebar, getMVPRole } from "./MVPLayout";
import { useAuth } from "@/lib/AuthContext";

export default function MVPPageLayout({ title, subtitle, action, children }) {
  const { collapsed } = useSidebar();
  const { user } = useAuth();
  const mvpRole = getMVPRole(user?.app_role || user?.data?.app_role);
  const isDark = mvpRole === 'manager';

  return (
    <div className={`min-h-screen transition-all duration-200 ${isDark ? 'bg-[#13151c]' : 'bg-gray-50'}`}>
      <div className="w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6 transition-all duration-200">
        {/* Page header */}
        {(title || action) && (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && (
                <h1 className={`text-2xl font-bold tracking-tight leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{subtitle}</p>
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