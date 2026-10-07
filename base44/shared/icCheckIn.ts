/**
 * icCheckIn.ts — shared helpers for non-user IC (frontline staff) daily
 * check-ins submitted via Microsoft Teams.
 *
 * - getMeasuresForClient: resolves the org's active check-in preset measures.
 * - getActiveCustomQuestions: fetches custom KPI questions applicable to ICs.
 * - buildICCheckInCard: builds the Adaptive Card sent to an IC in Teams.
 * - saveICCheckIn: persists an IC's submitted answers into DailyCheckIn.
 * - getGraphToken / sendCardToTeams: Graph API delivery (reused by the sender).
 *
 * Used by: sendICCheckInCards (proactive delivery), processICCheckInSubmission
 * (manual/admin submission), and atreusTeamsRouter (bot callback handling).
 */
import { CHECK_IN_PRESETS, getPreset } from './checkInPresets.ts';

const MEASURE_KEYS = ['energy', 'confidence', 'focus', 'load', 'growth'];

export function getMeasuresForClient(client: any): any[] {
  const presetId = client?.settings?.check_in_config?.preset_id || 'balance';
  const preset = getPreset(presetId) || CHECK_IN_PRESETS.balance;
  return preset.measures;
}

export async function getActiveCustomQuestions(
  serviceBase44: any,
  clientId: string,
  icRole: string,
  checkInType: string
): Promise<any[]> {
  try {
    const all = await serviceBase44.entities.CheckInCustomQuestion.filter(
      { is_active: true },
      'display_order',
      100
    );
    return (all || []).filter((q: any) => {
      // ICs have no app role, so only role-agnostic questions apply unless a
      // specific IC role is configured.
      if (q.target_role && q.target_role !== icRole) return false;
      if (checkInType !== 'both' && q.applies_to !== 'both' && q.applies_to !== checkInType) return false;
      return true;
    });
  } catch {
    return [];
  }
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
  checkInType: string
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
        },
      },
    ],
  };
}

export async function saveICCheckIn(
  serviceBase44: any,
  ic: any,
  answers: any,
  checkInType: string,
  dateStr?: string
): Promise<any> {
  const today = dateStr || new Date().toISOString().slice(0, 10);

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
        // keep numbers as numbers, yes/no as booleans, else string
        if (val === 'yes') customAnswers[qkey] = true;
        else if (val === 'no') customAnswers[qkey] = false;
        else if (!isNaN(Number(val)) && String(val).trim() !== '') customAnswers[qkey] = Number(val);
        else customAnswers[qkey] = val;
      }
    }
  }
  if (Object.keys(customAnswers).length > 0) payload.custom_answers = customAnswers;

  const now = new Date().toISOString();
  if (checkInType === 'morning') {
    payload.morning_completed = true;
    payload.morning_completed_at = now;
  } else {
    payload.evening_completed = true;
    payload.evening_completed_at = now;
  }

  // Upsert by IC email + date
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