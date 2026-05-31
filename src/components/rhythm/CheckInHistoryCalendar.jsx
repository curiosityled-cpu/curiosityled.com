/**
 * CheckInHistoryCalendar
 * Shows a 28-day visual heatmap of daily check-in activity with energy colour coding.
 * Used on ManagerPatterns and ManagerToday.
 */
import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const ENERGY_CONFIG = {
  strong:    { bg: "bg-[#0202ff]",    label: "Strong",    order: 4 },
  steady:    { bg: "bg-blue-400",     label: "Steady",    order: 3 },
  stretched: { bg: "bg-amber-400",    label: "Stretched", order: 2 },
  drained:   { bg: "bg-rose-400",     label: "Drained",   order: 1 },
  none:      { bg: "bg-gray-100",     label: "No data",   order: 0 },
};

function buildGrid(pulses) {
  const today = new Date();
  const map = {};
  pulses.forEach(p => {
    if (!p.created_date) return;
    const key = p.created_date.split("T")[0];
    if (!map[key] || (ENERGY_CONFIG[p.energy_level]?.order || 0) > (ENERGY_CONFIG[map[key].energy_level]?.order || 0)) {
      map[key] = p;
    }
  });

  // Build last 28 real days
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    days.push({ key, date: d, pulse: map[key] || null });
  }

  // Compute leading empty cells so day 0 lands on correct Mon-Sun column
  // getDay() returns 0=Sun..6=Sat, convert to Mon=0..Sun=6
  const firstDow = days[0].date.getDay();
  const leadingEmpties = firstDow === 0 ? 6 : firstDow - 1; // Mon-based
  return { days, leadingEmpties };
}

export default function CheckInHistoryCalendar({ pulses = [] }) {
  const { days: grid, leadingEmpties } = useMemo(() => buildGrid(pulses), [pulses]);
  const checkedInDays = grid.filter(d => d.pulse).length;
  const streak = useMemo(() => {
    let s = 0;
    const today = new Date().toISOString().split("T")[0];
    for (let i = grid.length - 1; i >= 0; i--) {
      if (grid[i].pulse) s++;
      else if (grid[i].key !== today) break;
    }
    return s;
  }, [grid]);

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Check-in rhythm</p>
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              🔥 {streak}-day streak
            </span>
          )}
          <span className="text-xs text-gray-400">{checkedInDays}/28 days</span>
        </div>
      </div>
      <CardContent className="px-5 pt-3 pb-5">
        {/* Grid: day headers + aligned day cells */}
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => (
            <div key={d} className="text-center text-[9px] text-gray-300 font-medium pb-0.5">{d}</div>
          ))}
          {/* Leading empty cells to align first day to correct column */}
          {Array.from({ length: leadingEmpties }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {grid.map(({ key, date, pulse }) => {
            // Prefer energy_level; fall back to perceived_load for morning_intent / baseline_energy pulses
            const LOAD_TO_ENERGY = { light: 'strong', manageable: 'steady', heavy: 'stretched', unsustainable: 'drained' };
            const energy = pulse?.energy_level || (pulse?.perceived_load ? LOAD_TO_ENERGY[pulse.perceived_load] : null);
            const config = energy ? ENERGY_CONFIG[energy] : ENERGY_CONFIG.none;
            const isToday = key === new Date().toISOString().split("T")[0];
            return (
              <div
                key={key}
                title={`${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${pulse ? ` · ${config.label}` : ""}`}
                className={`aspect-square rounded-md ${config.bg} ${isToday ? "ring-2 ring-offset-1 ring-[#0202ff]/50" : ""} transition-opacity hover:opacity-80 cursor-default`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {["strong","steady","stretched","drained"].map(key => (
            <div key={key} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-sm ${ENERGY_CONFIG[key].bg}`} />
              <span className="text-[10px] text-gray-400">{ENERGY_CONFIG[key].label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-200" />
            <span className="text-[10px] text-gray-400">No check-in</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}