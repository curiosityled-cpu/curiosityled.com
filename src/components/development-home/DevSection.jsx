import React from "react";

/** Shared section shell: title, one-line purpose, optional actions. */
export function DevSection({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={className}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold leading-[1.3] tracking-[-0.014em] text-[var(--pf-text)]">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-[13px] text-[var(--pf-muted)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** A quiet text action used in section headers. */
export function SectionLink({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-bold text-[var(--pf-accent)] transition-colors hover:text-[#E1A45E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pf-accent)]"
    >
      {children}
    </button>
  );
}

/** The one filled button used across the home. */
export function SectionButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#3B7890] bg-[#3B7890] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#2f6379] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pf-accent)]"
    >
      {children}
    </button>
  );
}

/** Dashed placeholder for a section with nothing in it yet. */
export function DevEmpty({ icon: Icon, title, text, action }) {
  return (
    <div className="rounded-[16px] border-[1.5px] border-dashed border-[var(--pf-dash)] bg-[var(--pf-surface)] px-5 py-6 text-center">
      {Icon && <Icon className="mx-auto mb-2 h-7 w-7 text-[var(--pf-accent)] opacity-60" />}
      <p className="text-sm font-bold text-[var(--pf-text)]">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-[420px] text-[13px] leading-[1.5] text-[var(--pf-muted)]">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Row-shaped skeleton while the learner's work loads. */
export function DevRowsSkeleton({ rows = 3 }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-[68px] animate-pulse rounded-[14px] border border-[var(--pf-border)] bg-[var(--pf-surface)]"
        />
      ))}
    </div>
  );
}