/**
 * WeatherOverlay — realistic CSS-animated weather effects layered over the
 * cinematic dark hero image.
 * Conditions: clear, partly_cloudy, cloudy, fog, drizzle, rain, snow, thunderstorm.
 *
 * Rain uses a "window glass" treatment: droplets that appear, grow, then slide
 * down leaving streak trails, layered over a reduced set of falling streaks.
 * Thunderstorms add a double-flash lightning + blue-tint rumble pulse.
 * Particle counts/durations are tuned for the dark cinematic palette.
 */
import React, { useMemo } from "react";

function WindowRainOverlay({ heavy }) {
  // Droplets clinging to "glass" — grow then slide down with a streak trail
  const droplets = useMemo(() =>
    Array.from({ length: heavy ? 18 : 12 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 70,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 4,
      growDuration: 1.5 + Math.random() * 1.5,
      slideDuration: 1.2 + Math.random() * 1.8,
      slideDistance: 40 + Math.random() * 60,
    })), [heavy]);

  // Subtle falling streaks behind the droplets
  const streaks = useMemo(() =>
    Array.from({ length: heavy ? 14 : 7 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 0.7 + Math.random() * 0.6,
      height: 14 + Math.random() * 16,
    })), [heavy]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Falling streaks (background layer) */}
      {streaks.map((s, i) => (
        <div
          key={`streak-${i}`}
          className="absolute w-px bg-gradient-to-b from-transparent via-blue-100/25 to-blue-200/40"
          style={{
            left: `${s.left}%`,
            top: "-30px",
            height: `${s.height}px`,
            animation: `hero-rain ${s.duration}s linear infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      {/* Window-droplet layer (foreground) */}
      {droplets.map((d, i) => (
        <div
          key={`drop-${i}`}
          className="absolute rounded-full bg-blue-100/30"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            boxShadow: "0 0 4px rgba(200,220,255,0.3)",
            animation: `hero-droplet ${d.growDuration + d.slideDuration}s ease-in infinite`,
            animationDelay: `${d.delay}s`,
            "--slide-distance": `${d.slideDistance}px`,
            "--grow-duration": `${d.growDuration}s`,
          }}
        />
      ))}
    </div>
  );
}

function SnowOverlay() {
  const flakes = useMemo(() =>
    Array.from({ length: 20 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 5,
      size: 2 + Math.random() * 3,
      opacity: 0.35 + Math.random() * 0.35,
    })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {flakes.map((f, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${f.left}%`,
            top: "-10px",
            width: `${f.size}px`,
            height: `${f.size}px`,
            opacity: f.opacity,
            animation: `hero-snow ${f.duration}s linear infinite`,
            animationDelay: `${f.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function FogOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent"
        style={{ animation: "hero-fog-drift 18s ease-in-out infinite" }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        style={{ animation: "hero-fog-drift 24s ease-in-out infinite reverse", animationDelay: "6s" }}
      />
    </div>
  );
}

function CloudOverlay() {
  const clouds = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => ({
      top: 5 + i * 22 + Math.random() * 8,
      delay: i * 12,
      duration: 50 + Math.random() * 25,
      scale: 0.8 + Math.random() * 0.5,
      opacity: 0.1 + Math.random() * 0.1,
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

function WindOverlay() {
  const particles = useMemo(() =>
    Array.from({ length: 10 }, () => ({
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 1.8 + Math.random() * 1.8,
      width: 20 + Math.random() * 30,
      opacity: 0.08 + Math.random() * 0.12,
    })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute h-px bg-white"
          style={{
            top: `${p.top}%`,
            left: "-60px",
            width: `${p.width}px`,
            opacity: p.opacity,
            animation: `hero-wind ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function ThunderstormOverlay() {
  return (
    <>
      <WindowRainOverlay heavy />
      {/* Double-flash lightning */}
      <div
        className="absolute inset-0 bg-white pointer-events-none"
        style={{ animation: "hero-lightning-double 9s ease-in-out infinite" }}
      />
      {/* Blue-tint rumble pulse */}
      <div
        className="absolute inset-0 pointer-events-none bg-blue-400/10"
        style={{ animation: "hero-rumble 9s ease-in-out infinite", animationDelay: "0.3s" }}
      />
    </>
  );
}

export default function WeatherOverlay({ condition, windSpeed = 0, isNight = false }) {
  const hasWind = windSpeed > 15;
  return (
    <>
      {hasWind && <WindOverlay />}
      {condition === "rain" && <WindowRainOverlay heavy />}
      {condition === "drizzle" && <WindowRainOverlay />}
      {condition === "snow" && <SnowOverlay />}
      {condition === "fog" && <FogOverlay />}
      {(condition === "cloudy" || condition === "partly_cloudy") && <CloudOverlay />}
      {condition === "thunderstorm" && <ThunderstormOverlay />}
    </>
  );
}