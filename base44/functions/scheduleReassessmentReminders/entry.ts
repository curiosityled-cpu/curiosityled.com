/**
 * scheduleReassessmentReminders
 *
 * Runs daily. For every tenant with a reassessment cadence
 * (Organization Settings → Assessment), finds people whose most recent
 * completion of a published assessment is older than that cadence and prompts
 * them to take it again. The prompt is a notification pointing at the same
 * signal — nothing is re-assigned and no result is altered.
 *
 * One reminder per person per assessment per month, so a cadence that has
 * elapsed does not turn into a daily nag.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import { authorizeScheduledTask } from "../../shared/scheduledTaskAuth.ts";
import { resolveOrgSettings } from "../../shared/orgNotificationSettings.ts";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const auth = await authorizeScheduledTask(req, base44);
    if (!auth.authorized) return auth.response;

    const now = new Date();
    const clients = await base44.asServiceRole.entities.Client.list("-created_date", 500).catch(() => []);

    let created = 0;
    let tenantsChecked = 0;

    for (const client of clients) {
      const months = Number(resolveOrgSettings(client).assessment.reassessment_cadence_months);
      if (!months || months <= 0) continue;
      tenantsChecked++;

      const cutoff = new Date(now.getTime() - months * MONTH_MS);

      const assessments = await base44.asServiceRole.entities.CustomAssessment.filter(
        { client_id: client.id, status: "published" },
        "-created_date",
        100
      ).catch(() => []);
      if (assessments.length === 0) continue;

      const assessmentById = new Map(assessments.map((a) => [a.id, a]));

      const submissions = await base44.asServiceRole.entities.AssessmentSubmission.filter(
        { client_id: client.id },
        "-created_date",
        1000
      ).catch(() => []);

      // Most recent completion per person per assessment.
      const latest = new Map();
      for (const submission of submissions) {
        const assessmentId = submission.custom_assessment_id;
        if (!assessmentId || !assessmentById.has(assessmentId) || !submission.user_email) continue;
        const at = submission.submission_date || submission.created_date;
        if (!at) continue;
        const key = `${submission.user_email}|${assessmentId}`;
        const current = latest.get(key);
        if (!current || new Date(current) < new Date(at)) latest.set(key, at);
      }

      for (const [key, lastAt] of latest) {
        if (new Date(lastAt) >= cutoff) continue;

        const [email, assessmentId] = key.split("|");
        const assessment = assessmentById.get(assessmentId);
        const cycleKey = `reassessment_${assessmentId}_${email}_${now.toISOString().slice(0, 7)}`;

        const existing = await base44.asServiceRole.entities.Notification.filter(
          { user_email: email, type: "assessment_due" },
          "-created_date",
          20
        ).catch(() => []);
        if (existing.some((n) => n.metadata?.cycle_key === cycleKey)) continue;

        const lastDone = new Date(lastAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        await base44.asServiceRole.entities.Notification.create({
          user_email: email,
          type: "assessment_due",
          title: `Time to reassess: ${assessment.title}`,
          message: `Your last completion of "${assessment.title}" was on ${lastDone}. Your organization reassesses every ${months} month${months === 1 ? "" : "s"}, so it is due again. Taking it keeps your profile and insights current.`,
          status: "pending",
          priority: "medium",
          scheduled_for: now.toISOString(),
          action_url: `/signal/${assessmentId}`,
          related_entity_type: "CustomAssessment",
          related_entity_id: assessmentId,
          metadata: { cycle_key: cycleKey, reassessment: true },
        });

        created++;
      }
    }

    return Response.json({
      ok: true,
      tenants_checked: tenantsChecked,
      notifications_created: created,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});