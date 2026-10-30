/**
 * successionDataQualityGate — the pre-deliberation gate.
 *
 * A deliberation that opens on thin, stale, or disputed material produces a
 * decision nobody can defend later. This module states what "fit to deliberate"
 * means and answers it for a set of candidates before a calibration session is
 * opened.
 *
 * Two levels:
 *   blocking — the deliberation may not open on this candidate/cycle.
 *   warning  — it may open, but the panel should see the caveat.
 *
 * Server-side only. Never imported by the client bundle.
 */

export type GateSeverity = "blocking" | "warning";

export interface GateFinding {
  code: string;
  severity: GateSeverity;
  subject: string;
  detail: string;
  record_ids: string[];
}

export interface GateCaseDetail {
  readiness_conclusion_id: string;
  candidacy_id: string | null;
  accepted_evidence: number;
  stale_evidence: number;
  blocking: GateFinding[];
  warnings: GateFinding[];
}

export interface GateReport {
  ok: boolean;
  blocking: GateFinding[];
  warnings: GateFinding[];
  cases: GateCaseDetail[];
  evaluated_at: string;
}

const DECISION_ELIGIBLE_STATUSES = ["accepted", "accepted_with_limitations"];

/**
 * Evaluates whether a cycle (and optionally a specific set of readiness
 * conclusions) is fit to enter deliberation.
 */
export async function evaluateDeliberationReadiness(params: {
  base44: any;
  client_id: string;
  cycle_id: string;
  conclusion_ids?: string[];
}): Promise<GateReport> {
  const { base44, client_id, cycle_id } = params;
  const wantedIds = (params.conclusion_ids || []).filter(Boolean);

  const blocking: GateFinding[] = [];
  const warnings: GateFinding[] = [];
  const cases: GateCaseDetail[] = [];
  const today = new Date().toISOString().split("T")[0];

  const cycles = await base44.asServiceRole.entities.SuccessionCycle
    .filter({ id: cycle_id, client_id }).catch(() => []);
  const cycle = (cycles || [])[0];

  if (!cycle) {
    return {
      ok: false,
      blocking: [
        {
          code: "cycle_not_found",
          severity: "blocking",
          subject: "Cycle",
          detail: "The cycle could not be found in this tenant.",
          record_ids: [cycle_id],
        },
      ],
      warnings: [],
      cases: [],
      evaluated_at: new Date().toISOString(),
    };
  }

  if (cycle.status !== "active") {
    blocking.push({
      code: "cycle_not_active",
      severity: "blocking",
      subject: cycle.name || "Cycle",
      detail: `The cycle is ${cycle.status}. A deliberation can only open on an active cycle.`,
      record_ids: [cycle.id],
    });
  }

  const conclusionQuery: Record<string, any> = { client_id, cycle_id };
  if (wantedIds.length) conclusionQuery.id = { $in: wantedIds };
  const conclusions = await base44.asServiceRole.entities.ReadinessConclusion
    .filter(conclusionQuery).catch(() => []);

  if (!(conclusions || []).length) {
    blocking.push({
      code: "no_readiness_proposals",
      severity: "blocking",
      subject: cycle.name || "Cycle",
      detail: "There is nothing to deliberate: no readiness conclusions exist in this cycle.",
      record_ids: [cycle.id],
    });
  }

  const candidacyIds = (conclusions || []).map((c: any) => c.candidacy_id).filter(Boolean);

  const [candidacies, evidence, incidents] = await Promise.all([
    candidacyIds.length
      ? base44.asServiceRole.entities.SuccessorCandidacy
          .filter({ client_id, id: { $in: candidacyIds } }).catch(() => [])
      : Promise.resolve([]),
    candidacyIds.length
      ? base44.asServiceRole.entities.EvidenceRecord
          .filter({ client_id, candidacy_id: { $in: candidacyIds } }).catch(() => [])
      : Promise.resolve([]),
    base44.asServiceRole.entities.SnapshotIntegrityIncident
      .filter({ client_id, status: { $in: ["open", "under_review"] } }).catch(() => []),
  ]);

  const candidacyById: Record<string, any> = {};
  for (const c of candidacies || []) candidacyById[c.id] = c;

  const openIncidentSnapshots = new Set(
    (incidents || []).map((i: any) => i.effective_blueprint_snapshot_id).filter(Boolean)
  );

  for (const conclusion of conclusions || []) {
    const candidacy = conclusion.candidacy_id ? candidacyById[conclusion.candidacy_id] : null;
    const subject = candidacy?.user_profile_id
      ? `Candidate ${String(conclusion.candidacy_id).slice(-6)}`
      : `Conclusion ${String(conclusion.id).slice(-6)}`;

    const items = (evidence || []).filter((e: any) => e.candidacy_id === conclusion.candidacy_id);
    const eligible = items.filter((e: any) => DECISION_ELIGIBLE_STATUSES.includes(e.status));
    const stale = eligible.filter(
      (e: any) => e.freshness_review_date && String(e.freshness_review_date).slice(0, 10) < today
    );

    const caseBlocking: GateFinding[] = [];
    const caseWarnings: GateFinding[] = [];

    if (!eligible.length) {
      caseBlocking.push({
        code: "no_decision_eligible_evidence",
        severity: "blocking",
        subject,
        detail:
          "No evidence for this candidate has passed review. A readiness judgement here would rest on nothing the panel can point to.",
        record_ids: [conclusion.id],
      });
    }

    if (stale.length) {
      caseWarnings.push({
        code: "evidence_past_freshness",
        severity: "warning",
        subject,
        detail: `${stale.length} accepted evidence item${stale.length === 1 ? " is" : "s are"} past their freshness review date.`,
        record_ids: stale.map((e: any) => e.id),
      });
    }

    if (!conclusion.rationale || String(conclusion.rationale).trim().length < 20) {
      caseWarnings.push({
        code: "proposal_rationale_thin",
        severity: "warning",
        subject,
        detail: "The readiness proposal carries no substantive rationale.",
        record_ids: [conclusion.id],
      });
    }

    if (conclusion.effective_blueprint_snapshot_id && openIncidentSnapshots.has(conclusion.effective_blueprint_snapshot_id)) {
      caseBlocking.push({
        code: "snapshot_integrity_incident_open",
        severity: "blocking",
        subject,
        detail:
          "The blueprint snapshot this candidate was assessed against has an open integrity incident. Resolve it before judging readiness.",
        record_ids: [conclusion.id, conclusion.effective_blueprint_snapshot_id],
      });
    }

    if (!conclusion.effective_blueprint_snapshot_id) {
      caseWarnings.push({
        code: "no_blueprint_snapshot",
        severity: "warning",
        subject,
        detail: "The proposal is not tied to a frozen blueprint snapshot, so the standard applied cannot be shown.",
        record_ids: [conclusion.id],
      });
    }

    blocking.push(...caseBlocking);
    warnings.push(...caseWarnings);
    cases.push({
      readiness_conclusion_id: conclusion.id,
      candidacy_id: conclusion.candidacy_id || null,
      accepted_evidence: eligible.length,
      stale_evidence: stale.length,
      blocking: caseBlocking,
      warnings: caseWarnings,
    });
  }

  return {
    ok: blocking.length === 0,
    blocking,
    warnings,
    cases,
    evaluated_at: new Date().toISOString(),
  };
}