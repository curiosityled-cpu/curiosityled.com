/**
 * successionSoDRules — the declared segregation-of-duties rule set for the
 * succession module, and the detector that finds breaches of it.
 *
 * Until now the duties were enforced as individual inline checks scattered
 * across the action functions. Nothing stated what the rules were, and nothing
 * could find a breach that had already been written. This module is the single
 * statement of the rules: each rule is declared once here with the actions that
 * enforce it, and evaluateSodCompliance() re-examines stored records against it.
 *
 * Server-side only. Never imported by the client bundle.
 */

export interface SodRule {
  key: string;
  label: string;
  description: string;
  /** Backend actions where this duty is enforced at the moment of the act. */
  enforced_at: string[];
}

export const SOD_RULES: SodRule[] = [
  {
    key: "blueprint_submitter_approver",
    label: "Blueprint: the submitter may not approve",
    description:
      "The person who submits a Role Success Blueprint cannot be the person who approves it. The standard for a role must be signed off by a second authority.",
    enforced_at: ["successionApproveBlueprint"],
  },
  {
    key: "requirement_submitter_approver",
    label: "Requirement: the submitter may not approve",
    description:
      "The person who submits a role or critical-role requirement cannot approve it. This prevents one person both proposing and ratifying what a role demands.",
    enforced_at: ["successionApproveCriticalRoleRequirement"],
  },
  {
    key: "mapping_submitter_approver",
    label: "Assessment mapping: the submitter may not approve",
    description:
      "The person who proposes that an assessment competency maps to a role requirement cannot approve that mapping, because the mapping decides what counts as evidence.",
    enforced_at: ["successionApproveLeadershipIndexMapping"],
  },
  {
    key: "evidence_reviewer_not_subject",
    label: "Evidence: the reviewer may not be the subject",
    description:
      "Nobody reviews evidence about themselves. The reviewer of an evidence record must differ from the person the record is about.",
    enforced_at: ["successionReviewEvidence"],
  },
  {
    key: "decision_recorder_ratifier",
    label: "Decision: the recorder may not ratify",
    description:
      "A succession decision requires a counter-signature by a second authority. The person who records the decision cannot ratify it.",
    enforced_at: ["successionRecordDecision"],
  },
  {
    key: "proposer_not_on_panel",
    label: "Calibration: the proposer may not judge their own proposal",
    description:
      "The person who proposed a candidate's readiness cannot sit on the panel that calibrates that proposal, or the calibration has nothing to calibrate.",
    enforced_at: ["successionCreateCalibrationSession", "successionRecordCalibrationJudgment"],
  },
];

export type SodSeverity = "violation" | "observation";

export interface SodFinding {
  rule_key: string;
  rule_label: string;
  severity: SodSeverity;
  subject: string;
  detail: string;
  record_ids: string[];
}

export interface SodReport {
  findings: SodFinding[];
  counts: { violations: number; observations: number; rules_evaluated: number };
  evaluated_at: string;
}

function ruleLabel(key: string): string {
  return SOD_RULES.find((r) => r.key === key)?.label || key;
}

/**
 * Re-examines stored records against the declared rule set.
 *
 * A "violation" is a record that already breaches a duty — it should not exist.
 * An "observation" is a condition worth seeing that is not itself a breach.
 */
export async function evaluateSodCompliance(params: {
  base44: any;
  client_id: string;
  cycle_id?: string | null;
}): Promise<SodReport> {
  const { base44, client_id } = params;
  const cycle_id = params.cycle_id || null;
  const findings: SodFinding[] = [];

  const scope = (extra: Record<string, any> = {}) =>
    cycle_id ? { client_id, cycle_id, ...extra } : { client_id, ...extra };

  const [blueprints, roleReqs, criticalReqs, mappings, decisions, calCases] = await Promise.all([
    base44.asServiceRole.entities.RoleSuccessBlueprint.filter(scope()).catch(() => []),
    base44.asServiceRole.entities.RoleRequirement.filter(scope()).catch(() => []),
    base44.asServiceRole.entities.CriticalRoleRequirement.filter(scope()).catch(() => []),
    base44.asServiceRole.entities.LeadershipIndexRequirementMapping.filter(scope()).catch(() => []),
    base44.asServiceRole.entities.SuccessionDecisionRecord.filter(scope()).catch(() => []),
    base44.asServiceRole.entities.CalibrationCase.filter(scope()).catch(() => []),
  ]);

  // ── Blueprint submitted by its own approver ──────────────────────────────
  for (const b of blueprints || []) {
    if (b.submitted_by_profile_id && b.submitted_by_profile_id === b.approved_by_profile_id) {
      findings.push({
        rule_key: "blueprint_submitter_approver",
        rule_label: ruleLabel("blueprint_submitter_approver"),
        severity: "violation",
        subject: b.version_label ? `Blueprint ${b.version_label}` : `Blueprint ${b.id}`,
        detail: "The same person submitted and approved this blueprint.",
        record_ids: [b.id],
      });
    }
  }

  // ── Requirements submitted by their own approver ─────────────────────────
  for (const [collection, entity] of [
    [roleReqs, "RoleRequirement"],
    [criticalReqs, "CriticalRoleRequirement"],
  ] as const) {
    for (const r of collection || []) {
      if (!r.submitted_by_profile_id) continue;
      if (r.submitted_by_profile_id === r.approved_by_profile_id) {
        findings.push({
          rule_key: "requirement_submitter_approver",
          rule_label: ruleLabel("requirement_submitter_approver"),
          severity: "violation",
          subject: String(r.requirement_text || entity).slice(0, 90),
          detail: "The same person submitted and approved this requirement.",
          record_ids: [r.id],
        });
      }
    }
  }

  // ── Assessment mappings submitted by their own approver ──────────────────
  for (const m of mappings || []) {
    if (m.submitted_by_profile_id && m.submitted_by_profile_id === m.approved_by_profile_id) {
      findings.push({
        rule_key: "mapping_submitter_approver",
        rule_label: ruleLabel("mapping_submitter_approver"),
        severity: "violation",
        subject: `Mapping v${m.version_number ?? 1} — ${m.competency_key || m.competency_id || "competency"}`,
        detail: "The same person submitted and approved this assessment-to-requirement mapping.",
        record_ids: [m.id],
      });
    }
  }

  // ── Evidence reviewed by its own subject ─────────────────────────────────
  if (cycle_id) {
    const conclusions = await base44.asServiceRole.entities.ReadinessConclusion
      .filter({ client_id, cycle_id }).catch(() => []);
    const candidacyIds = (conclusions || []).map((c: any) => c.candidacy_id).filter(Boolean);
    if (candidacyIds.length) {
      const evidence = await base44.asServiceRole.entities.EvidenceRecord
        .filter({ client_id, candidacy_id: { $in: candidacyIds } }).catch(() => []);
      const byId: Record<string, any> = {};
      for (const e of evidence || []) byId[e.id] = e;

      const reviews = await base44.asServiceRole.entities.EvidenceReviewDecision
        .filter({ client_id, candidacy_id: { $in: candidacyIds } }).catch(() => []);
      for (const rev of reviews || []) {
        const subject = byId[rev.evidence_record_id];
        if (subject && rev.reviewer_profile_id && rev.reviewer_profile_id === subject.user_profile_id) {
          findings.push({
            rule_key: "evidence_reviewer_not_subject",
            rule_label: ruleLabel("evidence_reviewer_not_subject"),
            severity: "violation",
            subject: String(subject.title || "Evidence record").slice(0, 90),
            detail: "The evidence was reviewed by the person it is about.",
            record_ids: [rev.id, subject.id],
          });
        }
      }
    }
  }

  // ── Decisions ratified by their own recorder ─────────────────────────────
  for (const d of decisions || []) {
    if (d.recorded_by_profile_id && d.recorded_by_profile_id === d.ratified_by_profile_id) {
      findings.push({
        rule_key: "decision_recorder_ratifier",
        rule_label: ruleLabel("decision_recorder_ratifier"),
        severity: "violation",
        subject: `${d.role_title || "Role"} — ${d.status}`,
        detail: "The decision was recorded and ratified by the same person.",
        record_ids: [d.id],
      });
    }
    if (d.status === "ratified" && !d.ratified_by_profile_id) {
      findings.push({
        rule_key: "decision_recorder_ratifier",
        rule_label: ruleLabel("decision_recorder_ratifier"),
        severity: "observation",
        subject: `${d.role_title || "Role"} — ratified`,
        detail: "Ratified decision carries no ratifying identity. It cannot be shown who countersigned it.",
        record_ids: [d.id],
      });
    }
  }

  // ── Candidates judged by the person who proposed their readiness ─────────
  const panelCases = (calCases || []).filter((c: any) => (c.panel_member_profile_ids || []).length > 0);
  if (panelCases.length) {
    const conclusionIds = panelCases.map((c: any) => c.readiness_conclusion_id).filter(Boolean);
    const conclusions = conclusionIds.length
      ? await base44.asServiceRole.entities.ReadinessConclusion
          .filter({ client_id, id: { $in: conclusionIds } }).catch(() => [])
      : [];
    const proposedBy: Record<string, string> = {};
    for (const c of conclusions || []) proposedBy[c.id] = c.proposed_by_profile_id;

    for (const c of panelCases) {
      const proposer = proposedBy[c.readiness_conclusion_id];
      if (proposer && (c.panel_member_profile_ids || []).includes(proposer)) {
        findings.push({
          rule_key: "proposer_not_on_panel",
          rule_label: ruleLabel("proposer_not_on_panel"),
          severity: "violation",
          subject: `Calibration case ${c.id.slice(-6)}`,
          detail: "The person who proposed this readiness sits on the panel that calibrates it.",
          record_ids: [c.id, c.readiness_conclusion_id],
        });
      }
    }
  }

  const violations = findings.filter((f) => f.severity === "violation").length;
  return {
    findings,
    counts: {
      violations,
      observations: findings.length - violations,
      rules_evaluated: SOD_RULES.length,
    },
    evaluated_at: new Date().toISOString(),
  };
}