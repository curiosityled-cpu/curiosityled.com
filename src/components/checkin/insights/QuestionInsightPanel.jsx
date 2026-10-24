import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle, Sparkles, ListChecks, Users } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { formatDateShort, isNumericType } from "@/lib/insightsShared";

const TREND_META = {
  improving: { label: "Improving", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  stable: { label: "Stable", icon: Minus, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
  declining: { label: "Declining", icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  insufficient_data: { label: "Insufficient data", icon: AlertCircle, color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-200" },
};

const SCALE_LABELS = ["Low", "Below avg", "Okay", "Good", "Strong"];
const SCALE_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#10b981"];

function TrendBadge({ direction }) {
  const meta = TREND_META[direction] || TREND_META.insufficient_data;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} border ${meta.border}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function DistributionRow({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium w-28 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{count} ({pct}%)</span>
    </div>
  );
}

/** One selected question with its stats, trend, distribution and recent answers. */
export default function QuestionInsightPanel({ entry, insight }) {
  if (!entry) return null;

  const data = insight || {};
  const trend = data.trend || [];
  const distribution = data.distribution || {};
  const responseCount = data.response_count || 0;
  const numeric = entry.type === "measure" || isNumericType(entry.response_type);

  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardContent className="p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">
              {entry.emoji ? `${entry.emoji} ` : ""}{entry.label}
            </p>
            {entry.type === "measure" && (
              <Badge variant="outline" className="text-[10px]">Measure</Badge>
            )}
            {entry.is_ic_fixed && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                <ListChecks className="w-2.5 h-2.5" /> Fixed
              </span>
            )}
            {entry.is_ai_generated && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0202ff] bg-[#0202ff]/10 border border-[#0202ff]/20 rounded px-1.5 py-0.5">
                <Sparkles className="w-2.5 h-2.5" /> AI daily
              </span>
            )}
            {!entry.is_active && entry.type === "custom" && (
              <Badge variant="outline" className="text-[10px] text-gray-400">Historical</Badge>
            )}
          </div>
          {entry.description && (
            <p className="text-xs text-gray-500 mt-0.5">{entry.description}</p>
          )}
          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <Users className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              Asked of: {entry.audience || "Everyone in the organisation"}
            </span>
            {entry.target_role && <span className="text-gray-400">· {entry.target_role}</span>}
          </p>
        </div>

        {responseCount === 0 ? (
          <p className="text-xs text-gray-400 italic">No responses to this question in the selected period.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              {data.avg != null && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
                    {data.avg_label || (entry.response_type === "yes_no" ? "Yes rate" : "Average")}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {data.avg}{numeric ? "/5" : ""}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Responses</p>
                <p className="text-xl font-bold text-gray-900">{responseCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Trend</p>
                <div className="mt-0.5">
                  <TrendBadge direction={data.trend_direction} />
                </div>
              </div>
              {entry.first_seen_date && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Active period</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {formatDateShort(entry.first_seen_date)} — {formatDateShort(entry.last_seen_date)}
                  </p>
                </div>
              )}
            </div>

            {trend.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-2">
                  {entry.response_type === "yes_no" ? "Daily % yes" : entry.response_type === "anchored_choices" ? "Daily response count" : "Daily average"}
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trend} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      domain={entry.response_type === "yes_no" ? [0, 1] : entry.response_type === "anchored_choices" ? [0, "auto"] : [0, 5]}
                      tickFormatter={(v) => entry.response_type === "yes_no" ? `${Math.round(v * 100)}%` : v}
                    />
                    <Tooltip
                      contentStyle={{ border: "none", borderRadius: "10px", fontSize: "12px", boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)" }}
                      labelFormatter={formatDateShort}
                      formatter={(v) => [
                        entry.response_type === "yes_no" ? `${Math.round(v * 100)}%` : v,
                        entry.response_type === "anchored_choices" ? "Responses" : "Average",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0202ff"
                      strokeWidth={2}
                      dot={{ fill: "#0202ff", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No trend data in this period.</p>
            )}

            {Object.keys(distribution).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-2">Distribution</p>
                <div className="space-y-1.5">
                  {numeric ? (
                    Object.entries(distribution).map(([k, count]) => {
                      const idx = parseInt(k, 10) - 1;
                      return (
                        <DistributionRow
                          key={k}
                          label={SCALE_LABELS[idx] || k}
                          count={count}
                          total={responseCount}
                          color={SCALE_COLORS[idx] || "#9ca3af"}
                        />
                      );
                    })
                  ) : entry.response_type === "yes_no" ? (
                    Object.entries(distribution).map(([k, count]) => (
                      <DistributionRow
                        key={k}
                        label={k === "yes" ? "Yes" : "No"}
                        count={count}
                        total={responseCount}
                        color={k === "yes" ? "#22c55e" : "#9ca3af"}
                      />
                    ))
                  ) : (
                    Object.entries(distribution).map(([k, count]) => (
                      <DistributionRow key={k} label={k} count={count} total={responseCount} color="#0202ff" />
                    ))
                  )}
                </div>
              </div>
            )}

            {data.recent_answers && data.recent_answers.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-2">Recent responses</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {data.recent_answers.map((answer, i) => (
                    <div key={i} className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      {String(answer)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}