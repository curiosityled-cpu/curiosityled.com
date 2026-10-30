import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { CONFIDENTIALITY_LEVELS } from "../../shared/successionConstants.ts";

/**
 * POST /successionSealedDemographics
 *
 * Actions:
 *   ingest — bring sealed demographic attributes in from the HR system, a file,
 *            or manual entry. One row per person; re-ingesting updates it.
 *   counts — coverage only: how many people have attributes, from which source.
 *            Never returns an individual row.
 *   purge  — erase the attribute values for a person or a row, keeping the row
 *            as proof the purge happened.
 *
 * These values exist for one purpose: adverse-impact analysis on outcomes.
 * They are never read by a candidate, readiness, calibration or decision
 * screen, and never used to score, rank or select anyone.
 */

const ALLOWED_DIMENSIONS = [
  "gender",
  "race_ethnicity",
  "age_band",
  "disability_status",
  "veteran_status",
  "other",
];

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { action } = body || {};

  if (!["ingest", "counts", "purge"].includes(action)) {
    return Response.json({ error: "action must be 'ingest', 'counts' or 'purge'" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44,
    auth,
    action: "successionSealedDemographics",
    target_client_id: auth.client_id,
    required_permission: action === "counts" ? "succession.compliance_view" : "succession.governance.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  try {
    if (action === "counts") {
      const rows = await base44.asServiceRole.entities.SuccessionSealedDemographic.filter({
        client_id: auth.client_id,
      });
      const sealed = (rows || []).filter((r) => r.status === "sealed");
      const bySource: Record<string, number> = {};
      const byDimension: Record<string, number> = {};
      for (const row of sealed) {
        const source = row.collection_source || "unknown";
        bySource[source] = (bySource[source] || 0) + 1;
        for (const key of Object.keys(row.attributes || {})) {
          byDimension[key] = (byDimension[key] || 0) + 1;
        }
      }
      return Response.json({
        people_with_attributes: sealed.length,
        purged_rows: (rows || []).length - sealed.length,
        by_source: bySource,
        by_dimension: byDimension,
        note: "Coverage only. Individual sealed values are never returned by this endpoint.",
      });
    }

    if (action === "purge") {
      const { demographic_id, subject_email, purge_reason } = body;
      if (!demographic_id && !subject_email) {
        return Response.json({ error: "demographic_id or subject_email is required" }, { status: 400 });
      }
      const query: Record<string, any> = { client_id: auth.client_id };
      if (demographic_id) query.id = demographic_id;
      if (subject_email) query.subject_email = String(subject_email).toLowerCase();

      const rows = await base44.asServiceRole.entities.SuccessionSealedDemographic.filter(query);
      if (!rows || rows.length === 0) {
        return Response.json({ error: "No sealed record found" }, { status: 404 });
      }
      const now = new Date().toISOString();
      let purged = 0;
      for (const row of rows) {
        if (row.status === "purged") continue;
        await base44.asServiceRole.entities.SuccessionSealedDemographic.update(row.id, {
          attributes: {},
          status: "purged",
          purged_at: now,
          purged_by_email: auth.email,
        });
        purged += 1;
      }
      await writeSuccessionAuditEvent({
        base44,
        action_type: "sealed_demographic_purged",
        target_entity_type: "SuccessionSealedDemographic",
        target_entity_id: demographic_id || undefined,
        metadata: { purged_count: purged, reason: purge_reason || null, requested_by_email: subject_email || null },
        confidentiality_level: CONFIDENTIALITY_LEVELS.LEGALLY_RESTRICTED,
        event_type: "domain_action_completed",
        event_key: { action: "sealed_demographic_purged", at: now },
      });
      return Response.json({ purged_count: purged });
    }

    // ── ingest ──
    const { records, consent_basis, collection_source, collection_reference, purge_after } = body;
    if (!Array.isArray(records) || records.length === 0) {
      return Response.json({ error: "records must be a non-empty array" }, { status: 400 });
    }
    if (records.length > 500) {
      return Response.json({ error: "At most 500 records per call" }, { status: 400 });
    }
    if (!consent_basis || String(consent_basis).trim().length < 10) {
      return Response.json(
        { error: "A legal or policy basis for holding these attributes is required" },
        { status: 400 }
      );
    }
    if (!["hris", "file", "manual"].includes(collection_source)) {
      return Response.json({ error: "collection_source must be 'hris', 'file' or 'manual'" }, { status: 400 });
    }

    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    const rejected: { index: number; reason: string }[] = [];

    for (let i = 0; i < records.length; i += 1) {
      const rec = records[i] || {};
      const attributes = rec.attributes || {};
      const keys = Object.keys(attributes);
      if (keys.length === 0) {
        rejected.push({ index: i, reason: "no attributes supplied" });
        continue;
      }
      const badKey = keys.find((k) => !ALLOWED_DIMENSIONS.includes(k));
      if (badKey) {
        rejected.push({ index: i, reason: `unsupported dimension '${badKey}'` });
        continue;
      }

      let email = rec.subject_email ? String(rec.subject_email).toLowerCase() : null;
      if (!email && rec.subject_profile_id) {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({
          id: rec.subject_profile_id,
        }).catch(() => []);
        email = profiles?.[0]?.email ? String(profiles[0].email).toLowerCase() : null;
      }
      if (!email) {
        rejected.push({ index: i, reason: "no subject email or resolvable profile" });
        continue;
      }

      let subjectProfileId = rec.subject_profile_id || null;
      if (!subjectProfileId) {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({
          email,
        }).catch(() => []);
        subjectProfileId = profiles?.[0]?.id || null;
      }

      const existing = await base44.asServiceRole.entities.SuccessionSealedDemographic.filter({
        client_id: auth.client_id,
        subject_email: email,
      });
      const payload = {
        client_id: auth.client_id,
        subject_profile_id: subjectProfileId,
        subject_email: email,
        collection_source,
        collection_reference: collection_reference || null,
        consent_basis: String(consent_basis).trim(),
        attributes,
        sealed: true,
        status: "sealed",
        collected_by_email: auth.email,
        collected_at: now,
        purge_after: purge_after || null,
        confidentiality_level: CONFIDENTIALITY_LEVELS.LEGALLY_RESTRICTED,
      };

      if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.SuccessionSealedDemographic.update(existing[0].id, {
          attributes,
          status: "sealed",
          subject_profile_id: subjectProfileId || existing[0].subject_profile_id,
          collection_source,
          collection_reference: collection_reference || existing[0].collection_reference || null,
          consent_basis: payload.consent_basis,
          collected_by_email: auth.email,
          collected_at: now,
          purge_after: purge_after || existing[0].purge_after || null,
          purged_at: null,
          purged_by_email: null,
        });
        updated += 1;
      } else {
        await base44.asServiceRole.entities.SuccessionSealedDemographic.create(payload);
        created += 1;
      }
    }

    await writeSuccessionAuditEvent({
      base44,
      action_type: "sealed_demographics_ingested",
      target_entity_type: "SuccessionSealedDemographic",
      metadata: {
        created,
        updated,
        rejected: rejected.length,
        collection_source,
        consent_basis: String(consent_basis).trim(),
      },
      confidentiality_level: CONFIDENTIALITY_LEVELS.LEGALLY_RESTRICTED,
      event_type: "domain_action_completed",
      event_key: { action: "sealed_demographics_ingested", at: now },
    });

    return Response.json({ created, updated, rejected });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}