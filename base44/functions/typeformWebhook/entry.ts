import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * ============================================
 * TYPEFORM WEBHOOK HANDLER
 * ============================================
 * 
 * Processes Leadership Index Assessment submissions from Typeform.
 * Extracts text-based scenario answers, scores them via LLM, and
 * creates an Assessment record.
 */

// ============================================
// DEMOGRAPHIC FIELD KEYWORDS (partial match on field title)
// ============================================
const DEMOGRAPHIC_FIELDS = {
  management_experience: ['how long have you been a people manager'],
  sector:               ['what sector best describes'],
  sector_other:         ['other'],
  role_level:           ['which best describes you'],
};

// ============================================
// METADATA FIELDS (personal info)
// ============================================
const PERSONAL_FIELDS = {
  first_name:   ['first name'],
  last_name:    ['last name'],
  phone:        ['phone'],
  email_field:  ['email'],
  company:      ['company'],
};

// ============================================
// SKIP FIELDS - these are not scenario questions
// ============================================
const SKIP_KEYWORDS = [
  'how long have you been',
  'what sector best describes',
  'which best describes you',
  'first name',
  'last name',
  'phone number',
  'email',
  'company',
  'hubspot',
  'response type',
  'start date',
  'submit date',
  'network id',
  'tags',
  'ending',
  'other',
];

// ============================================
// LLM SCORING PROMPT
// ============================================
function buildScoringPrompt(qaPairs, sector, roleLevel, managementExperience) {
  return `You are an expert leadership assessor scoring a scenario-based leadership assessment.

Respondent Profile:
- Sector: ${sector || 'Not specified'}
- Leadership Level: ${roleLevel || 'Not specified'}
- People Management Experience: ${managementExperience || 'Not specified'}

You will be given scenario-based questions and the answers chosen by the respondent. 
Score the following 6 leadership competencies from 0-100 based on the overall quality and maturity demonstrated:

COMPETENCY DEFINITIONS:
- Situational Intelligence (SI): Reading the environment, assessing complexity, contextual awareness
- Decision Making (DM): Quality of judgment under pressure, risk assessment, decisive action
- Communication (COMM): Clarity, transparency, messaging to different audiences, managing conflict
- Resource Management (RM): Optimization of people, time, budget, and materials under constraints
- Stakeholder Management (SM): Managing relationships, navigating politics, building alignment
- Performance Management (PM): Developing people, setting standards, addressing performance gaps

SCORING GUIDANCE:
- 80-100: Mastery - Proactive, systemic, collaborative, sees the big picture
- 65-79: Proficient - Solid judgment, addresses root causes, involves others appropriately
- 50-64: Developing - Some awareness but reactive, partial solutions
- 35-49: Emerging - Limited awareness, avoids complexity
- 0-34: Foundation - Reactive, misses key issues, avoids conflict

Q&A PAIRS FROM ASSESSMENT (only questions the respondent answered):
${qaPairs.map((qa, i) => `\n---\nQ${i + 1}: ${qa.q}\nSelected Answer: ${qa.a}`).join('')}

Based on these answers, provide scores. Be calibrated - most managers score between 45-75 on most competencies.

Return ONLY valid JSON:
{
  "si_pct": <0-100>,
  "dm_pct": <0-100>,
  "comm_pct": <0-100>,
  "rm_pct": <0-100>,
  "sm_pct": <0-100>,
  "pm_pct": <0-100>,
  "archetype_label": "<one of the 9 archetypes below>",
  "scoring_notes": "<1-2 sentence rationale>"
}

VALID ARCHETYPES (choose the best fit based on top scoring competencies):
- "The Adaptive Strategist" (high DM + SI)
- "The Influential Connector" (high COMM + SM)
- "The Resourceful Optimizer" (high RM + DM)
- "The Performance Catalyst" (high PM + COMM)
- "The Steady Operator" (high RM + PM)
- "The Change Navigator" (high SI + SM)
- "The Collaborative Problem-Solver" (high SM + COMM)
- "The Visionary Architect" (high DM + SM)
- "The Emerging Leader" (default when no clear pattern)`;
}

// ============================================
// HELPERS
// ============================================
function matchesKeyword(fieldTitle, keywords) {
  const lower = (fieldTitle || '').toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

function extractDemographic(answers, keywords) {
  const match = answers.find(a => {
    const title = (a.field?.title || '').toLowerCase();
    return keywords.some(kw => title.includes(kw));
  });
  if (!match) return null;
  return match.choice?.label || match.text || match.email || match.phone_number || null;
}

function isSkippable(fieldTitle) {
  const lower = (fieldTitle || '').toLowerCase();
  return SKIP_KEYWORDS.some(kw => lower.includes(kw));
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================
Deno.serve(async (req) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[Webhook ${requestId}] ============================================`);
  console.log(`[Webhook ${requestId}] Received ${req.method} at ${new Date().toISOString()}`);

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // ============================================
    // STEP 1: VERIFY SIGNATURE
    // ============================================
    const bodyText = await req.text();
    const signatureHeader = req.headers.get('typeform-signature');
    const webhookSecret = Deno.env.get('TYPEFORM_WEBHOOK_SECRET');

    // DEBUG MODE: log everything, never reject
    console.log(`[Webhook ${requestId}] DEBUG signatureHeader: ${signatureHeader}`);
    console.log(`[Webhook ${requestId}] DEBUG body (first 100 chars): ${bodyText.substring(0, 100)}`);
    console.log(`[Webhook ${requestId}] DEBUG TYPEFORM_WEBHOOK_SECRET length: ${webhookSecret ? webhookSecret.length : 'NOT SET'}`);

    if (webhookSecret && signatureHeader) {
      const receivedHash = signatureHeader.startsWith('sha256=')
        ? signatureHeader.slice('sha256='.length)
        : signatureHeader.startsWith('sha256-')
        ? signatureHeader.slice('sha256-'.length)
        : signatureHeader;

      const encoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(bodyText));
      const computedHash = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

      console.log(`[Webhook ${requestId}] DEBUG receivedHash:  ${receivedHash}`);
      console.log(`[Webhook ${requestId}] DEBUG computedHash:  ${computedHash}`);
      console.log(`[Webhook ${requestId}] DEBUG match: ${receivedHash === computedHash}`);
    }

    // ⚠️ TEMPORARILY not rejecting — returning 200 always for debug
    console.log(`[Webhook ${requestId}] ⚠️ Signature check bypassed for debugging`);

    // ============================================
    // STEP 2: PARSE PAYLOAD
    // ============================================
    const payload = JSON.parse(bodyText);
    const formResponse = payload.form_response;

    if (!formResponse) {
      console.error(`[Webhook ${requestId}] ❌ Missing form_response`);
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const answers = formResponse.answers || [];
    console.log(`[Webhook ${requestId}] Total answers received: ${answers.length}`);

    // Log all answers for debugging field refs
    answers.forEach((a, i) => {
      const val = a.choice?.label || a.text || a.email || a.phone_number || a.boolean || a.number || '';
      if (val) {
        console.log(`[Webhook ${requestId}] Answer[${i}] ref=${a.field?.ref} title="${(a.field?.title || '').substring(0, 60)}..." value="${String(val).substring(0, 80)}"`);
      }
    });

    // ============================================
    // STEP 3: EXTRACT EMAIL
    // ============================================
    let email = formResponse.hidden?.email || null;

    if (!email) {
      const emailAnswer = answers.find(a => a.type === 'email');
      if (emailAnswer?.email) email = emailAnswer.email;
    }

    if (!email) {
      // Try personal fields
      const emailField = answers.find(a => matchesKeyword(a.field?.title, ['email']));
      if (emailField) email = emailField.email || emailField.text;
    }

    // Also check HubSpot/hidden fields
    if (!email && formResponse.hidden) {
      email = Object.values(formResponse.hidden).find(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) || null;
    }

    if (!email) {
      console.error(`[Webhook ${requestId}] ❌ No email found`);
      return Response.json({ error: 'Email not found' }, { status: 400 });
    }

    email = email.toLowerCase().trim();
    console.log(`[Webhook ${requestId}] ✅ Email: ${email}`);

    // ============================================
    // STEP 4: EXTRACT DEMOGRAPHIC METADATA
    // ============================================
    const managementExperience = extractDemographic(answers, DEMOGRAPHIC_FIELDS.management_experience);
    const sector = extractDemographic(answers, DEMOGRAPHIC_FIELDS.sector);
    const sectorOther = extractDemographic(answers, DEMOGRAPHIC_FIELDS.sector_other);
    const roleLevel = extractDemographic(answers, DEMOGRAPHIC_FIELDS.role_level);

    // Personal info
    const firstName = formResponse.hidden?.first_name || extractDemographic(answers, PERSONAL_FIELDS.first_name);
    const lastName = formResponse.hidden?.last_name || extractDemographic(answers, PERSONAL_FIELDS.last_name);
    const company = formResponse.hidden?.company || extractDemographic(answers, PERSONAL_FIELDS.company);

    const effectiveSector = sector === 'Other' && sectorOther ? sectorOther : (sector || 'Not specified');

    console.log(`[Webhook ${requestId}] Demographic: sector="${effectiveSector}" level="${roleLevel}" experience="${managementExperience}"`);

    // ============================================
    // STEP 5: COLLECT SCENARIO Q&A PAIRS
    // ============================================
    const qaPairs = [];

    for (const answer of answers) {
      const fieldTitle = answer.field?.title || '';
      const answerValue = answer.choice?.label || answer.text || '';

      // Skip blank answers and demographic/metadata fields
      if (!answerValue || isSkippable(fieldTitle)) continue;

      // Skip the "What most..." / "What drives..." self-reflection question
      if (fieldTitle.toLowerCase().includes('what most') ||
          fieldTitle.toLowerCase().includes('what drives') ||
          fieldTitle.toLowerCase().includes('self-reflection')) continue;

      qaPairs.push({ q: fieldTitle, a: answerValue });
    }

    console.log(`[Webhook ${requestId}] Scenario Q&A pairs found: ${qaPairs.length}`);

    if (qaPairs.length === 0) {
      console.error(`[Webhook ${requestId}] ❌ No scenario answers found`);
      return Response.json({ error: 'No scenario answers found in submission' }, { status: 400 });
    }

    // ============================================
    // STEP 6: SCORE COMPETENCIES VIA LLM
    // ============================================
    console.log(`[Webhook ${requestId}] Scoring ${qaPairs.length} answers via LLM...`);

    const scoringPrompt = buildScoringPrompt(qaPairs, effectiveSector, roleLevel, managementExperience);

    let scores;
    try {
      scores = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: scoringPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            si_pct:         { type: 'number' },
            dm_pct:         { type: 'number' },
            comm_pct:       { type: 'number' },
            rm_pct:         { type: 'number' },
            sm_pct:         { type: 'number' },
            pm_pct:         { type: 'number' },
            archetype_label:{ type: 'string' },
            scoring_notes:  { type: 'string' },
          },
          required: ['si_pct', 'dm_pct', 'comm_pct', 'rm_pct', 'sm_pct', 'pm_pct', 'archetype_label'],
        },
      });
      console.log(`[Webhook ${requestId}] ✅ LLM scores:`, scores);
    } catch (err) {
      console.error(`[Webhook ${requestId}] LLM scoring failed: ${err.message}. Using defaults.`);
      scores = {
        si_pct: 50, dm_pct: 50, comm_pct: 50,
        rm_pct: 50, sm_pct: 50, pm_pct: 50,
        archetype_label: 'The Emerging Leader',
        scoring_notes: 'Default scores — LLM unavailable',
      };
    }

    // Clamp scores to 0-100
    const clamp = (v) => Math.min(100, Math.max(0, Math.round(v || 0)));
    const si_pct   = clamp(scores.si_pct);
    const dm_pct   = clamp(scores.dm_pct);
    const comm_pct = clamp(scores.comm_pct);
    const rm_pct   = clamp(scores.rm_pct);
    const sm_pct   = clamp(scores.sm_pct);
    const pm_pct   = clamp(scores.pm_pct);

    const overall_pct = clamp((dm_pct + comm_pct + rm_pct + sm_pct + pm_pct) / 5);
    const archetype_label = scores.archetype_label || 'The Emerging Leader';

    // ============================================
    // STEP 7: DETERMINE PROFICIENCY BAND
    // ============================================
    let band_overall = 'Foundation';
    if (overall_pct >= 85)      band_overall = 'Mastery';
    else if (overall_pct >= 75) band_overall = 'Proficient';
    else if (overall_pct >= 65) band_overall = 'Developing';
    else if (overall_pct >= 50) band_overall = 'Emerging';

    console.log(`[Webhook ${requestId}] Overall: ${overall_pct}% | Band: ${band_overall} | Archetype: ${archetype_label}`);

    // ============================================
    // STEP 8: LOOKUP CLIENT_ID FROM USER
    // ============================================
    let client_id = formResponse.hidden?.client_id || null;
    if (!client_id) {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users.length > 0 && users[0].client_id) {
          client_id = users[0].client_id;
          console.log(`[Webhook ${requestId}] ✅ client_id from user: ${client_id}`);
        }
      } catch (err) {
        console.warn(`[Webhook ${requestId}] Could not lookup client_id: ${err.message}`);
      }
    }

    // ============================================
    // STEP 9: CREATE ASSESSMENT RECORD
    // ============================================
    const assessmentData = {
      email,
      client_id,
      response_id: formResponse.token || formResponse.response_id || `tf_${Date.now()}`,
      submission_ts: formResponse.submitted_at,
      overall_pct,
      si_pct,
      dm_pct,
      comm_pct,
      rm_pct,
      sm_pct,
      pm_pct,
      archetype_label,
      band_overall,
      status: 'pending',
      record: {
        // Demographics
        first_name: firstName || null,
        last_name: lastName || null,
        company: company || null,
        sector: effectiveSector,
        role_level: roleLevel || null,
        management_experience: managementExperience || null,
        // Scoring metadata
        scoring_notes: scores.scoring_notes || null,
        qa_count: qaPairs.length,
        // Raw data
        raw_payload: payload,
        calculation_timestamp: new Date().toISOString(),
        webhook_request_id: requestId,
      },
    };

    console.log(`[Webhook ${requestId}] Creating Assessment record...`);
    const assessment = await base44.asServiceRole.entities.Assessment.create(assessmentData);
    console.log(`[Webhook ${requestId}] ✅ Assessment created: ${assessment.id}`);

    return Response.json({
      success: true,
      message: 'Assessment processed successfully',
      assessment_id: assessment.id,
      email: assessment.email,
      overall_score: assessment.overall_pct,
      archetype: assessment.archetype_label,
      band: assessment.band_overall,
      sector: effectiveSector,
      role_level: roleLevel,
      qa_pairs_scored: qaPairs.length,
      request_id: requestId,
    }, { status: 200 });

  } catch (error) {
    console.error(`[Webhook ${requestId}] ❌ Error:`, error.message, error.stack);
    return Response.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      request_id: requestId,
    }, { status: 500 });
  }
});