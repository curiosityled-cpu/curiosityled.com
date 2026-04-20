import React, { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from "recharts";

const COMP_LABELS = {
  si_pct:   "Situational Intelligence",
  dm_pct:   "Decision Making",
  comm_pct: "Communication",
  rm_pct:   "Resource Management",
  sm_pct:   "Stakeholder Management",
  pm_pct:   "Performance Management",
};

const COMP_COLORS = {
  si_pct:   "#6366f1",
  dm_pct:   "#3b82f6",
  comm_pct: "#10b981",
  rm_pct:   "#f59e0b",
  sm_pct:   "#ec4899",
  pm_pct:   "#8b5cf6",
};

function DeltaBadge({ delta }) {
  if (delta > 0)  return <span className="flex items-center gap-0.5 text-emerald-600 font-semibold text-xs"><TrendingUp className="w-3 h-3" />+{delta}%</span>;
  if (delta < 0)  return <span className="flex items-center gap-0.5 text-red-500 font-semibold text-xs"><TrendingDown className="w-3 h-3" />{delta}%</span>;
  return               <span className="flex items-center gap-0.5 text-gray-400 text-xs"><Minus className="w-3 h-3" />No change</span>;
}

export default function AssessmentTrendSection({ assessments }) {
  const [highlightedComp, setHighlightedComp] = useState(null);

  if (!assessments || assessments.length < 2) return null;

  // Sort oldest → newest for chart
  const sorted = [...assessments].sort((a, b) =>
    new Date(a.submission_ts) - new Date(b.submission_ts)
  );

  const chartData = sorted.map(a => ({
    date:    format(new Date(a.submission_ts), "MMM d, yy"),
    overall: a.overall_pct,
    si:      a.si_pct,
    dm:      a.dm_pct,
    comm:    a.comm_pct,
    rm:      a.rm_pct,
    sm:      a.sm_pct,
    pm:      a.pm_pct,
  }));

  // Compute deltas between first and last
  const first = sorted[0];
  const last  = sorted[sorted.length - 1];

  const deltas = Object.keys(COMP_LABELS).map(key => ({
    key,
    label: COMP_LABELS[key],
    delta: Math.round((last[key] || 0) - (first[key] || 0)),
    current: last[key] || 0,
  }));

  const overallDelta = Math.round((last.overall_pct || 0) - (first.overall_pct || 0));

  const getLineOpacity = (lineKey) => {
    if (!highlightedComp) return 1;
    return lineKey === highlightedComp || lineKey === "overall" ? 1 : 0.1;
  };

  const getLineStrokeWidth = (lineKey) => {
    if (!highlightedComp) return lineKey === "overall" ? 2.5 : 1.5;
    return lineKey === highlightedComp || lineKey === "overall" ? 2.5 : 1.5;
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Assessment Progress Over Time</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                Comparing your {assessments.length} assessments from{" "}
                {format(new Date(sorted[0].submission_ts), "MMM yyyy")} to{" "}
                {format(new Date(last.submission_ts), "MMM yyyy")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Overall change:</span>
            <DeltaBadge delta={overallDelta} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Line chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="overall" stroke="#1e293b" strokeWidth={getLineStrokeWidth("overall")} name="Overall" dot opacity={getLineOpacity("overall")} />
              <Line type="monotone" dataKey="si"      stroke={COMP_COLORS.si_pct}   strokeWidth={getLineStrokeWidth("si")}       name="SI"   dot={false} opacity={getLineOpacity("si")} />
              <Line type="monotone" dataKey="dm"      stroke={COMP_COLORS.dm_pct}   strokeWidth={getLineStrokeWidth("dm")}       name="DM"   dot={false} opacity={getLineOpacity("dm")} />
              <Line type="monotone" dataKey="comm"    stroke={COMP_COLORS.comm_pct} strokeWidth={getLineStrokeWidth("comm")}     name="Comm" dot={false} opacity={getLineOpacity("comm")} />
              <Line type="monotone" dataKey="rm"      stroke={COMP_COLORS.rm_pct}   strokeWidth={getLineStrokeWidth("rm")}       name="RM"   dot={false} opacity={getLineOpacity("rm")} />
              <Line type="monotone" dataKey="sm"      stroke={COMP_COLORS.sm_pct}   strokeWidth={getLineStrokeWidth("sm")}       name="SM"   dot={false} opacity={getLineOpacity("sm")} />
              <Line type="monotone" dataKey="pm"      stroke={COMP_COLORS.pm_pct}   strokeWidth={getLineStrokeWidth("pm")}       name="PM"   dot={false} opacity={getLineOpacity("pm")} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Delta pills per competency */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {deltas.map(d => (
            <button
              key={d.key}
              onMouseEnter={() => setHighlightedComp(d.key)}
              onMouseLeave={() => setHighlightedComp(null)}
              onClick={() => setHighlightedComp(highlightedComp === d.key ? null : d.key)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                highlightedComp === d.key
                  ? 'bg-blue-50 border-blue-300 font-medium'
                  : 'bg-gray-50 border-gray-200 hover:border-blue-200'
              }`}
            >
              <span className="text-xs text-gray-600 truncate mr-2">{d.label}</span>
              <DeltaBadge delta={d.delta} />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}