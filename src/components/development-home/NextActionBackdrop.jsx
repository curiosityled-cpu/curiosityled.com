/**
 * NextActionBackdrop — the animated layer behind the Next Up card.
 *
 * A slow-panning brand-blue image with a light shaft, a travelling sheen and
 * points of light that drift upward, swell and fade like embers catching the
 * light. Built for this artwork, not reused from the page hero.
 */
import React, { useMemo } from "react";

const BACKDROP_IMAGE =
  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/a0a7cb55bf99042bd3f9c66980fe8171_generated_image.png";

// Deterministic scatter so the field is stable across renders.
function seeded(i, salt = 1) {
  const x = Math.sin(i * 12.9898 * salt) * 43758.5453;
  return x - Math.floor(x);
}

export default function NextActionBackdrop() {
  const motes = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const r1 = seeded(i + 1);
        const r2 = seeded(i + 1, 2.7);
        const r3 = seeded(i + 1, 4.3);
        const flare = i % 6 === 0;
        return {
          left: 32 + r1 * 66,
          top: 8 + r2 * 84,
          size: flare ? 7 + r3 * 3 : 2.5 + r3 * 3,
          duration: 6 + r1 * 9,
          delay: r2 * 7,
          drift: (r3 > 0.5 ? 1 : -1) * (8 + r1 * 18),
          rise: 30 + r2 * 46,
          flare,
        };
      }),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Artwork, panning slowly so the light shaft breathes across the card */}
      <img
        src={BACKDROP_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-screen"
        style={{ animation: "na-pan 32s ease-in-out infinite alternate" }}
      />

      {/* Travelling sheen along the light shaft */}
      <div
        className="absolute -inset-y-1/2 left-0 w-[45%]"
        style={{
          background:
            "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0) 100%)",
          animation: "na-sweep 13s linear infinite",
        }}
      />

      {/* Points of light */}
      {motes.map((m, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            width: `${m.size}px`,
            height: `${m.size}px`,
            backgroundColor: m.flare ? "rgba(255,248,224,0.98)" : "rgba(255,244,214,0.9)",
            boxShadow: m.flare
              ? "0 0 14px 4px rgba(255,236,190,0.65)"
              : "0 0 7px 2px rgba(255,238,198,0.5)",
            filter: m.flare ? "blur(0.3px)" : "blur(0.4px)",
            animation: `na-mote ${m.duration}s ease-in-out ${m.delay}s infinite`,
            "--na-drift": `${m.drift}px`,
            "--na-rise": `${m.rise}px`,
          }}
        />
      ))}
    </div>
  );
}