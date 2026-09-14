/**
 * DynamicHeroHeader — animated hero banner for the Today page.
 *
 * Renders a time-of-day landscape illustration as the background, overlaid
 * with CSS-animated weather effects (rain, snow, fog, clouds, lightning)
 * fetched from Open-Meteo.  Includes the date, greeting, and the
 * context-aware HeadlineSignal pill.
 *
 * Time-of-day mapping:
 *   05:00–11:59  → morning  (sunrise landscape)
 *   12:00–16:59  → afternoon (midday landscape)
 *   17:00–04:59  → evening  (twilight landscape)
 */
import React, { useState, useEffect } from "react";
import HeadlineSignal from "@/components/density/HeadlineSignal";
import WeatherOverlay from "@/components/lead/WeatherOverlay";

const HERO_IMAGES = {
  morning: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/b203d2183_generated_image.png",
  afternoon: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/13bbf1f65_generated_image.png",
  evening: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/8636a7a38_generated_image.png",
};

function mapWeatherCode(code) {
  if (code == null) return "clear";
  if (code <= 1) return "clear";
  if (code === 2) return "partly_cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "thunderstorm";
  return "clear";
}

function Birds({ color }) {
  return (
    <div className="flex gap-3" style={{ color, animation: "hero-bird-bob 3s ease-in-out infinite" }}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width="14" height="7" viewBox="0 0 14 7" fill="none">
          <path d="M0 5 Q3.5 0 7 4 Q10.5 0 14 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}

export default function DynamicHeroHeader({ firstName, greeting, day, hour, todayRecord, userEmail }) {
  const [weather, setWeather] = useState(null);

  const timeOfDay = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : "evening";
  const bgImage = HERO_IMAGES[timeOfDay];
  const birdColor = timeOfDay === "evening" ? "rgba(240,240,240,0.5)" : "rgba(30,30,50,0.4)";

  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async (lat, lon) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day,wind_speed_10m`
        );
        const data = await res.json();
        if (cancelled) return;
        const code = data?.current?.weather_code;
        setWeather({ condition: mapWeatherCode(code), isDay: data?.current?.is_day === 1, windSpeed: data?.current?.wind_speed_10m ?? 0 });
      } catch {
        if (!cancelled) setWeather(null);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(40.7128, -74.0060),
        { timeout: 5000, maximumAge: 600000 }
      );
    } else {
      fetchWeather(40.7128, -74.0060);
    }

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden mb-5 shadow-lg" style={{ minHeight: "180px" }}>
      {/* Background image with breathing animation */}
      <div className="absolute inset-0" style={{ animation: "hero-breathe 20s ease-in-out infinite" }}>
        <img src={bgImage} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

      {/* Weather overlay */}
      {weather && <WeatherOverlay condition={weather.condition} windSpeed={weather.windSpeed} />}

      {/* Birds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute"
          style={{ top: "18%", left: 0, animation: "hero-bird-fly 30s linear infinite" }}
        >
          <Birds color={birdColor} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 py-5 flex flex-col justify-end" style={{ minHeight: "180px" }}>
        <p className="text-[10px] font-semibold text-white/70 uppercase tracking-widest mb-1">{day}</p>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)" }}>
          {greeting}, {firstName}.
        </h1>
        <div className="mt-2">
          <HeadlineSignal todayRecord={todayRecord} hasCheckedIn={!!todayRecord} userEmail={userEmail} hour={hour} />
        </div>
      </div>
    </div>
  );
}