/**
 * getCheckInInsights — question-aware check-in insights with history.
 *
 * Returns per-question aggregates (measures + custom questions) derived from
 * real DailyCheckIn records, so insights track the actual questions asked.
 * The question catalog includes ALL questions ever configured for the tenant
 * (active + inactive), plus any orphan keys found in the data — so users can
 * filter by and report on past questions even after they change.
 *
 * Scopes:
 *   "team" — caller + full reporting tree (manager view)
 *   "org"  — all users in the tenant (privacy-safe, min group 5)
 *
 * DailyCheckIn RLS is owner-only, so this runs as the service role.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { getPreset, DEFAULT_PRESET_ID } from "../../shared/checkInPresets.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const scope: string = body.scope === "org" ? "org" : "team";
    const days: number = Math.min(Math.max(parseInt(body.days) || 90, 7), 365);

    const svc = base44.asServiceRole;
    const userEmail = user.email;
    const clientId = user?.data?.client_id || user?.client_id || "";

    // ── Resolve users in scope ───────────────────────────────────
    let emailsInScope: string[] = [];
    let teamMembers: { email: string; name: string }[] = [];

    const allUsers = await svc.entities.User.list(null, 2000).catch(() => []);

    if (scope === "org") {
      if (!clientId) {
        return Response.json({ error: "No client linked to your account" }, { status: 403 });
      }
      const orgUsers = (allUsers || []).filter(
        (u) => (u?.data?.client_id || u?.client_id) === clientId && u.email
      );
      emailsInScope = orgUsers.map((u) => u.email);
      teamMembers = orgUsers.map((u) => ({
        email: u.email,
        name: u?.data?.display_name || u?.full_name || u.email,
      }));

      const MIN_GROUP = 5;
      if (emailsInScope.length < MIN_GROUP) {
        return Response.json({
          suppressed: true,
          reason: `Organisational insights require at least ${MIN_GROUP} managers to prevent identification.`,
          minimum_required: MIN_GROUP,
          total_managers: emailsInScope.length,
          question_catalog: [],
          insights_by_key: {},
          date_range: null,
          team_members: [],
          scope,
        });
      }
    } else {
      // Team scope: resolve reporting tree (BFS down manager_email)
      const managerToReports = new Map();
      for (const u of allUsers || []) {
        if (!u.email) continue;
        const mgr = u?.data?.manager_email || u?.manager_email || "";
        if (mgr) {
          const key = mgr.toLowerCase();
          if (!managerToReports.has(key)) managerToReports.set(key, []);
          managerToReports.get(key).push(u);
        }
      }

      const seen = new Set([userEmail.toLowerCase()]);
      const queue = [userEmail.toLowerCase()];
      while (queue.length > 0) {
        const cur = queue.shift();
        const reports = managerToReports.get(cur) || [];
        for (const u of reports) {
          const em = u.email.toLowerCase();
          if (em === userEmail.toLowerCase() || seen.has(em)) continue;
          seen.add(em);
          teamMembers.push({
            email: u.email,
            name: u?.data?.display_name || u?.full_name || u.email,
          });
          queue.push(em);
        }
      }
      // Include subordinate_emails fallback
      const subEmails = user?.data?.subordinate_emails || user?.subordinate_emails || [];
      for (const se of subEmails) {
        if (se && !seen.has(se.toLowerCase())) {
          seen.add(se.toLowerCase());
          teamMembers.push({ email: se, name: se });
          queue.push(se.toLowerCase());
        }
      }
      while (queue.length > 0) {
        const cur = queue.shift();
        const reports = managerToReports.get(cur) || [];
        for (const u of reports) {
          const em = u.email.toLowerCase();
          if (em === userEmail.toLowerCase() || seen.has(em)) continue;
          seen.add(em);
          teamMembers.push({
            email: u.email,
            name: u?.data?.display_name || u?.full_name || u.email,
          });
          queue.push(em);
        }
      }
      emailsInScope = [userEmail, ...teamMembers.map((t) => t.email)];
    }

    if (emailsInScope.length === 0) {
      return Response.json({
        question_catalog: [],
        insights_by_key: {},
        date_range: null,
        team_members: [],
        scope,
        suppressed: false,
      });
    }

    // ── Fetch DailyCheckIn records (batched) ──────────────────────
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const fetchOne = async (em: string) => {
      const rows = await svc.entities.DailyCheckIn.filter(
        { user_email: em },
        "-check_in_date",
        200
      ).catch(() => []);
      const arr = Array.isArray(rows) ? rows : rows?.items || [];
      return (arr || []).filter((r) => {
        const d = r.check_in_date || r.created_date;
        return d && new Date(d) >= sinceDate;
      });
    };

    const allCheckIns: any[] = [];
    const batchSize = 6;
    for (let i = 0; i < emailsInScope.length; i += batchSize) {
      const batch = emailsInScope.slice(i, i + batchSize);
      const settled = await Promise.allSettled(batch.map(fetchOne));
      for (const s of settled) {
        if (s.status === "fulfilled") allCheckIns.push(...s.value);
      }
    }

    // ── Fetch CheckInCustomQuestion definitions (active + inactive) ──
    let customQs: any[] = [];
    if (clientId) {
      try {
        const [activeRes, inactiveRes] = await Promise.all([
          svc.entities.CheckInCustomQuestion.filter(
            { client_id: clientId, is_active: true },
            { sort: "display_order", limit: 200 }
          ).catch(() => ({ items: [] })),
          svc.entities.CheckInCustomQuestion.filter(
            { client_id: clientId, is_active: false },
            { sort: "-created_date", limit: 200 }
          ).catch(() => ({ items: [] })),
        ]);
        const active = (activeRes?.items || activeRes || []) as any[];
        const inactive = (inactiveRes?.items || inactiveRes || []) as any[];
        customQs = [...active, ...inactive];
      } catch (e) {
        console.warn("[getCheckInInsights] custom questions fetch failed:", e.message);
      }
    }

    // ── Build question catalog ───────────────────────────────────
    const preset = getPreset(user?.data?.check_in_preset || DEFAULT_PRESET_ID);
    const measures = preset.measures;
    const catalog: any[] = [];
    const knownKeys = new Set<string>();

    // Standard measures
    for (const m of measures) {
      const scoreKey = `${m.key}_score`;
      const records = allCheckIns.filter((r) => r[scoreKey] != null);
      const dates = records.map((r) => r.check_in_date).filter(Boolean).sort();
      catalog.push({
        key: m.key,
        label: m.label,
        emoji: m.emoji,
        description: m.desc,
        type: "measure",
        is_active: true,
        response_type: "scale_1_5",
        unit_label: null,
        anchored_choices_options: null,
        is_ic_fixed: false,
        is_ai_generated: false,
        first_seen_date: dates[0] || null,
        last_seen_date: dates[dates.length - 1] || null,
        response_count: records.length,
      });
      knownKeys.add(m.key);
    }

    // Custom questions (from definitions)
    const seenQKeys = new Set<string>();
    for (const q of customQs) {
      if (!q.question_key || seenQKeys.has(q.question_key)) continue;
      seenQKeys.add(q.question_key);
      knownKeys.add(q.question_key);
      const records = allCheckIns.filter(
        (r) => r.custom_answers && r.custom_answers[q.question_key] != null && r.custom_answers[q.question_key] !== ""
      );
      const dates = records.map((r) => r.check_in_date).filter(Boolean).sort();
      catalog.push({
        key: q.question_key,
        label: q.title,
        emoji: null,
        description: q.is_ai_generated ? `AI-generated from: ${q.ai_topic || ""}` : "",
        type: "custom",
        is_active: q.is_active,
        response_type: q.response_type,
        unit_label: q.unit_label || null,
        anchored_choices_options: q.anchored_choices_options || [],
        is_ic_fixed: q.is_ic_fixed || false,
        is_ai_generated: q.is_ai_generated || false,
        first_seen_date: dates[0] || null,
        last_seen_date: dates[dates.length - 1] || null,
        response_count: records.length,
      });
    }

    // Orphan keys found in data but not in definitions
    for (const r of allCheckIns) {
      if (!r.custom_answers) continue;
      for (const k of Object.keys(r.custom_answers)) {
        if (knownKeys.has(k) || seenQKeys.has(k)) continue;
        seenQKeys.add(k);
        const records = allCheckIns.filter(
          (r2) => r2.custom_answers && r2.custom_answers[k] != null && r2.custom_answers[k] !== ""
        );
        const dates = records.map((r2) => r2.check_in_date).filter(Boolean).sort();
        // Detect response type from values
        const vals = records.map((r2) => r2.custom_answers[k]).filter((v) => v != null);
        const detectedType = detectResponseType(vals);
        catalog.push({
          key: k,
          label: k.replace(/_/g, " "),
          emoji: null,
          description: "Historical question (definition no longer active)",
          type: "custom",
          is_active: false,
          response_type: detectedType,
          unit_label: null,
          anchored_choices_options: [],
          is_ic_fixed: false,
          is_ai_generated: false,
          first_seen_date: dates[0] || null,
          last_seen_date: dates[dates.length - 1] || null,
          response_count: records.length,
        });
      }
    }

    // ── Compute insights per question ────────────────────────────
    const insightsByKey: Record<string, any> = {};

    for (const entry of catalog) {
      if (entry.type === "measure") {
        const scoreKey = `${entry.key}_score`;
        const records = allCheckIns.filter((r) => r[scoreKey] != null);
        insightsByKey[entry.key] = computeScaleInsights(records, scoreKey);
      } else {
        const records = allCheckIns.filter(
          (r) => r.custom_answers && r.custom_answers[entry.key] != null && r.custom_answers[entry.key] !== ""
        );
        insightsByKey[entry.key] = computeCustomInsights(records, entry.key, entry.response_type, entry.anchored_choices_options);
      }
    }

    // ── Date range ───────────────────────────────────────────────
    const allDates = allCheckIns.map((r) => r.check_in_date).filter(Boolean).sort();
    const dateRange = {
      earliest: allDates[0] || null,
      latest: allDates[allDates.length - 1] || null,
      total_checkins: allCheckIns.length,
      unique_respondents: new Set(allCheckIns.map((r) => r.user_email)).size,
    };

    return Response.json({
      question_catalog: catalog,
      insights_by_key: insightsByKey,
      date_range: dateRange,
      team_members: teamMembers,
      scope,
      suppressed: false,
      days,
    });
  } catch (error) {
    console.error("[getCheckInInsights] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function detectResponseType(values: any[]): string {
  if (values.length === 0) return "text";
  const nonNull = values.filter((v) => v != null && v !== "");
  if (nonNull.length === 0) return "text";
  const sample = nonNull[0];
  if (typeof sample === "number" || (!isNaN(Number(sample)) && sample !== "")) {
    return "number";
  }
  if (sample === "yes" || sample === "no" || sample === true || sample === false) {
    return "yes_no";
  }
  if (typeof sample === "string" && !isNaN(Number(sample)) && Number(sample) >= 1 && Number(sample) <= 5) {
    return "scale_1_5";
  }
  return "text";
}

function computeScaleInsights(records: any[], scoreKey: string) {
  const scores = records.map((r) => Number(r[scoreKey])).filter((n) => !isNaN(n));
  if (scores.length === 0) {
    return { avg: null, distribution: {}, trend: [], response_count: 0, trend_direction: "insufficient_data" };
  }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const distribution: Record<string, number> = {};
  for (let i = 1; i <= 5; i++) distribution[String(i)] = 0;
  for (const s of scores) distribution[String(Math.round(s))]++;

  const trend = buildDailyTrend(records, (r) => Number(r[scoreKey]));
  const trendDirection = computeTrendDirection(trend);

  return { avg: round2(avg), distribution, trend, response_count: scores.length, trend_direction: trendDirection };
}

function computeCustomInsights(records: any[], key: string, responseType: string, anchoredOptions: string[] | null) {
  const answers = records.map((r) => r.custom_answers[key]).filter((v) => v != null && v !== "");
  if (answers.length === 0) {
    return { avg: null, distribution: {}, trend: [], response_count: 0, trend_direction: "insufficient_data", recent_answers: [] };
  }

  if (responseType === "number") {
    const nums = answers.map((a) => Number(a)).filter((n) => !isNaN(n));
    if (nums.length === 0) return { avg: null, distribution: {}, trend: [], response_count: 0, trend_direction: "insufficient_data", recent_answers: answers.slice(0, 10) };
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    const trend = buildDailyTrend(records, (r) => Number(r.custom_answers[key]));
    return { avg: round2(avg), distribution: {}, trend, response_count: nums.length, trend_direction: computeTrendDirection(trend), recent_answers: [] };
  }

  if (responseType === "scale_1_5") {
    const nums = answers.map((a) => Number(a)).filter((n) => !isNaN(n) && n >= 1 && n <= 5);
    if (nums.length === 0) return { avg: null, distribution: {}, trend: [], response_count: 0, trend_direction: "insufficient_data", recent_answers: answers.slice(0, 10) };
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    const distribution: Record<string, number> = {};
    for (let i = 1; i <= 5; i++) distribution[String(i)] = 0;
    for (const n of nums) distribution[String(n)]++;
    const trend = buildDailyTrend(records, (r) => Number(r.custom_answers[key]));
    return { avg: round2(avg), distribution, trend, response_count: nums.length, trend_direction: computeTrendDirection(trend), recent_answers: [] };
  }

  if (responseType === "yes_no") {
    const yesCount = answers.filter((a) => a === "yes" || a === true || a === "Yes").length;
    const noCount = answers.filter((a) => a === "no" || a === false || a === "No").length;
    const distribution: Record<string, number> = { yes: yesCount, no: noCount };
    const trend = buildDailyTrend(records, (r) => {
      const v = r.custom_answers[key];
      return v === "yes" || v === true || v === "Yes" ? 1 : 0;
    });
    const yesPct = answers.length > 0 ? Math.round((yesCount / answers.length) * 100) : 0;
    return { avg: yesPct, distribution, trend, response_count: answers.length, trend_direction: computeTrendDirection(trend), recent_answers: [], avg_label: `${yesPct}% yes` };
  }

  if (responseType === "anchored_choices") {
    const distribution: Record<string, number> = {};
    for (const opt of anchoredOptions || []) distribution[opt] = 0;
    for (const a of answers) {
      const key = String(a);
      distribution[key] = (distribution[key] || 0) + 1;
    }
    const trend = buildDailyTrendCount(records);
    return { avg: null, distribution, trend, response_count: answers.length, trend_direction: "stable", recent_answers: [] };
  }

  // text or unknown
  const trend = buildDailyTrendCount(records);
  return { avg: null, distribution: {}, trend, response_count: answers.length, trend_direction: "stable", recent_answers: answers.slice(0, 10) };
}

function buildDailyTrend(records: any[], valueFn: (r: any) => number) {
  const byDate = new Map<string, { sum: number; count: number }>();
  for (const r of records) {
    const d = r.check_in_date;
    if (!d) continue;
    const v = valueFn(r);
    if (isNaN(v)) continue;
    if (!byDate.has(d)) byDate.set(d, { sum: 0, count: 0 });
    const entry = byDate.get(d);
    entry.sum += v;
    entry.count++;
  }
  return Array.from(byDate.entries())
    .map(([date, { sum, count }]) => ({ date, value: round2(sum / count), count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildDailyTrendCount(records: any[]) {
  const byDate = new Map<string, number>();
  for (const r of records) {
    const d = r.check_in_date;
    if (!d) continue;
    byDate.set(d, (byDate.get(d) || 0) + 1);
  }
  return Array.from(byDate.entries())
    .map(([date, count]) => ({ date, value: count, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeTrendDirection(trend: { value: number; count: number }[]): string {
  if (trend.length < 4) return "insufficient_data";
  const mid = Math.floor(trend.length / 2);
  const firstHalf = trend.slice(0, mid);
  const secondHalf = trend.slice(mid);
  const avgFirst = firstHalf.reduce((a, b) => a + b.value, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b.value, 0) / secondHalf.length;
  const diff = avgSecond - avgFirst;
  const threshold = 0.2;
  if (diff > threshold) return "improving";
  if (diff < -threshold) return "declining";
  return "stable";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}