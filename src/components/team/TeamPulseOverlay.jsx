/**
 * TeamPulseOverlay — CSS-animated "team network" layered over the Team hero.
 *
 * Glowing nodes pulse at a calm cadence (like a living org chart), thin
 * connection lines flow between them, and a few sparks drift upward.
 * Restrained, not flashy — mirrors the Lead weather and Practice energy overlays.
 */
import React, { useMemo } from "react";

const NODES = [
  { x: 14, y: 32 },
  { x: 30, y: 62 },
  { x: 47, y: 28 },
  { x: 64, y: 58 },
  { x: 79, y: 36 },
  { x: 89, y: 64 },
];

const LINES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 4], [1, 3], [0, 2],
];

function NetworkNodes() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {NODES.map((n, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            width: "7px",
            height: "7px",
            marginLeft: "-3.5px",
            marginTop: "-3.5px",
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            animation: `team-node-pulse 4.4s ease-in-out infinite`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}
    </div>
  );
}

function ConnectionLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {LINES.map(([a, b], i) => (
        <line
          key={i}
          x1={NODES[a].x}
          y1={NODES[a].y}
          x2={NODES[b].x}
          y2={NODES[b].y}
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="0.4"
          vectorEffect="non-scaling-stroke"
          style={{
            animation: `team-line-flow 5.2s ease-in-out infinite`,
            animationDelay: `${i * 0.45}s`,
          }}
        />
      ))}
    </svg>
  );
}

function DriftingSparks() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 9 }, () => ({
        left: 10 + Math.random() * 80,
        top: 60 + Math.random() * 35,
        delay: Math.random() * 7,
        duration: 7 + Math.random() * 5,
        size: 1.5 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.4,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {sparks.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: "rgba(255, 246, 220, 0.95)",
            opacity: s.opacity,
            filter: "blur(0.5px)",
            animation: `team-spark ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function TeamPulseOverlay() {
  return (
    <>
      <ConnectionLines />
      <NetworkNodes />
      <DriftingSparks />
    </>
  );
}