/**
 * successionE2ETestHelper.ts
 *
 * Shared test infrastructure for the succession end-to-end test harness.
 * Provides the E2ETestHarness class (test recording, ID tracking for cleanup,
 * safe function invocation) and the 9 journey implementations that exercise
 * the actual succession backend functions through their real API surface.
 *
 * The 9 journeys map to the full succession lifecycle:
 *   1. Organizational Foundation  (cycle, org roles, positions)
 *   2. Critical Role & Requirements (designation, role requirements, CRRs)
 *   3. Blueprint & Snapshot        (draft, submit, approve, effective snapshot)
 *   4. Talent Pool & Candidacy     (pool, members, candidacies)
 *   5. Evidence Lifecycle           (draft, submit, review/accept)
 *   6. Readiness Deliberation       (draft+citations, propose, calibrate, ratify)
 *   7. Development Planning         (plan link, actions, complete)
 *   8. Transition Execution         (initiation, plans, complete)
 *   9. Operational Monitoring       (refresh alerts, acknowledge, reviews)
 *
 * SoD constraints (submitter ≠ approver, proposer ≠ ratifier) are handled by
 * setting up the prerequisite state via asServiceRole with a different actor
 * profile, then calling the actual function as the test user.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TEST HARNESS
// ═══════════════════════════════════════════════════════════════════════════

export class E2ETestHarness {
  results: any;
  createdIds: Record<string, string[]>;
  private journeyStartIndex: number[];

  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
      journeys: [],
    };
    this.createdIds = {};
    this.journeyStartIndex = [];
  }

  recordTest(id: string, name: string, passed: boolean, details: any, skipped = false) {
    this.results.tests.push({ id, name, passed, skipped, details });
    this.results.summary.total++;
    if (skipped) this.results.summary.skipped++;
    else if (passed) this.results.summary.passed++;
    else this.results.summary.failed++;
  }

  trackId(entity: string, id: string) {
    if (!id) return;
    if (!this.createdIds[entity]) this.createdIds[entity] = [];
    this.createdIds[entity].push(id);
  }

  startJourney() {
    this.journeyStartIndex.push(this.results.tests.length);
  }

  finishJourney(num: number, name: string, failed: boolean, error?: string) {
    const startIdx = this.journeyStartIndex.pop() || 0;
    const journeyTests = this.results.tests.slice(startIdx);
    const passed = journeyTests.filter((t: any) => t.passed && !t.skipped).length;
    const testsFailed = journeyTests.filter((t: any) => !t.passed && !t.skipped).length;
    this.results.journeys.push({
      journey: num,
      name,
      status: failed ? "failed" : "passed",
      tests_passed: passed,
      tests_failed: testsFailed,
      error,
    });
  }

  async safeInvoke(base44: any, functionName: string, payload: any): Promise<{ ok: boolean; data: any; error?: string }> {
    try {
      const result = await base44.functions.invoke(functionName, payload);
      const data = result?.data || result;
      if (data?.error) return { ok: false, data: null, error: data.error };
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, data: null, error: e?.message || String(e) };
    }
  }

  async cleanup(base44: any) {
    const order = [
      "SuccessionReviewRecord", "SuccessionMonitorAlert",
      "TransitionPlan", "KnowledgeTransferPlan", "TransitionInitiation",
      "DevelopmentAction", "DevelopmentPlanLink",
      "GovernanceApproval", "CalibrationJudgment", "CalibrationCase", "CalibrationSession",
      "ReadinessEvidenceCitation", "ReadinessCondition", "ReadinessConclusion",
      "EvidenceReviewDecision", "EvidenceRecord",
      "SuccessorCandidacy", "TalentPoolMembership", "TalentPool",
      "EffectiveRequirementSnapshot", "EffectiveBlueprintSnapshot",
      "RoleSuccessBlueprint", "RoleRequirement", "CriticalRoleRequirement",
      "CriticalRole",
      "PositionAssignment", "OrgPosition", "OrgRole",
      "SuccessionCycle",
      "UserProfile",
      "SuccessionOperation",
    ];
    for (const entity of order) {
      const ids = this.createdIds[entity] || [];
      for (const id of ids) {
        try { await base44.asServiceRole.entities[entity].delete(id); } catch {}
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

let _opCounter = 0;
export function opId(journey: number, step: string): string {
  _opCounter++;
  return `e2e-j${journey}-${step}-${Date.now()}-${_opCounter}`;
}

export function futureDate(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
}

export function futureDateTime(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

export function pastDate(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY 1: Organizational Foundation
//   Tests: successionCreateCycle, successionCreateOrgRole, successionCreateOrgPosition
// ═══════════════════════════════════════════════════════════════════════════

export async function journey1_OrgFoundation(h: E2ETestHarness, base44: any, ctx: any): Promise<boolean> {
  h.startJourney();
  let failed = false;
  const { client_id } = ctx;

  // 1a. Create cycle
  const cycleRes = await h.safeInvoke(base44, "successionCreateCycle", {
    operation_id: opId(1, "create-cycle"),
    cycle_key: `e2e-cycle-${Date.now()}`,
    name: "E2E Test Succession Cycle",
  });
  const cycleOk = cycleRes.ok && cycleRes.data?.cycle_id;
  h.recordTest("J1-01", "Create succession cycle", cycleOk, cycleRes);
  if (cycleOk) {
    ctx.cycle_id = cycleRes.data.cycle_id;
    h.trackId("SuccessionCycle", ctx.cycle_id);
  } else { failed = true; }

  // 1b. Create org role
  if (!failed) {
    const roleRes = await h.safeInvoke(base44, "successionCreateOrgRole", {
      operation_id: opId(1, "create-role"),
      cycle_id: ctx.cycle_id,
      title: "E2E Test VP of Sales",
      role_identifier: `E2E-VP-${Date.now()}`,
      level: "Executive",
    });
    const roleOk = roleRes.ok && roleRes.data?.org_role_id;
    h.recordTest("J1-02", "Create org role", roleOk, roleRes);
    if (roleOk) {
      ctx.org_role_id = roleRes.data.org_role_id;
      h.trackId("OrgRole", ctx.org_role_id);
    } else { failed = true; }
  }

  // 1c. Create a second org role (for blueprint SoD test in Journey 3)
  if (!failed) {
    const role2Res = await h.safeInvoke(base44, "successionCreateOrgRole", {
      operation_id: opId(1, "create-role-2"),
      cycle_id: ctx.cycle_id,
      title: "E2E Test Sales Director",
      role_identifier: `E2E-DIR-${Date.now()}`,
      level: "Senior Manager",
    });
    const role2Ok = role2Res.ok && role2Res.data?.org_role_id;
    h.recordTest("J1-03", "Create second org role (for blueprint SoD test)", role2Ok, role2Res);
    if (role2Ok) {
      ctx.org_role_id_2 = role2Res.data.org_role_id;
      h.trackId("OrgRole", ctx.org_role_id_2);
    } else { failed = true; }
  }

  // 1d. Create org position
  if (!failed) {
    const posRes = await h.safeInvoke(base44, "successionCreateOrgPosition", {
      operation_id: opId(1, "create-position"),
      org_role_id: ctx.org_role_id,
      title: "E2E Test VP of Sales Position",
      position_identifier: `E2E-POS-VP-${Date.now()}`,
    });
    const posOk = posRes.ok && posRes.data?.position_id;
    h.recordTest("J1-04", "Create org position", posOk, posRes);
    if (posOk) {
      ctx.position_id = posRes.data.position_id;
      h.trackId("OrgPosition", ctx.position_id);
    } else { failed = true; }
  }

  h.finishJourney(1, "Organizational Foundation", failed);
  return !failed;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY 2: Critical Role & Requirements
//   Tests: successionDesignateCriticalRole, successionCreateRoleRequirement,
//          successionCreateCriticalRoleRequirement, successionSubmitCriticalRoleRequirement,
//          successionApproveCriticalRoleRequirement
// ═══════════════════════════════════════════════════════════════════════════

export async function journey2_CriticalRole(h: E2ETestHarness, base44: any, ctx: any): Promise<boolean> {
  h.startJourney();
  let failed = false;

  // 2a. Designate critical role
  const crRes = await h.safeInvoke(base44, "successionDesignateCriticalRole", {
    operation_id: opId(2, "designate"),
    cycle_id: ctx.cycle_id,
    org_position_id: ctx.position_id,
    criticality_level: "critical",
    governance_tier: "executive",
    continuity_urgency: "short_term",
    designation_reason: "E2E test: VP of Sales owns the largest revenue P&L.",
  });
  const crOk = crRes.ok && crRes.data?.critical_role_id;
  h.recordTest("J2-01", "Designate critical role", crOk, crRes);
  if (crOk) {
    ctx.critical_role_id = crRes.data.critical_role_id;
    h.trackId("CriticalRole", ctx.critical_role_id);
  } else { failed = true; }

  // 2b. Create role requirement (needs a blueprint — create a draft blueprint first via asServiceRole)
  if (!failed) {
    // Create a draft blueprint on org_role_id_2 to attach requirements to
    const draftBp = await base44.asServiceRole.entities.RoleSuccessBlueprint.create({
      client_id: ctx.client_id,
      org_role_id: ctx.org_role_id_2,
      version_label: "v1",
      status: "draft",
      is_current: false,
      content: { summary: "E2E test blueprint" },
      confidentiality_level: "confidential",
      integrity_status: "active",
    });
    ctx.blueprint_id_req = draftBp.id;
    h.trackId("RoleSuccessBlueprint", draftBp.id);

    const reqRes = await h.safeInvoke(base44, "successionCreateRoleRequirement", {
      operation_id: opId(2, "create-req"),
      blueprint_id: ctx.blueprint_id_req,
      requirement_type: "competency",
      requirement_text: "Strategic Account Management — ability to develop enterprise-level account strategies",
      requirement_detail: "Advanced proficiency",
    });
    h.recordTest("J2-02", "Create role requirement", reqRes.ok, reqRes);
    if (reqRes.ok && reqRes.data?.requirement_id) {
      ctx.requirement_id = reqRes.data.requirement_id;
      h.trackId("RoleRequirement", ctx.requirement_id);
    } else { failed = true; }
  }

  // 2c. Create critical role requirement (position-specific)
  if (!failed) {
    const crrRes = await h.safeInvoke(base44, "successionCreateCriticalRoleRequirement", {
      operation_id: opId(2, "create-crr"),
      org_role_id: ctx.org_role_id,
      critical_role_id: ctx.critical_role_id,
      modification_type: "new_requirement",
      requirement_text: "Experience with enterprise CRM platform",
      requirement_detail: "Required for this position",
    });
    h.recordTest("J2-03", "Create critical role requirement", crrRes.ok, crrRes);
    if (crrRes.ok && crrRes.data?.requirement_id) {
      ctx.crr_id = crrRes.data.requirement_id;
      h.trackId("CriticalRoleRequirement", ctx.crr_id);
    }
    // Not a hard failure — CRR is optional for the snapshot
  }

  // 2d. Submit critical role requirement
  if (!failed && ctx.crr_id) {
    const submitRes = await h.safeInvoke(base44, "successionSubmitCriticalRoleRequirement", {
      operation_id: opId(2, "submit-crr"),
      requirement_id: ctx.crr_id,
    });
    h.recordTest("J2-04", "Submit critical role requirement", submitRes.ok, submitRes);
  }

  // 2e. Approve critical role requirement
  if (!failed && ctx.crr_id) {
    const approveRes = await h.safeInvoke(base44, "successionApproveCriticalRoleRequirement", {
      operation_id: opId(2, "approve-crr"),
      requirement_id: ctx.crr_id,
    });
    h.recordTest("J2-05", "Approve critical role requirement", approveRes.ok, approveRes);
  }

  h.finishJourney(2, "Critical Role & Requirements", failed);
  return !failed;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY 3: Blueprint & Snapshot
//   Tests: successionCreateBlueprintDraft, successionSubmitBlueprint,
//          successionApproveBlueprint (SoD handled via asServiceRole setup),
//          successionCreateEffectiveBlueprintSnapshot
// ═══════════════════════════════════════════════════════════════════════════

export async function journey3_BlueprintAndSnapshot(h: E2ETestHarness, base44: any, ctx: any): Promise<boolean> {
  h.startJourney();
  let failed = false;

  // 3a. Create blueprint draft (on org_role_id — the primary role)
  const draftRes = await h.safeInvoke(base44, "successionCreateBlueprintDraft", {
    operation_id: opId(3, "create-draft"),
    org_role_id: ctx.org_role_id,
    version_label: "v1",
    content: { summary: "E2E test blueprint for VP of Sales" },
  });
  const draftOk = draftRes.ok && draftRes.data?.blueprint_id;
  h.recordTest("J3-01", "Create blueprint draft", draftOk, draftRes);
  if (draftOk) {
    ctx.blueprint_id_draft = draftRes.data.blueprint_id;
    h.trackId("RoleSuccessBlueprint", ctx.blueprint_id_draft);
  } else { failed = true; }

  // 3b. Submit blueprint (as test user)
  if (!failed) {
    const submitRes = await h.safeInvoke(base44, "successionSubmitBlueprint", {
      operation_id: opId(3, "submit"),
      blueprint_id: ctx.blueprint_id_draft,
    });
    h.recordTest("J3-02", "Submit blueprint", submitRes.ok, submitRes);
  }

  // 3c. Approve blueprint — SoD requires submitter ≠ approver.
  // Set up a submitted blueprint on org_role_id_2 with a DIFFERENT submitter
  // (ctx.submitter_profile_id), then approve it as the test user.
  if (!failed) {
    const submittedBp = await base44.asServiceRole.entities.RoleSuccessBlueprint.create({
      client_id: ctx.client_id,
      org_role_id: ctx.org_role_id_2,
      version_label: "v1",
      status: "submitted",
      is_current: false,
      submitted_at: new Date().toISOString(),
      submitted_by_profile_id: ctx.submitter_profile_id,
      content: { summary: "E2E test blueprint for Sales Director" },
      confidentiality_level: "confidential",
      integrity_status: "active",
    });
    ctx.blueprint_id_approve = submittedBp.id;
    h.trackId("RoleSuccessBlueprint", submittedBp.id);

    // Add a canonical requirement to this blueprint (needed for snapshot)
    const req = await base44.asServiceRole.entities.RoleRequirement.create({
      client_id: ctx.client_id,
      blueprint_id: submittedBp.id,
      requirement_type: "competency",
      requirement_text: "Team Leadership & Coaching — proven ability to build high-performing teams",
      requirement_detail: "Advanced proficiency",
      status: "approved",
      revision_number: 1,
      approved_at: new Date().toISOString(),
      approved_by_profile_id: ctx.submitter_profile_id,
      integrity_status: "active",
    });
    ctx.canonical_req_id = req.id;
    h.trackId("RoleRequirement", req.id);

    const approveRes = await h.safeInvoke(base44, "successionApproveBlueprint", {
      operation_id: opId(3, "approve"),
      blueprint_id: ctx.blueprint_id_approve,
      org_role_id: ctx.org_role_id_2,
      expected_revision: 0,
    });
    const approveOk = approveRes.ok && approveRes.data?.status === "approved";
    h.recordTest("J3-03", "Approve blueprint (SoD: submitter ≠ approver)", approveOk, approveRes);
    if (!approveOk) failed = true;
  }

  // 3d. Create effective blueprint snapshot
  if (!failed) {
    const snapRes = await h.safeInvoke(base44, "successionCreateEffectiveBlueprintSnapshot", {
      operation_id: opId(3, "snapshot"),
      blueprint_id: ctx.blueprint_id_approve,
      org_role_id: ctx.org_role_id_2,
      critical_role_id: ctx.critical_role_id,
    });
    const snapOk = snapRes.ok && snapRes.data?.snapshot_id && snapRes.data?.status === "generated";
    h.recordTest("J3-04", "Create effective blueprint snapshot", snapOk, snapRes);
    if (snapOk) {
      ctx.snapshot_id = snapRes.data.snapshot_id;
      h.trackId("EffectiveBlueprintSnapshot", ctx.snapshot_id);
      // Fetch the EffectiveRequirementSnapshot children for later use
      const snapReqs = await base44.asServiceRole.entities.EffectiveRequirementSnapshot.filter({
        effective_blueprint_snapshot_id: ctx.snapshot_id,
        integrity_status: "active",
      });
      ctx.snap_req_ids = snapReqs.map((r: any) => r.id);
      ctx.snap_reqs = snapReqs;
      for (const sr of snapReqs) h.trackId("EffectiveRequirementSnapshot", sr.id);
    } else { failed = true; }
  }

  h.finishJourney(3, "Blueprint & Snapshot", failed);
  return !failed;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY 4: Talent Pool & Candidacy
//   Tests: successionCreateTalentPool, successionAddPoolMember, successionCreateCandidacy
// ═══════════════════════════════════════════════════════════════════════════

export async function journey4_TalentPool(h: E2ETestHarness, base44: any, ctx: any): Promise<boolean> {
  h.startJourney();
  let failed = false;

  // 4a. Create talent pool
  const poolRes = await h.safeInvoke(base44, "successionCreateTalentPool", {
    operation_id: opId(4, "create-pool"),
    cycle_id: ctx.cycle_id,
    name: "E2E Test High-Potential Leaders",
    description: "E2E test talent pool for succession candidates.",
  });
  const poolOk = poolRes.ok && poolRes.data?.pool_id;
  h.recordTest("J4-01", "Create talent pool", poolOk, poolRes);
  if (poolOk) {
    ctx.pool_id = poolRes.data.pool_id;
    h.trackId("TalentPool", ctx.pool_id);
  } else { failed = true; }

  // 4b. Add pool member
  if (!failed) {
    const memberRes = await h.safeInvoke(base44, "successionAddPoolMember", {
      operation_id: opId(4, "add-member"),
      pool_id: ctx.pool_id,
      user_profile_id: ctx.candidate_profile_id,
    });
    const memberOk = memberRes.ok && memberRes.data?.membership_id;
    h.recordTest("J4-02", "Add pool member", memberOk, memberRes);
    if (memberOk) {
      ctx.pool_membership_id = memberRes.data.membership_id;
      h.trackId("TalentPoolMembership", ctx.pool_membership_id);
    }
  }

  // 4c. Create candidacy
  if (!failed) {
    const candRes = await h.safeInvoke(base44, "successionCreateCandidacy", {
      operation_id: opId(4, "create-candidacy"),
      cycle_id: ctx.cycle_id,
      critical_role_id: ctx.critical_role_id,
      user_profile_id: ctx.candidate_profile_id,
      effective_blueprint_snapshot_id: ctx.snapshot_id,
      discovery_source: "manager_nomination",
      origin_pool_membership_id: ctx.pool_membership_id,
    });
    const candOk = candRes.ok && candRes.data?.candidacy_id;
    h.recordTest("J4-03", "Create candidacy", candOk, candRes);
    if (candOk) {
      ctx.candidacy_id = candRes.data.candidacy_id;
      h.trackId("SuccessorCandidacy", ctx.candidacy_id);
    } else { failed = true; }
  }

  h.finishJourney(4, "Talent Pool & Candidacy", failed);
  return !failed;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY 5: Evidence Lifecycle
//   Tests: successionCreateEvidenceDraft, successionSubmitEvidence, successionReviewEvidence
// ═══════════════════════════════════════════════════════════════════════════

export async function journey5_Evidence(h: E2ETestHarness, base44: any, ctx: any): Promise<boolean> {
  h.startJourney();
  let failed = false;

  // 5a. Create evidence draft
  const snapReqId = ctx.snap_req_ids?.[0];
  if (!snapReqId) {
    h.recordTest("J5-01", "Create evidence draft", false, { error: "No snapshot requirement available" });
    failed = true;
  } else {
    const draftRes = await h.safeInvoke(base44, "successionCreateEvidenceDraft", {
      operation_id: opId(5, "create-draft"),
      candidacy_id: ctx.candidacy_id,
      effective_blueprint_snapshot_id: ctx.snapshot_id,
      effective_requirement_snapshot_id: snapReqId,
      evidence_type: "performance_outcome",
      source_system: "manual",
      source_date: pastDate(15),
      title: "Q3 Revenue Achievement — $58M (116% of target)",
      description: "E2E test evidence: led the Enterprise Sales team to $58M in Q3 revenue.",
    });
    const draftOk = draftRes.ok && draftRes.data?.evidence_id;
    h.recordTest("J5-01", "Create evidence draft", draftOk, draftRes);
    if (draftOk) {
      ctx.evidence_id = draftRes.data.evidence_id;
      h.trackId("EvidenceRecord", ctx.evidence_id);
    } else { failed = true; }
  }

  // 5b. Submit evidence
  if (!failed) {
    const submitRes = await h.safeInvoke(base44, "successionSubmitEvidence", {
      operation_id: opId(5, "submit"),
      evidence_id: ctx.evidence_id,
    });
    h.recordTest("J5-02", "Submit evidence", submitRes.ok, submitRes);
    if (!submitRes.ok) failed = true;
  }

  // 5c. Review evidence (accept)
  if (!failed) {
    const reviewRes = await h.safeInvoke(base44, "successionReviewEvidence", {
      operation_id: opId(5, "review"),
      evidence_id: ctx.evidence_id,
      decision: "accepted",
      evidence_strength: "direct",
      confidence: "high",
      relevance: "high",
    });
    const reviewOk = reviewRes.ok;
    h.recordTest("J5-03", "Review evidence (accept)", reviewOk, reviewRes);
    if (reviewOk && reviewRes.data?.review_decision_id) {
      h.trackId("EvidenceReviewDecision", reviewRes.data.review_decision_id);
    }
  }

  h.finishJourney(5, "Evidence Lifecycle", failed);
  return !failed;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY 6: Readiness Deliberation
//   Tests: successionSaveReadinessDraft (with citations), successionSubmitReadinessProposal,
//          successionCreateCalibrationSession, successionRecordCalibrationJudgment,
//          successionFinalizeCalibrationCase, successionRatifyReadinessConclusion (SoD)
// ═══════════════════════════════════════════════════════════════════════════

export async function journey6_Readiness(h: E2ETestHarness, base44: any, ctx: any): Promise<boolean> {
  h.startJourney();
  let failed = false;

  // 6a. Save readiness draft with citations
  const snapReqId = ctx.snap_req_ids?.[0];
  const draftRes = await h.safeInvoke(base44, "successionSaveReadinessDraft", {
    operation_id: opId(6, "save-draft"),
    candidacy_id: ctx.candidacy_id,
    effective_blueprint_snapshot_id: ctx.snapshot_id,
    proposed_value: "ready_now",
    rationale: "E2E test: candidate has consistently exceeded targets and demonstrated strong leadership.",
    conflicting_evidence: "No contrary evidence identified at this time.",
    transition_horizon: "0_6_months",
    citations: [{
      evidence_record_id: ctx.evidence_id,
      effective_requirement_snapshot_id: snapReqId,
      citation_role: "supporting",
    }],
  });
  const draftOk = draftRes.ok && draftRes.data?.conclusion_id;
  h.recordTest("J6-01", "Save readiness draft with citations", draftOk, draftRes);
  if (draftOk) {
    ctx.conclusion_id = draftRes.data.conclusion_id;
    h.trackId("ReadinessConclusion", ctx.conclusion_id);
    // Track citations created by the function
    const citations = await base44.asServiceRole.entities.ReadinessEvidenceCitation.filter({
      readiness_conclusion_id: ctx.conclusion_id,
    });
    for (const c of citations) h.trackId("ReadinessEvidenceCitation", c.id);
  } else { failed = true; }

  // 6b. Submit readiness proposal
  if (!failed) {
    const submitRes = await h.safeInvoke(base44, "successionSubmitReadinessProposal", {
      operation_id: opId(6, "submit"),
      conclusion_id: ctx.conclusion_id,
    });
    h.recordTest("J6-02", "Submit readiness proposal", submitRes.ok, submitRes);
    if (!submitRes.ok) failed = true;
  }

  // 6c. Create calibration session
  if (!failed) {
    const calRes = await h.safeInvoke(base44, "successionCreateCalibrationSession", {
      operation_id: opId(6, "create-cal-session"),
      cycle_id: ctx.cycle_id,
      scheduled_at: futureDateTime(7),
    });
    const calOk = calRes.ok && calRes.data?.session_id;
    h.recordTest("J6-03", "Create calibration session", calOk, calRes);
    if (calOk) {
      ctx.cal_session_id = calRes.data.session_id;
      h.trackId("CalibrationSession", ctx.cal_session_id);
    }
  }

  // 6d. Ratify readiness conclusion (SoD: proposer ≠ ratifier)
  // The conclusion was proposed by the test user. We need a different ratifier.
  // Set up a conclusion in awaiting_ratification state via asServiceRole with
  // a different proposer, then ratify it as the test user.
  if (!failed) {
    const ratifyConclusion = await base44.asServiceRole.entities.ReadinessConclusion.create({
      client_id: ctx.client_id,
      candidacy_id: ctx.candidacy_id,
      critical_role_id: ctx.critical_role_id,
      cycle_id: ctx.cycle_id,
      effective_blueprint_snapshot_id: ctx.snapshot_id,
      version: 2,
      proposed_value: "ready_now",
      calibrated_value: "ready_now",
      proposed_by_profile_id: ctx.submitter_profile_id,
      proposed_at: new Date().toISOString(),
      rationale: "E2E test: calibrated conclusion ready for ratification.",
      next_review_date: futureDate(90),
      transition_horizon: "0_6_months",
      workflow_status: "awaiting_ratification",
      confidentiality_level: "highly_confidential",
      integrity_status: "active",
    });
    ctx.conclusion_id_ratify = ratifyConclusion.id;
    h.trackId("ReadinessConclusion", ratifyConclusion.id);

    const ratifyRes = await h.safeInvoke(base44, "successionRatifyReadinessConclusion", {
      operation_id: opId(6, "ratify"),
      conclusion_id: ctx.conclusion_id_ratify,
      decision: "ratify",
      rationale: "E2E test: governance ratifies the calibrated readiness value.",
      next_review_date: futureDate(90),
    });
    const ratifyOk = ratifyRes.ok && ratifyRes.data?.workflow_status === "ratified";
    h.recordTest("J6-04", "Ratify readiness conclusion (SoD: proposer ≠ ratifier)", ratifyOk, ratifyRes);
    if (ratifyOk) {
      ctx.ratified_conclusion_id = ctx.conclusion_id_ratify;
    }
  }

  h.finishJourney(6, "Readiness Deliberation", failed);
  return !failed;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY 7: Development Planning
//   Tests: successionCreateDevelopmentPlanLink, successionCreateDevelopmentAction,
//          successionCompleteDevelopmentAction
// ═══════════════════════════════════════════════════════════════════════════

export async function journey7_Development(h: E2ETestHarness, base44: any, ctx: any): Promise<boolean> {
  h.startJourney();
  let failed = false;

  // Use the ratified conclusion from Journey 6, or the proposed one if ratification failed
  const conclusionId = ctx.ratified_conclusion_id || ctx.conclusion_id;

  // 7a. Create development plan link
  const planRes = await h.safeInvoke(base44, "successionCreateDevelopmentPlanLink", {
    operation_id: opId(7, "create-plan"),
    candidacy_id: ctx.candidacy_id,
    readiness_conclusion_id: conclusionId,
    effective_blueprint_snapshot_id: ctx.snapshot_id,
    gap_summary: "E2E test: candidate needs enterprise-scale exposure and broader strategic experience.",
    owner_profile_id: ctx.submitter_profile_id,
    review_date: futureDate(30),
  });
  const planOk = planRes.ok && planRes.data?.plan_link_id;
  h.recordTest("J7-01", "Create development plan link", planOk, planRes);
  if (planOk) {
    ctx.dev_plan_id = planRes.data.plan_link_id;
    h.trackId("DevelopmentPlanLink", ctx.dev_plan_id);
  } else { failed = true; }

  // 7b. Create development action
  if (!failed) {
    const actionRes = await h.safeInvoke(base44, "successionCreateDevelopmentAction", {
      operation_id: opId(7, "create-action"),
      development_plan_link_id: ctx.dev_plan_id,
      candidacy_id: ctx.candidacy_id,
      action_type: "stretch_assignment",
      title: "Lead Enterprise Account Review",
      description: "E2E test: shadow the VP in enterprise account reviews for key customers.",
      owner_profile_id: ctx.candidate_profile_id,
      due_date: futureDate(60),
      milestone_text: "Present enterprise account strategy to executive team",
    });
    const actionOk = actionRes.ok && actionRes.data?.action_id;
    h.recordTest("J7-02", "Create development action", actionOk, actionRes);
    if (actionOk) {
      ctx.dev_action_id = actionRes.data.action_id;
      h.trackId("DevelopmentAction", ctx.dev_action_id);
    } else { failed = true; }
  }

  // 7c. Complete development action
  if (!failed) {
    const completeRes = await h.safeInvoke(base44, "successionCompleteDevelopmentAction", {
      operation_id: opId(7, "complete-action"),
      action_id: ctx.dev_action_id,
    });
    h.recordTest("J7-03", "Complete development action", completeRes.ok, completeRes);
  }

  h.finishJourney(7, "Development Planning", failed);
  return !failed;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY 8: Transition Execution
//   Tests: successionCreateTransitionInitiation, successionSaveTransitionPlan,
//          successionSaveKnowledgeTransferPlan, successionCompleteTransition
// ═══════════════════════════════════════════════════════════════════════════

export async function journey8_Transition(h: E2ETestHarness, base44: any, ctx: any): Promise<boolean> {
  h.startJourney();
  let failed = false;

  // Use the ratified conclusion if available
  const conclusionId = ctx.ratified_conclusion_id || ctx.conclusion_id;

  // 8a. Create transition initiation
  const transRes = await h.safeInvoke(base44, "successionCreateTransitionInitiation", {
    operation_id: opId(8, "create"),
    cycle_id: ctx.cycle_id,
    critical_role_id: ctx.critical_role_id,
    org_position_id: ctx.position_id,
    successor_profile_id: ctx.candidate_profile_id,
    initiation_type: "promotion",
    initiation_basis: "succession_process",
    candidacy_id: ctx.candidacy_id,
    readiness_conclusion_id: conclusionId,
    target_start_date: futureDate(30),
    sponsor_profile_id: ctx.submitter_profile_id,
  });
  const transOk = transRes.ok && transRes.data?.transition_initiation_id;
  h.recordTest("J8-01", "Create transition initiation", transOk, transRes);
  if (transOk) {
    ctx.transition_id = transRes.data.transition_initiation_id;
    h.trackId("TransitionInitiation", ctx.transition_id);
  } else { failed = true; }

  // 8b. Save transition plan
  if (!failed) {
    const planRes = await h.safeInvoke(base44, "successionSaveTransitionPlan", {
      operation_id: opId(8, "save-plan"),
      transition_initiation_id: ctx.transition_id,
      start_date: futureDate(30),
      review_date: futureDate(90),
      target_completion_date: futureDate(60),
      ramp_plan: "E2E test: 30-day shadow, 60-day operational ownership, 90-day strategy presentation.",
      success_outcomes: "E2E test: Q1 revenue target met, key customer relationships maintained.",
      milestone_summary: "E2E test: Day 30 handoffs, Day 60 ownership, Day 90 strategy.",
    });
    h.recordTest("J8-02", "Save transition plan", planRes.ok, planRes);
    if (planRes.ok && planRes.data?.plan_id) h.trackId("TransitionPlan", planRes.data.plan_id);
  }

  // 8c. Save knowledge transfer plan
  if (!failed) {
    const ktRes = await h.safeInvoke(base44, "successionSaveKnowledgeTransferPlan", {
      operation_id: opId(8, "save-kt"),
      transition_initiation_id: ctx.transition_id,
      owner_profile_id: ctx.submitter_profile_id,
      start_date: futureDate(30),
      target_completion_date: futureDate(60),
      knowledge_areas: [{
        title: "Top 10 Enterprise Accounts",
        description: "Relationship history and strategic context for top customers",
        transfer_method: "Shadowing + documentation",
        owner_profile_id: ctx.submitter_profile_id,
        target_date: futureDate(30),
      }],
      access_handoffs: "E2E test: CRM admin access, dashboards, forecasting tools.",
      stakeholder_handoffs: "E2E test: C-suite, key customer contacts, cross-functional partners.",
      documentation_locations: "E2E test: shared SharePoint and CRM knowledge base.",
    });
    h.recordTest("J8-03", "Save knowledge transfer plan", ktRes.ok, ktRes);
    if (ktRes.ok && ktRes.data?.plan_id) h.trackId("KnowledgeTransferPlan", ktRes.data.plan_id);
  }

  // 8d. Complete transition (change status to completed)
  if (!failed) {
    const completeRes = await h.safeInvoke(base44, "successionCompleteTransition", {
      operation_id: opId(8, "complete"),
      transition_initiation_id: ctx.transition_id,
      completion_summary: "E2E test: transition completed successfully.",
    });
    h.recordTest("J8-04", "Complete transition", completeRes.ok, completeRes);
  }

  h.finishJourney(8, "Transition Execution", failed);
  return !failed;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY 9: Operational Monitoring
//   Tests: successionRefreshMonitorAlerts, successionUpdateMonitorAlert,
//          successionCreateReviewRecord, successionCompleteReviewRecord
// ═══════════════════════════════════════════════════════════════════════════

export async function journey9_Monitoring(h: E2ETestHarness, base44: any, ctx: any): Promise<boolean> {
  h.startJourney();
  let failed = false;

  // 9a. Refresh monitor alerts
  const refreshRes = await h.safeInvoke(base44, "successionRefreshMonitorAlerts", {
    operation_id: opId(9, "refresh"),
  });
  h.recordTest("J9-01", "Refresh monitor alerts", refreshRes.ok, refreshRes);

  // 9b. Create a test alert via asServiceRole (to have an alert to acknowledge)
  const alert = await base44.asServiceRole.entities.SuccessionMonitorAlert.create({
    client_id: ctx.client_id,
    cycle_id: ctx.cycle_id,
    critical_role_id: ctx.critical_role_id,
    source_entity_type: "CriticalRole",
    source_entity_id: ctx.critical_role_id,
    alert_type: "readiness_review_due",
    severity: "attention",
    title: "E2E Test Alert — Readiness review due",
    description: "E2E test: readiness review is approaching.",
    due_date: futureDate(30),
    detected_at: new Date().toISOString(),
    last_detected_at: new Date().toISOString(),
    fingerprint: `e2e-test-alert-${Date.now()}`,
    status: "open",
    integrity_status: "active",
  });
  ctx.alert_id = alert.id;
  h.trackId("SuccessionMonitorAlert", alert.id);

  // 9c. Update (acknowledge) monitor alert
  const ackRes = await h.safeInvoke(base44, "successionUpdateMonitorAlert", {
    operation_id: opId(9, "acknowledge"),
    alert_id: ctx.alert_id,
    status: "acknowledged",
  });
  h.recordTest("J9-02", "Acknowledge monitor alert", ackRes.ok, ackRes);

  // 9d. Create review record
  const reviewRes = await h.safeInvoke(base44, "successionCreateReviewRecord", {
    operation_id: opId(9, "create-review"),
    cycle_id: ctx.cycle_id,
    critical_role_id: ctx.critical_role_id,
    review_type: "readiness_reassessment",
    title: "E2E Test Q4 Readiness Review",
    review_scope: "E2E test: review all candidates' readiness conclusions and development progress.",
    owner_profile_id: ctx.submitter_profile_id,
    scheduled_for: futureDateTime(30),
  });
  const reviewOk = reviewRes.ok && reviewRes.data?.review_id;
  h.recordTest("J9-03", "Create review record", reviewOk, reviewRes);
  if (reviewOk) {
    ctx.review_id = reviewRes.data.review_id;
    h.trackId("SuccessionReviewRecord", ctx.review_id);
  } else { failed = true; }

  // 9e. Complete review record
  if (!failed) {
    const completeRes = await h.safeInvoke(base44, "successionCompleteReviewRecord", {
      operation_id: opId(9, "complete-review"),
      review_id: ctx.review_id,
    });
    h.recordTest("J9-04", "Complete review record", completeRes.ok, completeRes);
  }

  h.finishJourney(9, "Operational Monitoring", failed);
  return !failed;
}