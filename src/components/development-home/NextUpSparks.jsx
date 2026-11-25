/**
 * NextUpSparks — drifting points of light over the Next Up backdrop.
 *
 * Each spark rises, brightens and fades on its own cycle, so the card's light
 * path keeps breathing without the pattern ever repeating in sync.
 */
import React, { useMemo } from "react";

export default function NextUpSparks({ count = 18 }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: 6 + Math.random() * 90,
        top: 15 + Math.random() * 80,
        size: 2 + Math.random() * 4,
        maxOpacity: 0.45 + Math.random() * 0.5,
        duration: 6 + Math.random() * 6,
        delay: Math.random() * 8,
        drift: -18 + Math.random() * 36,
      })),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {sparks.map((s, i) => (
        <span
          key={i}
          className="nextup-spark absolute rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: "rgba(226, 236, 255, 0.95)",
            boxShadow: "0 0 8px 2px rgba(180, 200, 255, 0.55)",
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            "--mote-max": s.maxOpacity,
            "--mote-drift": `${s.drift}px`,
          }}
        />
      ))}
    </div>
  );
}