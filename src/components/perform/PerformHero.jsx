/**
 * PerformHero — the Perform masthead.
 *
 * Same hero band as the Develop header: today's date, a personal headline, the
 * scope in one line, the space label as a pill, and the live counts on the
 * right, with Refresh in the top corner.
 */
import React from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import TeamPulseOverlay from "@/components/team/TeamPulseOverlay";

const HERO_IMAGE = "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/741bf3823_generated_image.png";

export default function PerformHero({ description, stats = [], tiles = [], isFetching, onRefresh }) {
  const today = new Date()
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase();

  return (
    <section className="relative mb-5 overflow-hidden rounded-2xl shadow-lg" style={{ minHeight: "210px" }}>
      <div
        className="absolute inset-0"
        style={{ animation: "practice-breathe 22s ease-in-out infinite" }}
      >
        <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20" />
      <TeamPulseOverlay />

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm transition-colors hover:bg-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      )}

      <div className="relative z-10 flex min-h-[210px] flex-col justify-end px-6 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
          {today}
        </p>

        <div className="mt-1.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1 className="max-w-[620px] text-[26px] font-extrabold leading-[1.05] tracking-[-0.02em] text-white sm:text-[34px]">
              Performance in focus
            </h1>
            <p className="mt-2 max-w-[520px] text-[13px] leading-[1.55] text-white/70">
              {description}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-3 w-3 flex-shrink-0 text-amber-300" />
              Your Performance Space
            </div>
          </div>

          <div className="flex flex-shrink-0 items-end gap-5 pb-0.5">
            <dl className="flex items-end gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-right">
                  <dd className="text-[20px] font-extrabold leading-none text-white">
                    {stat.value}
                  </dd>
                  <dt className="mt-1 text-[9px] font-medium uppercase tracking-[0.1em] text-white/60">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {tiles.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm"
              >
                <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/60">
                  {tile.label}
                </p>
                <p className="mt-1 text-[18px] font-extrabold leading-none text-white">
                  {tile.value}
                </p>
                {tile.hint && (
                  <p className="mt-1 text-[10px] leading-tight text-white/60">{tile.hint}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}