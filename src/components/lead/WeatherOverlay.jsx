/**
 * WeatherOverlay — CSS-animated weather effects layered over the hero image.
 * Conditions: clear, partly_cloudy, cloudy, fog, drizzle, rain, snow, thunderstorm.
 */
import React, { useMemo } from "react";

function RainOverlay({ heavy }) {
  const drops = useMemo(() =>
    Array.from({ length: heavy ? 40 : 20 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 0.5 + Math.random() * 0.5,
      height: 12 + Math.random() * 18,
    })), [heavy]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {drops.map((d, i) => (
        <div
          key={i}
          className="absolute w-px bg-gradient-to-b from-transparent via-blue-100/40 to-blue-200/60"
          style={{
            left: `${d.left}%`,
            top: "-30px",
            height: `${d.height}px`,
            animation: `hero-rain ${d.duration}s linear infinite`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function SnowOverlay() {
  const flakes = useMemo(() =>
    Array.from({ length: 30 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      size: 3 + Math.random() * 4,
      opacity: 0.4 + Math.random() * 0.4,
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
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        style={{ animation: "hero-fog-drift 15s ease-in-out infinite" }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        style={{ animation: "hero-fog-drift 20s ease-in-out infinite reverse", animationDelay: "5s" }}
      />
    </div>
  );
}

function CloudOverlay() {
  const clouds = useMemo(() =>
    Array.from({ length: 4 }, (_, i) => ({
      top: 5 + i * 18 + Math.random() * 8,
      delay: i * 10,
      duration: 40 + Math.random() * 25,
      scale: 0.8 + Math.random() * 0.6,
      opacity: 0.15 + Math.random() * 0.15,
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
    Array.from({ length: 15 }, () => ({
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 1.5 + Math.random() * 1.5,
      width: 20 + Math.random() * 30,
      opacity: 0.1 + Math.random() * 0.15,
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
      <RainOverlay heavy />
      <div
        className="absolute inset-0 bg-white pointer-events-none"
        style={{ animation: "hero-lightning 8s ease-in-out infinite" }}
      />
    </>
  );
}

export default function WeatherOverlay({ condition, windSpeed = 0 }) {
  const hasWind = windSpeed > 15;
  return (
    <>
      {hasWind && <WindOverlay />}
      {condition === "rain" && <RainOverlay heavy />}
      {condition === "drizzle" && <RainOverlay />}
      {condition === "snow" && <SnowOverlay />}
      {condition === "fog" && <FogOverlay />}
      {(condition === "cloudy" || condition === "partly_cloudy") && <CloudOverlay />}
      {condition === "thunderstorm" && <ThunderstormOverlay />}
    </>
  );
}