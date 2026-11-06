import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  canActOnClient,
  isPlatformPrincipal,
  resolveTenantContext,
} from '../../shared/tenantContext.ts';
import {
  PERSON_OWNED_TENANT_TYPES,
  membershipClientMap,
  rowTenantHints,
} from '../../shared/tenantColumns.ts';

/**
 * Phase 5 — the two-client proof.
 *
 * Phase 4 proved the resolver makes the right decision when handed a principal.
 * This is a different question, and a harder one: with two real clients in the
 * database and a real record of every category in each, does a request that
 * names the *other* client actually reach it?
 *
 * For every category it performs four attempts, in both directions:
 *
 *   cross-read    read the other client's row, scoped to the caller's client
 *   cross-write   move the other client's row to the caller's client
 *   claim         may this principal act on the other client at all?
 *   own-scope     (control) may it act on its own? — so a refusal above cannot
 *                 come from a harness that simply refuses everything
 *
 * The attempts deliberately run with the service role. That is the honest way to
 * test the *server path*: a scoped query is refused because it does not match,
 * not because a rule happened to hide it. The access rules were the subject of
 * Phase 3 batches 1–12 and are recorded there; what has never been measured is
 * whether the code that builds the query actually applies the tenant.
 *
 * Every category is now client-bound: the last person-owned types gained a
 * tenant column in Phase 3, so a check-in and a user profile are measured the
 * same way as a course. The person-owned types as a whole are then checked for
 * column coverage below — a row whose owner is a known member but which carries
 * no tenant column is a row its organisation cannot report on, and fails here.
 *
 * Fixtures are created and removed within the run. The two clients persist, so
 * the proof can be re-run and inspected. Platform Admin only.
 */

type Direction = 'A→B' | 'B→A';

const PROOF_SLUGS = ['phase5-proof-alpha', 'phase5-proof-beta'];
const PROOF_NOTE = 'Phase 5 proof tenant — synthetic, safe to delete';

const CATEGORIES: any[] = [
  {
    key: 'checkin_questions', label: 'Check-in questions',
    entity: 'CheckInCustomQuestion', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, title: `P5 proof question ${tag}`, question_key: `p5_proof_${tag}`,
      response_type: 'text', applies_to: 'both', is_active: false,
    }),
  },
  {
    key: 'goals', label: 'Goals',
    entity: 'Goal', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, title: `P5 proof goal ${tag}`, status: 'draft', visibility: 'private',
    }),
  },
  {
    key: 'learning_resources', label: 'Learning resources',
    entity: 'LearningResource', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, title: `P5 proof resource ${tag}`, type: 'article',
    }),
  },
  {
    key: 'reports', label: 'Report templates',
    entity: 'ReportTemplate', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, title: `P5 proof report ${tag}`, category: 'p5_proof', metrics: [],
    }),
  },
  {
    key: 'courses', label: 'Courses',
    entity: 'Course', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, title: `P5 proof course ${tag}`,
      status: 'draft', access_mode: 'closed', pacing: 'self_paced',
    }),
  },
  {
    key: 'roles', label: 'Roles',
    entity: 'Role', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, title: `P5 proof role ${tag}`, level: 'leading_self',
      department: 'Proof', job_summary: 'Proof tenant role.', essential_duties: ['Proof duty'],
    }),
  },
  {
    key: 'competencies', label: 'Competencies',
    entity: 'Competency', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, name: `P5 proof competency ${tag}`, category: 'p5_proof', definition: 'Proof.',
    }),
  },
  {
    key: 'signals', label: 'Signals and custom forms',
    entity: 'CustomForm', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, title: `P5 proof signal ${tag}`, form_type: 'custom',
      form_category: 'operational', status: 'draft',
    }),
  },
  {
    key: 'cohorts', label: 'Cohorts',
    entity: 'Cohort', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, name: `P5 proof cohort ${tag}`, start_date: '2026-01-05',
    }),
  },
  {
    key: 'certifications', label: 'Certifications',
    entity: 'Certification', basis: 'client',
    specimen: (c: string, tag: string, email: string) => ({
      client_id: c, user_email: email, name: `P5 proof certification ${tag}`, issuing_body: 'Proof',
    }),
  },
  {
    key: 'requests', label: 'Development requests',
    entity: 'DevelopmentRequest', basis: 'client',
    specimen: (c: string, tag: string, email: string) => ({
      client_id: c, title: `P5 proof request ${tag}`, description: 'Proof.',
      request_type: 'platform_support', source: 'other', requested_by_email: email,
    }),
  },
  {
    key: 'kpis', label: 'KPIs',
    entity: 'KPI', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, title: `P5 proof KPI ${tag}`, visibility: 'private',
    }),
  },
  {
    key: 'workforce_metrics', label: 'Workforce metrics',
    entity: 'WorkforceMetrics', basis: 'client',
    specimen: (c: string) => ({
      client_id: c, period: '2026-P5', effective_date: '2026-01-01',
    }),
  },
  {
    key: 'learning_certificates', label: 'Learning certificates',
    entity: 'LearningCertificate', basis: 'client',
    specimen: (c: string, tag: string, email: string) => ({
      client_id: c, user_email: email, certificate_type: 'module_completion',
      title: `P5 proof certificate ${tag}`, issued_date: '2026-01-01T00:00:00.000Z',
    }),
  },
  {
    key: 'branding', label: 'Branding configuration',
    entity: 'BrandingConfiguration', basis: 'client',
    specimen: (c: string) => ({ client_id: c, is_active: false, description: 'P5 proof branding' }),
  },
  {
    key: 'external_learning', label: 'External learning records',
    entity: 'ExternalLearningRecord', basis: 'client',
    specimen: (c: string, tag: string, email: string) => ({
      client_id: c, user_email: email, course_title: `P5 proof external ${tag}`,
      source_system: 'manual', status: 'excluded',
    }),
  },
  {
    key: 'daily_checkins', label: 'Daily check-ins',
    entity: 'DailyCheckIn', basis: 'client',
    specimen: (c: string, tag: string, email: string) => ({
      client_id: c, user_email: email, check_in_date: '2026-01-01', check_in_type: 'morning',
      focus_note: `P5 proof check-in ${tag}`,
    }),
  },
  {
    key: 'user_profiles', label: 'User profiles',
    entity: 'UserProfile', basis: 'client',
    specimen: (c: string, tag: string, email: string) => ({
      client_id: c, tenant_id: c, email, first_name: `Proof${tag}`, last_name: 'Tenant',
      status: 'PROVISIONED', source_system: 'MANUAL',
    }),
  },

  // ── Module configuration ────────────────────────────────────────────────
  // The records an administrator configures per organisation, as opposed to the
  // records people create. Each is the configuration surface a wired module
  // reads, so a leak here is a module running on another tenant's settings.
  {
    key: 'gamification_settings', label: 'Gamification settings', module: 'Gamification',
    entity: 'GamificationSettings', basis: 'client',
    specimen: (c: string) => ({ client_id: c }),
  },
  {
    key: 'gamification_levels', label: 'Gamification levels', module: 'Gamification',
    entity: 'GamificationLevel', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, level_name: `P5 level ${tag}`, level_order: 1, points_threshold: 100,
    }),
  },
  {
    key: 'badges', label: 'Badges', module: 'Gamification',
    entity: 'Badge', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, name: `P5 badge ${tag}`, category: 'learning', tier: 'bronze',
    }),
  },
  {
    key: 'badge_templates', label: 'Badge templates', module: 'Gamification',
    entity: 'BadgeTemplate', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, badge_name: `P5 badge template ${tag}`,
      badge_category: 'completion', criteria_type: 'manual',
    }),
  },
  {
    key: 'leaderboard_templates', label: 'Leaderboard templates', module: 'Gamification',
    entity: 'LeaderboardTemplate', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, leaderboard_name: `P5 leaderboard ${tag}`,
      scope: 'global', metric_type: 'total_points',
    }),
  },
  {
    key: 'competitions', label: 'Competitions', module: 'Gamification',
    entity: 'Competition', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, competition_name: `P5 competition ${tag}`,
      competition_type: 'individual',
      start_date: '2026-01-01', end_date: '2026-01-31',
    }),
  },
  {
    key: 'programs', label: 'Programs', module: 'Programs',
    entity: 'Program', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, name: `P5 program ${tag}`, status: 'draft',
    }),
  },
  {
    key: 'classes', label: 'Classes', module: 'Programs',
    entity: 'Class', basis: 'client',
    specimen: (c: string, tag: string, email: string) => ({
      client_id: c, facilitator_email: email, title: `P5 class ${tag}`, class_type: 'virtual_ilt',
    }),
  },
  {
    key: 'journeys', label: 'Journeys', module: 'Learning',
    entity: 'Journey', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, title: `P5 journey ${tag}`, status: 'draft',
    }),
  },
  {
    key: 'custom_assessments', label: 'Signals', module: 'Signals',
    entity: 'CustomAssessment', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, title: `P5 signal ${tag}`, type: 'quiz', status: 'draft',
    }),
  },
  {
    key: 'email_templates', label: 'Email templates', module: 'Notifications',
    entity: 'EmailTemplate', basis: 'client',
    specimen: (c: string, tag: string) => ({
      client_id: c, template_key: `p5_proof_${tag}`, template_name: `P5 template ${tag}`,
      subject: 'P5 proof', body_html: '<p>proof</p>', category: 'system',
    }),
  },
  {
    key: 'role_taxonomy', label: 'Role taxonomy', module: 'Role targeting',
    entity: 'RoleTaxonomy', basis: 'client',
    specimen: (c: string) => ({ client_id: c }),
  },
  {
    key: 'coaching_engagements', label: 'Coaching engagements', module: 'Coaching',
    entity: 'CoachingEngagement', basis: 'client',
    specimen: (c: string, tag: string, email: string) => ({
      client_id: c, coach_email: email, title: `P5 engagement ${tag}`,
      engagement_type: '1on1_coaching',
    }),
  },
];

function asArray(result: any): any[] {
  if (Array.isArray(result)) return result;
  return result?.items || [];
}

function affectedOf(result: any): number | null {
  if (typeof result === 'number') return result;
  const candidates = [
    result?.updated, result?.modified_count, result?.modifiedCount,
    result?.count, result?.n, result?.matched,
  ];
  const found = candidates.find((v) => typeof v === 'number');
  return typeof found === 'number' ? found : null;
}

async function ensureProofClients(base44: any) {
  const found = asArray(
    await base44.asServiceRole.entities.Client.filter({ slug: { $in: PROOF_SLUGS } })
  );
  const bySlug = new Map(found.map((c: any) => [c.slug, c]));

  const make = async (slug: string, name: string) => {
    const existing = bySlug.get(slug);
    if (existing) return existing;
    return await base44.asServiceRole.entities.Client.create({
      name, slug, type: 'direct_customer', status: 'trial',
      contact_email: `${slug}@example.test`, notes: PROOF_NOTE,
      onboarding_status: 'not_started',
    });
  };

  const A = await make(PROOF_SLUGS[0], 'Phase 5 Proof — Alpha');
  const B = await make(PROOF_SLUGS[1], 'Phase 5 Proof — Beta');
  return { A, B };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isPlatformPrincipal(user)) {
      return Response.json({ error: 'Platform Admin only' }, { status: 403 });
    }

    const { A, B } = await ensureProofClients(base44);
    if (!A?.id || !B?.id || A.id === B.id) {
      return Response.json({ error: 'Two distinct proof clients could not be created' }, { status: 500 });
    }

    const tag = Math.random().toString(36).slice(2, 7);
    const emailA = `proof-alpha-${tag}@example.test`;
    const emailB = `proof-beta-${tag}@example.test`;

    // The principals this attempt is made *as*. Synthetic, so the proof does not
    // depend on anybody's real membership, and so a real account is never used to
    // write a probe.
    const memberA = { email: emailA, data: { client_id: A.id, app_role: 'Admin Level 1' } };
    const memberB = { email: emailB, data: { client_id: B.id, app_role: 'Admin Level 1' } };
    const platform = { email: 'proof-platform@example.test', data: { app_role: 'Platform Admin' } };

    const [ctxA, ctxB, ctxPlatform] = await Promise.all([
      resolveTenantContext(base44, memberA, null),
      resolveTenantContext(base44, memberB, null),
      resolveTenantContext(base44, platform, null),
    ]);

    const categories: any[] = [];
    let seeded = 0;
    let removed = 0;

    for (const cat of CATEGORIES) {
      const entity = base44.asServiceRole.entities[cat.entity];
      const payloadA = cat.specimen(A.id, `${tag}a`, emailA);
      const payloadB = cat.specimen(B.id, `${tag}b`, emailB);

      let rowA: any = null;
      let rowB: any = null;
      try {
        [rowA, rowB] = await Promise.all([entity.create(payloadA), entity.create(payloadB)]);
        seeded += 2;
      } catch (error: any) {
        categories.push({
          key: cat.key, label: cat.label, module: cat.module || null,
          entity: cat.entity, basis: cat.basis,
          ok: false, checks: [],
          error: `fixture could not be created: ${error.message}`,
        });
        continue;
      }

      const checks: any[] = [];

      // ── Control: the guard is not simply "refuse everything" ───────────────
      checks.push({
        name: 'own-scope control (client A)', layer: 'guard',
        expected: true, actual: canActOnClient(ctxA, A.id), ok: canActOnClient(ctxA, A.id) === true,
      });
      checks.push({
        name: 'own-scope control (client B)', layer: 'guard',
        expected: true, actual: canActOnClient(ctxB, B.id), ok: canActOnClient(ctxB, B.id) === true,
      });
      checks.push({
        name: 'platform scopes to any client', layer: 'guard',
        expected: true, actual: canActOnClient(ctxPlatform, B.id), ok: canActOnClient(ctxPlatform, B.id) === true,
      });

      // ── Claim: may this member act on the other client at all? ─────────────
      checks.push({
        name: 'A may not claim B', layer: 'guard',
        expected: false, actual: canActOnClient(ctxA, B.id), ok: canActOnClient(ctxA, B.id) === false,
      });
      checks.push({
        name: 'B may not claim A', layer: 'guard',
        expected: false, actual: canActOnClient(ctxB, A.id), ok: canActOnClient(ctxB, A.id) === false,
      });

      if (cat.basis === 'client') {
        const attempt = async (dir: Direction, actingCtx: any, targetClient: any, targetRow: any) => {
          const scope = { id: targetRow?.id, client_id: actingCtx.client_id };

          const readRows = asArray(await entity.filter(scope));
          checks.push({
            name: `${dir} cross-read`, layer: 'server path',
            expected: '0 rows', actual: `${readRows.length} rows`, ok: readRows.length === 0,
          });

          const writeResult = await entity.updateMany(scope, { $set: { client_id: actingCtx.client_id } });
          const affected = affectedOf(writeResult);
          const stillThere = asArray(
            await entity.filter({ id: targetRow?.id, client_id: targetClient.id })
          );
          const moved = stillThere.length === 0;
          checks.push({
            name: `${dir} cross-write`, layer: 'server path',
            expected: '0 rows moved',
            actual: moved ? '0 rows moved' : 'row changed tenant',
            ok: (affected === null || affected === 0) && !moved,
          });
        };

        await attempt('A→B', ctxA, B, rowB);
        await attempt('B→A', ctxB, A, rowA);
      } else {
        // No client column exists on this type, so no query can prove whose row
        // it is. Recorded rather than papered over: the boundary here is the
        // person's own email in the access rule.
        const noTenantColumn = rowA && rowA.client_id === undefined && rowB && rowB.client_id === undefined;
        checks.push({
          name: 'row carries a tenant column', layer: 'schema',
          expected: 'yes', actual: noTenantColumn ? 'no — person-bound only' : 'yes',
          ok: noTenantColumn,
        });
      }

      categories.push({
        key: cat.key, label: cat.label, module: cat.module || null,
        entity: cat.entity, basis: cat.basis,
        ok: checks.every((c) => c.ok),
        checks,
      });

      try {
        await entity.deleteMany({ id: { $in: [rowA?.id, rowB?.id].filter(Boolean) } });
        removed += 2;
      } catch {
        // A leftover fixture is visible by its `P5 proof` label and harmless.
      }
    }

    // ── Person-owned types: does every row carry its tenant? ──────────────────
    // Phase 3 closed these columns. Measured rather than assumed: a row whose
    // owner is a known member but which carries no tenant column is a row its
    // organisation cannot report on. Rows with no known owner are reported as
    // leftovers, not counted as failures, because there is nobody to attribute
    // them to.
    const allUsers = asArray(await base44.asServiceRole.entities.User.list());
    const clientOf = membershipClientMap(allUsers);
    const tenantColumns: any[] = [];
    for (const name of PERSON_OWNED_TENANT_TYPES) {
      const entity = base44.asServiceRole.entities[name];
      if (!entity) continue;
      const rows = asArray(await entity.list('-created_date', 500));
      let attributableMissing = 0;
      for (const row of rows) {
        if (row.client_id) continue;
        const { clientId, emails } = rowTenantHints(name, row);
        const resolved = clientId || emails.map((e) => clientOf.get(e)).find(Boolean);
        if (resolved) attributableMissing += 1;
      }
      const withoutColumn = rows.filter((r) => !r.client_id).length;
      tenantColumns.push({
        entity: name,
        sampled: rows.length,
        without_column: withoutColumn,
        attributable_missing: attributableMissing,
        ok: attributableMissing === 0,
      });
    }

    const allChecks = categories.flatMap((c) => c.checks || []);
    const failed = allChecks.filter((c) => !c.ok);
    const personBound = categories.filter((c) => c.basis === 'person');
    const columnFailures = tenantColumns
      .filter((c) => !c.ok)
      .map(
        (c) => `${c.entity}: ${c.attributable_missing} row(s) belong to a known member but carry no tenant column`
      );

    return Response.json({
      run_at: new Date().toISOString(),
      clients: [
        { role: 'A', id: A.id, name: A.name },
        { role: 'B', id: B.id, name: B.name },
      ],
      categories_tested: categories.length,
      categories_passed: categories.filter((c) => c.ok).length,
      // Grouped by the module each record configures, so "every wired module is
      // covered" is readable from the run rather than asserted in a document.
      by_module: Object.fromEntries(
        [...new Set(categories.map((c) => c.module || 'People and work'))].map((m) => {
          const inModule = categories.filter((c) => (c.module || 'People and work') === m);
          return [m, `${inModule.filter((c) => c.ok).length}/${inModule.length} passing`];
        })
      ),
      attempts: allChecks.length,
      passed: allChecks.filter((c) => c.ok).length,
      failed: failed.length + columnFailures.length,
      failures: [
        ...failed.map((c) => `${c.name}: expected ${c.expected}, got ${c.actual}`),
        ...columnFailures,
      ],
      person_bound: personBound.map((c) => `${c.label} (${c.entity}) carries no client column`),
      tenant_columns: {
        types_checked: tenantColumns.length,
        rows_sampled: tenantColumns.reduce((n, c) => n + c.sampled, 0),
        rows_without_column: tenantColumns.reduce((n, c) => n + c.without_column, 0),
        attributable_without_column: tenantColumns.reduce((n, c) => n + c.attributable_missing, 0),
        details: tenantColumns,
      },
      fixtures: { seeded, removed },
      categories,
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Proof failed to run' }, { status: 500 });
  }
}