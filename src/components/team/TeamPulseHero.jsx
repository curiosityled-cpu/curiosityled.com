/**
 * TeamPulseHero — AI-synthesized situational read for the Team page.
 * Follows the WhatMattersNowCard visual pattern: headline + body + "See why" drawer.
 */
import React, { useState } from "react";
import { Activity, Layers, AlertTriangle, Target, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function buildSignalChips(rollup) {
  const chips = [];
  const atRisk = rollup?.at_risk || [];
  const aggregates = rollup?.aggregates;

  if (atRisk.length > 0) {
    chips.push({
      label: `${atRisk.length} at-risk ${atRisk.length === 1 ? "person" : "people"}`,
      color: "bg-amber-50 text-amber-700",
      icon: AlertTriangle,
    });
  }
  if (aggregates?.goals?.total > 0) {
    const stalled = aggregates.goals.total - aggregates.goals.completed - aggregates.goals.in_progress;
    if (stalled > 0) {
      chips.push({
        label: `${stalled} stalled ${stalled === 1 ? "goal" : "goals"}`,
        color: "bg-gray-100 text-gray-700",
        icon: Target,
      });
    }
  }
  if (aggregates?.checkins?.participation_pct != null && aggregates.checkins.participation_pct < 60) {
    const gap = Math.round(rollup.scope_size * (1 - aggregates.checkins.participation_pct / 100));
    if (gap > 0) {
      chips.push({
        label: `${gap} haven't checked in`,
        color: "bg-blue-50 text-blue-700",
        icon: Activity,
      });
    }
  }
  if (aggregates?.assessments?.avg_overall_pct != null && aggregates.assessments.avg_overall_pct < 70) {
    chips.push({
      label: `Avg assessment ${aggregates.assessments.avg_overall_pct}%`,
      color: "bg-violet-50 text-violet-700",
      icon: BarChart3,
    });
  }
  return chips;
}

export default function TeamPulseHero({ rollup }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pulse = rollup?.team_pulse;
  const chips = buildSignalChips(rollup);

  if (!pulse) return null;

  return (
    <>
      <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-sm font-semibold text-card-foreground">Team Pulse</p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0202ff] transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">See why</span>
          </button>
        </div>

        <CardContent className="px-5 pt-3 pb-5 space-y-3">
          <p className="text-base font-semibold text-card-foreground leading-snug">{pulse.headline}</p>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c, i) => {
                const Icon = c.icon;
                return (
                  <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${c.color}`}>
                    <Icon className="w-2.5 h-2.5" />
                    {c.label}
                  </span>
                );
              })}
            </div>
          )}

          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{pulse.body}</p>
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-xs text-gray-400 hover:text-[#0202ff] transition-colors -mt-1"
          >
            See the signals behind this read →
          </button>
        </CardContent>
      </Card>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-white" />
              </div>
              <SheetTitle className="text-sm font-semibold text-gray-900">How this read is built</SheetTitle>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed pt-1">{pulse.headline}</p>
          </SheetHeader>
          <div className="pt-2 pb-6 space-y-3">
            <p className="text-sm text-gray-600 leading-relaxed">{pulse.body}</p>
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Signals this week</p>
              {chips.length === 0 ? (
                <p className="text-sm text-gray-500">No friction signals detected. Your team is in a steady state.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {chips.map((c, i) => {
                    const Icon = c.icon;
                    return (
                      <span key={i} className={`text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${c.color}`}>
                        <Icon className="w-3 h-3" />
                        {c.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            {rollup?.at_risk?.length > 0 && (
              <div className="pt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">People needing attention</p>
                {rollup.at_risk.map((r) => (
                  <div key={r.email} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.full_name || r.email}</p>
                      <p className="text-xs text-gray-500">{r.reasons.join(" · ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}