/**
 * PerformHero — the Perform page masthead.
 * Same hero rhythm as Lead and the former Team page: date label, the page name,
 * the scope being read, and a refresh control over an animated backdrop.
 */
import React from "react";
import { RefreshCw } from "lucide-react";
import TeamPulseOverlay from "@/components/team/TeamPulseOverlay";

const HERO_IMAGE = "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/741bf3823_generated_image.png";

export default function PerformHero({ subtitle, signal, isFetching, onRefresh }) {
  const day = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative rounded-2xl overflow-hidden mb-5 shadow-lg" style={{ minHeight: "180px" }}>
      <div className="absolute inset-0" style={{ animation: "hero-breathe 22s ease-in-out infinite" }}>
        <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/30 to-transparent" />

      <TeamPulseOverlay />

      {onRefresh && (
        <button
          onClick={onRefresh}
          className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/80 hover:text-white hover:bg-white/25 transition-colors text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      )}

      <div className="relative z-10 px-6 py-5 flex flex-col justify-end" style={{ minHeight: "180px" }}>
        <p className="text-[10px] font-semibold text-white/70 uppercase tracking-widest mb-1">{day}</p>
        <h1
          className="text-2xl font-bold text-white tracking-tight"
          style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)" }}
        >
          Perform
        </h1>
        {subtitle && <p className="mt-1 text-sm text-white/80 max-w-xl leading-snug">{subtitle}</p>}
        {signal ? (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 text-white border border-white/20 text-xs font-medium backdrop-blur-sm max-w-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
            <span className="line-clamp-2 leading-snug">{signal}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}