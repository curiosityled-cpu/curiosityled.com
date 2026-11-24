import React from "react";

/** A bordered record row that expands in place — certificates, learning record. */
export default function DevelopRecord({ title, defaultOpen = true, children }) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[14px] border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-[0_4px_12px_rgba(23,40,50,0.06)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-[18px] py-3.5 text-[15px] font-bold text-[var(--pf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B7890] [&::-webkit-details-marker]:hidden">
        {title}
        <span className="block h-2 w-2 rotate-45 border-b-2 border-r-2 border-[var(--pf-accent)]" />
      </summary>
      <div className="px-[18px] pb-4">{children}</div>
    </details>
  );
}