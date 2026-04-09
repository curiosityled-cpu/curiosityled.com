import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Realistic demo data for the MVP
const ARCHETYPES = [
  'Decisive Communicator', 'Strategic Visionary', 'Collaborative Builder',
  'Analytical Leader', 'Empathetic Coach', 'Results-Driven Executor'
];

const STRENGTHS_POOL = [
  'Clear and direct communication under pressure',
  'Building cross-functional alignment',
  'Data-driven decision making',
  'Developing and retaining top talent',
  'Executing on strategic priorities',
  'Creating psychological safety in teams',
  'Navigating ambiguity with confidence',
  'Stakeholder management across levels',
  'Translating strategy into actionable plans',
  'Coaching team members through challenges'
];

const DEVELOPMENT_POOL = [
  'Delegating more effectively to expand team capacity',
  'Communicating upward with greater executive presence',
  'Balancing short-term execution with long-term strategy',
  'Building resilience during periods of high change',
  'Creating more consistent feedback loops with direct reports',
  'Expanding influence beyond immediate team boundaries',
  'Prioritizing leadership development alongside delivery'
];

const RECOMMENDATIONS_POOL = [
  'Schedule a focused 1-on-1 with your highest-potential team member this week',
  'Block 30 minutes to review your top strategic priority and align your team',
  'Practice delivering one piece of constructive feedback using the SBI model',
  'Identify one decision you can delegate to build team ownership',
  'Reach out to a cross-functional stakeholder you haven\'t connected with recently',
  'Reflect on your team\'s energy and address any signs of burnout proactively',
  'Review your goals for the quarter and reprioritize if needed'
];

const GOAL_TEMPLATES = [
  { title: 'Improve Team Communication', description: 'Implement weekly team syncs and improve async documentation practices', progress: 40, status: 'active' },
  { title: 'Complete Leadership Development Program', description: 'Finish the advanced leadership certification and apply learnings', progress: 65, status: 'active' },
  { title: 'Drive Q2 Revenue Target', description: 'Achieve quarterly revenue goals through improved team execution', progress: 75, status: 'active' },
  { title: 'Build Succession Pipeline', description: 'Identify and develop two high-potential team members for next-level roles', progress: 30, status: 'active' },
  { title: 'Reduce Team Attrition', description: 'Implement retention strategies to improve team stability', progress: 55, status: 'active' },
  { title: 'Launch Cross-Functional Initiative', description: 'Partner with product and engineering to deliver strategic project', progress: 90, status: 'active' },
  { title: 'Complete 360 Feedback Cycle', description: 'Gather and act on feedback from peers, direct reports, and manager', progress: 100, status: 'archived' },
  { title: 'Onboard New Team Members', description: 'Successfully onboard 3 new hires within 30 days', progress: 100, status: 'archived' }
];

const LEARNING_TEMPLATES = [
  { title: 'Leading Through Change', priority: 'high', status: 'in_progress' },
  { title: 'Effective Communication for Leaders', priority: 'medium', status: 'assigned' },
  { title: 'Coaching Skills for Managers', priority: 'high', status: 'started' },
  { title: 'Strategic Decision Making', priority: 'medium', status: 'completed' },
  { title: 'Building High-Performance Teams', priority: 'low', status: 'assigned' },
  { title: 'Stakeholder Management Essentials', priority: 'medium', status: 'in_progress' }
];

const SCORE_PROFILES = [
  { overall: 82, si: 85, dm: 78, comm: 88, rm: 76, sm: 83, pm: 80 }, // Strong communicator
  { overall: 74, si: 70, dm: 80, comm: 72, rm: 75, sm: 68, pm: 79 }, // Decision-focused
  { overall: 91, si: 93, dm: 88, comm: 90, rm: 92, sm: 89, pm: 93 }, // High performer
  { overall: 63, si: 60, dm: 65, comm: 70, rm: 58, sm: 62, pm: 65 }, // Developing
  { overall: 78, si: 80, dm: 76, comm: 74, rm: 82, sm: 79, pm: 77 }, // Balanced
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse optional body params
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { target_email } = body;

    // The email to seed data for (defaults to calling user)
    const seedEmail = target_email || user.email;
    const clientId = user.client_id;

    const results = { assessments: 0, insights: 0, goals: 0, learning: 0 };

    // ── 1. Create Assessment record ─────────────────────────────────────────
    const profile = pickRandom(SCORE_PROFILES);
    const bandMap = (pct) => pct >= 85 ? 'Mastery' : pct >= 70 ? 'Proficient' : pct >= 55 ? 'Developing' : 'Awareness';

    const assessment = await base44.asServiceRole.entities.Assessment.create({
      client_id: clientId,
      email: seedEmail,
      response_id: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      submission_ts: daysAgo(randomInt(7, 60)),
      overall_pct: profile.overall,
      si_pct: profile.si,
      dm_pct: profile.dm,
      comm_pct: profile.comm,
      rm_pct: profile.rm,
      sm_pct: profile.sm,
      pm_pct: profile.pm,
      band_overall: bandMap(profile.overall),
      archetype_label: pickRandom(ARCHETYPES),
      status: 'processed',
      record: {
        scores: profile,
        generated_at: new Date().toISOString()
      }
    });
    results.assessments++;

    // ── 2. Create AssessmentInsights record ────────────────────────────────
    const archetype = pickRandom(ARCHETYPES);
    const strengths = pickN(STRENGTHS_POOL, 3);
    const devAreas = pickN(DEVELOPMENT_POOL, 3);
    const recommendations = pickN(RECOMMENDATIONS_POOL, 3);

    await base44.asServiceRole.entities.AssessmentInsights.create({
      assessment_id: assessment.id,
      user_email: seedEmail,
      client_id: clientId,
      archetype,
      summary: `${archetype} leaders like you consistently drive outcomes through a unique blend of strategic clarity and interpersonal effectiveness. Your assessment reveals a leader who is ready to scale impact — with targeted development, you're well-positioned for the next level of responsibility.`,
      top_strengths: strengths,
      development_areas: devAreas,
      recommendations,
      risk_flags: profile.overall < 65 ? ['low_overall_score'] : [],
      status: 'generated',
      overall_score: profile.overall,
      competency_scores: {
        situational_intelligence: profile.si,
        decision_making: profile.dm,
        communication: profile.comm,
        resource_management: profile.rm,
        stakeholder_management: profile.sm,
        performance_management: profile.pm
      }
    });
    results.insights++;

    // ── 3. Create Goals ────────────────────────────────────────────────────
    const goalsToCreate = pickN(GOAL_TEMPLATES, randomInt(3, 5));
    for (const goalTemplate of goalsToCreate) {
      await base44.asServiceRole.entities.Goal.create({
        ...goalTemplate,
        client_id: clientId,
        created_by: seedEmail,
        visibility: 'private'
      });
      results.goals++;
    }

    // ── 4. Create Assigned Learning ─────────────────────────────────────────
    const learningToCreate = pickN(LEARNING_TEMPLATES, randomInt(3, 4));
    for (const l of learningToCreate) {
      await base44.asServiceRole.entities.AssignedLearning.create({
        client_id: clientId,
        user_email: seedEmail,
        learning_resource_id: `demo-resource-${Math.random().toString(36).slice(2)}`,
        assigned_by: seedEmail,
        title: l.title,
        description: `Complete this resource to strengthen your leadership capability.`,
        priority: l.priority,
        status: l.status
      });
      results.learning++;
    }

    return Response.json({
      success: true,
      message: `MVP demo data seeded for ${seedEmail}`,
      created: results
    });

  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});