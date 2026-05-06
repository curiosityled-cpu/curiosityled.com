import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Star, ArrowUpCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

function PipelineBar({ label, value, target, color }) {
  const pct = value != null ? Math.min(value, 100) : null;
  const isGood = pct != null && pct >= target;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {pct != null ? (
            <>
              <span className={`font-bold ${isGood ? "text-emerald-600" : "text-amber-600"}`}>{pct}%</span>
              {isGood
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              }
            </>
          ) : (
            <span className="text-gray-400 text-xs">No data</span>
          )}
        </div>
      </div>
      <Progress value={pct ?? 0} className={`h-2 ${color}`} />
      <div className="text-xs text-gray-400">Target: ≥{target}%</div>
    </div>
  );
}

export default function SuccessionStabilityCard({ workforceMetrics, assessmentMetrics }) {
  const latest = workforceMetrics?.[0];
  const hasData = !!latest;

  const getValue = (field) => hasData && latest[field] != null ? latest[field] : null;

  // Derive succession pipeline health from available data
  const successionCoverage = getValue("succession_coverage_rate");
  const highPotRetention = getValue("high_potential_retention_rate");
  const internalFillRate = getValue("internal_fill_rate_leadership");
  const readyNow = getValue("ready_now_successors");

  // Pull high-potential count from assessment data as a platform-native proxy
  const platformHighPotentials = assessmentMetrics?.highPotentialLeaders ?? 0;
  const totalAssessed = assessmentMetrics?.totalAssessments ?? 0;
  const platformReadinessRate = totalAssessed > 0
    ? Math.round((platformHighPotentials / totalAssessed) * 100)
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                Talent Pipeline & Succession
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Leadership readiness and future-role coverage
              </p>
            </div>
            {readyNow != null && (
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                {readyNow} Ready Now
              </Badge>
            )}
          </div>
          {!hasData && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              External succession data not yet connected. Showing platform-native readiness data only.
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          {/* Platform-native readiness derived from assessments */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-800">Platform-Native Readiness (from Assessments)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-indigo-700">{platformHighPotentials}</div>
                <div className="text-xs text-indigo-600">High-Potential Leaders (≥85%)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-700">
                  {platformReadinessRate != null ? `${platformReadinessRate}%` : "—"}
                </div>
                <div className="text-xs text-indigo-600">of Assessed Leaders</div>
              </div>
            </div>
          </div>

          {/* HRIS-fed pipeline metrics */}
          <div className="space-y-4">
            <PipelineBar
              label="Succession Coverage (Critical Roles)"
              value={successionCoverage}
              target={80}
              color=""
            />
            <PipelineBar
              label="High-Potential Retention Rate"
              value={highPotRetention}
              target={90}
              color=""
            />
            <PipelineBar
              label="Internal Leadership Fill Rate"
              value={internalFillRate}
              target={60}
              color=""
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
            <strong>Leadership Correlation:</strong> Leaders scoring above 85% in assessments are the primary pipeline for
            critical role succession. Strong internal fill rates indicate a healthy development culture driven by effective coaching and goal achievement.
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}