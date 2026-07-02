/**
 * DevelopmentStatsRow — Three analytics cards (Active Journeys, Active Learning,
 * Experiences) mirroring the top row of My Development. Self-contained: fetches
 * its own data so it can be dropped into any page.
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";

export default function DevelopmentStatsRow() {
  const { user } = useAuth();

  const { data: stats = { journeys: 0, learning: 0, experiences: 0 } } = useQuery({
    queryKey: ['dev-stats', user?.email],
    queryFn: async () => {
      if (!user?.email) return { journeys: 0, learning: 0, experiences: 0 };
      try {
        const [plans, assigned, exps] = await Promise.all([
          base44.entities.DevelopmentPlan.filter({ status: { $in: ["active", "paused"] } }),
          base44.entities.AssignedLearning.filter({ user_email: user.email, status: { $ne: "completed" } }),
          base44.entities.DevelopmentExperience.filter({ user_email: user.email }),
        ]);
        return { journeys: plans.length, learning: assigned.length, experiences: exps.length };
      } catch {
        return { journeys: 0, learning: 0, experiences: 0 };
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const cards = [
    { label: "Active Journeys", value: stats.journeys, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Active Learning", value: stats.learning, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Experiences", value: stats.experiences, color: "text-amber-600", bg: "bg-amber-50" },
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