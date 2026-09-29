/**
 * group1DailyRhythm.ts
 *
 * Group 1 flows: daily rhythm (morning check-in, evening check-in, Big 3, weekly reflection).
 * Each flow is a declarative multi-step spec with a completion handler that
 * persists collected data to the appropriate entity (DailyCheckIn, WeeklyCheckIn).
 *
 * Completion handlers receive the service-role base44 client so they can write
 * directly to entities (bypassing RLS) — the Teams router cannot use auth.me().
 */

import type { Flow } from '../conversationStateMachine.ts';

// ── Helpers ────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekStartISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

async function upsertDailyCheckIn(serviceBase44: any, userEmail: string, data: any) {
  const today = todayISO();
  const existing = await serviceBase44.entities.DailyCheckIn.filter(
    { user_email: userEmail, check_in_date: today },
    '-created_date', 1
  ).catch(() => []);

  if (existing[0]) {
    return await serviceBase44.entities.DailyCheckIn.update(existing[0].id, data);
  }
  return await serviceBase44.entities.DailyCheckIn.create({
    user_email: userEmail,
    check_in_date: today,
    ...data,
  });
}

const SCORE_CHOICES = [
  { label: '1 – Very low', value: '1' },
  { label: '2 – Low', value: '2' },
  { label: '3 – Moderate', value: '3' },
  { label: '4 – Good', value: '4' },
  { label: '5 – Excellent', value: '5' },
];

const LOAD_CHOICES = [
  { label: '1 – Very light', value: '1' },
  { label: '2 – Manageable', value: '2' },
  { label: '3 – Moderate', value: '3' },
  { label: '4 – Heavy', value: '4' },
  { label: '5 – Overloaded', value: '5' },
];

// ── Morning Check-In Flow ──────────────────────────────────────────────────

const morningCheckin: Flow = {
  id: 'morning_checkin',
  group: 1,
  name: 'Morning Check-In',
  trigger_keywords: ['morning', 'check-in', 'checkin', 'start day', 'how am i starting'],
  trigger_label: 'Morning Check-In',
  trigger_icon: '☀️',
  steps: [
    {
      id: 'energy',
      prompt: "☀️ Good morning. How's your energy as you start the day?",
      input_type: 'choice',
      label: 'Energy level',
      choices: SCORE_CHOICES,
      field: 'energy_score',
    },
    {
      id: 'load',
      prompt: 'How heavy does the load feel today?',
      input_type: 'choice',
      label: 'Load / pressure',
      choices: LOAD_CHOICES,
      field: 'load_score',
    },
    {
      id: 'focus',
      prompt: "What's your main focus today? A sentence is enough.",
      input_type: 'text',
      label: 'Main focus',
      placeholder: 'e.g. Resolve the pricing deadlock with the sales team',
      field: 'focus_note',
      optional: true,
    },
    {
      id: 'big3_1',
      prompt: "🎯 Let's set your Big 3 — the three things that matter most today.\n\nPriority 1?",
      input_type: 'text',
      label: 'Big 3 — Priority 1',
      placeholder: 'e.g. Finalise Q3 hiring plan',
      field: 'big3_1',
    },
    {
      id: 'big3_2',
      prompt: 'Priority 2?',
      input_type: 'text',
      label: 'Big 3 — Priority 2',
      placeholder: 'e.g. 1:1 with Sarah about her career path',
      field: 'big3_2',
    },
    {
      id: 'big3_3',
      prompt: 'Priority 3?',
      input_type: 'text',
      label: 'Big 3 — Priority 3',
      placeholder: 'e.g. Review the customer churn data',
      field: 'big3_3',
    },
  ],
  async onComplete(serviceBase44, userEmail, data) {
    const big3 = [data.big3_1, data.big3_2, data.big3_3].filter(Boolean);
    const big3_priorities = big3.map((title, i) => ({
      id: `big3_${i}_${Date.now()}`,
      title,
      status: 'planned',
    }));

    await upsertDailyCheckIn(serviceBase44, userEmail, {
      check_in_type: 'morning',
      energy_score: parseInt(data.energy_score) || 3,
      load_score: parseInt(data.load_score) || 3,
      focus_note: data.focus_note || '',
      big3_priorities,
      morning_completed: true,
      morning_completed_at: new Date().toISOString(),
    });

    const big3List = big3.length > 0
      ? `\n${big3.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
      : '';
    return `☀️ Morning check-in saved. Your Big 3 are set:${big3List}\n\nI'll check in on these this afternoon. Have a good day.`;
  },
};

// ── Evening Check-In Flow ───────────────────────────────────────────────────

const eveningCheckin: Flow = {
  id: 'evening_checkin',
  group: 1,
  name: 'Evening Check-In',
  trigger_keywords: ['evening', 'end of day', 'how did today go', 'wrap up', 'reflect on today'],
  trigger_label: 'Evening Check-In',
  trigger_icon: '🌙',
  steps: [
    {
      id: 'energy',
      prompt: "🌙 How did the day go? Let's start with your energy now.",
      input_type: 'choice',
      label: 'Energy level',
      choices: SCORE_CHOICES,
      field: 'energy_score',
    },
    {
      id: 'load',
      prompt: 'How heavy was the load today?',
      input_type: 'choice',
      label: 'Load / pressure',
      choices: LOAD_CHOICES,
      field: 'load_score',
    },
    {
      id: 'mattered',
      prompt: 'What mattered most today?',
      input_type: 'text',
      label: 'What mattered',
      placeholder: 'A sentence is enough',
      field: 'focus_note',
      optional: true,
    },
    {
      id: 'big3_followthrough',
      prompt: 'Did you follow through on your Big 3?',
      input_type: 'choice',
      label: 'Big 3 follow-through',
      choices: [
        { label: 'Yes — all three', value: 'all' },
        { label: 'Partially — some', value: 'partial' },
        { label: 'No — got pulled away', value: 'no' },
      ],
      field: 'big3_followthrough',
    },
    {
      id: 'learning',
      prompt: "What's one thing you learned today?",
      input_type: 'text',
      label: 'One learning',
      placeholder: 'Optional',
      field: 'learning_note',
      optional: true,
    },
  ],
  async onComplete(serviceBase44, userEmail, data) {
    const today = todayISO();
    const existing = await serviceBase44.entities.DailyCheckIn.filter(
      { user_email: userEmail, check_in_date: today },
      '-created_date', 1
    ).catch(() => []);

    let big3Status = 'shifted';
    if (data.big3_followthrough === 'all') big3Status = 'completed';
    else if (data.big3_followthrough === 'partial') big3Status = 'on_track';

    const updateData: any = {
      check_in_type: 'evening',
      energy_score: parseInt(data.energy_score) || 3,
      load_score: parseInt(data.load_score) || 3,
      focus_note: data.focus_note || '',
      evening_completed: true,
      evening_completed_at: new Date().toISOString(),
    };

    if (existing[0]?.big3_priorities?.length) {
      updateData.big3_priorities = existing[0].big3_priorities.map((p: any) => ({
        ...p,
        status: big3Status,
      }));
    }

    await upsertDailyCheckIn(serviceBase44, userEmail, updateData);

    let msg = '🌙 Evening check-in saved. ';
    if (data.big3_followthrough === 'all') msg += 'Great follow-through on your Big 3 today.';
    else if (data.big3_followthrough === 'partial') msg += 'You moved the needle on some of your Big 3.';
    else msg += 'The day pulled you away from your Big 3. That happens — what got in the way?';
    if (data.learning_note) msg += ` Noted: "${data.learning_note}".`;
    return msg;
  },
};

// ── Big 3 Quick Set Flow ────────────────────────────────────────────────────

const big3QuickSet: Flow = {
  id: 'big3_quickset',
  group: 1,
  name: 'Big 3 Quick Set',
  trigger_keywords: ['big 3', 'big3', 'priorities', 'top 3', 'focus today', 'set priorities'],
  trigger_label: 'Set My Big 3',
  trigger_icon: '🎯',
  steps: [
    {
      id: 'big3_1',
      prompt: "🎯 Let's set your Big 3 — the three things that matter most today.\n\nPriority 1?",
      input_type: 'text',
      label: 'Priority 1',
      placeholder: 'e.g. Finalise Q3 hiring plan',
      field: 'big3_1',
    },
    {
      id: 'big3_2',
      prompt: 'Priority 2?',
      input_type: 'text',
      label: 'Priority 2',
      placeholder: 'e.g. 1:1 with Sarah about her career path',
      field: 'big3_2',
    },
    {
      id: 'big3_3',
      prompt: 'Priority 3?',
      input_type: 'text',
      label: 'Priority 3',
      placeholder: 'e.g. Review the customer churn data',
      field: 'big3_3',
    },
  ],
  async onComplete(serviceBase44, userEmail, data) {
    const big3 = [data.big3_1, data.big3_2, data.big3_3].filter(Boolean);
    const big3_priorities = big3.map((title, i) => ({
      id: `big3_${i}_${Date.now()}`,
      title,
      status: 'planned',
    }));

    await upsertDailyCheckIn(serviceBase44, userEmail, {
      check_in_type: 'morning',
      big3_priorities,
      morning_completed: true,
      morning_completed_at: new Date().toISOString(),
    });

    return `🎯 Big 3 set:\n${big3.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nI'll check in on these this afternoon.`;
  },
};

// ── Weekly Reflection Flow ──────────────────────────────────────────────────

const weeklyReflection: Flow = {
  id: 'weekly_reflection',
  group: 1,
  name: 'Weekly Reflection',
  trigger_keywords: ['weekly reflection', 'week review', 'end of week', 'friday reflection', 'week summary'],
  trigger_label: 'Weekly Reflection',
  trigger_icon: '📅',
  steps: [
    {
      id: 'accomplishments',
      prompt: "📅 Let's reflect on the week.\n\nWhat did you accomplish this week?",
      input_type: 'text',
      label: 'Accomplishments',
      placeholder: 'The wins, big or small',
      field: 'accomplishments',
    },
    {
      id: 'next_priority',
      prompt: "What's your top priority for next week?",
      input_type: 'text',
      label: 'Top priority',
      placeholder: 'The one thing that matters most',
      field: 'next_priority',
    },
    {
      id: 'energy_level',
      prompt: 'How was your energy this week?',
      input_type: 'choice',
      label: 'Energy / morale',
      choices: SCORE_CHOICES,
      field: 'energy_level',
    },
    {
      id: 'help_needed',
      prompt: 'What help or resources do you need?',
      input_type: 'text',
      label: 'Help needed',
      placeholder: 'Optional',
      field: 'help_needed',
      optional: true,
    },
    {
      id: 'feedback',
      prompt: 'Any feedback, concerns, or recognition to share?',
      input_type: 'text',
      label: 'Feedback',
      placeholder: 'Optional',
      field: 'feedback_to_give',
      optional: true,
    },
  ],
  async onComplete(serviceBase44, userEmail, data) {
    const users = await serviceBase44.entities.User.filter({ email: userEmail }).catch(() => []);
    const managerEmail = users[0]?.data?.manager_email || userEmail;
    const clientId = users[0]?.data?.client_id || '';

    await serviceBase44.entities.WeeklyCheckIn.create({
      client_id: clientId,
      employee_email: userEmail,
      manager_email: managerEmail,
      week_of: weekStartISO(),
      accomplishments: data.accomplishments || '',
      next_priority: data.next_priority || '',
      energy_level: parseInt(data.energy_level) || 3,
      help_needed: data.help_needed || '',
      feedback_to_give: data.feedback_to_give || '',
    });

    return `📅 Weekly reflection saved. Your top priority for next week: "${data.next_priority}". I'll keep an eye on that with you.`;
  },
};

// ── Export ──────────────────────────────────────────────────────────────────

export const GROUP1_FLOWS: Flow[] = [
  morningCheckin,
  eveningCheckin,
  big3QuickSet,
  weeklyReflection,
];