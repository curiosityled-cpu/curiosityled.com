import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { CONFIDENTIALITY_LEVELS } from "../../shared/successionConstants.ts";

/**
 * POST /successionCandidateNotice
 *
 * Actions:
 *   list        — notices for a candidacy, or the tenant's open notices.
 *   draft       — write a notice for a candidate. Versioned, never edited.
 *   send        — deliver a drafted notice to the candidate.
 *   acknowledge — the candidate confirms receipt.
 *
 * A notice is about the candidate's own record only: that they are being
 * considered, that evidence is being used, what readiness was concluded, what
 * decision was taken, or that their record is under hold or nearing retention.
 * It never carries another candidate's information, and what was sent is kept
 * exactly as sent.
 */

const NOTICE_TYPES = [
  "candidacy_inclusion",
  "evidence_use",
  "readiness_outcome",
  "decision_outcome",
  "legal_hold",
  "retention",
];

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { action } = body || {};

  if (!["list", "draft", "send", "acknowledge"].includes(action)) {
    return Response.json(
      { error: "action must be 'list', 'draft', 'send' or 'acknowledge'" },
      { status: 400 }
    );
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });
  }

  // A candidate acknowledging their own notice acts on their own record: that
  // is not a governance action, so it is gated by identity below rather than by
  // a succession permission.
  if (action === "acknowledge") {
    const { notice_id, note } = body;
    if (!notice_id) return Response.json({ error: "notice_id is required" }, { status: 400 });
    const rows = await base44.asServiceRole.entities.SuccessionCandidateNotice.filter({
      id: notice_id,
      client_id: auth.client_id,
    });
    const notice = rows?.[0];
    if (!notice) return Response.json({ error: "Notice not found" }, { status: 404 });
    if (String(notice.subject_email || "").toLowerCase() !== String(auth.email || "").toLowerCase()) {
      return Response.json({ error: "Only the candidate this notice is about may acknowledge it" }, { status: 403 });
    }
    if (notice.status !== "sent") {
      return Response.json({ error: `This notice is ${notice.status} — there is nothing to acknowledge` }, { status: 409 });
    }
    const acknowledgedAt = new Date().toISOString();
    await base44.asServiceRole.entities.SuccessionCandidateNotice.update(notice_id, {
      status: "acknowledged",
      acknowledged_at: acknowledgedAt,
      acknowledged_by_email: auth.email,
      acknowledgement_note: note || null,
    });
    await writeSuccessionAuditEvent({
      base44,
      action_type: "candidate_notice_acknowledged",
      target_entity_type: "SuccessionCandidateNotice",
      target_entity_id: notice_id,
      target_user_profile_id: notice.subject_profile_id,
      metadata: { notice_type: notice.notice_type, candidacy_id: notice.candidacy_id },
      confidentiality_level: CONFIDENTIALITY_LEVELS.HIGHLY_CONFIDENTIAL,
      event_type: "domain_action_completed",
      event_key: { action: "candidate_notice_acknowledged", notice_id },
      target_record_id: notice_id,
    });
    return Response.json({ notice_id, status: "acknowledged" });
  }

  const authz = await authorizeSuccessionAction({
    base44,
    auth,
    action: "successionCandidateNotice",
    target_client_id: auth.client_id,
    required_permission: action === "list" ? "succession.governance.view" : "succession.governance.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  try {
    if (action === "list") {
      const query: Record<string, any> = { client_id: auth.client_id };
      if (body.candidacy_id) query.candidacy_id = body.candidacy_id;
      if (body.status) query.status = body.status;
      const notices = await base44.asServiceRole.entities.SuccessionCandidateNotice.filter(
        query,
        "-drafted_at",
        200
      );
      return Response.json({ notices: notices || [] });
    }

    if (action === "draft") {
      const { candidacy_id, notice_type, summary, body: noticeBody, legal_basis } = body;
      if (!candidacy_id) return Response.json({ error: "candidacy_id is required" }, { status: 400 });
      if (!NOTICE_TYPES.includes(notice_type)) {
        return Response.json({ error: `notice_type must be one of: ${NOTICE_TYPES.join(", ")}` }, { status: 400 });
      }
      if (!summary || String(summary).trim().length < 10) {
        return Response.json({ error: "A notice needs a one-line summary" }, { status: 400 });
      }
      if (!noticeBody || String(noticeBody).trim().length < 40) {
        return Response.json(
          { error: "A notice needs a body the candidate can actually understand (at least 40 characters)" },
          { status: 400 }
        );
      }

      const candidacies = await base44.asServiceRole.entities.SuccessorCandidacy.filter({
        id: candidacy_id,
        client_id: auth.client_id,
      });
      const candidacy = candidacies?.[0];
      if (!candidacy) return Response.json({ error: "Candidacy not found in this tenant" }, { status: 404 });

      let roleTitle = null;
      try {
        const roles = await base44.asServiceRole.entities.CriticalRole.filter({
          id: candidacy.critical_role_id,
          client_id: auth.client_id,
        });
        roleTitle = roles?.[0]?.title || null;
      } catch {
        roleTitle = null;
      }

      // The candidacy was already validated against the caller's tenant above, so
      // the profile is resolved by ID alone — a profile's own client_id is not a
      // reliable tenant marker and requiring it here silently blocked notices.
      let subjectEmail = null;
      try {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({
          id: candidacy.user_profile_id,
        });
        subjectEmail = profiles?.[0]?.email || null;
      } catch {
        subjectEmail = null;
      }
      if (!subjectEmail) {
        return Response.json(
          { error: "The candidate has no recorded email address, so no notice can be addressed to them" },
          { status: 422 }
        );
      }

      const prior = await base44.asServiceRole.entities.SuccessionCandidateNotice.filter({
        client_id: auth.client_id,
        candidacy_id,
        notice_type,
      });
      const version = (prior?.length || 0) + 1;
      const now = new Date().toISOString();

      const notice = await base44.asServiceRole.entities.SuccessionCandidateNotice.create({
        client_id: auth.client_id,
        candidacy_id,
        cycle_id: candidacy.cycle_id || null,
        critical_role_id: candidacy.critical_role_id || null,
        role_title: roleTitle,
        subject_profile_id: candidacy.user_profile_id,
        subject_email: subjectEmail,
        notice_type,
        summary: String(summary).trim(),
        body: String(noticeBody).trim(),
        legal_basis: legal_basis || null,
        version,
        status: "draft",
        drafted_by_profile_id: auth.profile_id,
        drafted_by_email: auth.email,
        drafted_at: now,
        confidentiality_level: CONFIDENTIALITY_LEVELS.HIGHLY_CONFIDENTIAL,
      });

      await writeSuccessionAuditEvent({
        base44,
        action_type: "candidate_notice_drafted",
        target_entity_type: "SuccessionCandidateNotice",
        target_entity_id: notice.id,
        target_user_profile_id: candidacy.user_profile_id,
        metadata: { candidacy_id, notice_type, version, legal_basis: legal_basis || null },
        confidentiality_level: CONFIDENTIALITY_LEVELS.HIGHLY_CONFIDENTIAL,
        event_type: "domain_action_completed",
        event_key: { action: "candidate_notice_drafted", notice_id: notice.id },
        target_record_id: notice.id,
      });

      return Response.json({ notice });
    }

    // ── send ──
    const { notice_id } = body;
    if (!notice_id) return Response.json({ error: "notice_id is required" }, { status: 400 });

    const found = await base44.asServiceRole.entities.SuccessionCandidateNotice.filter({
      id: notice_id,
      client_id: auth.client_id,
    });
    const notice = found?.[0];
    if (!notice) return Response.json({ error: "Notice not found in this tenant" }, { status: 404 });
    if (notice.status !== "draft") {
      return Response.json({ error: `This notice is already ${notice.status}` }, { status: 409 });
    }

    // The notice is delivered in-app, so the candidate must have an account.
    // Refusing here keeps a "sent" status from meaning nothing at all.
    const accounts = await base44.asServiceRole.entities.User.filter({
      email: String(notice.subject_email || "").toLowerCase(),
    }).catch(() => []);
    if (!accounts || accounts.length === 0) {
      return Response.json(
        { error: "This person has no app account, so an in-app notice cannot reach them. Give them access first, or record the notice outside the app." },
        { status: 422 }
      );
    }

    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email: accounts[0].email,
      type: "succession_candidate_notice",
      title: notice.role_title
        ? `Your succession record — ${notice.role_title}`
        : "Notice about your succession record",
      message: notice.summary,
      is_read: false,
      related_entity_type: "SuccessionCandidateNotice",
      related_entity_id: notice.id,
      action_url: "/succession",
    });

    const sentAt = new Date().toISOString();
    await base44.asServiceRole.entities.SuccessionCandidateNotice.update(notice_id, {
      status: "sent",
      delivered_channel: "in_app",
      notification_id: notification.id,
      sent_by_email: auth.email,
      sent_at: sentAt,
    });

    await writeSuccessionAuditEvent({
      base44,
      action_type: "candidate_notice_sent",
      target_entity_type: "SuccessionCandidateNotice",
      target_entity_id: notice_id,
      target_user_profile_id: notice.subject_profile_id,
      metadata: { notice_type: notice.notice_type, candidacy_id: notice.candidacy_id, channel: "in_app" },
      confidentiality_level: CONFIDENTIALITY_LEVELS.HIGHLY_CONFIDENTIAL,
      event_type: "domain_action_completed",
      event_key: { action: "candidate_notice_sent", notice_id },
      target_record_id: notice_id,
    });

    return Response.json({ notice_id, status: "sent", notification_id: notification.id });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}