/**
 * PatternsZone — a density zone for the Patterns tab.
 *
 * Visual language: warm-paper translucent cards (light) / deep-navy glass (dark).
 * Collapsible with localStorage-persisted expand/collapse state (same
 * `cl_collapse_<title>` key convention as ZoneCard).
 *
 * Supports an optional `summary` prop — a one-line preview shown when the
 * zone is collapsed (used for the Leading Pattern and Leadership Narrative
 * zones only, per the density-framework redesign).
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PatternsZone({
  title,
  label,
  icon: Icon,
  iconColor,
  summary,
  children,
  defaultExpanded = true,
  index = 0,
  className,
}) {
  const storageKey = `cl_collapse_${title}`;
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? JSON.parse(saved) : defaultExpanded;
    } catch {
      return defaultExpanded;
    }
  });

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  return (
    <section
      className={cn("cl-zone", className)}
      style={{ animationDelay: `${0.2 + index * 0.08}s` }}
    >
      <header
        className="cl-zone-head"
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div className="cl-zone-title-wrap">
          {Icon && <Icon className={cn("cl-zone-icon", iconColor)} />}
          <h3 className="cl-zone-title">{title}</h3>
        </div>
        <div className="cl-zone-meta">
          {label && <span className="cl-zone-label">{label}</span>}
          <ChevronDown
            className={cn("cl-zone-chevron", expanded && "cl-zone-chevron-open")}
          />
        </div>
      </header>

      {!expanded && summary && (
        <div className="cl-zone-summary">{summary}</div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="cl-zone-body-wrap"
          >
            <div className="cl-zone-body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}