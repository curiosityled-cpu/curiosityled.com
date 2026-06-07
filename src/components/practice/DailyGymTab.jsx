/**
 * DailyGymTab — Tab 2: Curated micro-coaching workouts and assigned learning.
 * Workouts are surfaced first, learning tracks below.
 */
import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import WorkoutsSection from "@/components/practice/WorkoutsSection";
import ActiveFocusSection from "@/components/patterns/ActiveFocusSection";

function SectionLabel({ children }) {
  return <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1">{children}</p>;
}

export default function DailyGymTab({ goals, assignments, devPlans, trends, insight, onOpenAtreus }) {
  const active = assignments.filter(a => a.status !== 'completed').slice(0, 2);
  const activePlan = devPlans.find(p => p.status === 'active');

  const getBecause = () => {
    if (trends?.overload_pattern_strength > 40) return "Curated for your overload pattern";
    if (trends?.identity_friction_active) return "Linked to your role clarity signals";
    if (insight?.development_areas?.[0]) return `For your ${insight.development_areas[0].split(' (')[0]} development`;
    if (goals.some(g => g.status === 'active')) return "Supports your active growth focus";
    return null;
  };

  return (
    <div className="space-y-5 pb-6">

      {/* Active Focus */}
      <div>
        <SectionLabel>Focus</SectionLabel>
        <div className="mt-2">
          <ActiveFocusSection goals={goals} trends={trends} insight={insight} onOpenAtreus={onOpenAtreus} />
        </div>
      </div>

      {/* Workouts — hero position */}
      <div>
        <SectionLabel>Recommended Workouts</SectionLabel>
        <p className="text-xs text-muted-foreground px-1 mb-3 mt-1">3–7 min exercises personalised to your active patterns and goals.</p>
        <WorkoutsSection goals={goals} trends={trends} insight={insight} />
      </div>

      {/* Assigned Learning */}
      <div>
        <SectionLabel>Learning</SectionLabel>
        <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden mt-2">
          <div className="px-5 pt-5 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">Assigned learning</p>
                {getBecause() && (
                  <p className="text-[10px] text-[#0202ff]/70 font-medium">{getBecause()}</p>
                )}
              </div>
            </div>
            <Link to="/my-development">
              <span className="text-xs text-[#0202ff] font-medium">View all →</span>
            </Link>
          </div>
          <CardContent className="px-5 pt-2 pb-5 space-y-2">
            {activePlan && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
                <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide mb-0.5">Active journey</p>
                <p className="text-sm font-medium text-card-foreground">{activePlan.title}</p>
              </div>
            )}
            {active.length > 0 ? active.map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl">
                <Zap className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-card-foreground truncate">{a.title}</p>
                  {getBecause() && <p className="text-[10px] text-[#0202ff]/70 font-medium mt-0.5">{getBecause()}</p>}
                  {a.due_date && <p className="text-[10px] text-muted-foreground">Due {new Date(a.due_date + 'T00:00:00').toLocaleDateString()}</p>}
                </div>
              </div>
            )) : (
              <div className="py-3 space-y-2 text-center">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No assigned learning yet. Your development library and curated content will appear here.
                </p>
                <Link to="/my-development">
                  <button className="text-xs font-medium text-[#0202ff] hover:underline">Browse development library →</button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}