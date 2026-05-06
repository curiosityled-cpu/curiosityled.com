import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, AlertTriangle, TrendingUp, TrendingDown, Minus, MessageSquare, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";

function ENPSGauge({ score }) {
  if (score == null) return (
    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
      <span className="text-3xl font-bold">—</span>
      <span className="text-xs mt-1">No eNPS data</span>
    </div>
  );

  const normalized = ((score + 100) / 200) * 100; // map -100..+100 to 0..100
  const color = score >= 30 ? "#10b981" : score >= 0 ? "#f59e0b" : "#ef4444";
  const label = score >= 50 ? "Excellent" : score >= 30 ? "Good" : score >= 0 ? "Moderate" : "Critical";

  const data = [{ value: normalized, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-32 w-32">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#f1f5f9" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
          <span className="text-2xl font-bold" style={{ color }}>{score > 0 ? `+${score}` : score}</span>
          <span className="text-xs text-gray-500">eNPS</span>
        </div>
      </div>
      <Badge className="mt-1 text-xs" style={{ backgroundColor: color + "20", color, border: `1px solid ${color}40` }}>
        {label}
      </Badge>
    </div>
  );
}

function StatBlock({ icon: Icon, label, value, suffix = "%", note, colorClass = "text-gray-700" }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
      <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <div>
        <div className={`text-xl font-bold ${colorClass}`}>
          {value != null ? `${value}${suffix}` : "—"}
        </div>
        <div className="text-xs font-medium text-gray-700">{label}</div>
        {note && <div className="text-xs text-gray-500 mt-0.5">{note}</div>}
      </div>
    </div>
  );
}

export default function EngagementCultureCard({ workforceMetrics, leadershipScore }) {
  const latest = workforceMetrics?.[0];
  const hasData = !!latest;

  const getValue = (field) => hasData && latest[field] != null ? latest[field] : null;

  const enps = getValue("enps_score");
  const engagementIndex = getValue("engagement_index");
  const absenteeism = getValue("absenteeism_rate");

  // Correlate: high leadership scores correlate with better engagement
  const leadershipCorrelation = leadershipScore != null
    ? leadershipScore >= 75
      ? { label: "Positive signal", color: "text-emerald-600", note: "Strong leadership scores typically correlate with higher engagement." }
      : leadershipScore >= 60
        ? { label: "Moderate signal", color: "text-amber-600", note: "Mid-range leadership scores may be contributing to engagement variability." }
        : { label: "Risk signal", color: "text-red-600", note: "Low leadership scores are a leading indicator of declining engagement." }
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Engagement & Culture
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Employee sentiment as a leading indicator of leadership health
              </p>
            </div>
          </div>
          {!hasData && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Engagement data not yet connected. Upload your eNPS or engagement survey results to populate this section.
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* eNPS Gauge */}
            <div className="flex flex-col items-center justify-center md:w-48">
              <ENPSGauge score={enps} />
              <p className="text-xs text-gray-500 text-center mt-2">Employee Net Promoter Score</p>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <StatBlock
                icon={TrendingUp}
                label="Engagement Index"
                value={engagementIndex}
                suffix={engagementIndex != null ? "/100" : ""}
                note="Target: ≥70"
                colorClass={engagementIndex != null ? (engagementIndex >= 70 ? "text-emerald-600" : engagementIndex >= 55 ? "text-amber-600" : "text-red-600") : "text-gray-400"}
              />
              <StatBlock
                icon={Clock}
                label="Absenteeism Rate"
                value={absenteeism}
                note="Target: <3% (proxy for burnout)"
                colorClass={absenteeism != null ? (absenteeism <= 3 ? "text-emerald-600" : absenteeism <= 5 ? "text-amber-600" : "text-red-600") : "text-gray-400"}
              />
            </div>
          </div>

          {/* Leadership correlation callout */}
          {leadershipCorrelation && (
            <div className={`mt-4 p-3 rounded-lg border text-sm ${
              leadershipCorrelation.label === "Positive signal"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : leadershipCorrelation.label === "Moderate signal"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-red-50 border-red-200 text-red-800"
            }`}>
              <strong>{leadershipCorrelation.label}:</strong> {leadershipCorrelation.note}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}