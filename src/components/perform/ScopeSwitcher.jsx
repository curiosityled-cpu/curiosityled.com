/**
 * ScopeSwitcher — the three Perform scopes. Only the scopes the person is
 * allowed to read are passed in, so the control never offers an empty view.
 */
import React from "react";

export default function ScopeSwitcher({ scopes = [], value, onChange }) {
  if (scopes.length < 2) return null;

  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--ld-border)] bg-[var(--ld-surface)] shadow-sm mb-5"
      role="tablist"
      aria-label="Performance scope"
    >
      {scopes.map((scope) => {
        const active = scope.id === value;
        return (
          <button
            key={scope.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(scope.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              active
                ? "bg-[var(--ld-accent)] text-white shadow-sm"
                : "text-[var(--ld-muted)] hover:text-[var(--ld-text)]"
            }`}
          >
            {scope.label}
          </button>
        );
      })}
    </div>
  );
}