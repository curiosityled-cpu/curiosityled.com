/**
 * icCheckIn.ts — shared helpers for non-user IC (frontline staff) daily
 * check-ins submitted via Microsoft Teams, email, or secure web link.
 *
 * - getMeasuresForClient: resolves the org's active check-in preset measures.
 * - getActiveCustomQuestions: fetches custom KPI questions applicable to ICs.
 * - getICQuestions: resolves the full IC question set (measures + custom, with
 *   AI-generated text for AI-flagged questions). Respects ic_skip_measures.
 * - generateAIQuestionsForIC: server-side AI text generation for IC questions
 *   (ICs are not app users and cannot use the frontend hook).
 * - getTenantDateStr: computes today's date in the tenant's business timezone.
 * - buildICCheckInCard: builds the Adaptive Card sent to an IC in Teams.
 * - buildICCheckInEmailHTML: builds the HTML email body for email delivery.
 * - saveICCheckIn: persists an IC's submitted answers into DailyCheckIn.
 * - getGraphToken / sendCardToTeams: Graph API delivery (reused by the sender).
 *
 * Used by: sendICCheckInCards (proactive delivery), sendAutomatedICCheckIns
 * (scheduled delivery), processICCheckInSubmission (Teams callback),
 * icWebCheckIn (web fallback), and atreusTeamsRouter (bot callback handling).
 */
import { CHECK_IN_PRESETS, getPreset } from './checkInPresets.ts';

const MEASURE_KEYS = ['energy', 'confidence', 'focus', 'load', 'growth'];

export function getMeasuresForClient(client: any): any[] {
  const presetId = client?.settings?.check_in_config?.preset_id || 'balance';
  const preset = getPreset(presetId) || CHECK_IN_PRESETS.balance;
  return preset.measures;
}

/**
 * Computes today's date (YYYY-MM-DD) in the tenant's business timezone.
 * Falls back to UTC if the timezone is missing or invalid.
 */
export function getTenantDateStr(timezone: string | undefined | null): string {
  const tz = timezone || 'UTC';
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function getActiveCustomQuestions(
  serviceBase44: any,
  clientId: string,
  icRole: string,
  checkInType: string
): Promise<any[]> {
  try {
    const all = await serviceBase44.entities.CheckInCustomQuestion.filter(
      { is_active: true, client_id: clientId },
      'display_order',
      100
    );
    return (all || []).filter((q: any) => {
      if (q.target_role && q.target_role !== icRole) return false;
      if (checkInType !== 'both' && q.applies_to !== 'both' && q.applies_to !== checkInType) return false;
      return true;
    });
  } catch {
    return [];
  }
}

/**
 * Generates fresh AI question text for AI-flagged custom questions.
 * Called server-side because ICs are not app users and cannot use the
 * frontend useCustomCheckInQuestions hook. Returns a map of question_key → text.
 */
export async function generateAIQuestionsForIC(
  serviceBase44: any,
  questions: any[],
  checkInType: string
): Promise<Record<string, string>> {
  const aiQuestions = (questions || []).filter(
    (q) => q.is_ai_generated && (q.ai_topic || '').trim()
  );
  if (aiQuestions.length === 0) return {};

  const today = new Date().toISOString().slice(0, 10);
  const listDesc = aiQuestions
    .map(
      (q) =>
        `${q.question_key}: topic="${(q.ai_topic || '').trim()}", response_type=${
          q.response_type || 'scale_1_5'
        }`
    )
    .join('\n');

  const prompt = `Generate a fresh daily check-in question for each of the topics below. Today is ${today}. Check-in type: ${checkInType}.
Vary the phrasing naturally day to day so it does not feel repetitive. Each question MUST be a direct question under 12 words, appropriate for its response_type:
- number → ask for a count or amount
- text → ask a short open question
- scale_1_5 → a first-person rateable statement (no question mark)
- yes_no → a yes/no question
- anchored_choices → a direct question (with question mark)
Topics:
${listDesc}
Return a JSON object keyed by question_key, where each value is the generated question text string.`;

  try {
    const result = await serviceBase44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: Object.fromEntries(
          aiQuestions.map((q) => [q.question_key, { type: 'string' }])
        ),
        required: aiQuestions.map((q) => q.question_key),
      },
    });
    return result || {};
  } catch {
    return {};
  }
}

/**
 * Resolves the full IC question set for a check-in type:
 * - Measures (from the client's preset), unless ic_skip_measures is true.
 * - Custom questions (fixed operational + AI wellbeing), with AI text generated.
 * Returns { measures, customQuestions, questionsUsed } where questionsUsed
 * maps question_key → AI-generated text (for preservation in DailyCheckIn).
 */
export async function getICQuestions(
  serviceBase44: any,
  client: any,
  checkInType: string
): Promise<{ measures: any[]; customQuestions: any[]; questionsUsed: Record<string, string> }> {
  const skipMeasures = client?.settings?.check_in_config?.ic_skip_measures === true;
  const measures = skipMeasures ? [] : getMeasuresForClient(client);
  const customQuestions = await getActiveCustomQuestions(
    serviceBase44,
    client?.id || '',
    '',
    checkInType
  );

  // Generate AI text for AI-flagged questions (server-side, since ICs are not app users)
  const aiGenerated = await generateAIQuestionsForIC(serviceBase44, customQuestions, checkInType);
  const questionsUsed: Record<string, string> = {};
  for (const [key, text] of Object.entries(aiGenerated)) {
    questionsUsed[key] = text;
  }

  // Replace titles with AI-generated text where available
  const questionsWithAI = customQuestions.map((q: any) =>
    q.is_ai_generated && aiGenerated[q.question_key]
      ? { ...q, title: aiGenerated[q.question_key] }
      : q
  );

  return { measures, customQuestions: questionsWithAI, questionsUsed };
}

function choiceSet(id: string, label: string, choices: { title: string; value: string }[]) {
  return {
    type: 'Input.ChoiceSet',
    id,
    label,
    choices,
    style: 'expanded',
  };
}

const SCALE_CHOICES = [1, 2, 3, 4, 5].map((n) => ({
  title: `${n}`,
  value: String(n),
}));

const YESNO_CHOICES = [
  { title: 'Yes', value: 'yes' },
  { title: 'No', value: 'no' },
];

export function buildICCheckInCard(
  ic: any,
  measures: any[],
  customQuestions: any[],
  checkInType: string,
  questionsUsed?: Record<string, string>
): any {
  const body: any[] = [
    {
      type: 'TextBlock',
      text: '📋 Daily Check-in',
      weight: 'Bolder',
      size: 'Medium',
    },
    {
      type: 'TextBlock',
      text: checkInType === 'morning'
        ? `Hi ${ic.name?.split(' ')[0] || ''} — a quick check-in to start your day.`
        : `Hi ${ic.name?.split(' ')[0] || ''} — a quick end-of-day check-in.`,
      wrap: true,
      isSubtle: true,
    },
  ];

  for (const m of measures) {
    body.push({
      type: 'TextBlock',
      text: `${m.emoji || ''} ${m.label} — ${m.desc}`,
      wrap: true,
      spacing: 'Medium',
    });
    body.push(choiceSet(`m_${m.key}`, m.label, SCALE_CHOICES));
  }

  for (const q of customQuestions) {
    body.push({
      type: 'TextBlock',
      text: q.title + (q.is_required ? ' *' : ''),
      wrap: true,
      spacing: 'Medium',
    });
    if (q.response_type === 'number') {
      body.push({
        type: 'Input.Number',
        id: `c_${q.question_key}`,
        label: q.unit_label || '',
        placeholder: '0',
      });
    } else if (q.response_type === 'text') {
      body.push({
        type: 'Input.Text',
        id: `c_${q.question_key}`,
        placeholder: 'Type your answer…',
        isMultiline: true,
      });
    } else if (q.response_type === 'yes_no') {
      body.push(choiceSet(`c_${q.question_key}`, '', YESNO_CHOICES));
    } else if (q.response_type === 'anchored_choices') {
      const choices = (q.anchored_choices_options || []).map((opt: string) => ({
        title: opt,
        value: opt,
      }));
      body.push(choiceSet(`c_${q.question_key}`, '', choices));
    } else {
      // scale_1_5 (default)
      body.push(choiceSet(`c_${q.question_key}`, '', SCALE_CHOICES));
    }
  }

  return {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.4',
    body,
    actions: [
      {
        type: 'Action.Submit',
        title: 'Submit check-in',
        data: {
          action: 'ic_checkin_submit',
          ic_id: ic.id,
          check_in_type: checkInType,
          ...(questionsUsed && Object.keys(questionsUsed).length > 0
            ? { questions_used: questionsUsed }
            : {}),
        },
      },
    ],
  };
}

/**
 * Builds an HTML email body for IC check-in delivery. The email lists the
 * questions as context (not a live form — most email clients strip <form>
 * elements) and provides a prominent button linking to the secure web page.
 */
export function buildICCheckInEmailHTML(
  ic: any,
  measures: any[],
  customQuestions: any[],
  checkInType: string,
  webLink: string
): string {
  const firstName = ic.name?.split(' ')[0] || '';
  const intro = 'Here is your daily check-in. It takes about a minute to complete.';

  const items: string[] = [
    ...measures.map(
      (m) =>
        `<li style="margin-bottom:6px;">${m.emoji || ''} <strong>${m.label}</strong> — ${m.desc} <span style="color:#9ca3af;">(1–5 scale)</span></li>`
    ),
    ...customQuestions.map((q) => {
      const suffix =
        q.response_type === 'number' && q.unit_label
          ? ` <span style="color:#9ca3af;">(${q.unit_label})</span>`
          : '';
      const scale =
        q.response_type === 'scale_1_5'
          ? ' <span style="color:#9ca3af;">(1–5 scale)</span>'
          : q.response_type === 'yes_no'
            ? ' <span style="color:#9ca3af;">(yes/no)</span>'
            : q.response_type === 'anchored_choices'
              ? ` <span style="color:#9ca3af;">(${(q.anchored_choices_options || []).join(' · ')})</span>`
              : q.response_type === 'number'
                ? ' <span style="color:#9ca3af;">(number)</span>'
                : '';
      return `<li style="margin-bottom:6px;">${q.title}${scale}${suffix}${q.is_required ? ' <span style="color:#ef4444;">*</span>' : ''}</li>`;
    }),
  ];

  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <p style="font-size:16px;color:#374151;margin:0 0 8px;">Hi ${firstName},</p>
  <p style="font-size:14px;color:#6b7280;margin:0 0 16px;">${intro}</p>
  <p style="font-size:14px;color:#374151;margin:0 0 8px;"><strong>Your check-in questions:</strong></p>
  <ul style="font-size:14px;color:#374151;padding-left:20px;margin:0 0 20px;">${items.join('')}</ul>
  <a href="${webLink}" style="display:inline-block;padding:12px 28px;background-color:#0202ff;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Complete your check-in</a>
  <p style="font-size:12px;color:#9ca3af;margin-top:20px;">Curiosity Led · Frontline Check-in</p>
</div>`;
}

export async function saveICCheckIn(
  serviceBase44: any,
  ic: any,
  answers: any,
  checkInType: string,
  dateStr?: string,
  timezone?: string,
  questionsUsed?: Record<string, string>
): Promise<any> {
  const today = dateStr || getTenantDateStr(timezone);

  const payload: any = {
    check_in_type: checkInType,
  };

  // Measures → *_score fields
  for (const key of MEASURE_KEYS) {
    const v = answers[`m_${key}`];
    if (v !== undefined && v !== '' && v !== null) {
      payload[`${key}_score`] = parseInt(String(v)) || 3;
    }
  }

  // Custom KPI answers
  const customAnswers: any = {};
  for (const k of Object.keys(answers || {})) {
    if (k.startsWith('c_')) {
      const qkey = k.slice(2);
      const val = answers[k];
      if (val !== undefined && val !== '' && val !== null) {
        if (val === 'yes') customAnswers[qkey] = true;
        else if (val === 'no') customAnswers[qkey] = false;
        else if (!isNaN(Number(val)) && String(val).trim() !== '') customAnswers[qkey] = Number(val);
        else customAnswers[qkey] = val;
      }
    }
  }
  if (Object.keys(customAnswers).length > 0) payload.custom_answers = customAnswers;

  // Preserve the exact AI-generated question wording used for this check-in
  if (questionsUsed && Object.keys(questionsUsed).length > 0) {
    payload.questions_used = questionsUsed;
  }

  const now = new Date().toISOString();
  if (checkInType === 'morning') {
    payload.morning_completed = true;
    payload.morning_completed_at = now;
  } else {
    payload.evening_completed = true;
    payload.evening_completed_at = now;
  }

  // Upsert by IC email + date (tenant-local date)
  const existing = await serviceBase44.entities.DailyCheckIn.filter(
    { user_email: ic.email, check_in_date: today },
    '-created_date',
    1
  ).catch(() => []);

  let record;
  if (existing[0]) {
    record = await serviceBase44.entities.DailyCheckIn.update(existing[0].id, payload);
  } else {
    record = await serviceBase44.entities.DailyCheckIn.create({
      user_email: ic.email,
      check_in_date: today,
      ...payload,
    });
  }

  // Stamp last check-in time on the roster entry
  await serviceBase44.entities.ICRoster.update(ic.id, {
    last_check_in_at: now,
  }).catch(() => {});

  return record;
}

// ── Graph API delivery helpers (reused by sendICCheckInCards) ──────────────

export async function getGraphToken(): Promise<string> {
  const tenantId = Deno.env.get('TEAMS_TENANT_ID') || 'common';
  const clientId = Deno.env.get('TEAMS_BOT_APP_ID');
  const clientSecret = Deno.env.get('TEAMS_BOT_APP_PASSWORD');
  if (!clientId || !clientSecret) {
    throw new Error('TEAMS_BOT_APP_ID and TEAMS_BOT_APP_PASSWORD secrets are required for Teams delivery');
  }
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    }
  );
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Graph token error: ${tokenData.error_description || JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

export async function sendCardToTeams(
  conversationId: string,
  card: any,
  graphToken: string
): Promise<any> {
  const body = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: card,
      },
    ],
  };
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${graphToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph send failed (${res.status}): ${err}`);
  }
  return await res.json();
}