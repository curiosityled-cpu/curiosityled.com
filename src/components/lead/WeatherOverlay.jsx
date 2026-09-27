/**
 * WeatherOverlay — CSS-animated weather effects layered over the hero image.
 *
 * Enhanced realistic effects:
 *   - Rain: falling streaks + window-droplet effect (droplets form, grow, slide)
 *   - Thunderstorm: heavy rain + lightning flash + thunder afterglow
 *   - Snow: drifting flakes + accumulation band at the bottom edge
 *   - Fog: multi-layered drifting fog with depth
 *   - Cloudy: drifting cloud shapes
 *
 * Conditions: clear, cloudy, foggy, snowy, stormy.
 */
import React, { useMemo } from "react";

function RainOverlay({ heavy }) {
  const streaks = useMemo(() =>
    Array.from({ length: heavy ? 35 : 18 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 0.4 + Math.random() * 0.4,
      height: 15 + Math.random() * 25,
    })), [heavy]);

  const drops = useMemo(() => {
    const count = heavy ? 16 : 10;
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 50,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      size: 5 + Math.random() * 10,
    }));
  }, [heavy]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Falling rain streaks */}
      {streaks.map((s, i) => (
        <div
          key={`streak-${i}`}
          className="absolute w-px bg-gradient-to-b from-transparent via-blue-100/30 to-blue-200/50"
          style={{
            left: `${s.left}%`,
            top: "-30px",
            height: `${s.height}px`,
            animation: `hero-rain ${s.duration}s linear infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      {/* Window droplets — form, grow, slide down leaving trails */}
      {drops.map((d, i) => (
        <div
          key={`drop-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            background:
              "radial-gradient(circle, rgba(200,220,255,0.28) 0%, rgba(200,220,255,0.08) 70%, transparent 100%)",
            border: "1px solid rgba(200,220,255,0.15)",
            animation: `hero-window-drop ${d.duration}s ease-in infinite`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function SnowOverlay() {
  const flakes = useMemo(() =>
    Array.from({ length: 35 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 5,
      size: 2 + Math.random() * 5,
      opacity: 0.4 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 40,
    })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Falling snowflakes with horizontal drift */}
      {flakes.map((f, i) => (
        <div
          key={`flake-${i}`}
          className="absolute rounded-full bg-white"
          style={{
            left: `${f.left}%`,
            top: "-10px",
            width: `${f.size}px`,
            height: `${f.size}px`,
            opacity: f.opacity,
            animation: `hero-snow ${f.duration}s linear infinite`,
            animationDelay: `${f.delay}s`,
            "--drift": `${f.drift}px`,
          }}
        />
      ))}
      {/* Snow accumulation at the bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "0",
          background:
            "linear-gradient(to top, rgba(255,255,255,0.55), rgba(255,255,255,0.15), transparent)",
          animation: "hero-snow-pile 30s ease-out forwards",
        }}
      />
    </div>
  );
}

function FogOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        style={{ animation: "hero-fog-drift 18s ease-in-out infinite" }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        style={{
          animation: "hero-fog-drift 25s ease-in-out infinite reverse",
          animationDelay: "3s",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/20 to-transparent"
        style={{ animation: "hero-fog-drift 15s ease-in-out infinite", animationDelay: "1s" }}
      />
    </div>
  );
}

function CloudOverlay() {
  const clouds = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      top: 3 + i * 16 + Math.random() * 6,
      delay: i * 8,
      duration: 45 + Math.random() * 30,
      scale: 0.8 + Math.random() * 0.6,
      opacity: 0.12 + Math.random() * 0.15,
    })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {clouds.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white blur-xl"
          style={{
            top: `${c.top}%`,
            left: "-250px",
            width: "250px",
            height: "70px",
            opacity: c.opacity,
            "--scale": c.scale,
            animation: `hero-cloud-drift ${c.duration}s linear infinite`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function ThunderstormOverlay() {
  return (
    <>
      <RainOverlay heavy />
      {/* Lightning flash — bright white */}
      <div
        className="absolute inset-0 bg-white pointer-events-none"
        style={{ animation: "hero-lightning 7s ease-in-out infinite" }}
      />
      {/* Thunder afterglow — warm subtle radial glow following the flash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255,240,200,0.12), transparent 60%)",
          animation: "hero-thunder-glow 7s ease-in-out infinite",
        }}
      />
    </>
  );
}

export default function WeatherOverlay({ condition, windSpeed = 0 }) {
  return (
    <>
      {condition === "cloudy" && <CloudOverlay />}
      {condition === "foggy" && <FogOverlay />}
      {condition === "snowy" && <SnowOverlay />}
      {condition === "stormy" && <ThunderstormOverlay />}
    </>
  );
}