import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * seedSuccessionDemoData — Creates a complete, realistic demo scenario for the
 * Succession Management module in an isolated demo tenant (Production DB).
 *
 * Demo scenario: "Acme Corp — VP of Sales Succession"
 *   - 3 candidates at different readiness stages (ratified, in calibration, proposed)
 *   - Full 9-stage lifecycle: cycle → roles → positions → critical role → blueprint →
 *     snapshot → candidacies → evidence → readiness → calibration → ratification →
 *     development → transition → monitor
 *
 * Idempotent: if demo data already exists, skips creation and just switches the
 * calling user's client_id to the demo tenant.
 *
 * Platform Admin only (PLATFORM_ADMIN_FULL_ACCESS must be enabled).
 */

const DEMO_CLIENT_ID = 'demo-acme-corp';
const DEMO_CLIENT_SLUG = 'demo-acme-corp';
const NOW = new Date().toISOString();
const TODAY = new Date().toISOString().split('T')[0];
const FUTURE_30D = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
const FUTURE_60D = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
const FUTURE_90D = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
const FUTURE_30D_DT = new Date(Date.now() + 30 * 86400000).toISOString();
// Date-only versions for format: "date" fields
const DATE_PAST_10D = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
const DATE_PAST_20D = new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0];
const DATE_PAST_30D = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
const DATE_PAST_60D = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];
const PAST_5D = new Date(Date.now() - 5 * 86400000).toISOString();
const PAST_7D = new Date(Date.now() - 7 * 86400000).toISOString();
const PAST_8D = new Date(Date.now() - 8 * 86400000).toISOString();
const PAST_10D = new Date(Date.now() - 10 * 86400000).toISOString();
const PAST_12D = new Date(Date.now() - 12 * 86400000).toISOString();
const PAST_15D = new Date(Date.now() - 15 * 86400000).toISOString();
const PAST_20D = new Date(Date.now() - 20 * 86400000).toISOString();
const PAST_25D = new Date(Date.now() - 25 * 86400000).toISOString();
const PAST_30D = new Date(Date.now() - 30 * 86400000).toISOString();
const PAST_40D = new Date(Date.now() - 40 * 86400000).toISOString();
const PAST_45D = new Date(Date.now() - 45 * 86400000).toISOString();
const PAST_50D = new Date(Date.now() - 50 * 86400000).toISOString();
const PAST_60D = new Date(Date.now() - 60 * 86400000).toISOString();

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const role = user.app_role || 'User Level 1';
    const isPlatformAdmin = role === 'Platform Admin' || role === 'Platform Administrator' || role === 'admin';
    if (!isPlatformAdmin) {
      return Response.json({ error: 'Only Platform Admin can seed demo data' }, { status: 403 });
    }

    // ── Check if demo data already exists ──────────────────────────────
    const existingCycles = await base44.asServiceRole.entities.SuccessionCycle.filter({ client_id: DEMO_CLIENT_ID }, '-created_date', 1);
    const demoExists = existingCycles.length > 0;

    let createdIds: any = {};

    if (!demoExists) {
      createdIds = await seedAllData(base44, user.id);
    }

    // ── Switch the calling user's client_id to the demo tenant ──────────
    const currentClientId = user.client_id || user.data?.client_id || null;
    const updateData: any = { client_id: DEMO_CLIENT_ID };
    if (currentClientId && currentClientId !== DEMO_CLIENT_ID) {
      updateData.original_client_id = currentClientId;
    }
    await base44.auth.updateMe(updateData);

    return Response.json({
      status: demoExists ? 'exists' : 'created',
      client_id: DEMO_CLIENT_ID,
      message: demoExists
        ? 'Demo data already loaded — switched your view to the demo tenant'
        : 'Demo data created and your view switched to the demo tenant',
      created: !demoExists,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function seedAllData(base44: any, adminProfileId: string): Promise<any> {
  const ids: any = {};

  // ── 1. Demo Client (tenant) ──────────────────────────────────────────
  let client = await base44.asServiceRole.entities.Client.filter({ slug: DEMO_CLIENT_SLUG }, '-created_date', 1);
  if (client.length > 0) {
    ids.client = client[0].id;
  } else {
    const created = await base44.asServiceRole.entities.Client.create({
      name: 'Acme Corp (DEMO)',
      slug: DEMO_CLIENT_SLUG,
      type: 'direct_customer',
      status: 'active',
      industry: 'Technology',
      company_size: '500-1000',
      contact_name: 'Jennifer Walsh (CHRO)',
      contact_email: 'jennifer.walsh@demo-acme.com',
      business_timezone: 'America/New_York',
      license_count: 50,
      seats_used: 7,
      onboarding_status: 'completed',
      notes: 'DEMO TENANT — Created for succession module demonstration. Not real data.',
    });
    ids.client = created.id;
  }

  // ── 2. UserProfiles (demo people) ───────────────────────────────────
  const profiles = await base44.asServiceRole.entities.UserProfile.bulkCreate([
    { tenant_id: DEMO_CLIENT_ID, email: 'sarah.chen@demo-acme.com', first_name: 'Sarah', last_name: 'Chen', department: 'Sales', status: 'ACTIVE', source_system: 'MANUAL' },
    { tenant_id: DEMO_CLIENT_ID, email: 'marcus.johnson@demo-acme.com', first_name: 'Marcus', last_name: 'Johnson', department: 'Sales', status: 'ACTIVE', source_system: 'MANUAL' },
    { tenant_id: DEMO_CLIENT_ID, email: 'priya.patel@demo-acme.com', first_name: 'Priya', last_name: 'Patel', department: 'Sales Operations', status: 'ACTIVE', source_system: 'MANUAL' },
    { tenant_id: DEMO_CLIENT_ID, email: 'jennifer.walsh@demo-acme.com', first_name: 'Jennifer', last_name: 'Walsh', department: 'Human Resources', status: 'ACTIVE', source_system: 'MANUAL' },
    { tenant_id: DEMO_CLIENT_ID, email: 'robert.kim@demo-acme.com', first_name: 'Robert', last_name: 'Kim', department: 'Operations', status: 'ACTIVE', source_system: 'MANUAL' },
    { tenant_id: DEMO_CLIENT_ID, email: 'lisa.anderson@demo-acme.com', first_name: 'Lisa', last_name: 'Anderson', department: 'Finance', status: 'ACTIVE', source_system: 'MANUAL' },
    { tenant_id: DEMO_CLIENT_ID, email: 'david.martinez@demo-acme.com', first_name: 'David', last_name: 'Martinez', department: 'Marketing', status: 'ACTIVE', source_system: 'MANUAL' },
  ]);
  ids.sarah = profiles[0].id;
  ids.marcus = profiles[1].id;
  ids.priya = profiles[2].id;
  ids.jennifer = profiles[3].id;
  ids.robert = profiles[4].id;
  ids.lisa = profiles[5].id;
  ids.david = profiles[6].id;

  // ── 3. SuccessionCycle ──────────────────────────────────────────────
  const cycle = await base44.asServiceRole.entities.SuccessionCycle.create({
    client_id: DEMO_CLIENT_ID,
    cycle_key: '2026-Q4-succession',
    name: '2026 Q4 Succession Cycle',
    status: 'active',
    process_stage: 'deliberate',
    process_stage_changed_at: PAST_10D,
    process_stage_changed_by_profile_id: ids.jennifer,
    started_at: PAST_60D,
    created_by_profile_id: ids.jennifer,
    integrity_status: 'active',
    confidentiality_level: 'confidential',
  });
  ids.cycle = cycle.id;

  // ── 4. OrgRoles ─────────────────────────────────────────────────────
  const roles = await base44.asServiceRole.entities.OrgRole.bulkCreate([
    { client_id: DEMO_CLIENT_ID, cycle_id: ids.cycle, title: 'VP of Sales', role_identifier: 'VP-SALES-001', level: 'Executive', status: 'active', integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, cycle_id: ids.cycle, title: 'Sales Director', role_identifier: 'DIR-SALES-001', level: 'Senior Manager', status: 'active', integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, cycle_id: ids.cycle, title: 'Regional Sales Manager', role_identifier: 'MGR-SALES-001', level: 'Mid-Level Manager', status: 'active', integrity_status: 'active' },
  ]);
  ids.roleVP = roles[0].id;
  ids.roleDirector = roles[1].id;
  ids.roleManager = roles[2].id;

  // ── 5. OrgPositions ────────────────────────────────────────────────
  const positions = await base44.asServiceRole.entities.OrgPosition.bulkCreate([
    { client_id: DEMO_CLIENT_ID, org_role_id: ids.roleVP, title: 'VP of Sales', position_identifier: 'POS-VP-SALES-001', is_active: true, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, org_role_id: ids.roleDirector, title: 'Sales Director — Enterprise', position_identifier: 'POS-DIR-ENT-001', is_active: true, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, org_role_id: ids.roleManager, title: 'Regional Sales Manager — West', position_identifier: 'POS-MGR-WEST-001', is_active: true, integrity_status: 'active' },
  ]);
  ids.posVP = positions[0].id;
  ids.posDirector = positions[1].id;
  ids.posManager = positions[2].id;

  // ── 6. RoleSuccessBlueprint (approved) ─────────────────────────────
  const blueprint = await base44.asServiceRole.entities.RoleSuccessBlueprint.create({
    client_id: DEMO_CLIENT_ID,
    org_role_id: ids.roleVP,
    version_label: 'v1',
    status: 'approved',
    is_current: true,
    submitted_at: PAST_60D,
    submitted_by_profile_id: ids.jennifer,
    approved_at: PAST_45D,
    approved_by_profile_id: ids.jennifer,
    content: {
      summary: 'Blueprint for VP of Sales — strategic sales leadership, team building, and revenue accountability.',
      competencies: ['Strategic Account Management', 'Team Leadership & Coaching', 'Executive Communication'],
      success_criteria: 'Consistent revenue growth, high-performing team, strong cross-functional partnerships.',
    },
    integrity_status: 'active',
    confidentiality_level: 'confidential',
  });
  ids.blueprint = blueprint.id;

  // Update OrgRole to reference the approved blueprint
  await base44.asServiceRole.entities.OrgRole.update(ids.roleVP, {
    current_blueprint_id: ids.blueprint,
    blueprint_approval_revision: 1,
  });

  // ── 7. RoleRequirements (5 canonical) ──────────────────────────────
  const reqs = await base44.asServiceRole.entities.RoleRequirement.bulkCreate([
    { client_id: DEMO_CLIENT_ID, blueprint_id: ids.blueprint, requirement_type: 'competency', requirement_text: 'Strategic Account Management — ability to develop and execute enterprise-level account strategies', requirement_detail: 'Advanced proficiency', status: 'approved', revision_number: 1, approved_at: PAST_45D, approved_by_profile_id: ids.jennifer, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, blueprint_id: ids.blueprint, requirement_type: 'competency', requirement_text: 'Team Leadership & Coaching — proven ability to build, develop, and retain high-performing sales teams', requirement_detail: 'Advanced proficiency', status: 'approved', revision_number: 1, approved_at: PAST_45D, approved_by_profile_id: ids.jennifer, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, blueprint_id: ids.blueprint, requirement_type: 'experience', requirement_text: '5+ years of enterprise sales leadership experience at director level or above', requirement_detail: 'Required', status: 'approved', revision_number: 1, approved_at: PAST_45D, approved_by_profile_id: ids.jennifer, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, blueprint_id: ids.blueprint, requirement_type: 'outcome', requirement_text: 'Track record of exceeding $50M+ annual revenue targets for 2+ consecutive years', requirement_detail: 'Required', status: 'approved', revision_number: 1, approved_at: PAST_45D, approved_by_profile_id: ids.jennifer, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, blueprint_id: ids.blueprint, requirement_type: 'competency', requirement_text: 'Executive Communication — ability to present sales strategy to C-suite and board stakeholders', requirement_detail: 'Advanced proficiency', status: 'approved', revision_number: 1, approved_at: PAST_45D, approved_by_profile_id: ids.jennifer, integrity_status: 'active' },
  ]);
  ids.req1 = reqs[0].id;
  ids.req2 = reqs[1].id;
  ids.req3 = reqs[2].id;
  ids.req4 = reqs[3].id;
  ids.req5 = reqs[4].id;

  // ── 8. CriticalRole (VP of Sales) ──────────────────────────────────
  const criticalRole = await base44.asServiceRole.entities.CriticalRole.create({
    client_id: DEMO_CLIENT_ID,
    cycle_id: ids.cycle,
    org_position_id: ids.posVP,
    criticality_level: 'critical',
    governance_tier: 'executive',
    continuity_urgency: 'short_term',
    designation_reason: 'VP of Sales owns the largest revenue P&L. Loss without a ready successor would directly impact quarterly targets and key customer relationships.',
    status: 'active',
    designated_by_profile_id: ids.jennifer,
    designated_at: PAST_50D,
    status_changed_at: PAST_45D,
    status_changed_by_profile_id: ids.jennifer,
    integrity_status: 'active',
    confidentiality_level: 'highly_confidential',
  });
  ids.criticalRole = criticalRole.id;

  // ── 9. CriticalRoleRequirement (1 position-specific) ───────────────
  const crr = await base44.asServiceRole.entities.CriticalRoleRequirement.create({
    client_id: DEMO_CLIENT_ID,
    org_role_id: ids.roleVP,
    critical_role_id: ids.criticalRole,
    modification_type: 'new_requirement',
    requirement_text: 'Experience with Acme\u2019s enterprise CRM platform (Salesforce) and sales tech stack',
    requirement_detail: 'Required for this position',
    status: 'approved',
    applicability_status: 'applicable',
    revision_number: 1,
    approved_at: PAST_40D,
    approved_by_profile_id: ids.jennifer,
    integrity_status: 'active',
  });
  ids.crr1 = crr.id;

  // ── 10. EffectiveBlueprintSnapshot ─────────────────────────────────
  const snapshot = await base44.asServiceRole.entities.EffectiveBlueprintSnapshot.create({
    client_id: DEMO_CLIENT_ID,
    org_role_id: ids.roleVP,
    critical_role_id: ids.criticalRole,
    blueprint_id: ids.blueprint,
    blueprint_revision: 1,
    status: 'generated',
    expected_requirement_count: 6,
    generated_requirement_count: 6,
    requirements_content_hash: 'demo-hash-' + Date.now(),
    generation_completed_at: PAST_40D,
    generated_at: PAST_40D,
    requirements_snapshot: [],
    integrity_status: 'active',
    confidentiality_level: 'highly_confidential',
  });
  ids.snapshot = snapshot.id;

  // ── 11. EffectiveRequirementSnapshots (6 frozen) ───────────────────
  const snapReqs = await base44.asServiceRole.entities.EffectiveRequirementSnapshot.bulkCreate([
    { client_id: DEMO_CLIENT_ID, effective_blueprint_snapshot_id: ids.snapshot, requirement_key: 'canonical-' + ids.req1, requirement_type: 'competency', source_type: 'canonical', source_requirement_id: ids.req1, modification_type: 'canonical', frozen_title: 'Strategic Account Management', frozen_description: 'Ability to develop and execute enterprise-level account strategies', effective_language: 'Strategic Account Management — ability to develop and execute enterprise-level account strategies', effective_level: 'Advanced proficiency', applicability_status: 'applicable', exception_approval_status: 'none', frozen_at: PAST_40D, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, effective_blueprint_snapshot_id: ids.snapshot, requirement_key: 'canonical-' + ids.req2, requirement_type: 'competency', source_type: 'canonical', source_requirement_id: ids.req2, modification_type: 'canonical', frozen_title: 'Team Leadership & Coaching', frozen_description: 'Proven ability to build, develop, and retain high-performing sales teams', effective_language: 'Team Leadership & Coaching — proven ability to build, develop, and retain high-performing sales teams', effective_level: 'Advanced proficiency', applicability_status: 'applicable', exception_approval_status: 'none', frozen_at: PAST_40D, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, effective_blueprint_snapshot_id: ids.snapshot, requirement_key: 'canonical-' + ids.req3, requirement_type: 'experience', source_type: 'canonical', source_requirement_id: ids.req3, modification_type: 'canonical', frozen_title: 'Enterprise Sales Leadership Experience', frozen_description: '5+ years at director level or above', effective_language: '5+ years of enterprise sales leadership experience at director level or above', effective_level: 'Required', applicability_status: 'applicable', exception_approval_status: 'none', frozen_at: PAST_40D, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, effective_blueprint_snapshot_id: ids.snapshot, requirement_key: 'canonical-' + ids.req4, requirement_type: 'outcome', source_type: 'canonical', source_requirement_id: ids.req4, modification_type: 'canonical', frozen_title: 'Revenue Target Achievement', frozen_description: 'Track record of exceeding $50M+ annual revenue targets', effective_language: 'Track record of exceeding $50M+ annual revenue targets for 2+ consecutive years', effective_level: 'Required', applicability_status: 'applicable', exception_approval_status: 'none', frozen_at: PAST_40D, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, effective_blueprint_snapshot_id: ids.snapshot, requirement_key: 'canonical-' + ids.req5, requirement_type: 'competency', source_type: 'canonical', source_requirement_id: ids.req5, modification_type: 'canonical', frozen_title: 'Executive Communication', frozen_description: 'Ability to present sales strategy to C-suite and board', effective_language: 'Executive Communication — ability to present sales strategy to C-suite and board stakeholders', effective_level: 'Advanced proficiency', applicability_status: 'applicable', exception_approval_status: 'none', frozen_at: PAST_40D, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, effective_blueprint_snapshot_id: ids.snapshot, requirement_key: 'position-' + ids.crr1, requirement_type: 'other', source_type: 'position_specific', source_requirement_id: ids.crr1, modification_type: 'new_requirement', frozen_title: 'Acme CRM Platform Experience', frozen_description: 'Experience with Acme\u2019s enterprise CRM platform', effective_language: 'Experience with Acme\u2019s enterprise CRM platform (Salesforce) and sales tech stack', effective_level: 'Required', applicability_status: 'applicable', exception_approval_status: 'none', frozen_at: PAST_40D, integrity_status: 'active' },
  ]);
  ids.snapReq1 = snapReqs[0].id;
  ids.snapReq2 = snapReqs[1].id;
  ids.snapReq3 = snapReqs[2].id;
  ids.snapReq4 = snapReqs[3].id;
  ids.snapReq5 = snapReqs[4].id;
  ids.snapReq6 = snapReqs[5].id;

  // ── 12. TalentPool ─────────────────────────────────────────────────
  const pool = await base44.asServiceRole.entities.TalentPool.create({
    client_id: DEMO_CLIENT_ID,
    cycle_id: ids.cycle,
    name: 'High-Potential Sales Leaders',
    description: 'Nominees identified as potential successors for VP of Sales and adjacent sales leadership roles.',
    status: 'active',
    created_by_profile_id: ids.jennifer,
    created_at: PAST_50D,
    integrity_status: 'active',
    confidentiality_level: 'confidential',
  });
  ids.pool = pool.id;

  // ── 13. SuccessorCandidacies (3 candidates) ───────────────────────
  const candidacies = await base44.asServiceRole.entities.SuccessorCandidacy.bulkCreate([
    { client_id: DEMO_CLIENT_ID, cycle_id: ids.cycle, critical_role_id: ids.criticalRole, user_profile_id: ids.sarah, effective_blueprint_snapshot_id: ids.snapshot, discovery_source: 'manager_nomination', nominated_by_profile_id: ids.jennifer, nominated_at: PAST_45D, status: 'active', integrity_status: 'active', confidentiality_level: 'highly_confidential' },
    { client_id: DEMO_CLIENT_ID, cycle_id: ids.cycle, critical_role_id: ids.criticalRole, user_profile_id: ids.marcus, effective_blueprint_snapshot_id: ids.snapshot, discovery_source: 'pool_nomination', nominated_by_profile_id: ids.jennifer, nominated_at: PAST_45D, status: 'active', integrity_status: 'active', confidentiality_level: 'highly_confidential' },
    { client_id: DEMO_CLIENT_ID, cycle_id: ids.cycle, critical_role_id: ids.criticalRole, user_profile_id: ids.priya, effective_blueprint_snapshot_id: ids.snapshot, discovery_source: 'hr_nomination', nominated_by_profile_id: ids.jennifer, nominated_at: PAST_30D, status: 'active', integrity_status: 'active', confidentiality_level: 'highly_confidential' },
  ]);
  ids.candSarah = candidacies[0].id;
  ids.candMarcus = candidacies[1].id;
  ids.candPriya = candidacies[2].id;

  // ── 14. EvidenceRecords (2 per candidate = 6 total) ───────────────
  const evidence = await base44.asServiceRole.entities.EvidenceRecord.bulkCreate([
    // Sarah Chen — strong evidence
    { client_id: DEMO_CLIENT_ID, candidacy_id: ids.candSarah, user_profile_id: ids.sarah, critical_role_id: ids.criticalRole, effective_blueprint_snapshot_id: ids.snapshot, effective_requirement_snapshot_id: ids.snapReq4, evidence_type: 'performance_outcome', source_system: 'curiosity_led', source_date: DATE_PAST_30D, title: 'Q3 Revenue Achievement — $58M (116% of target)', description: 'Sarah led the Enterprise Sales team to $58M in Q3 revenue, exceeding the $50M target by 16%. This marks the 3rd consecutive quarter of overachievement.', submitted_by_profile_id: ids.jennifer, submitted_at: PAST_30D, freshness_review_date: FUTURE_90D, status: 'accepted', integrity_status: 'active', confidentiality_level: 'confidential' },
    { client_id: DEMO_CLIENT_ID, candidacy_id: ids.candSarah, user_profile_id: ids.sarah, critical_role_id: ids.criticalRole, effective_blueprint_snapshot_id: ids.snapshot, effective_requirement_snapshot_id: ids.snapReq2, evidence_type: 'competency_behavior', source_system: 'manual', source_date: DATE_PAST_20D, title: '360 Leadership Assessment — Team Building', description: '360-degree feedback from 8 direct reports and 4 cross-functional peers. Strong ratings in coaching, team development, and retention. 90% retention rate on her team over 2 years.', submitted_by_profile_id: ids.jennifer, submitted_at: PAST_20D, freshness_review_date: FUTURE_90D, status: 'accepted', integrity_status: 'active', confidentiality_level: 'confidential' },
    // Marcus Johnson — moderate evidence
    { client_id: DEMO_CLIENT_ID, candidacy_id: ids.candMarcus, user_profile_id: ids.marcus, critical_role_id: ids.criticalRole, effective_blueprint_snapshot_id: ids.snapshot, effective_requirement_snapshot_id: ids.snapReq4, evidence_type: 'performance_outcome', source_system: 'curiosity_led', source_date: DATE_PAST_30D, title: 'Regional Team Growth — 40% YoY', description: 'Marcus grew the West Region team from 8 to 12 reps and increased regional revenue by 40% year-over-year. Strong execution but at a smaller scale than the VP role requires.', submitted_by_profile_id: ids.jennifer, submitted_at: PAST_30D, freshness_review_date: FUTURE_90D, status: 'accepted', integrity_status: 'active', confidentiality_level: 'confidential' },
    { client_id: DEMO_CLIENT_ID, candidacy_id: ids.candMarcus, user_profile_id: ids.marcus, critical_role_id: ids.criticalRole, effective_blueprint_snapshot_id: ids.snapshot, effective_requirement_snapshot_id: ids.snapReq2, evidence_type: 'credential', source_system: 'manual', source_date: DATE_PAST_60D, title: 'Executive Coaching Certification (ICF)', description: 'Marcus completed an ICF-accredited executive coaching certification, demonstrating commitment to team development. Limited application at enterprise scale so far.', submitted_by_profile_id: ids.jennifer, submitted_at: PAST_60D, freshness_review_date: FUTURE_90D, status: 'accepted_with_limitations', integrity_status: 'active', confidentiality_level: 'confidential' },
    // Priya Patel — limited evidence
    { client_id: DEMO_CLIENT_ID, candidacy_id: ids.candPriya, user_profile_id: ids.priya, critical_role_id: ids.criticalRole, effective_blueprint_snapshot_id: ids.snapshot, effective_requirement_snapshot_id: ids.snapReq1, evidence_type: 'performance_outcome', source_system: 'curiosity_led', source_date: DATE_PAST_20D, title: 'Sales Ops Optimization — 25% efficiency gain', description: 'Priya led a sales operations optimization project that reduced quote-to-close cycle time by 25%. Strong operational impact but limited direct sales leadership experience.', submitted_by_profile_id: ids.jennifer, submitted_at: PAST_20D, freshness_review_date: FUTURE_90D, status: 'accepted_with_limitations', integrity_status: 'active', confidentiality_level: 'confidential' },
    { client_id: DEMO_CLIENT_ID, candidacy_id: ids.candPriya, user_profile_id: ids.priya, critical_role_id: ids.criticalRole, effective_blueprint_snapshot_id: ids.snapshot, effective_requirement_snapshot_id: ids.snapReq2, evidence_type: 'manager_observation', source_system: 'manual', source_date: DATE_PAST_10D, title: 'Limited Team Leadership Exposure', description: 'Priya has led a 3-person sales ops team for 1 year. No direct enterprise sales leadership experience. Needs significant development in team leadership at scale.', submitted_by_profile_id: ids.jennifer, submitted_at: PAST_10D, freshness_review_date: FUTURE_90D, status: 'returned_for_clarification', integrity_status: 'active', confidentiality_level: 'confidential' },
  ]);
  ids.evSarah1 = evidence[0].id;
  ids.evSarah2 = evidence[1].id;
  ids.evMarcus1 = evidence[2].id;
  ids.evMarcus2 = evidence[3].id;
  ids.evPriya1 = evidence[4].id;
  ids.evPriya2 = evidence[5].id;

  // ── 15. EvidenceReviewDecisions (4 total) ──────────────────────────
  await base44.asServiceRole.entities.EvidenceReviewDecision.bulkCreate([
    { client_id: DEMO_CLIENT_ID, evidence_record_id: ids.evSarah1, candidacy_id: ids.candSarah, effective_requirement_snapshot_id: ids.snapReq4, reviewer_profile_id: ids.robert, decision: 'accepted', evidence_strength: 'direct', confidence: 'high', relevance: 'high', reviewed_at: PAST_25D, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, evidence_record_id: ids.evSarah2, candidacy_id: ids.candSarah, effective_requirement_snapshot_id: ids.snapReq2, reviewer_profile_id: ids.lisa, decision: 'accepted', evidence_strength: 'direct', confidence: 'high', relevance: 'high', reviewed_at: PAST_15D, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, evidence_record_id: ids.evMarcus1, candidacy_id: ids.candMarcus, effective_requirement_snapshot_id: ids.snapReq4, reviewer_profile_id: ids.robert, decision: 'accepted', evidence_strength: 'transferable', confidence: 'medium', relevance: 'high', reviewed_at: PAST_25D, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, evidence_record_id: ids.evPriya1, candidacy_id: ids.candPriya, effective_requirement_snapshot_id: ids.snapReq1, reviewer_profile_id: ids.david, decision: 'accepted_with_limitations', evidence_strength: 'indicative', confidence: 'medium', relevance: 'medium', limitations: 'Operational impact is clear but does not demonstrate direct sales leadership capability.', reviewed_at: PAST_15D, integrity_status: 'active' },
  ]);

  // ── 16. ReadinessConclusions (3 at different stages) ───────────────
  // Sarah — ratified (ready_now)
  const conclSarah = await base44.asServiceRole.entities.ReadinessConclusion.create({
    client_id: DEMO_CLIENT_ID, candidacy_id: ids.candSarah, critical_role_id: ids.criticalRole, cycle_id: ids.cycle, effective_blueprint_snapshot_id: ids.snapshot,
    version: 1, proposed_value: 'ready_now', calibrated_value: 'ready_now', ratified_value: 'ready_now',
    proposed_by_profile_id: ids.jennifer, proposed_at: PAST_25D,
    rationale: 'Sarah has consistently exceeded revenue targets, demonstrated strong team leadership with 90% retention, and received positive 360 feedback. She is ready to step into the VP of Sales role.',
    next_review_date: FUTURE_90D, transition_horizon: '0_6_months',
    workflow_status: 'ratified',
    integrity_status: 'active', confidentiality_level: 'highly_confidential',
  });
  ids.conclSarah = conclSarah.id;

  // Marcus — in_calibration (emerging)
  const conclMarcus = await base44.asServiceRole.entities.ReadinessConclusion.create({
    client_id: DEMO_CLIENT_ID, candidacy_id: ids.candMarcus, critical_role_id: ids.criticalRole, cycle_id: ids.cycle, effective_blueprint_snapshot_id: ids.snapshot,
    version: 1, proposed_value: 'emerging',
    proposed_by_profile_id: ids.jennifer, proposed_at: PAST_15D,
    rationale: 'Marcus shows strong potential with 40% regional growth and a coaching certification. Needs more experience at enterprise scale and broader strategic exposure before ready for VP role.',
    transition_horizon: '6_12_months',
    workflow_status: 'in_calibration',
    integrity_status: 'active', confidentiality_level: 'highly_confidential',
  });
  ids.conclMarcus = conclMarcus.id;

  // Priya — proposed (insufficient_evidence)
  const conclPriya = await base44.asServiceRole.entities.ReadinessConclusion.create({
    client_id: DEMO_CLIENT_ID, candidacy_id: ids.candPriya, critical_role_id: ids.criticalRole, cycle_id: ids.cycle, effective_blueprint_snapshot_id: ids.snapshot,
    version: 1, proposed_value: 'insufficient_evidence',
    proposed_by_profile_id: ids.jennifer, proposed_at: PAST_5D,
    rationale: 'Priya has strong operational impact but limited direct sales leadership experience. More evidence is needed, particularly around team leadership at scale and enterprise sales strategy.',
    missing_evidence: 'Enterprise sales leadership experience, team leadership at scale (10+ reports), direct P&L ownership',
    transition_horizon: '12_24_months',
    workflow_status: 'proposed',
    integrity_status: 'active', confidentiality_level: 'highly_confidential',
  });
  ids.conclPriya = conclPriya.id;

  // ── 17. CalibrationSession ─────────────────────────────────────────
  const calSession = await base44.asServiceRole.entities.CalibrationSession.create({
    client_id: DEMO_CLIENT_ID, cycle_id: ids.cycle,
    scheduled_at: PAST_10D, status: 'in_progress', quorum_required: 3,
    blind_judgment: true,
    created_by_profile_id: ids.jennifer, created_at: PAST_15D,
    integrity_status: 'active', confidentiality_level: 'highly_confidential',
  });
  ids.calSession = calSession.id;

  // ── 18. CalibrationCase (for Marcus) ───────────────────────────────
  const calCase = await base44.asServiceRole.entities.CalibrationCase.create({
    client_id: DEMO_CLIENT_ID, session_id: ids.calSession,
    candidacy_id: ids.candMarcus, readiness_conclusion_id: ids.conclMarcus,
    effective_blueprint_snapshot_id: ids.snapshot,
    status: 'judgments_recorded',
    panel_member_profile_ids: [ids.robert, ids.lisa, ids.david],
    minimum_panel_size: 3,
    panel_roster_finalized_at: PAST_12D,
    panel_roster_finalized_by_profile_id: ids.jennifer,
    integrity_status: 'active', confidentiality_level: 'highly_confidential',
  });
  ids.calCase = calCase.id;

  // ── 19. CalibrationJudgments (3 blind judgments) ───────────────────
  await base44.asServiceRole.entities.CalibrationJudgment.bulkCreate([
    { client_id: DEMO_CLIENT_ID, calibration_case_id: ids.calCase, panelist_profile_id: ids.robert, eligibility_status: 'eligible', judgment_value: 'ready_with_conditions', judgment_notes: 'Strong potential but needs enterprise-scale exposure first.', recorded_at: PAST_8D, revealed: false, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, calibration_case_id: ids.calCase, panelist_profile_id: ids.lisa, eligibility_status: 'eligible', judgment_value: 'emerging', judgment_notes: 'Not yet ready for VP but on the right trajectory.', recorded_at: PAST_8D, revealed: false, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, calibration_case_id: ids.calCase, panelist_profile_id: ids.david, eligibility_status: 'eligible', judgment_value: 'emerging', judgment_notes: 'Coaching certification is promising but limited scale evidence.', recorded_at: PAST_7D, revealed: false, integrity_status: 'active' },
  ]);

  // ── 20. GovernanceApproval (ratify Sarah) ──────────────────────────
  await base44.asServiceRole.entities.GovernanceApproval.create({
    client_id: DEMO_CLIENT_ID, readiness_conclusion_id: ids.conclSarah,
    approver_profile_id: ids.robert, decision: 'ratify',
    rationale: 'Evidence strongly supports readiness. Sarah has exceeded revenue targets, demonstrated team leadership, and is ready for the VP role.',
    next_review_date: FUTURE_90D, decided_at: PAST_20D,
    integrity_status: 'active', confidentiality_level: 'highly_confidential',
  });

  // ── 21. DevelopmentPlanLink (for Marcus) ──────────────────────────
  const devPlan = await base44.asServiceRole.entities.DevelopmentPlanLink.create({
    client_id: DEMO_CLIENT_ID, candidacy_id: ids.candMarcus, readiness_conclusion_id: ids.conclMarcus,
    effective_blueprint_snapshot_id: ids.snapshot,
    gap_summary: 'Marcus needs enterprise-scale sales leadership exposure and broader strategic account management experience. Coaching certification is a strong foundation.',
    owner_profile_id: ids.jennifer, status: 'active', review_date: FUTURE_30D,
    created_by_profile_id: ids.jennifer, created_at: PAST_10D,
    integrity_status: 'active', confidentiality_level: 'confidential',
  });
  ids.devPlan = devPlan.id;

  // ── 22. DevelopmentActions (2 for Marcus) ──────────────────────────
  await base44.asServiceRole.entities.DevelopmentAction.bulkCreate([
    { client_id: DEMO_CLIENT_ID, development_plan_link_id: ids.devPlan, candidacy_id: ids.candMarcus, action_type: 'stretch_assignment', title: 'Lead Enterprise Account Review', description: 'Shadow the VP of Sales in enterprise account reviews for 2 key customers. Present strategy to the executive team.', owner_profile_id: ids.marcus, due_date: FUTURE_60D, milestone_text: 'Present enterprise account strategy to executive team', status: 'in_progress', created_by_profile_id: ids.jennifer, created_at: PAST_10D, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, development_plan_link_id: ids.devPlan, candidacy_id: ids.candMarcus, action_type: 'coaching', title: 'Executive Coaching with External Coach', description: '6-month executive coaching engagement focused on enterprise sales strategy and cross-functional leadership.', owner_profile_id: ids.marcus, due_date: FUTURE_90D, milestone_text: 'Complete 6-month coaching engagement with documented growth', status: 'not_started', created_by_profile_id: ids.jennifer, created_at: PAST_10D, integrity_status: 'active' },
  ]);

  // ── 23. TransitionInitiation (for Sarah — promotion) ───────────────
  const transition = await base44.asServiceRole.entities.TransitionInitiation.create({
    client_id: DEMO_CLIENT_ID, cycle_id: ids.cycle, critical_role_id: ids.criticalRole, org_position_id: ids.posVP,
    successor_profile_id: ids.sarah, candidacy_id: ids.candSarah, readiness_conclusion_id: ids.conclSarah,
    initiation_type: 'promotion', initiation_basis: 'succession_process',
    target_start_date: FUTURE_30D, status: 'approved',
    sponsor_profile_id: ids.jennifer,
    initiated_by_profile_id: ids.jennifer, initiated_at: PAST_15D,
    approved_by_profile_id: ids.robert, approved_at: PAST_10D,
    integrity_status: 'active', confidentiality_level: 'highly_confidential',
  });
  ids.transition = transition.id;

  // ── 24. TransitionPlan ─────────────────────────────────────────────
  await base44.asServiceRole.entities.TransitionPlan.create({
    client_id: DEMO_CLIENT_ID, transition_initiation_id: ids.transition, org_position_id: ids.posVP,
    successor_profile_id: ids.sarah, sponsor_profile_id: ids.jennifer,
    transition_type: 'promotion', start_date: FUTURE_30D, review_date: FUTURE_90D, target_completion_date: FUTURE_60D,
    ramp_plan: 'First 30 days: shadow current VP and meet all key customers. 30-60 days: assume day-to-day operations. 60-90 days: present Q1 strategy to executive team.',
    success_outcomes: 'Q1 revenue target met or exceeded, key customer relationships maintained, team retention above 85%.',
    risks: [
      { risk: 'Key customer relationships may transition slowly', severity: 'medium', mitigation: 'Structured handoff meetings with top 10 customers in first 2 weeks', owner_profile_id: ids.jennifer, status: 'monitoring' },
      { risk: 'Team adjustment to new leadership style', severity: 'low', mitigation: '1-on-1s with all direct reports in first week', owner_profile_id: ids.jennifer, status: 'open' },
    ],
    milestone_summary: 'Day 30: customer handoffs complete. Day 60: full operational ownership. Day 90: Q1 strategy presented.',
    status: 'active',
    integrity_status: 'active', confidentiality_level: 'highly_confidential',
  });

  // ── 25. KnowledgeTransferPlan ──────────────────────────────────────
  await base44.asServiceRole.entities.KnowledgeTransferPlan.create({
    client_id: DEMO_CLIENT_ID, transition_initiation_id: ids.transition, org_position_id: ids.posVP,
    successor_profile_id: ids.sarah, owner_profile_id: ids.jennifer,
    status: 'active',
    knowledge_areas: [
      { title: 'Top 10 Enterprise Accounts', description: 'Relationship history, current opportunities, and strategic context for top 10 customers', transfer_method: 'Shadowing + documentation', owner_profile_id: ids.jennifer, target_date: FUTURE_30D, status: 'in_progress' },
      { title: 'Sales Tech Stack & CRM', description: 'Salesforce configuration, reporting dashboards, and sales tech integrations', transfer_method: 'Documentation + hands-on', owner_profile_id: ids.jennifer, target_date: FUTURE_30D, status: 'not_started' },
      { title: 'Team Dynamics & Development Plans', description: 'Direct report strengths, development needs, and ongoing coaching plans', transfer_method: '1-on-1 meetings', owner_profile_id: ids.jennifer, target_date: FUTURE_60D, status: 'not_started' },
    ],
    access_handoffs: 'Salesforce admin access, CRM dashboards, sales forecasting tools, and customer data platforms.',
    stakeholder_handoffs: 'C-suite stakeholders (CEO, CFO, COO), key customer contacts, and cross-functional partners in Marketing and Product.',
    documentation_locations: 'All documentation in shared Sales Leadership SharePoint. CRM playbooks in Salesforce knowledge base.',
    start_date: FUTURE_30D, target_completion_date: FUTURE_60D,
    integrity_status: 'active', confidentiality_level: 'highly_confidential',
  });

  // ── 26. SuccessionMonitorAlerts (2 alerts) ─────────────────────────
  await base44.asServiceRole.entities.SuccessionMonitorAlert.bulkCreate([
    { client_id: DEMO_CLIENT_ID, cycle_id: ids.cycle, critical_role_id: ids.criticalRole, candidacy_id: ids.candPriya, readiness_conclusion_id: ids.conclPriya, source_entity_type: 'ReadinessConclusion', source_entity_id: ids.conclPriya, alert_type: 'readiness_review_due', severity: 'attention', title: 'Readiness review due — Priya Patel', description: 'Priya Patel\u2019s readiness conclusion (insufficient_evidence) should be reviewed to determine next development steps.', due_date: FUTURE_30D, detected_at: PAST_5D, last_detected_at: NOW, fingerprint: 'demo-readiness-priya-' + ids.conclPriya, status: 'open', integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, cycle_id: ids.cycle, critical_role_id: ids.criticalRole, candidacy_id: ids.candMarcus, development_plan_link_id: ids.devPlan, source_entity_type: 'DevelopmentPlanLink', source_entity_id: ids.devPlan, alert_type: 'development_review_due', severity: 'attention', title: 'Development plan review due — Marcus Johnson', description: 'Marcus Johnson\u2019s development plan (active) has a review date approaching. Evaluate progress on stretch assignment and coaching engagement.', due_date: FUTURE_30D, detected_at: PAST_5D, last_detected_at: NOW, fingerprint: 'demo-devplan-marcus-' + ids.devPlan, status: 'open', integrity_status: 'active' },
  ]);

  // ── 27. SuccessionReviewRecord ────────────────────────────────────
  await base44.asServiceRole.entities.SuccessionReviewRecord.create({
    client_id: DEMO_CLIENT_ID, cycle_id: ids.cycle, critical_role_id: ids.criticalRole,
    review_type: 'readiness_reassessment', title: 'Q4 Readiness Review — VP of Sales Succession',
    review_scope: 'Review all 3 candidates\u2019 readiness conclusions and development progress. Assess whether Marcus\u2019s calibration should be finalized and whether Priya needs additional development actions.',
    owner_profile_id: ids.jennifer, scheduled_for: FUTURE_30D_DT, status: 'scheduled',
    participant_profile_ids: [ids.jennifer, ids.robert, ids.lisa, ids.david],
    confidentiality_level: 'highly_confidential',
    integrity_status: 'active',
    created_by_profile_id: ids.jennifer, created_at: PAST_5D,
  });

  // ── 28. SuccessionAuditEvents (a few) ─────────────────────────────
  await base44.asServiceRole.entities.SuccessionAuditEvent.bulkCreate([
    { client_id: DEMO_CLIENT_ID, action_type: 'cycle_created', actor_profile_id: ids.jennifer, actor_email: 'jennifer.walsh@demo-acme.com', target_entity_type: 'SuccessionCycle', target_entity_id: ids.cycle, metadata: { cycle_name: '2026 Q4 Succession Cycle' }, timestamp: PAST_60D, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, action_type: 'blueprint_approved', actor_profile_id: ids.jennifer, actor_email: 'jennifer.walsh@demo-acme.com', target_entity_type: 'RoleSuccessBlueprint', target_entity_id: ids.blueprint, metadata: { version_label: 'v1' }, timestamp: PAST_45D, integrity_status: 'active' },
    { client_id: DEMO_CLIENT_ID, action_type: 'readiness_ratified', actor_profile_id: ids.robert, actor_email: 'robert.kim@demo-acme.com', target_entity_type: 'ReadinessConclusion', target_entity_id: ids.conclSarah, metadata: { candidate: 'Sarah Chen', value: 'ready_now' }, timestamp: PAST_20D, integrity_status: 'active' },
  ]);

  return ids;
}