import React from "react";
import { SlidersHorizontal } from "lucide-react";
import HeadlineSignal from "@/components/density/HeadlineSignal";

const LEAD_IMAGE =
  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5c05d5357_generated_image.png";
const PRACTICE_IMAGE =
  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5365205b0_generated_image.png";

function Birds() {
  return (
    <div
      className="flex gap-3"
      style={{ color: "rgba(30,30,50,0.4)", animation: "hero-bird-bob 3s ease-in-out infinite" }}
    >
      {[0, 1, 2].map((i) => (
        <svg key={i} width="14" height="10" viewBox="0 0 14 10" fill="none">
          <path stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round">
            <animate
              attributeName="d"
              dur="0.5s"
              repeatCount="indefinite"
              begin={`${i * 0.12}s`}
              values="M0 6 Q3.5 1 7 5 Q10.5 1 14 6; M0 4 Q3.5 8 7 5 Q10.5 8 14 4; M0 6 Q3.5 1 7 5 Q10.5 1 14 6"
              keyTimes="0; 0.5; 1"
            />
          </path>
        </svg>
      ))}
    </div>
  );
}

function EnergyPulse() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border border-white/30"
          style={{
            width: 220,
            height: 220,
            right: "8%",
            top: "20%",
            animation: `practice-pulse-ring 9s ease-out ${i * 3}s infinite`,
          }}
        />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={`d${i}`}
          className="absolute rounded-full bg-white/50"
          style={{
            width: 2,
            height: 2,
            left: `${18 + i * 13}%`,
            bottom: "12%",
            animation: `practice-dust 7s ease-in-out ${i * 1.1}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function StreakRing({ weekCount = 3 }) {
  const size = 56;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, weekCount / 5);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-white leading-none">{weekCount}</span>
        <span className="text-[8px] text-white/70 leading-none mt-0.5">this wk</span>
      </div>
    </div>
  );
}

/**
 * The app's two page banners, reproduced for the demo:
 *   variant="lead"     → Lead page landscape + greeting + headline signal
 *   variant="practice" → Practice page training room + status pill + streak ring
 */
export default function DemoHero({ variant = "lead", firstName = "Alex", greeting, day, hour = 9 }) {
  const isPractice = variant === "practice";

  return (
    <div className="relative rounded-2xl overflow-hidden mb-5 shadow-lg" style={{ minHeight: "180px" }}>
      <div
        className="absolute inset-0"
        style={{
          animation: isPractice
            ? "practice-breathe 22s ease-in-out infinite"
            : "hero-breathe 20s ease-in-out infinite",
        }}
      >
        <img src={isPractice ? PRACTICE_IMAGE : LEAD_IMAGE} alt="" className="w-full h-full object-cover" />
      </div>

      <div
        className={`absolute inset-0 bg-gradient-to-t ${
          isPractice ? "from-black/65 via-black/25 to-black/10" : "from-black/55 via-black/15 to-transparent"
        }`}
      />

      {isPractice ? (
        <EnergyPulse />
      ) : (
        <>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute" style={{ top: "18%", left: 0, animation: "hero-bird-fly 30s linear infinite" }}>
              <Birds />
            </div>
          </div>
        </>
      )}

      <button className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/80 hover:text-white hover:bg-white/25 transition-colors text-xs font-medium">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Settings</span>
      </button>

      <div className="relative z-10 px-6 py-5 flex flex-col justify-end" style={{ minHeight: "180px" }}>
        <p className="text-[10px] font-semibold text-white/70 uppercase tracking-widest mb-1">{day}</p>

        {isPractice ? (
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1
                className="text-2xl font-bold text-white tracking-tight"
                style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)" }}
              >
                {greeting}, {firstName}.
              </h1>
              <div className="mt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 text-white border border-white/20 text-xs font-medium backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  3 sessions this week — keep the rhythm.
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 pb-0.5">
              <StreakRing weekCount={3} />
            </div>
          </div>
        ) : (
          <>
            <h1
              className="text-2xl font-bold text-white tracking-tight"
              style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)" }}
            >
              {greeting}, {firstName}.
            </h1>
            <div className="mt-2">
              <HeadlineSignal todayRecord={null} hasCheckedIn={false} userEmail={null} hour={hour} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}