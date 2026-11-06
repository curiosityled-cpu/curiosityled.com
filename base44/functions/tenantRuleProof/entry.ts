/**
 * tenantRuleProof — tests tenant boundaries as authorisation, not as query
 * construction.
 *
 * A service-role call bypasses every entity rule, so a proof written with the
 * service role can only ever show that a query was scoped — not that a signed-in
 * browser is actually refused. This function evaluates each entity's own rule
 * against a synthetic principal and a synthetic foreign record, in both roles
 * that matter (a tenant administrator and a plain user), for read, create,
 * update and delete.
 *
 * The rules cannot be read from the runtime (entity schemas are not exposed to a
 * function), so the caller supplies them:
 *
 *   POST { "bundle": { "entities": [ { "name": "Goal", "rls": { ... } } ] } }
 *
 * Export the bundle from the schema files whenever rules change, and the same
 * command answers again. Two clients are never created here: the proof uses
 * client ids supplied by the caller, which by default are the two existing
 * proof organisations ("Phase 5 Proof — Alpha" / "— Beta").
 *
 * SELF-TEST: before any result is reported, the evaluator is checked against
 * rules whose answer is known. An evaluator that resolves `{{user.email}}`
 * wrongly (the `user.` prefix is part of the template, not a property) reports
 * every entity as open, and a wrong "all clear" is worse than no proof at all.
 * If the self-test fails the function returns 500 and no results.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { evaluateRule, effectiveRule } from "../../shared/rlsEvaluator.ts";

const OPS = ["read", "create", "update", "delete"] as const;

const TENANT_ROLES = ["Admin Level 2", "User Level 1"];

type Principal = {
  id: string;
  email: string;
  role: string;
  app_role: string;
  data: Record<string, any>;
};

function principal(clientId: string, appRole: string, side: "a" | "b"): Principal {
  return {
    id: `proof-${side}-user`,
    email: `proof.${side}@phase5.test`,
    role: "user",
    app_role: appRole,
    data: {
      client_id: clientId,
      partner_client_ids: [],
      subordinate_emails: [],
      managed_program_ids: [],
    },
  };
}

/**
 * Builds the record a given tenant's person owns: every person-bound field is
 * set to that tenant's own principal, so a rule that matches on identity can be
 * told apart from one that matches on the client.
 */
function recordFor(clientId: string, side: "a" | "b"): Record<string, any> {
  const mail = `proof.${side}@phase5.test`;
  const id = `proof-${side}-user`;
  const fields = [
    "created_by", "user_email", "email", "employee_email", "manager_email",
    "target_email", "accessed_by", "requester_email", "owner_email",
    "tester_email", "learner_email", "sender_email", "assigned_by",
    "enrolled_by", "created_by_email", "submitter_email", "from_hrbp_email",
    "given_by_email", "facilitator_email", "program_manager_email",
    "coach_email", "reviewer_email",
  ];
  const record: Record<string, any> = {
    id: `proof-${side}-record`,
    client_id: clientId,
    tenant_id: clientId,
    created_by_id: id,
    base44_user_id: id,
    name: "Proof record",
  };
  fields.forEach((field) => { record[field] = mail; });
  return record;
}

/** Rules with a known answer. If these do not behave, nothing else is reported. */
function selfTest(): string[] {
  const failures: string[] = [];
  const own = principal("client-a", "Admin Level 2", "a");
  const ownRec = recordFor("client-a", "a");
  const foreignRec = recordFor("client-b", "b");

  const scoped = {
    $and: [
      { user_condition: { role: "Admin Level 2" } },
      // Rule fixture, not a read: this is the template text the proof submits to
      // the access-rule evaluator to confirm the rule scopes to the principal.
      { "data.client_id": "{{user.data.client_id}}" },
    ],
  };
  if (evaluateRule(scoped, own, foreignRec) !== false) {
    failures.push("a client-scoped rule admitted a foreign record");
  }
  if (evaluateRule(scoped, own, ownRec) !== true) {
    failures.push("a client-scoped rule rejected the principal's own record");
  }

  const byEmail = { "data.owner_email": "{{user.email}}" };
  if (evaluateRule(byEmail, own, foreignRec) !== false) {
    failures.push("an identity rule admitted another person's record (template not resolved)");
  }
  if (evaluateRule(byEmail, own, ownRec) !== true) {
    failures.push("an identity rule rejected the principal's own record");
  }

  const byList = { "data.member_emails": { $in: ["{{user.email}}"] } };
  if (evaluateRule(byList, own, { id: "x", member_emails: ["someone.else@phase5.test"] }) !== false) {
    failures.push("a list-membership rule admitted a non-member");
  }
  if (evaluateRule(byList, own, { id: "x", member_emails: [own.email] }) !== true) {
    failures.push("a list-membership rule rejected a member");
  }

  return failures;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.app_role !== "Platform Admin" && user.role !== "admin") {
      return Response.json({ error: "Platform Admin only" }, { status: 403 });
    }

    const sanity = selfTest();
    if (sanity.length) {
      return Response.json(
        {
          error: "Evaluator self-test failed — no proof is reported because a wrong result would read as all-clear",
          failures: sanity,
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const entities = body?.bundle?.entities;
    if (!Array.isArray(entities) || !entities.length) {
      return Response.json(
        {
          error: "Send bundle.entities = [{ name, rls }] exported from the entity schemas",
          note: "Entity rules are not readable from the function runtime, so the caller supplies them.",
        },
        { status: 400 }
      );
    }

    // Existing proof organisations only — this function never creates clients.
    const clients = await base44.asServiceRole.entities.Client.list().catch(() => []);
    const alpha = clients.find((c: any) => c.slug === "phase5-proof-alpha");
    const beta = clients.find((c: any) => c.slug === "phase5-proof-beta");
    if (!alpha || !beta) {
      return Response.json(
        { error: "The two proof organisations are missing (phase5-proof-alpha / phase5-proof-beta)" },
        { status: 409 }
      );
    }

    const results: any[] = [];
    for (const entity of entities) {
      const { name, rls } = entity ?? {};
      if (!name || !rls) continue;
      const entityResult: any = { entity: name, exposures: [], by_design: [] };

      for (const op of OPS) {
        const rule = effectiveRule(rls, op);
        if (rule === null || rule === undefined) {
          entityResult.by_design.push(`${op}: closed`);
          continue;
        }
        for (const role of TENANT_ROLES) {
          const foreignAdmitted = evaluateRule(rule, principal(alpha.id, role, "a"), recordFor(beta.id, "b"));
          if (foreignAdmitted === true) {
            entityResult.exposures.push(`${op} by ${role}`);
            break;
          }
        }
      }

      if (entityResult.exposures.length) results.push(entityResult);
    }

    return Response.json({
      clients: { alpha: alpha.name, beta: beta.name },
      entities_tested: entities.length,
      operations_tested: entities.length * OPS.length,
      exposed_entities: results.length,
      exposures: results,
      verdict: results.length === 0 ? "no cross-tenant admission found" : "exposures found",
      method: "entity rules evaluated against a synthetic foreign principal; service-role query scoping is tested separately by phase5TwoClientProof",
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}