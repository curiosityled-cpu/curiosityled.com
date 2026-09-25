import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionSubmitSelfDisclosure
 * Submits a candidate-authored, versioned self-disclosure.
 *
 * Candidate self-service: the authenticated user MUST be the candidacy's
 * user_profile_id. No proxy submission or HR interpretation in this MVP.
 *
 * A new submission creates a new version and supersedes the prior disclosure.
 * Never updates an existing submitted disclosure in place.
 *
 * No free-text COI narrative is stored. When conflict_of_interest_disclosed
 * is true, the UI displays "HR follow-up required."
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, candidacy_id, aspiration_status, aspiration_statement, mobility, availability_horizon, conflict_of_interest_disclosed } = body;

  if (!operation_id || !candidacy_id || !aspiration_status || !mobility || !availability_horizon) {
    return Response.json({ error: "operation_id, candidacy_id, aspiration_status, mobility, availability_horizon required" }, { status: 400 });
  }

  const validAspiration = ["interested", "undecided", "not_interested"];
  const validMobility = ["local_only", "relocatable", "remote_only", "open"];
  const validHorizon = ["immediate", "0_6_months", "6_12_months", "12_24_months", "24_plus_months"];

  if (!validAspiration.includes(aspiration_status)) {
    return Response.json({ error: "Invalid aspiration_status" }, { status: 400 });
  }
  if (!validMobility.includes(mobility)) {
    return Response.json({ error: "Invalid mobility" }, { status: 400 });
  }
  if (!validHorizon.includes(availability_horizon)) {
    return Response.json({ error: "Invalid availability_horizon" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  // Candidate self-service: no required_permission. The relationship check
  // (auth.profile_id === candidacy.user_profile_id) is enforced below.
  // authorizeSuccessionAction still denies Platform Admin and checks tenant scope.
  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionSubmitSelfDisclosure",
    target_client_id: auth.client_id,
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionSubmitSelfDisclosure",
    payload: { candidacy_id, aspiration_status, aspiration_statement, mobility, availability_horizon, conflict_of_interest_disclosed },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Cross-tenant validation: candidacy must belong to caller's tenant
    const candidacy = await validateSameTenantReference(base44, "SuccessorCandidacy", candidacy_id, auth.client_id);
    if (!candidacy) {
      await writeDeniedReferenceEvent(base44, auth, "SuccessorCandidacy", candidacy_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "candidacy_not_found");
      return Response.json({ error: "Candidacy not found" }, { status: 404 });
    }

    // Candidate self-service enforcement: auth.profile_id must match candidacy.user_profile_id
    if (candidacy.user_profile_id !== auth.profile_id) {
      await writeSuccessionAuditEvent({
        base44, action_type: "denied_action",
        target_entity_type: "SuccessorCandidacy", target_entity_id: candidacy_id,
        metadata: {
          action: "successionSubmitSelfDisclosure",
          denied_reason: "not_own_candidacy",
          actor_profile_id: auth.profile_id,
          candidacy_user_profile_id: candidacy.user_profile_id,
        },
        operation_id: opResult.operation.id,
        event_key: { action: "denied_disclosure_not_own_candidacy", candidacy_id },
        event_type: "denied_action",
      });
      await failOperation(base44, opResult.operation.id, "not_own_candidacy");
      return Response.json({ error: "You may only submit disclosures for your own candidacy." }, { status: 403 });
    }

    if (candidacy.status !== "active") {
      await failOperation(base44, opResult.operation.id, "candidacy_not_active");
      return Response.json({ error: "Cannot submit a disclosure for a withdrawn candidacy" }, { status: 409 });
    }

    // Find the current disclosure to supersede
    const currentDisclosures = await base44.asServiceRole.entities.CandidateSelfDisclosure.filter({
      client_id: auth.client_id, candidacy_id, status: "current", integrity_status: "active",
    });

    const priorDisclosure = currentDisclosures.length > 0 ? currentDisclosures[0] : null;
    const newVersion = priorDisclosure ? (priorDisclosure.version || 0) + 1 : 1;
    const now = new Date().toISOString();

    // Create the new disclosure version
    const newDisclosure = await base44.asServiceRole.entities.CandidateSelfDisclosure.create({
      client_id: auth.client_id,
      candidacy_id,
      user_profile_id: auth.profile_id,
      version: newVersion,
      aspiration_status,
      aspiration_statement: aspiration_statement || null,
      mobility,
      availability_horizon,
      conflict_of_interest_disclosed: !!conflict_of_interest_disclosed,
      submitted_by_profile_id: auth.profile_id,
      submitted_at: now,
      status: "current",
      supersedes_disclosure_id: priorDisclosure ? priorDisclosure.id : null,
      confidentiality_level: "confidential",
      integrity_status: "pending_validation",
    });

    // Supersede the prior disclosure (never update in place — this is a status transition)
    if (priorDisclosure) {
      await base44.asServiceRole.entities.CandidateSelfDisclosure.update(priorDisclosure.id, {
        status: "superseded",
      });
    }

    // Activate the new disclosure
    await base44.asServiceRole.entities.CandidateSelfDisclosure.update(newDisclosure.id, {
      integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "self_disclosure_submitted",
      target_entity_type: "CandidateSelfDisclosure", target_entity_id: newDisclosure.id,
      target_user_profile_id: auth.profile_id,
      metadata: {
        candidacy_id, version: newVersion,
        supersedes_disclosure_id: priorDisclosure ? priorDisclosure.id : null,
        aspiration_status, mobility, availability_horizon,
        conflict_of_interest_disclosed: !!conflict_of_interest_disclosed,
      },
      operation_id, event_key: { action: "self_disclosure_submitted", disclosure_id: newDisclosure.id },
      event_type: "domain_action_completed", target_record_id: newDisclosure.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      disclosure_id: newDisclosure.id, version: newVersion, status: "current",
    });

    return Response.json({
      operation_id,
      disclosure_id: newDisclosure.id,
      version: newVersion,
      status: "current",
      supersedes_disclosure_id: priorDisclosure ? priorDisclosure.id : null,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "submit_self_disclosure_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}