"use client";

import { useEffect, useState } from "react";
import { MapPin, Droplets, Wind, Thermometer, Sprout } from "lucide-react";
import { getAgricultureAdvice, type WeatherData } from "@/lib/weather";

const TAMALE_LAT = 9.4008;
const TAMALE_LON = -0.8393;
const TAMALE_LABEL = "Tamale, Northern Ghana";

interface WeatherWidgetProps {
  compact?: boolean;
}

async function fetchWeatherForCoords(lat: number, lon: number) {
  const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as WeatherData;
}

function localWeekday(dateStr: string): string {
  // Parse as local date (not UTC) to avoid off-by-one in non-UTC timezones
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GH", { weekday: "short" });
}

export function WeatherWidget({ compact = false }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>("");

  useEffect(() => {
    async function loadWithFallback(lat: number, lon: number, label: string) {
      try {
        const w = await fetchWeatherForCoords(lat, lon);
        setWeather(w);
        setLocationName(label);
      } catch {
        setLoading(false);
      } finally {
        setLoading(false);
      }
    }

    if (!navigator.geolocation) {
      loadWithFallback(TAMALE_LAT, TAMALE_LON, TAMALE_LABEL);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        const [weatherResult, geoResult] = await Promise.allSettled([
          fetchWeatherForCoords(latitude, longitude),
          fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          ).then((r) => r.json()),
        ]);

        if (weatherResult.status === "fulfilled") {
          setWeather(weatherResult.value);

          if (geoResult.status === "fulfilled") {
            const addr = geoResult.value?.address ?? {};
            // Build "Neighbourhood, City" — e.g. "La, Accra" instead of just "La"
            const neighbourhood =
              addr.suburb ??
              addr.neighbourhood ??
              addr.town ??
              addr.village ??
              addr.hamlet ??
              "";
            const cityOrRegion =
              addr.city ??
              addr.county ??
              addr.state_district ??
              addr.state ??
              "";
            const parts = [neighbourhood, neighbourhood !== cityOrRegion ? cityOrRegion : ""].filter(Boolean);
            setLocationName(parts.join(", ") || (addr.city as string | undefined) || "Your location");
          }

          setLoading(false);
        } else {
          // API error — fall back to Tamale
          loadWithFallback(TAMALE_LAT, TAMALE_LON, TAMALE_LABEL);
        }
      },
      () => {
        // Permission denied — fall back to Tamale weather
        loadWithFallback(TAMALE_LAT, TAMALE_LON, TAMALE_LABEL);
      },
      // maximumAge: 0 forces a fresh GPS fix, not a cached position
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }, []);

  if (loading) {
    return compact ? (
      <div className="h-8 w-48 animate-pulse rounded-full bg-[#eeeee9]" />
    ) : (
      <div className="rounded-2xl bg-[#eeeee9] p-5 animate-pulse opacity-60 h-56" />
    );
  }

  if (!weather) return null;

  const advice = getAgricultureAdvice(weather);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-[#fcfcf7] border border-[#eeeee9] px-3 py-1.5 text-sm text-[#1c3a13]">
        <span className="text-lg leading-none">{weather.icon}</span>
        <span className="font-bold">{weather.temperature}°C</span>
        <span className="text-[#1c3a13]/40">·</span>
        <Droplets className="h-3.5 w-3.5 text-[#1c3a13]/50" />
        <span>{weather.humidity}%</span>
        <Wind className="h-3.5 w-3.5 text-[#1c3a13]/50" />
        <span>{weather.windSpeed} km/h</span>
        {locationName && (
          <>
            <span className="text-[#1c3a13]/40">·</span>
            <MapPin className="h-3 w-3 text-[#1c3a13]/50" />
            <span className="text-[#1c3a13]/70 truncate max-w-[120px]">{locationName}</span>
          </>
        )}
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-GH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="rounded-2xl bg-[#fcfcf7] border border-[#eeeee9] p-5 text-[#1c3a13]">
      {/* Top row: location + date */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-[#1c3a13]/70">
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-sm font-medium">{locationName || TAMALE_LABEL}</span>
        </div>
        <span className="text-xs text-[#1c3a13]/50">{today}</span>
      </div>

      {/* Main weather row */}
      <div className="flex items-start gap-4 mb-4">
        {/* Left: emoji + temp */}
        <div>
          <div className="text-6xl leading-none mb-1">{weather.icon}</div>
          <div className="text-5xl font-light tracking-tight leading-none text-[#1c3a13]">{weather.temperature}°</div>
          <div className="text-sm text-[#1c3a13]/70 mt-1 capitalize">{weather.description}</div>
          <div className="flex items-center gap-1 text-xs text-[#1c3a13]/50 mt-0.5">
            <Thermometer className="h-3 w-3" />
            Feels {weather.feelsLike}°C
          </div>
        </div>

        {/* Right: stats panel */}
        <div className="ml-auto rounded-xl bg-[#eeeee9] p-3 min-w-[140px]">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1 text-[#1c3a13]/50 text-xs">
                <Droplets className="h-3.5 w-3.5" /> Humidity
              </span>
              <span className="font-bold text-[#1c3a13]">{weather.humidity}%</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1 text-[#1c3a13]/50 text-xs">
                <Wind className="h-3.5 w-3.5" /> Wind
              </span>
              <span className="font-bold text-[#1c3a13]">{weather.windSpeed} km/h</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#1c3a13]/50 text-xs">🌧 Rain</span>
              <span className="font-bold text-[#1c3a13]">{weather.precipitationProbability}%</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#1c3a13]/50 text-xs">☀️ UV</span>
              <span className="font-bold text-[#1c3a13]">{weather.uvIndex}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5-day forecast */}
      {weather.forecast.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-[#1c3a13]/50 uppercase tracking-wider mb-2">5-day forecast</p>
          <div className="grid grid-cols-5 gap-1">
            {weather.forecast.slice(0, 5).map((day) => (
              <div
                key={day.date}
                className="flex flex-col items-center rounded-xl bg-[#eeeee9] py-2 px-1 gap-0.5"
              >
                <span className="text-xs text-[#1c3a13]/50">{localWeekday(day.date)}</span>
                <span className="text-xl leading-tight">{day.icon}</span>
                <span className="text-xs font-bold text-[#1c3a13]">{day.maxTemp}°</span>
                <span className="text-xs text-[#1c3a13]/50">{day.minTemp}°</span>
                {day.precipitationSum > 0 && (
                  <span className="text-[10px] text-[#1c3a13]/50">
                    {day.precipitationSum.toFixed(0)}mm
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agriculture advice */}
      <div className="flex items-start gap-2 rounded-xl bg-[#eeeee9] p-3">
        <Sprout className="h-4 w-4 text-[#1c3a13] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#1c3a13]/70 leading-relaxed">{advice}</p>
      </div>
    </div>
  );
}
