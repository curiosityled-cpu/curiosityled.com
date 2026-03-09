import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * ============================================
 * TYPEFORM WEBHOOK HANDLER
 * ============================================
 * 
 * This function receives webhook payloads from Typeform when a user submits
 * the Leadership Assessment form, processes the responses, calculates scores,
 * and creates an Assessment record in the database.
 * 
 * CONFIGURATION REQUIRED:
 * ----------------------
 * 1. Set TYPEFORM_WEBHOOK_SECRET in environment variables
 * 2. Update FIELD_MAPPING below with your actual Typeform field refs
 * 
 * HOW TO GET TYPEFORM FIELD REFS:
 * -------------------------------
 * Method 1: Via Typeform API
 *   - Go to: https://admin.typeform.com/form/YOUR_FORM_ID/create
 *   - Open browser DevTools > Network tab
 *   - Look for API calls to retrieve form definition
 *   - Field refs are in format: 'vVWqjMxE', 'aBcD1234', etc.
 * 
 * Method 2: Via Webhook Test
 *   - Submit test form
 *   - Check logs below (this function logs full payload)
 *   - Copy field refs from answers array
 * 
 * Method 3: Via Typeform Connect Panel
 *   - Go to Connect tab in Typeform
 *   - Click on webhook
 *   - View sample payload
 */

// ============================================
// CONFIGURATION: UPDATE THESE FIELD REFS
// ============================================
const FIELD_MAPPING = {
  // Map your Typeform field refs to competency keys
  // Format: 'typeform_field_ref': 'competency_key'
  
  // Example (UPDATE THESE WITH YOUR ACTUAL REFS):
  'decision_making_q1': 'decision_making',
  'communication_q1': 'communication',
  'resource_mgmt_q1': 'resource_management',
  'stakeholder_q1': 'stakeholder_management',
  'performance_q1': 'performance_management',
  'situational_q1': 'situational_intelligence',
  
  // Alternative: If you have multiple questions per competency
  // 'vVWqjMxE': 'decision_making',
  // 'aBcD1234': 'decision_making',
  // 'xYz56789': 'communication',
  // etc.
};

// ============================================
// ARCHETYPE DEFINITIONS
// ============================================
const ARCHETYPES = [
  {
    label: "The Adaptive Strategist",
    pattern: (scores) => scores.decision_making >= 75 && scores.situational_intelligence >= 75
  },
  {
    label: "The Influential Connector",
    pattern: (scores) => scores.communication >= 75 && scores.stakeholder_management >= 75
  },
  {
    label: "The Resourceful Optimizer",
    pattern: (scores) => scores.resource_management >= 75 && scores.decision_making >= 70
  },
  {
    label: "The Performance Catalyst",
    pattern: (scores) => scores.performance_management >= 75 && scores.communication >= 70
  },
  {
    label: "The Steady Operator",
    pattern: (scores) => scores.resource_management >= 70 && scores.performance_management >= 70
  },
  {
    label: "The Change Navigator",
    pattern: (scores) => scores.situational_intelligence >= 75 && scores.stakeholder_management >= 70
  },
  {
    label: "The Collaborative Problem-Solver",
    pattern: (scores) => scores.stakeholder_management >= 70 && scores.communication >= 70
  },
  {
    label: "The Visionary Architect",
    pattern: (scores) => scores.decision_making >= 80 && scores.stakeholder_management >= 75
  }
];

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================
Deno.serve(async (req) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[Webhook ${requestId}] ============================================`);
  console.log(`[Webhook ${requestId}] Received request:`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(req.headers)
  });

  if (req.method !== 'POST') {
    console.log(`[Webhook ${requestId}] ❌ Method not allowed: ${req.method}`);
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // ============================================
    // STEP 1: VERIFY WEBHOOK SIGNATURE
    // ============================================
    const signature = req.headers.get('typeform-signature');
    const webhookSecret = Deno.env.get('TYPEFORM_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error(`[Webhook ${requestId}] ❌ TYPEFORM_WEBHOOK_SECRET not configured`);
      console.error(`[Webhook ${requestId}] Set this in your environment variables`);
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Get raw body for signature verification
    const bodyText = await req.text();
    
    if (!signature) {
      console.warn(`[Webhook ${requestId}] ⚠️ Missing signature - allowing for development/testing`);
      console.warn(`[Webhook ${requestId}] In production, enable signature validation`);
    } else {
      // Validate signature
      const crypto = await import('node:crypto');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyText)
        .digest('base64');
      
      const receivedSig = signature.replace('sha256=', '');
      
      if (receivedSig !== expectedSignature) {
        console.error(`[Webhook ${requestId}] ❌ Invalid signature`);
        console.error(`[Webhook ${requestId}] Received: ${receivedSig}`);
        console.error(`[Webhook ${requestId}] Expected: ${expectedSignature}`);
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
      
      console.log(`[Webhook ${requestId}] ✅ Signature validated`);
    }

    // ============================================
    // STEP 2: PARSE WEBHOOK PAYLOAD
    // ============================================
    const payload = JSON.parse(bodyText);
    
    console.log(`[Webhook ${requestId}] Full payload:`, JSON.stringify(payload, null, 2));
    
    const formResponse = payload.form_response;
    
    if (!formResponse) {
      console.error(`[Webhook ${requestId}] ❌ Missing form_response in payload`);
      return Response.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    console.log(`[Webhook ${requestId}] Processing form response:`, {
      response_id: formResponse.response_id,
      submitted_at: formResponse.submitted_at,
      answers_count: formResponse.answers?.length || 0,
      hidden_fields: formResponse.hidden
    });

    // ============================================
    // STEP 3: EXTRACT EMAIL
    // ============================================
    let email = null;
    
    // Try hidden fields first (recommended method)
    if (formResponse.hidden?.email) {
      email = formResponse.hidden.email;
      console.log(`[Webhook ${requestId}] ✅ Email from hidden field: ${email}`);
    }
    
    // Fallback to email answer type
    if (!email && formResponse.answers) {
      const emailAnswer = formResponse.answers.find(a => a.type === 'email');
      if (emailAnswer?.email) {
        email = emailAnswer.email;
        console.log(`[Webhook ${requestId}] ✅ Email from answer: ${email}`);
      }
    }

    if (!email) {
      console.error(`[Webhook ${requestId}] ❌ No email found in response`);
      console.error(`[Webhook ${requestId}] Hidden fields:`, formResponse.hidden);
      console.error(`[Webhook ${requestId}] Answer types:`, formResponse.answers?.map(a => a.type));
      return Response.json({ error: 'Email not found in form response' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error(`[Webhook ${requestId}] ❌ Invalid email format: ${email}`);
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // ============================================
    // STEP 4: EXTRACT SCORES FROM ANSWERS
    // ============================================
    const answers = formResponse.answers || [];
    console.log(`[Webhook ${requestId}] Processing ${answers.length} answers...`);
    
    // Log all answers for debugging/configuration
    answers.forEach((answer, idx) => {
      console.log(`[Webhook ${requestId}] Answer ${idx + 1}:`, {
        field_ref: answer.field?.ref,
        field_type: answer.type,
        value: answer.number || answer.choice?.label || answer.text || answer.boolean,
        raw_answer: answer
      });
    });

    // Initialize score accumulators for each competency
    const scoreAccumulators = {
      decision_making: { sum: 0, count: 0 },
      communication: { sum: 0, count: 0 },
      resource_management: { sum: 0, count: 0 },
      stakeholder_management: { sum: 0, count: 0 },
      performance_management: { sum: 0, count: 0 },
      situational_intelligence: { sum: 0, count: 0 }
    };

    // Process each answer and accumulate scores
    answers.forEach(answer => {
      const fieldRef = answer.field?.ref;
      if (!fieldRef) return;

      const competency = FIELD_MAPPING[fieldRef];
      if (!competency) {
        console.warn(`[Webhook ${requestId}] ⚠️ Unmapped field ref: ${fieldRef}`);
        return;
      }

      // Extract score from answer (supports multiple answer types)
      let score = 0;
      if (answer.number !== undefined) {
        score = answer.number;
      } else if (answer.choice?.label) {
        // Try to parse number from choice label (e.g., "5 - Strongly Agree")
        const match = answer.choice.label.match(/^(\d+)/);
        score = match ? parseInt(match[1]) : 0;
      }

      if (score > 0) {
        scoreAccumulators[competency].sum += score;
        scoreAccumulators[competency].count += 1;
        console.log(`[Webhook ${requestId}] ✅ Mapped ${fieldRef} → ${competency}: ${score}`);
      }
    });

    // Calculate average scores for each competency
    const scores = {};
    Object.keys(scoreAccumulators).forEach(competency => {
      const { sum, count } = scoreAccumulators[competency];
      scores[competency] = count > 0 ? Math.round(sum / count) : 0;
    });

    console.log(`[Webhook ${requestId}] Calculated scores:`, scores);

    // ============================================
    // STEP 5: CALCULATE OVERALL METRICS
    // ============================================
    const competencyScores = [
      scores.decision_making,
      scores.communication,
      scores.resource_management,
      scores.stakeholder_management,
      scores.performance_management
    ];
    
    const overall_pct = competencyScores.length > 0
      ? Math.round(competencyScores.reduce((sum, score) => sum + score, 0) / competencyScores.length)
      : 0;

    const si_pct = scores.situational_intelligence;

    console.log(`[Webhook ${requestId}] Overall metrics:`, {
      overall_pct,
      si_pct
    });

    // ============================================
    // STEP 6: DETERMINE ARCHETYPE
    // ============================================
    let archetype_label = "The Emerging Leader"; // Default
    
    for (const archetype of ARCHETYPES) {
      if (archetype.pattern(scores)) {
        archetype_label = archetype.label;
        break;
      }
    }

    console.log(`[Webhook ${requestId}] Determined archetype: ${archetype_label}`);

    // ============================================
    // STEP 7: DETERMINE PROFICIENCY BAND
    // ============================================
    let band_overall = "Foundation";
    if (overall_pct >= 85) band_overall = "Mastery";
    else if (overall_pct >= 75) band_overall = "Proficient";
    else if (overall_pct >= 65) band_overall = "Developing";
    else if (overall_pct >= 50) band_overall = "Emerging";

    console.log(`[Webhook ${requestId}] Proficiency band: ${band_overall}`);

    // ============================================
    // STEP 8: CREATE ASSESSMENT RECORD
    // ============================================
    const assessmentData = {
      email,
      response_id: formResponse.response_id,
      submission_ts: formResponse.submitted_at,
      overall_pct,
      si_pct,
      dm_pct: scores.decision_making,
      comm_pct: scores.communication,
      rm_pct: scores.resource_management,
      sm_pct: scores.stakeholder_management,
      pm_pct: scores.performance_management,
      archetype_label,
      band_overall,
      record: {
        raw_payload: payload,
        scores,
        calculation_timestamp: new Date().toISOString(),
        webhook_request_id: requestId
      }
    };

    console.log(`[Webhook ${requestId}] Creating assessment record...`);
    
    const assessment = await base44.asServiceRole.entities.Assessment.create(assessmentData);
    
    console.log(`[Webhook ${requestId}] ✅ Assessment created successfully:`, {
      id: assessment.id,
      email: assessment.email,
      overall_pct: assessment.overall_pct,
      archetype: assessment.archetype_label
    });

    // ============================================
    // SUCCESS RESPONSE
    // ============================================
    return Response.json({
      success: true,
      message: 'Assessment processed successfully',
      assessment_id: assessment.id,
      email: assessment.email,
      overall_score: assessment.overall_pct,
      archetype: assessment.archetype_label,
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error(`[Webhook ${requestId}] ❌ Error processing webhook:`, {
      error: error.message,
      stack: error.stack
    });

    return Response.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});