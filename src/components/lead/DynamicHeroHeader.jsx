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
import { SlidersHorizontal } from "lucide-react";
import HeadlineSignal from "@/components/density/HeadlineSignal";
import WeatherOverlay from "@/components/lead/WeatherOverlay";

// 20 images: 4 time periods × 5 weather conditions.
// Time periods for IMAGES: morning, afternoon, evening, night.
// "night" shows after sunset (is_day === 0 from the weather API) but does
// NOT change the greeting — greeting stays morning/afternoon/evening.
const HERO_IMAGES = {
  morning: {
    clear:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/d2fa683b8_generated_5529b01b.png",
    cloudy: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/273aaaa71_generated_image.png",
    stormy: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/94ccafb29_generated_image.png",
    foggy:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/72eedcb95_generated_image.png",
    snowy:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/7f0bcf5d1_generated_image.png",
  },
  afternoon: {
    clear:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5c05d5357_generated_image.png",
    cloudy: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/7f470d80f_generated_image.png",
    stormy: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/a54f2a6b8_generated_image.png",
    foggy:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/98e4a2045_generated_image.png",
    snowy:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5736eb792_generated_image.png",
  },
  evening: {
    clear:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/943de1ed8_generated_image.png",
    cloudy: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/014b73132_generated_image.png",
    stormy: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/3bb319142_generated_image.png",
    foggy:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/c9a4d80af_generated_image.png",
    snowy:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/c60911f6b_generated_image.png",
  },
  night: {
    clear:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/46e8c3ba3_generated_image.png",
    cloudy: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/20017a61b_generated_image.png",
    stormy: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/1ba566035_generated_image.png",
    foggy:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/49969ce5e_generated_image.png",
    snowy:  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/20e47e061_generated_image.png",
  },
};

// Maps WMO weather codes to our 5 hero image conditions:
// clear, cloudy, foggy, snowy, stormy (rain + thunderstorm both → stormy)
function mapWeatherCondition(code) {
  if (code == null) return "clear";
  if (code <= 1) return "clear";           // clear, mainly clear
  if (code <= 3) return "cloudy";          // partly cloudy, overcast
  if (code === 45 || code === 48) return "foggy";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snowy";
  if (code >= 95) return "stormy";         // thunderstorm
  return "stormy";                         // drizzle, rain, rain showers → stormy
}

function Birds({ color }) {
  return (
    <div className="flex gap-3" style={{ color, animation: "hero-bird-bob 3s ease-in-out infinite" }}>
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

export default function DynamicHeroHeader({ firstName, greeting, day, hour, todayRecord, userEmail, onSettingsClick }) {
  const [weather, setWeather] = useState(null);

  // Greeting time-of-day (morning / afternoon / evening) — unchanged by night
  const timeOfDay = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : "evening";

  // Image time-of-day adds "night" — shown when the weather API reports
  // is_day === 0 (after sunset, before sunrise). Greeting stays as-is.
  const imageTimeOfDay = weather?.isDay === false ? "night" : timeOfDay;
  const weatherCondition = weather?.condition || "clear";
  const bgImage = HERO_IMAGES[imageTimeOfDay]?.[weatherCondition] || HERO_IMAGES[timeOfDay]?.clear || HERO_IMAGES.morning.clear;
  const birdColor = imageTimeOfDay === "night" ? "rgba(200,200,220,0.3)" : timeOfDay === "evening" ? "rgba(240,240,240,0.5)" : "rgba(30,30,50,0.4)";

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
        setWeather({ condition: mapWeatherCondition(code), isDay: data?.current?.is_day === 1, windSpeed: data?.current?.wind_speed_10m ?? 0 });
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

      {/* Settings button */}
      {onSettingsClick && (
        <button
          onClick={onSettingsClick}
          className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/80 hover:text-white hover:bg-white/25 transition-colors text-xs font-medium"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      )}

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