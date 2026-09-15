/**
 * EnergyPulseOverlay — CSS-animated "energy pulse" layered over the Practice hero.
 *
 * Concentric rings breathe outward from a focal point at a calm resting-heartbeat
 * cadence, plus drifting dust motes in the light shaft. Restrained, not flashy.
 */
import React, { useMemo } from "react";

function PulseRings() {
  const rings = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        delay: i * 2.2,
        size: 60 + i * 10,
      })),
    []
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      <div className="relative" style={{ width: "0", height: "0" }}>
        {rings.map((r, i) => (
          <div
            key={i}
            className="absolute rounded-full border"
            style={{
              width: `${r.size}px`,
              height: `${r.size}px`,
              left: `${-r.size / 2}px`,
              top: `${-r.size / 2}px`,
              borderColor: "rgba(255, 240, 210, 0.45)",
              borderWidth: "1.5px",
              animation: `practice-pulse-ring 6.6s ease-out infinite`,
              animationDelay: `${r.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DustMotes() {
  const motes = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        left: 18 + Math.random() * 64,
        top: 55 + Math.random() * 40,
        delay: Math.random() * 8,
        duration: 7 + Math.random() * 6,
        size: 2 + Math.random() * 2.5,
        opacity: 0.3 + Math.random() * 0.4,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {motes.map((m, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            width: `${m.size}px`,
            height: `${m.size}px`,
            backgroundColor: "rgba(255, 238, 200, 0.9)",
            opacity: m.opacity,
            filter: "blur(0.5px)",
            animation: `practice-dust ${m.duration}s ease-in-out infinite`,
            animationDelay: `${m.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function EnergyPulseOverlay() {
  return (
    <>
      <PulseRings />
      <DustMotes />
    </>
  );
}