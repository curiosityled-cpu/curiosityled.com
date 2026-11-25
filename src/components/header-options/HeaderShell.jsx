import React from "react";
import { Flame, Settings } from "lucide-react";

/**
 * The shared content of a candidate header: date, greeting, status pill and the
 * weekly streak. Only the animated layer behind it changes between options, so
 * the ten can be compared on their motion and surface alone.
 */
export default function HeaderShell({ children, accent = "#ffcc00", date, greeting, status, streak = 0 }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-[#111113]">
      <div className="pointer-events-none absolute inset-0">{children}</div>

      <div className="relative flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">{date}</p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90">
            <Settings className="h-3 w-3" />
            Settings
          </span>
        </div>

        <div className="flex items-end justify-between gap-5">
          <div className="min-w-0">
            <h2 className="max-w-[440px] text-[20px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white sm:text-[24px]">
              {greeting}
            </h2>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] text-white/85">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              <span className="truncate">{status}</span>
            </div>
          </div>

          <div className="flex h-[68px] w-[68px] flex-shrink-0 flex-col items-center justify-center rounded-full border border-white/15 bg-black/40">
            <Flame className="h-3.5 w-3.5" style={{ color: accent }} />
            <span className="text-lg font-extrabold leading-none text-white">{streak}</span>
            <span className="text-[8px] font-bold uppercase tracking-wide text-white/55">this week</span>
          </div>
        </div>
      </div>
    </div>
  );
}