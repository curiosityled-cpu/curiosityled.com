/**
 * DynamicHeroImage — a time-of-day + weather-aware hero image for the Today header.
 * Picks one of three landscape images (morning / afternoon / evening) and overlays
 * live weather data fetched from Open-Meteo (free, no API key).
 * Falls back to a default location if geolocation is unavailable.
 */
import React, { useState, useEffect } from "react";
import { Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle } from "lucide-react";

const HERO_IMAGES = {
  morning: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/0eb7564ef_generated_image.png",
  afternoon: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/cb9e4df9c_generated_image.png",
  evening: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/f27f10b08_generated_image.png",
};

function getTimeOfDay() {
  const h = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', hour12: false
  }).format(new Date()), 10);
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  return 'evening';
}

const WEATHER_MAP = {
  0:  { label: "Clear",          icon: Sun,            overlay: "" },
  1:  { label: "Mostly clear",   icon: CloudSun,       overlay: "bg-slate-100/20" },
  2:  { label: "Partly cloudy",  icon: CloudSun,       overlay: "bg-slate-200/25" },
  3:  { label: "Overcast",       icon: Cloud,          overlay: "bg-slate-400/30" },
  45: { label: "Fog",            icon: CloudFog,       overlay: "bg-white/40" },
  48: { label: "Fog",            icon: CloudFog,       overlay: "bg-white/40" },
  51: { label: "Light drizzle",  icon: CloudDrizzle,   overlay: "bg-blue-800/20" },
  53: { label: "Drizzle",        icon: CloudDrizzle,   overlay: "bg-blue-800/25" },
  55: { label: "Heavy drizzle",  icon: CloudDrizzle,   overlay: "bg-blue-800/30" },
  61: { label: "Light rain",     icon: CloudRain,      overlay: "bg-blue-900/25" },
  63: { label: "Rain",           icon: CloudRain,      overlay: "bg-blue-900/30" },
  65: { label: "Heavy rain",     icon: CloudRain,      overlay: "bg-blue-900/35" },
  66: { label: "Freezing rain",  icon: CloudRain,      overlay: "bg-blue-900/25" },
  67: { label: "Freezing rain",  icon: CloudRain,      overlay: "bg-blue-900/25" },
  71: { label: "Light snow",     icon: CloudSnow,      overlay: "bg-white/35" },
  73: { label: "Snow",           icon: CloudSnow,      overlay: "bg-white/40" },
  75: { label: "Heavy snow",     icon: CloudSnow,      overlay: "bg-white/45" },
  77: { label: "Snow grains",    icon: CloudSnow,      overlay: "bg-white/35" },
  80: { label: "Rain showers",   icon: CloudRain,      overlay: "bg-blue-900/25" },
  81: { label: "Rain showers",   icon: CloudRain,      overlay: "bg-blue-900/30" },
  82: { label: "Heavy showers",  icon: CloudRain,      overlay: "bg-blue-900/35" },
  85: { label: "Snow showers",   icon: CloudSnow,      overlay: "bg-white/35" },
  86: { label: "Snow showers",   icon: CloudSnow,      overlay: "bg-white/40" },
  95: { label: "Thunderstorm",   icon: CloudLightning, overlay: "bg-purple-900/30" },
  96: { label: "Thunderstorm",   icon: CloudLightning, overlay: "bg-purple-900/30" },
  99: { label: "Thunderstorm",   icon: CloudLightning, overlay: "bg-purple-900/35" },
};

export default function DynamicHeroImage() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather(lat, lon) {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`
        );
        const data = await res.json();
        if (!cancelled) {
          setWeather(data.current_weather);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    if (!navigator.geolocation) {
      fetchWeather(40.71, -74.01); // NYC fallback
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => fetchWeather(40.71, -74.01), // denied → NYC fallback
      { timeout: 5000 }
    );

    return () => { cancelled = true; };
  }, []);

  const timeOfDay = getTimeOfDay();
  const imageUrl = HERO_IMAGES[timeOfDay];
  const weatherInfo = weather ? WEATHER_MAP[weather.weathercode] : null;
  const WeatherIcon = weatherInfo?.icon || Sun;
  const temp = weather ? Math.round(weather.temperature) : null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 flex-shrink-0 hidden md:block"
      style={{ width: 280, height: 120 }}
    >
      <img src={imageUrl} alt={`${timeOfDay} landscape`} className="absolute inset-0 w-full h-full object-cover" />
      {weatherInfo?.overlay && <div className={`absolute inset-0 ${weatherInfo.overlay}`} />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {weatherInfo && temp != null && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
          <WeatherIcon className="w-3.5 h-3.5 text-slate-700" />
          <span className="text-xs font-semibold text-slate-800">{temp}°</span>
          <span className="text-[10px] text-slate-500 hidden lg:inline">{weatherInfo.label}</span>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}