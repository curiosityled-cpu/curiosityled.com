import React from "react";

/** Shared, presentational pieces of the Development home — no data, no state. */

export function Eyebrow({ children }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B4762E] dark:text-[#E1A45E]">
      {children}
    </p>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-[var(--pf-border)] pb-3">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.015em] text-[var(--pf-text)]">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-[13px] leading-[1.5] text-[var(--pf-muted)]">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function TextButton({ onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-bold text-[var(--pf-accent)] transition-colors hover:text-[#E1A45E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pf-accent)] ${className}`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ onClick, children, size = "md", className = "" }) {
  const sizing =
    size === "sm" ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-[10px] bg-[#3B7890] font-bold text-white transition-[background,box-shadow] duration-200 hover:bg-[#2f6379] active:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B7890] ${sizing} ${className}`}
    >
      {children}
    </button>
  );
}

export function Chip({ tone = "neutral", children }) {
  const tones = {
    neutral: "border-[var(--pf-border)] bg-[var(--pf-soft)] text-[var(--pf-muted)]",
    accent: "border-[var(--pf-accent)] bg-[var(--pf-soft)] text-[var(--pf-accent)]",
    attention: "border-[#E1A45E] bg-[#FBF0E1] text-[#8A5A1E] dark:bg-[#3A2E20] dark:text-[#E1A45E]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone] || tones.neutral}`}
    >
      {children}
    </span>
  );
}

export function EmptyNote({ icon: Icon, title, text, action }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-dashed border-[var(--pf-dash)] bg-[var(--pf-surface)] px-6 py-7 text-center">
      {Icon && <Icon className="mx-auto mb-2 h-8 w-8 text-[var(--pf-accent)] opacity-55" />}
      <p className="text-[15px] font-bold text-[var(--pf-text)]">{title}</p>
      {text && (
        <p className="mx-auto mt-1 max-w-[440px] text-[13px] leading-[1.5] text-[var(--pf-muted)]">{text}</p>
      )}
      {action && <div className="mt-3.5 flex justify-center">{action}</div>}
    </div>
  );
}

export function RowSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-[70px] animate-pulse rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)]"
        />
      ))}
    </div>
  );
}