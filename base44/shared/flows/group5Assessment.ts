/**
 * group5Assessment.ts
 *
 * Group 5 flow: assessment.
 * Shows pending assessments and lets the user start one. Assessments are
 * too complex for a full chat experience, so this flow shows the list and
 * points to the platform for the full assessment.
 */

import type { Flow } from '../conversationStateMachine.ts';

const assessmentStatus: Flow = {
  id: 'assessment_status',
  group: 5,
  name: 'Assessment Status',
  trigger_keywords: ['assessment', 'take assessment', 'leadership index', 'evaluation', 'survey'],
  trigger_label: 'View Assessments',
  trigger_icon: '📊',
  steps: [
    {
      id: 'select_assessment',
      prompt: '📊 Here are your available assessments. Which would you like to take?',
      input_type: 'choice',
      label: 'Select assessment',
      field: 'assessment_id',
      dynamic_choices: async (serviceBase44, userEmail) => {
        // Try Assessment entity first, fall back to CustomAssessment
        let assessments: any[] = [];
        try {
          assessments = await serviceBase44.entities.Assessment.filter(
            { status: 'active' },
            '-created_date', 10
          );
        } catch {
          try {
            assessments = await serviceBase44.entities.CustomAssessment.filter(
              { status: 'published' },
              '-created_date', 10
            );
          } catch {
            assessments = [];
          }
        }
        return assessments.map(a => ({
          label: (a.title || a.name || a.id).slice(0, 70),
          value: a.id,
        }));
      },
    },
  ],
  async onComplete(serviceBase44, userEmail, data) {
    return `📊 Open the Atreus platform to take this assessment. I'll have your results ready for discussion when you're done. This is a development compass, not a certification — it's here to help you see where to grow.`;
  },
};

export const GROUP5_FLOWS: Flow[] = [assessmentStatus];