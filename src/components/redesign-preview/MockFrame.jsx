import React from "react";
import { directionStyle } from "./directions";

/** One mock screen, framed with the direction it belongs to. */
export default function MockFrame({ direction, screen, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5">
        <span className="text-xs font-semibold text-foreground">{direction.name}</span>
        <span className="text-[11px] text-muted-foreground">{direction.tagline}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {screen}
        </span>
      </div>
      <div style={directionStyle(direction)} className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}