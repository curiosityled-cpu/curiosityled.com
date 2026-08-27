import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, CheckCircle, Target, BookOpen, Users, Loader2 } from "lucide-react";

/**
 * Portfolio-scoped intelligence summary for the HRBP lens "Intelligence" tab.
 * Computes leadership health metrics across only the managers in the HRBP's
 * resolved portfolio (including delegated coverage), using the Hub's already-
 * loaded filteredData.
 */
export default function HRBPPortfolioIntelligence({ portfolioEmails, filteredData, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (!portfolioEmails || portfolioEmails.size === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">No portfolio assigned yet</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Your administrator needs to assign clients, business units, or managers to your portfolio
            before portfolio-scoped intelligence appears here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const emails = portfolioEmails;
  const has = (e) => (e ? emails.has(e) : false);

  const assessments = filteredData.assessments.filter((a) =>
    has(a.email || a.data?.email)
  );
  const goals = filteredData.goals.filter((g) =>
    has(g.user_email || g.data?.user_email)
  );
  const learning = filteredData.assignedLearning.filter((l) =>
    has(l.user_email || l.data?.user_email)
  );
  const managers = filteredData.users.filter((u) => has(u.email));

  const pct = (a) => a.overall_pct ?? a.data?.overall_pct ?? 0;
  const avg = assessments.length
    ? Math.round(assessments.reduce((s, a) => s + pct(a), 0) / assessments.length)
    : 0;
  const atRisk = assessments.filter((a) => pct(a) < 60).length;
  const highPot = assessments.filter((a) => pct(a) >= 85).length;
  const goalCompletion = goals.length
    ? Math.round(
        (goals.filter((g) => (g.status ?? g.data?.status) === "completed").length /
          goals.length) *
          100
      )
    : 0;
  const learningCompletion = learning.length
    ? Math.round(
        (learning.filter((l) => (l.status ?? l.data?.status) === "completed").length /
          learning.length) *
          100
      )
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className="bg-[#0202ff]/10 text-[#0202ff] border-[#0202ff]/15 text-xs">
          Portfolio-scoped · {managers.length} manager{managers.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Avg Leadership Score"
          value={`${avg}%`}
          icon={Target}
          tone="text-[#0202ff]"
        />
        <StatCard
          label="At-Risk Leaders"
          value={atRisk}
          icon={AlertTriangle}
          tone="text-red-600"
        />
        <StatCard
          label="High-Potential"
          value={highPot}
          icon={CheckCircle}
          tone="text-emerald-600"
        />
        <StatCard
          label="Goal Completion"
          value={`${goalCompletion}%`}
          icon={TrendingUp}
          tone="text-blue-600"
        />
        <StatCard
          label="Learning Completion"
          value={`${learningCompletion}%`}
          icon={BookOpen}
          tone="text-violet-600"
        />
        <StatCard
          label="Assessments"
          value={assessments.length}
          icon={Users}
          tone="text-gray-700"
        />
      </div>

      {assessments.length === 0 && (
        <Card className="border border-amber-200 bg-amber-50">
          <CardContent className="py-4 px-5">
            <p className="text-xs text-amber-800">
              No assessment data yet for your portfolio managers. Intelligence will populate as they
              complete their leadership assessments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className={`w-4 h-4 ${tone}`} />
          <span className="text-xs font-medium text-gray-500">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}