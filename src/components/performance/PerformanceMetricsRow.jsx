/**
 * PerformanceMetricsRow — Three analytics cards (Goals, KPIs, OKRs) shown under
 * the page title. Self-contained: fetches its own data so it can be reused across
 * My Performance and the Patterns tab.
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";

export default function PerformanceMetricsRow() {
  const { user } = useAuth();

  const { data: metrics = { goals: 0, kpis: 0, okrs: 0 } } = useQuery({
    queryKey: ['perf-metrics', user?.email],
    queryFn: async () => {
      if (!user?.email) return { goals: 0, kpis: 0, okrs: 0 };
      try {
        const [allGoals, kpis] = await Promise.all([
          base44.entities.Goal.filter({ status: 'active' }, '-created_date', 50),
          base44.entities.KPI.filter({ status: 'active' }, '-updated_date', 50),
        ]);

        const myGoals = allGoals.filter(g =>
          g.created_by === user.email ||
          (g.assigned_to_emails && g.assigned_to_emails.includes(user.email))
        );

        const okrs = myGoals.filter(g => g.goal_type === 'okr_objective').length;
        const goals = myGoals.filter(g => g.goal_type !== 'okr_objective').length;

        return { goals, kpis: kpis.length, okrs };
      } catch {
        return { goals: 0, kpis: 0, okrs: 0 };
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const cards = [
    { label: "Active Goals", value: metrics.goals, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active KPIs", value: metrics.kpis, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "OKRs", value: metrics.okrs, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
      {cards.map((s) => (
        <Card key={s.label} className="shadow-sm border border-border bg-card rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}