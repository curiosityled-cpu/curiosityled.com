import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus, Users, AlertTriangle, UserX, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

const BENCHMARKS = {
  turnover_rate_overall: { target: 15, label: "Industry avg: ~15%" },
  turnover_rate_regrettable: { target: 5, label: "Target: <5%" },
  turnover_rate_first_year: { target: 10, label: "Target: <10%" },
  critical_role_vacancy_rate: { target: 5, label: "Target: <5%" },
};

function MetricTile({ icon: Icon, label, value, suffix = "%", benchmark, higherIsBetter = false, noData = false }) {
  const numVal = parseFloat(value);
  const target = benchmark?.target;

  let status = "neutral";
  if (!noData && target !== undefined) {
    if (higherIsBetter) {
      status = numVal >= target ? "good" : numVal >= target * 0.85 ? "warning" : "bad";
    } else {
      status = numVal <= target ? "good" : numVal <= target * 1.2 ? "warning" : "bad";
    }
  }

  const statusConfig = {
    good: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", TrendIcon: TrendingDown },
    warning: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", TrendIcon: Minus },
    bad: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", TrendIcon: TrendingUp },
    neutral: { color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", TrendIcon: Minus },
  }[status];

  const { TrendIcon } = statusConfig;

  return (
    <div className={`rounded-xl border p-4 ${statusConfig.bg} ${statusConfig.border}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg bg-white shadow-sm`}>
          <Icon className={`w-4 h-4 ${statusConfig.color}`} />
        </div>
        {!noData && (
          <TrendIcon className={`w-4 h-4 ${statusConfig.color}`} />
        )}
      </div>
      <div className={`text-2xl font-bold mt-2 ${noData ? "text-gray-400" : statusConfig.color}`}>
        {noData ? "—" : `${value}${suffix}`}
      </div>
      <div className="text-xs font-medium text-gray-700 mt-1">{label}</div>
      {benchmark && (
        <div className="text-xs text-gray-500 mt-1">{benchmark.label}</div>
      )}
    </div>
  );
}

export default function WorkforceStabilityCard({ workforceMetrics }) {
  const latest = workforceMetrics?.[0];

  const hasData = !!latest;

  const getValue = (field) => hasData && latest[field] != null ? latest[field] : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-500" />
                Workforce Stability & Retention
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Compare workforce stability patterns alongside leadership signals to identify possible retention or vacancy risks.
              </p>
            </div>
            {hasData && latest.period && (
              <Badge variant="outline" className="text-xs">
                {latest.period}
              </Badge>
            )}
          </div>
          {!hasData && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              No workforce metrics uploaded yet. Connect your HRIS via CSV upload, API, or SFTP to populate this section.
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricTile
              icon={TrendingDown}
              label="Overall Turnover Rate"
              value={getValue("turnover_rate_overall") ?? "—"}
              suffix={getValue("turnover_rate_overall") != null ? "%" : ""}
              benchmark={BENCHMARKS.turnover_rate_overall}
              noData={!hasData || getValue("turnover_rate_overall") == null}
            />
            <MetricTile
              icon={UserX}
              label="Regrettable Turnover"
              value={getValue("turnover_rate_regrettable") ?? "—"}
              suffix={getValue("turnover_rate_regrettable") != null ? "%" : ""}
              benchmark={BENCHMARKS.turnover_rate_regrettable}
              noData={!hasData || getValue("turnover_rate_regrettable") == null}
            />
            <MetricTile
              icon={Users}
              label="First-Year Turnover"
              value={getValue("turnover_rate_first_year") ?? "—"}
              suffix={getValue("turnover_rate_first_year") != null ? "%" : ""}
              benchmark={BENCHMARKS.turnover_rate_first_year}
              noData={!hasData || getValue("turnover_rate_first_year") == null}
            />
            <MetricTile
              icon={Briefcase}
              label="Critical Role Vacancies"
              value={getValue("critical_role_vacancy_rate") ?? "—"}
              suffix={getValue("critical_role_vacancy_rate") != null ? "%" : ""}
              benchmark={BENCHMARKS.critical_role_vacancy_rate}
              noData={!hasData || getValue("critical_role_vacancy_rate") == null}
            />
          </div>

          {hasData && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
              <strong>Pattern note:</strong> Workforce stability patterns may align with leadership signals such as manager effectiveness and engagement — particularly in Decision Making and Stakeholder Management. Cross-reference with assessment scores above to identify which teams or levels may carry the most risk.
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}