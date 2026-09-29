/**
 * group3CommitmentFollowup.ts
 *
 * Group 3 flow: commitment follow-up — the second half of the closed loop.
 * Lists the manager's open action-item commitments, asks about follow-through,
 * and updates the Goal with status + an evidence entry. This closes the loop
 * between commitment capture (Group 2) and behavioral evidence.
 */

import type { Flow } from '../conversationStateMachine.ts';

const commitmentFollowup: Flow = {
  id: 'commitment_followup',
  group: 3,
  name: 'Commitment Follow-Up',
  trigger_keywords: ['follow up', 'followup', 'follow through', 'check commitment', 'commitment status', 'update commitment'],
  trigger_label: 'Follow Up on Commitments',
  trigger_icon: '🔄',
  steps: [
    {
      id: 'select_commitment',
      prompt: '🔄 Which commitment would you like to update?',
      input_type: 'choice',
      label: 'Select commitment',
      field: 'goal_id',
      dynamic_choices: async (serviceBase44, userEmail) => {
        const goals = await serviceBase44.entities.Goal.filter(
          { created_by: userEmail, goal_type: 'action_item', status: 'active' },
          '-updated_date', 10
        ).catch(() => []);
        return goals.map(g => ({
          label: (g.title || g.id).slice(0, 70),
          value: g.id,
        }));
      },
    },
    {
      id: 'followthrough',
      prompt: 'Did you follow through?',
      input_type: 'choice',
      label: 'Status',
      choices: [
        { label: '✅ Completed', value: 'completed' },
        { label: '📈 In progress', value: 'in_progress' },
        { label: '🚫 Blocked', value: 'blocked' },
        { label: '⏭️ Not started', value: 'not_started' },
      ],
      field: 'followthrough_status',
    },
    {
      id: 'outcome_note',
      prompt: 'What happened?',
      input_type: 'text',
      label: 'Outcome',
      placeholder: 'Optional — a sentence is enough',
      field: 'outcome_note',
      optional: true,
    },
  ],
  async onComplete(serviceBase44, userEmail, data) {
    const goalId = data.goal_id;
    const status = data.followthrough_status;

    const goal = await serviceBase44.entities.Goal.get(goalId).catch(() => null);
    if (!goal) return 'Commitment not found. It may have been removed.';

    const updateData: any = {};
    if (status === 'completed') {
      updateData.status = 'archived';
      updateData.progress = 100;
    } else if (status === 'in_progress') {
      updateData.progress = Math.max(goal.progress || 0, 50);
    } else if (status === 'blocked') {
      updateData.progress = Math.max(goal.progress || 0, 25);
    }

    // Add evidence entry
    const evidenceEntries = goal.evidence_entries || [];
    evidenceEntries.push({
      id: `ev_${Date.now()}`,
      note_type: status === 'completed' ? 'accomplishment' : 'context',
      description: data.outcome_note || `Follow-up: ${status}`,
      source: 'checkin',
      date: new Date().toISOString().slice(0, 10),
      added_by_email: userEmail,
      added_at: new Date().toISOString(),
      visibility: 'employee_and_manager',
    });
    updateData.evidence_entries = evidenceEntries;

    await serviceBase44.entities.Goal.update(goalId, updateData);

    if (status === 'completed') return `✅ Great work following through on "${goal.title}". Marked complete.`;
    if (status === 'in_progress') return `📈 Noted — you're making progress on "${goal.title}". I'll check in again.`;
    if (status === 'blocked') return `🚫 What's blocking you on "${goal.title}"? Want to think through it together?`;
    return `⏭️ No worries — when you're ready to start "${goal.title}", I'm here.`;
  },
};

export const GROUP3_FLOWS: Flow[] = [commitmentFollowup];