/**
 * group4PracticeLearning.ts
 *
 * Group 4 flows: practice / learning.
 * - practice_start: select a published ConversationalLearningModule (workout) and begin
 * - learning_start: select a learning module, check prerequisites, and start
 *
 * Both flows create an AssignedLearning record so progress is tracked in the
 * platform. The full interactive experience lives in the web app; the chat
 * flow gets the user started and points them to the platform.
 */

import type { Flow } from '../conversationStateMachine.ts';

const practiceStart: Flow = {
  id: 'practice_start',
  group: 4,
  name: 'Practice Workout',
  trigger_keywords: ['practice', 'workout', 'drill', 'skill building', 'train'],
  trigger_label: 'Start a Practice Workout',
  trigger_icon: '🏋️',
  steps: [
    {
      id: 'select_workout',
      prompt: '🏋️ Which workout would you like to practice?',
      input_type: 'choice',
      label: 'Select workout',
      field: 'module_id',
      dynamic_choices: async (serviceBase44, userEmail) => {
        const modules = await serviceBase44.entities.ConversationalLearningModule.filter(
          { status: 'published', is_active: true, workout_type: 'skill' },
          '-created_date', 10
        ).catch(() => []);
        if (modules.length === 0) {
          // Fallback: any published module
          const all = await serviceBase44.entities.ConversationalLearningModule.filter(
            { status: 'published', is_active: true },
            '-created_date', 10
          ).catch(() => []);
          return all.map(m => ({ label: (m.title || m.id).slice(0, 70), value: m.id }));
        }
        return modules.map(m => ({ label: (m.title || m.id).slice(0, 70), value: m.id }));
      },
    },
  ],
  async onComplete(serviceBase44, userEmail, data) {
    const mod = await serviceBase44.entities.ConversationalLearningModule.get(data.module_id).catch(() => null);
    if (!mod) return 'Workout not found. Please try again.';

    // Create an AssignedLearning record so progress is tracked
    await serviceBase44.entities.AssignedLearning.create({
      user_email: userEmail,
      resource_type: 'conversational_module',
      resource_id: data.module_id,
      resource_title: mod.title,
      status: 'assigned',
      assigned_by: 'atreus',
    }).catch(() => {});

    const stepCount = mod.conversation_structures?.length || 0;
    return `🏋️ Starting "${mod.title}" (${stepCount} steps). I'll guide you through it. Open the full interactive experience in the Atreus platform to begin.`;
  },
};

const learningStart: Flow = {
  id: 'learning_start',
  group: 4,
  name: 'Start a Learning Module',
  trigger_keywords: ['learn', 'learning module', 'course', 'study', 'lesson'],
  trigger_label: 'Start a Learning Module',
  trigger_icon: '📚',
  steps: [
    {
      id: 'select_module',
      prompt: '📚 Which learning module would you like to start?',
      input_type: 'choice',
      label: 'Select module',
      field: 'module_id',
      dynamic_choices: async (serviceBase44, userEmail) => {
        const modules = await serviceBase44.entities.ConversationalLearningModule.filter(
          { status: 'published', is_active: true },
          '-created_date', 10
        ).catch(() => []);
        return modules.map(m => ({ label: (m.title || m.id).slice(0, 70), value: m.id }));
      },
    },
  ],
  async onComplete(serviceBase44, userEmail, data) {
    const mod = await serviceBase44.entities.ConversationalLearningModule.get(data.module_id).catch(() => null);
    if (!mod) return 'Module not found. Please try again.';

    // Check prerequisites
    const prereqIds = mod.prerequisite_module_ids || [];
    if (prereqIds.length > 0) {
      const completed = await serviceBase44.entities.AssignedLearning.filter(
        { user_email: userEmail, status: 'completed' },
        '-created_date', 50
      ).catch(() => []);
      const completedIds = new Set(completed.map(c => c.resource_id));
      const missing = prereqIds.filter(id => !completedIds.has(id));
      if (missing.length > 0) {
        const missingModules = await Promise.all(
          missing.slice(0, 3).map(id => serviceBase44.entities.ConversationalLearningModule.get(id).catch(() => null))
        );
        const titles = missingModules.filter(Boolean).map(m => m.title).join(', ');
        return `📚 "${mod.title}" has prerequisites you haven't completed yet: ${titles}. Start those first, then come back.`;
      }
    }

    // Create an AssignedLearning record
    await serviceBase44.entities.AssignedLearning.create({
      user_email: userEmail,
      resource_type: 'conversational_module',
      resource_id: data.module_id,
      resource_title: mod.title,
      status: 'assigned',
      assigned_by: 'atreus',
    }).catch(() => {});

    return `📚 Started "${mod.title}". Open the full interactive experience in the Atreus platform to begin.`;
  },
};

export const GROUP4_FLOWS: Flow[] = [practiceStart, learningStart];