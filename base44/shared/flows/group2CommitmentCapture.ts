/**
 * group2CommitmentCapture.ts
 *
 * Group 2 flow: commitment capture — the first half of the closed loop.
 * When a manager states a commitment ("I will..."), this flow captures it
 * as a Goal (goal_type: 'action_item') with optional due date, competency
 * link, and success criteria. The follow-up flow (Group 3) checks on it later.
 */

import type { Flow } from '../conversationStateMachine.ts';

const commitmentCapture: Flow = {
  id: 'commitment_capture',
  group: 2,
  name: 'Commitment Capture',
  trigger_keywords: ['commit', 'i will', 'promise to', 'commitment', 'action item', 'i plan to'],
  trigger_label: 'Capture a Commitment',
  trigger_icon: '📝',
  steps: [
    {
      id: 'commitment_text',
      prompt: "📝 What are you committing to do? Start with \"I will...\"",
      input_type: 'text',
      label: 'Your commitment',
      placeholder: 'e.g. I will delegate the Q3 report to Sarah by Friday',
      field: 'commitment_text',
    },
    {
      id: 'due_date',
      prompt: 'By when?',
      input_type: 'text',
      label: 'Due date',
      placeholder: 'e.g. Friday, or 2026-10-05',
      field: 'due_date',
      optional: true,
    },
    {
      id: 'success_criteria',
      prompt: 'What does success look like?',
      input_type: 'text',
      label: 'Success criteria',
      placeholder: 'Optional — a sentence is enough',
      field: 'success_criteria',
      optional: true,
    },
  ],
  async onComplete(serviceBase44, userEmail, data) {
    const title = data.commitment_text || 'Untitled commitment';
    await serviceBase44.entities.Goal.create({
      title,
      description: data.success_criteria || '',
      goal_type: 'action_item',
      status: 'active',
      progress: 0,
      timeframe_end: data.due_date || undefined,
    });

    return `📝 Commitment captured: "${title}"${data.due_date ? ` (by ${data.due_date})` : ''}. I'll check in on this with you.`;
  },
};

export const GROUP2_FLOWS: Flow[] = [commitmentCapture];