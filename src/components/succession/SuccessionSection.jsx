import React from "react";

/**
 * SuccessionSection — bordered, full-width section with uppercase tracking
 * header bar and optional icon. Follows the Reflect zone design language:
 * bordered, full-width, section-header heavy.
 */
export function SuccessionSection({ icon: Icon, title, action, children, className = "" }) {
  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-500" />}
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
            {title}
          </h3>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Inline loading spinner */
export function SuccessionLoading({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
      <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
      {label}
    </div>
  );
}

/** Generic error banner — no stack traces or internal IDs */
export function SuccessionError({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
      <p className="text-sm text-red-700 flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 text-sm flex-shrink-0"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

/** Empty state */
export function SuccessionEmpty({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      {Icon && (
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
      )}
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1 max-w-sm">{subtitle}</p>}
    </div>
  );
}

/** Phase badge shown in the header */
export function PhaseBadge({ label = "Phase 1 — Development" }) {
  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0202ff]/5 border border-[#0202ff]/15">
      <span className="text-xs font-medium text-[#0202ff]">{label}</span>
    </div>
  );
}

export default SuccessionSection;