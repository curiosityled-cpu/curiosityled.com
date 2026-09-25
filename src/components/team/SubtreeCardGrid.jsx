/**
 * SubtreeCardGrid — depth-aware layout for Level 3+ managers.
 * Each card represents a direct report and their rolled-up subtree health.
 *
 * Props:
 *  - subtreeCards: array of subtree card objects from getTeamRollup
 *  - level: leader level (3, 4, or 5)
 *  - atRisk: at-risk array (for drill-down detail)
 */
import React, { useState } from "react";
import { ChevronDown, Users, AlertTriangle, Target, Activity, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import OwnedKpiList from "@/components/team/OwnedKpiList";

function MetricChip({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3 h-3 ${color}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-card-foreground">{value}</span>
    </div>
  );
}

function SubtreeCard({ card, level, atRisk, isExpanded, onToggle }) {
  const cardAtRisk = atRisk.filter((r) => {
    // Match at-risk people to this subtree by checking if they're in the subtree
    // We use the subtree_size and at_risk_count as proxies since we don't have
    // the full email list per subtree on the frontend.
    return false; // We'll show the count instead of individual names for now
  });

  const showName = level <= 4;
  const completionPct = card.goals?.completion_pct ?? 0;
  const participationPct = card.checkins?.participation_pct ?? 0;
  const avgPct = card.assessments?.avg_overall_pct;

  return (
    <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden">
      {/* Card header */}
      <button
        onClick={level >= 4 ? onToggle : undefined}
        className={`w-full px-5 pt-4 pb-3 flex items-center justify-between ${level >= 4 ? "hover:bg-muted/40" : ""} transition-colors text-left`}
      >
        <div className="flex items-center gap-3">
          {showName ? (
            <div className="w-9 h-9 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-[#0202ff]">
                {(card.full_name || card.email || "?").charAt(0).toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div>
            {showName ? (
              <>
                <p className="text-sm font-semibold text-card-foreground">{card.full_name || card.email}</p>
                {card.current_role && (
                  <p className="text-xs text-muted-foreground">{card.current_role}</p>
                )}
              </>
            ) : (
              <p className="text-sm font-semibold text-card-foreground">
                {card.subtree_size} {card.subtree_size === 1 ? "person" : "people"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {card.at_risk_count > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle className="w-2.5 h-2.5" />
              {card.at_risk_count}
            </span>
          )}
          {level >= 4 && (
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          )}
        </div>
      </button>

      {/* Metrics row */}
      <div className="px-5 pb-4 flex flex-wrap gap-x-4 gap-y-2">
        <MetricChip icon={Users} label="Team" value={card.subtree_size} color="text-muted-foreground" />
        {card.goals?.total > 0 && (
          <MetricChip icon={Target} label="Goals" value={`${completionPct}%`} color="text-muted-foreground" />
        )}
        <MetricChip icon={Activity} label="Check-ins" value={`${participationPct}%`} color="text-muted-foreground" />
        {avgPct != null && (
          <MetricChip icon={BarChart3} label="Assessment" value={`${avgPct}%`} color="text-muted-foreground" />
        )}
      </div>

      {/* Owned KPIs */}
      {card.kpis?.length > 0 && (
        <div className="px-5 pb-4 pt-1 border-t border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 pt-2">Owned KPIs</p>
          <OwnedKpiList kpis={card.kpis} />
        </div>
      )}

      {/* Expanded drill-down (Level 4+) */}
      {level >= 4 && isExpanded && card.at_risk_count > 0 && (
        <div className="px-5 pb-4 pt-1 border-t border-border space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
            {card.at_risk_count} {card.at_risk_count === 1 ? "person" : "people"} needing attention in this subtree
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Review the at-risk section above for specific names and reasons. Consider a check-in with {card.full_name?.split(" ")[0] || "this lead"} to unblock.
          </p>
        </div>
      )}
      {level >= 4 && isExpanded && card.at_risk_count === 0 && (
        <div className="px-5 pb-4 pt-1 border-t border-border">
          <p className="text-xs text-muted-foreground pt-2">No at-risk signals in this subtree. Team is in a steady state.</p>
        </div>
      )}
    </Card>
  );
}

export default function SubtreeCardGrid({ subtreeCards, level, atRisk }) {
  const [expandedEmails, setExpandedEmails] = useState(new Set());

  const toggle = (email) => {
    setExpandedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  if (!subtreeCards || subtreeCards.length === 0) return null;

  return (
    <div className="space-y-3">
      {subtreeCards.map((card) => (
        <SubtreeCard
          key={card.email}
          card={card}
          level={level}
          atRisk={atRisk}
          isExpanded={expandedEmails.has(card.email)}
          onToggle={() => toggle(card.email)}
        />
      ))}
    </div>
  );
}