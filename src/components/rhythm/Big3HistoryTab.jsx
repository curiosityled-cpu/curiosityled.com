import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const STATUS_CONFIG = {
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  on_track:  { label: "On Track",  color: "bg-blue-100 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
  shifted:   { label: "Shifted",   color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  blocked:   { label: "Blocked",   color: "bg-red-100 text-red-700 border-red-200",       dot: "bg-red-500" },
  confirmed: { label: "Confirmed", color: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "bg-indigo-400" },
  planned:   { label: "Planned",   color: "bg-gray-100 text-gray-600 border-gray-200",   dot: "bg-gray-400" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function CompletionRateChart({ checkIns }) {
  // Build a 14-day rolling window of completion rates
  const today = new Date();
  const data = [];

  for (let i = 13; i >= 0; i--) {
    const day = subDays(today, i);
    const dayStr = format(day, "yyyy-MM-dd");
    const record = checkIns.find(c => c.check_in_date === dayStr);
    const priorities = record?.big3_priorities || [];
    const total = priorities.length;
    const completed = priorities.filter(p => p.status === "completed").length;

    data.push({
      date: format(day, "MMM d"),
      total,
      completed,
      rate: total > 0 ? Math.round((completed / total) * 100) : null,
    });
  }

  return (
    <Card className="shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5 text-green-600" />
          14-Day Completion Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={1} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={36} />
            <Tooltip
              formatter={(value, name) => value !== null ? [`${value}%`, "Completion Rate"] : ["No data", ""]}
              labelFormatter={l => l}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} name="Completion Rate">
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.rate === null ? "#e5e7eb" : entry.rate >= 66 ? "#22c55e" : entry.rate >= 33 ? "#f59e0b" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> ≥66% complete</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> 33–65%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> &lt;33%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" /> No data</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryStats({ checkIns }) {
  const allPriorities = checkIns.flatMap(c => c.big3_priorities || []);
  const total = allPriorities.length;
  const completed = allPriorities.filter(p => p.status === "completed").length;
  const blocked = allPriorities.filter(p => p.status === "blocked").length;
  const shifted = allPriorities.filter(p => p.status === "shifted").length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Completion Rate", value: `${rate}%`, sub: `${completed}/${total} priorities`, color: "text-green-600", bg: "bg-green-50" },
        { label: "Total Set",       value: total,       sub: "across all days",                  color: "text-blue-600",  bg: "bg-blue-50"  },
        { label: "Shifted",         value: shifted,     sub: "adapted mid-day",                  color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Blocked",         value: blocked,     sub: "hit an obstacle",                  color: "text-red-600",   bg: "bg-red-50"   },
      ].map(({ label, value, sub, color, bg }) => (
        <div key={label} className={`rounded-xl p-3 ${bg} border border-gray-100`}>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
          <p className="text-xs text-gray-500">{sub}</p>
        </div>
      ))}
    </div>
  );
}

function DayCard({ checkIn }) {
  const [expanded, setExpanded] = useState(false);
  const priorities = checkIn.big3_priorities || [];
  if (priorities.length === 0) return null;

  const completed = priorities.filter(p => p.status === "completed").length;
  const date = parseISO(checkIn.check_in_date);

  return (
    <Card className="shadow-sm border border-gray-100">
      <button
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="text-center w-10">
            <p className="text-xs text-gray-500 uppercase">{format(date, "EEE")}</p>
            <p className="text-lg font-bold text-gray-900 leading-none">{format(date, "d")}</p>
            <p className="text-xs text-gray-400">{format(date, "MMM")}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{priorities.length} Priorities Set</p>
            <p className="text-xs text-gray-500">{completed} of {priorities.length} completed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {priorities.map((p, i) => (
              <span key={i} className={`w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[p.status]?.dot || "bg-gray-300"}`} title={p.title} />
            ))}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <CardContent className="pt-0 pb-3 px-4 border-t border-gray-100">
          <div className="space-y-2 mt-3">
            {priorities.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg">
                <span className="text-gray-400 text-xs font-bold mt-0.5 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.title}</p>
                  {p.context && <p className="text-xs text-gray-500 mt-0.5">{p.context}</p>}
                  {p.midday_note && (
                    <p className="text-xs text-amber-700 mt-1 italic">Midday: {p.midday_note}</p>
                  )}
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function Big3HistoryTab() {
  const { user } = useAuth();
  const [range, setRange] = useState(14);

  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ["big3-history", user?.email, range],
    queryFn: async () => {
      const cutoff = format(subDays(new Date(), range), "yyyy-MM-dd");
      const records = await base44.entities.DailyCheckIn.filter(
        { user_email: user.email },
        "-check_in_date",
        range * 2 // fetch enough to cover both morning+evening per day
      );
      return records.filter(r =>
        r.check_in_date >= cutoff &&
        r.big3_priorities?.length > 0
      );
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  // Deduplicate by date — prefer evening check-in (has final statuses) over morning
  const deduped = Object.values(
    checkIns.reduce((acc, c) => {
      const key = c.check_in_date;
      if (!acc[key] || c.check_in_type === "evening") acc[key] = c;
      return acc;
    }, {})
  ).sort((a, b) => b.check_in_date.localeCompare(a.check_in_date));

  return (
    <div className="space-y-5">
      {/* Range Selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Showing days with Big 3 data</p>
        <div className="flex gap-1.5">
          {[7, 14, 30].map(d => (
            <Button
              key={d}
              variant={range === d ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 px-3"
              onClick={() => setRange(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : deduped.length === 0 ? (
        <div className="py-16 text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No Big 3 history yet</p>
          <p className="text-gray-400 text-sm mt-1">Set your Big 3 priorities during your evening check-in to start building your history.</p>
        </div>
      ) : (
        <>
          <SummaryStats checkIns={deduped} />
          <CompletionRateChart checkIns={deduped} />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Day by Day</p>
            {deduped.map(c => <DayCard key={c.id} checkIn={c} />)}
          </div>
        </>
      )}
    </div>
  );
}