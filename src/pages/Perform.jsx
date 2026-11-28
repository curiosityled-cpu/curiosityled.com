/**
 * Perform — the performance workspace.
 * Route: /team (the Team page's home; the navigation label is Perform).
 *
 * One page, three scopes: My work, My team, Organization. Each scope puts the
 * work that needs a decision first, then goals and outcomes, then a concise
 * read of the context. Every action opens the route that already completes it
 * (Reviews, Lead's check-in, My Performance) — nothing is re-implemented here.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useActiveClientId } from "@/components/contexts/ClientContext";
import LeadSection from "@/components/lead/ui/LeadSection";
import PerformHero from "@/components/perform/PerformHero";
import ScopeSwitcher from "@/components/perform/ScopeSwitcher";
import AttentionList from "@/components/perform/AttentionList";
import OutcomeTiles from "@/components/perform/OutcomeTiles";
import MyGoalsCard from "@/components/perform/MyGoalsCard";
import PeopleList from "@/components/perform/PeopleList";
import {
  todayKeyET,
  mondayKeyOf,
  weekStanding,
  buildMyWorkItems,
  buildTeamItems,
  buildOrgItems,
} from "@/lib/performItems";

export default function Perform() {
  const { user } = useAuth();
  const activeClientId = useActiveClientId();
  const todayKey = useMemo(() => todayKeyET(), []);
  const weekStart = useMemo(() => mondayKeyOf(todayKey), [todayKey]);
  const tenant = activeClientId ? { client_id: activeClientId } : {};

  // ── Review work: the same role-scoped source the Reviews page reads ──
  const {
    data: reviewData = null,
    isLoading: reviewLoading,
    isFetching: reviewFetching,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ["perform-reviews", user?.email, activeClientId],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("getReviewWorkspace", tenant);
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!user?.email,
    staleTime: 60_000,
  });

  // ── Team / organization rollup (access-controlled, as before) ──
  const {
    data: rollup = null,
    isLoading: rollupLoading,
    isFetching: rollupFetching,
    refetch: refetchRollup,
  } = useQuery({
    queryKey: ["perform-rollup", user?.email, activeClientId],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("getTeamRollup", tenant);
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!user?.email,
    staleTime: 60_000,
  });

  // ── My check-ins for this week ──
  const { data: weekCheckins = [] } = useQuery({
    queryKey: ["perform-checkins", user?.email, weekStart],
    queryFn: async () => {
      try {
        return await base44.entities.DailyCheckIn.filter(
          { user_email: user.email, check_in_date: { $gte: weekStart } },
          "-check_in_date",
          30
        );
      } catch {
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 60_000,
  });

  // ── My goals and KPIs ──
  const { data: goals = [] } = useQuery({
    queryKey: ["perform-goals", user?.email, activeClientId],
    queryFn: async () => {
      try {
        const [mine, assigned] = await Promise.all([
          base44.entities.Goal.filter(
            { ...tenant, created_by: user.email, status: "active" },
            "-updated_date",
            20
          ),
          base44.entities.Goal.filter(
            { ...tenant, assigned_to_emails: { $in: [user.email] }, status: "active" },
            "-updated_date",
            20
          ),
        ]);
        const byId = new Map();
        [...mine, ...assigned].forEach((goal) => byId.set(goal.id, goal));
        return [...byId.values()];
      } catch {
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 60_000,
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ["perform-kpis", user?.email, activeClientId],
    queryFn: async () => {
      try {
        return await base44.entities.KPI.filter(
          { ...tenant, owner_email: user.email, status: "active" },
          "-updated_date",
          10
        );
      } catch {
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 60_000,
  });

  // ── Scopes the person may read ──
  const scopes = useMemo(() => {
    const list = [{ id: "my", label: "My work" }];
    const size = rollup?.scope_size || 0;
    if (size === 0) return list;
    if (rollup?.scope_type === "vertical") list.push({ id: "team", label: "My team" });
    else list.push({ id: "org", label: "Organization" });
    return list;
  }, [rollup]);

  // Last scope is remembered; My work is the default and the fallback.
  const storageKey = user?.email ? `perform:scope:${user.email}` : null;
  const [scope, setScope] = useState("my");

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setScope(saved);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const chooseScope = (id) => {
    setScope(id);
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      /* ignore */
    }
  };

  const activeScope = scopes.some((s) => s.id === scope) ? scope : "my";

  const loading = !user || reviewLoading || rollupLoading;
  const items = useMemo(() => {
    if (activeScope === "team") return buildTeamItems({ reviewData, todayKey });
    if (activeScope === "org") return buildOrgItems({ reviewData });
    return buildMyWorkItems({ reviewData, checkins: weekCheckins, goals, kpis, todayKey });
  }, [activeScope, reviewData, weekCheckins, goals, kpis, todayKey]);

  const openReviewCount = (reviewData?.cycles || []).reduce(
    (sum, cycle) => sum + (cycle.my_tasks || []).filter((task) => !task.submitted).length,
    0
  );
  const standing = useMemo(() => weekStanding(weekCheckins, todayKey), [weekCheckins, todayKey]);

  const myWeekTiles = [
    { label: "Check-ins", value: `${standing.done}/${standing.elapsed}`, hint: "this week" },
    { label: "Open reviews", value: String(openReviewCount), hint: "assigned to you" },
    { label: "Active goals", value: String(goals.length), hint: "in flight" },
    { label: "KPIs", value: String(kpis.length), hint: "you own" },
  ];

  const agg = rollup?.aggregates || {};
  const outcomeTiles = [
    {
      label: "Goals complete",
      value: `${agg.goals?.completion_pct ?? 0}%`,
      hint: `${agg.goals?.completed ?? 0} of ${agg.goals?.total ?? 0}`,
    },
    {
      label: "Check-ins",
      value: `${agg.checkins?.participation_pct ?? 0}%`,
      hint: "of people have checked in",
    },
    {
      label: "Assessments",
      value: `${agg.assessments?.completion_rate ?? 0}%`,
      hint: "have a scored assessment",
    },
    { label: "At risk", value: String(rollup?.at_risk?.length ?? 0), hint: "people with gaps" },
  ];

  const people = useMemo(() => {
    const atRisk = new Set((rollup?.at_risk || []).map((row) => row.email));
    const members = rollup?.members || [];
    if (members.length > 0) {
      return members.slice(0, 8).map((member) => ({
        id: member.email,
        name: member.full_name || member.email,
        role: member.current_role || member.app_role || "",
        detail: `${member.goals?.in_progress ?? 0} goals in progress · ${
          member.checkins?.submitted_count ?? 0
        } check-ins`,
        atRisk: atRisk.has(member.email),
      }));
    }
    return (rollup?.at_risk || []).slice(0, 8).map((row) => ({
      id: row.email,
      name: row.full_name || row.email,
      role: "",
      detail: (row.reasons || []).join(" · "),
      atRisk: true,
    }));
  }, [rollup]);

  const scopeSize = rollup?.scope_size || 0;
  const description =
    activeScope === "my"
      ? "Your own reviews, check-ins and goals — what needs you today."
      : `${rollup?.scope_label || "Your team"} · ${scopeSize} ${
          scopeSize === 1 ? "person" : "people"
        } in scope.`;

  const heroStats =
    activeScope === "my"
      ? [
          { label: "To act on", value: items.length },
          { label: "Goals", value: goals.length },
        ]
      : [
          { label: "To act on", value: items.length },
          { label: "People", value: scopeSize },
        ];

  const attentionDescription =
    activeScope === "my"
      ? "Your own reviews, check-ins and goal updates, most urgent first."
      : activeScope === "team"
      ? "The reviews and conversations your team is waiting on."
      : "Cycles and people that still need action this period.";

  const emptyTitle =
    activeScope === "my"
      ? "You're clear"
      : activeScope === "team"
      ? "Your team is up to date"
      : "Nothing outstanding";

  const emptyHint =
    activeScope === "my"
      ? "No review, check-in or goal update is waiting on you."
      : activeScope === "team"
      ? "No review or conversation is waiting on you right now."
      : "Every review cycle in this scope is on track.";

  const contextLabel =
    activeScope === "my" ? "Your week" : activeScope === "team" ? "Team context" : "Organization context";

  const contextDescription =
    activeScope === "my"
      ? "How your own check-ins and workload stand this week."
      : "Who is in scope, and who needs a conversation first.";

  const refetchAll = () => {
    refetchReviews();
    refetchRollup();
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <PerformHero
          description={description}
          stats={heroStats}
          isFetching={reviewFetching || rollupFetching}
          onRefresh={refetchAll}
        />

        <ScopeSwitcher scopes={scopes} value={activeScope} onChange={chooseScope} />

        <div className="space-y-6">
          <LeadSection label={contextLabel} description={contextDescription}>
            {activeScope === "my" ? (
              <OutcomeTiles tiles={myWeekTiles} />
            ) : (
              <PeopleList
                people={people}
                emptyTitle={
                  activeScope === "team" ? "No one in your team yet" : "No individual records in scope"
                }
                emptyHint={
                  activeScope === "team"
                    ? "When people report to you, their goals and check-ins appear here."
                    : "This scope shows organization-wide totals for now."
                }
                footer={
                  activeScope === "team"
                    ? { label: "Open the review cycle", to: "/reviews" }
                    : { label: "Open Leadership Intelligence", to: "/Insights?tab=org" }
                }
              />
            )}
          </LeadSection>

          <div
            className={
              activeScope === "my" ? "grid items-start gap-6 lg:grid-cols-2" : "space-y-6"
            }
          >
            <LeadSection label="Needs attention" description={attentionDescription} collapsible>
              <AttentionList
                items={items}
                loading={loading}
                emptyTitle={emptyTitle}
                emptyHint={emptyHint}
              />
            </LeadSection>

            <LeadSection
              label="Goals & outcomes"
              collapsible
              description={
                activeScope === "my"
                  ? "What you're working towards, and where it stands."
                  : "How goals and check-ins are moving across this scope."
              }
            >
              {activeScope === "my" ? (
                <MyGoalsCard goals={goals} kpis={kpis} />
              ) : (
                <OutcomeTiles tiles={outcomeTiles} />
              )}
            </LeadSection>
          </div>
        </div>
      </div>
    </div>
  );
}