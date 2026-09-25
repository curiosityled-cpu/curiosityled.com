/**
 * TeamHeroHeader — calm hero banner for the Team page.
 * Mirrors the Lead/Practice hero rhythm: date label, title, signal pill, refresh.
 * Uses a gradient (not animated landscape) to stay distinct from /today.
 */
import React from "react";
import { RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TeamHeroHeader({ scopeLabel, subtitle, pulse, isFetching, onRefresh }) {
  const day = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="relative rounded-2xl overflow-hidden mb-5 shadow-lg" style={{ minHeight: "160px" }}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0202ff] via-[#1a1aff] to-[#4a4aff]" />

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 1px, transparent 1px), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.2) 1px, transparent 1px)",
        backgroundSize: "40px 40px, 60px 60px",
      }} />

      {/* Refresh button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/80 hover:text-white hover:bg-white/25 transition-colors text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      )}

      {/* Content */}
      <div className="relative z-10 px-6 py-5 flex flex-col justify-end" style={{ minHeight: "160px" }}>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-3.5 h-3.5 text-white/70" />
          <p className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">{day}</p>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)" }}>
          {scopeLabel}
        </h1>
        <p className="text-sm text-white/80 mt-1">{subtitle}</p>

        {/* Pulse signal pill */}
        {pulse?.headline && (
          <div className="mt-3 inline-flex items-start gap-2 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-sm max-w-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-white/80 mt-1.5 flex-shrink-0 animate-pulse" />
            <p className="text-xs text-white/90 leading-snug line-clamp-2">{pulse.headline}</p>
          </div>
        )}
      </div>
    </div>
  );
}