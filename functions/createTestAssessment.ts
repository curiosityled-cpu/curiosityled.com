import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Test function to create a mock assessment for the current user
 * Use this for testing the assessment results flow without needing Typeform
 * 
 * Call from frontend: await createTestAssessment({ scenario: 'high_performer' })
 */

Deno.serve(async (req) => {
  const requestId = `test_${Date.now()}`;
  
  console.log(`[TestAssessment ${requestId}] Creating test assessment`);

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return Response.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const scenario = body.scenario || 'average';

    // Predefined test scenarios
    const scenarios = {
      high_performer: {
        overall_pct: 87,
        si_pct: 85,
        dm_pct: 90,
        comm_pct: 88,
        rm_pct: 84,
        sm_pct: 89,
        pm_pct: 86,
        archetype_label: "The Adaptive Strategist",
        band_overall: "Mastery"
      },
      average: {
        overall_pct: 72,
        si_pct: 70,
        dm_pct: 75,
        comm_pct: 71,
        rm_pct: 68,
        sm_pct: 74,
        pm_pct: 72,
        archetype_label: "The Resourceful Optimizer",
        band_overall: "Proficient"
      },
      developing: {
        overall_pct: 58,
        si_pct: 55,
        dm_pct: 62,
        comm_pct: 57,
        rm_pct: 54,
        sm_pct: 60,
        pm_pct: 59,
        archetype_label: "The Emerging Leader",
        band_overall: "Developing"
      },
      at_risk: {
        overall_pct: 45,
        si_pct: 42,
        dm_pct: 48,
        comm_pct: 43,
        rm_pct: 41,
        sm_pct: 47,
        pm_pct: 49,
        archetype_label: "The Foundation Builder",
        band_overall: "Foundation"
      },
      incomplete: {
        overall_pct: 68,
        si_pct: null,
        dm_pct: 70,
        comm_pct: null,
        rm_pct: 65,
        sm_pct: 72,
        pm_pct: null,
        archetype_label: null,
        band_overall: "Developing"
      }
    };

    const selectedScenario = scenarios[scenario] || scenarios.average;

    console.log(`[TestAssessment ${requestId}] Using scenario: ${scenario}`, selectedScenario);

    // Check if user already has an assessment
    const existingAssessments = await base44.entities.Assessment.filter(
      { email: user.email },
      '-created_date',
      1
    );

    let assessment;

    if (body.replace_existing && existingAssessments.length > 0) {
      // Update existing assessment
      assessment = await base44.entities.Assessment.update(
        existingAssessments[0].id,
        {
          ...selectedScenario,
          response_id: `test_${requestId}`,
          submission_ts: new Date().toISOString(),
          record: {
            test: true,
            scenario,
            created_by: 'createTestAssessment function'
          }
        }
      );
      console.log(`[TestAssessment ${requestId}] ✅ Updated existing assessment:`, assessment.id);
    } else {
      // Create new assessment
      const assessmentData = {
        email: user.email,
        response_id: `test_${requestId}`,
        submission_ts: new Date().toISOString(),
        ...selectedScenario,
        record: {
          test: true,
          scenario,
          created_by: 'createTestAssessment function'
        }
      };

      assessment = await base44.asServiceRole.entities.Assessment.create(assessmentData);
      console.log(`[TestAssessment ${requestId}] ✅ Created new assessment:`, assessment.id);
    }

    return Response.json({
      success: true,
      message: 'Test assessment created successfully',
      assessment: {
        id: assessment.id,
        email: assessment.email,
        overall_pct: assessment.overall_pct,
        si_pct: assessment.si_pct,
        archetype_label: assessment.archetype_label,
        band_overall: assessment.band_overall
      },
      scenario_used: scenario,
      note: 'This is a test assessment. Real assessments come from Typeform submissions.'
    });

  } catch (error) {
    console.error(`[TestAssessment ${requestId}] ❌ Error:`, {
      error: error.message,
      stack: error.stack
    });

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});