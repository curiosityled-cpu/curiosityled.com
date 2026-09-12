/**
 * CollapsibleZone — a density-aware card with a condensed summary state and
 * an expandable detail state. The building block of the Today page's
 * progressive-disclosure layout.
 *
 * Supports both controlled (open/onToggle) and uncontrolled (defaultOpen) modes.
 * In Compact density: defaultOpen=false (summary shown, detail on tap).
 * In Detailed density: defaultOpen=true (detail shown by default).
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CollapsibleZone({
  title,
  icon: Icon,
  iconColor = "text-[#0202ff]",
  summary,          // ReactNode — condensed summary shown when collapsed
  children,         // ReactNode — full content shown when expanded
  defaultOpen = false,
  accentColor = "#0202ff",
  className,
  open: controlledOpen,
  onToggle,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const handleToggle = () => {
    if (isControlled) onToggle?.();
    else setInternalOpen(v => !v);
  };

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200/80 overflow-hidden", className)}>
      {/* Top accent pill indicator */}
      <div className="h-0.5 w-full" style={{ backgroundColor: accentColor }} />

      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left hover:bg-slate-50/60 transition-colors select-none"
      >
        {Icon && <Icon className={cn("w-4 h-4 flex-shrink-0", iconColor)} />}
        <p className="text-sm font-semibold text-slate-900 flex-1">{title}</p>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>

      {/* Condensed summary — shown when collapsed */}
      {!open && summary && (
        <div className="px-4 pb-3.5 -mt-1">
          {summary}
        </div>
      )}

      {/* Full content — shown when expanded */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}