/**
 * conversationStateMachine.ts
 *
 * Turn-by-turn conversational state machine for Teams/Slack channels.
 * Manages multi-step flows (check-ins, Big 3, weekly reflection, commitment
 * capture, practice, assessment, alerts) with persistent state between turns.
 *
 * Architecture:
 *   - Flows are declarative specs (steps, prompts, input types, transitions)
 *   - State is persisted in the ConversationState entity (one active per user/channel)
 *   - The turn handler loads state, processes input, advances, and returns the next card
 *   - Completion handlers persist collected data to the right entities (DailyCheckIn, etc.)
 *
 * Flow groups:
 *   Group 1: Daily rhythm (morning/evening check-in, Big 3, weekly reflection)
 *   Group 2: Commitment capture (the closed loop)
 *   Group 3: Follow-up (commitment follow-through tracking)
 *   Group 4: Practice / learning
 *   Group 5: Assessment
 *   Group 6: Alerts / calendar
 *
 * Currently registered: Group 1. Groups 2–6 will be added as separate flow files.
 */

import { GROUP1_FLOWS } from './flows/group1DailyRhythm.ts';
import { GROUP2_FLOWS } from './flows/group2CommitmentCapture.ts';
import { GROUP3_FLOWS } from './flows/group3CommitmentFollowup.ts';
import { GROUP4_FLOWS } from './flows/group4PracticeLearning.ts';
import { GROUP5_FLOWS } from './flows/group5Assessment.ts';
import { GROUP6_FLOWS } from './flows/group6AlertsCalendar.ts';

// ── Types ──────────────────────────────────────────────────────────────────

export interface FlowStep {
  id: string;
  prompt: string;
  input_type: 'choice' | 'text' | 'number';
  label?: string;
  placeholder?: string;
  choices?: { label: string; value: string }[];
  dynamic_choices?: (serviceBase44: any, userEmail: string) => Promise<{ label: string; value: string }[]>;
  field: string;
  optional?: boolean;
  next?: string;
  skip_if?: (data: Record<string, any>) => boolean;
}

export interface Flow {
  id: string;
  group: number;
  name: string;
  trigger_keywords: string[];
  trigger_label: string;
  trigger_icon: string;
  steps: FlowStep[];
  onComplete: (serviceBase44: any, userEmail: string, data: Record<string, any>) => Promise<string>;
}

export interface TurnResponse {
  message: string;
  card?: any;
  is_complete: boolean;
  matched: boolean;
  suggested_actions?: { label: string; flow_id: string }[];
}

// ── Flow Registry ──────────────────────────────────────────────────────────

const FLOWS: Record<string, Flow> = {};
for (const flow of [...GROUP1_FLOWS, ...GROUP2_FLOWS, ...GROUP3_FLOWS, ...GROUP4_FLOWS, ...GROUP5_FLOWS, ...GROUP6_FLOWS]) {
  FLOWS[flow.id] = flow;
}

export function getFlow(flowId: string): Flow | null {
  return FLOWS[flowId] || null;
}

export function getAllFlows(): Flow[] {
  return Object.values(FLOWS);
}

// ── State Persistence ──────────────────────────────────────────────────────

async function loadActiveState(serviceBase44: any, userEmail: string, channel: string) {
  const states = await serviceBase44.entities.ConversationState.filter(
    { user_email: userEmail, channel, status: 'active' },
    '-last_turn_at', 1
  ).catch(() => []);
  return states[0] || null;
}

async function createState(
  serviceBase44: any,
  userEmail: string,
  channel: string,
  conversationId: string,
  flowId: string,
  stepId: string
) {
  const now = new Date().toISOString();
  return await serviceBase44.entities.ConversationState.create({
    user_email: userEmail,
    channel,
    channel_conversation_id: conversationId || '',
    flow_id: flowId,
    step_id: stepId,
    collected_data: {},
    status: 'active',
    started_at: now,
    last_turn_at: now,
  });
}

async function updateState(serviceBase44: any, state: any, updates: any) {
  return await serviceBase44.entities.ConversationState.update(state.id, {
    ...updates,
    last_turn_at: new Date().toISOString(),
  });
}

async function markStateCompleted(serviceBase44: any, state: any) {
  return await serviceBase44.entities.ConversationState.update(state.id, {
    status: 'completed',
    last_turn_at: new Date().toISOString(),
  });
}

async function abandonActiveFlow(serviceBase44: any, state: any) {
  if (!state) return;
  return await serviceBase44.entities.ConversationState.update(state.id, {
    status: 'abandoned',
    last_turn_at: new Date().toISOString(),
  });
}

// ── Trigger Matching ────────────────────────────────────────────────────────

export function matchFlowTrigger(text: string): Flow | null {
  const lower = text.toLowerCase();
  for (const flow of Object.values(FLOWS)) {
    if (flow.trigger_keywords.some(kw => lower.includes(kw))) {
      return flow;
    }
  }
  return null;
}

// ── Step Navigation ───────────────────────────────────────────────────────

function findNextStep(flow: Flow, currentStep: FlowStep, data: Record<string, any>): FlowStep | null {
  if (currentStep.next) {
    const next = flow.steps.find(s => s.id === currentStep.next);
    if (next) {
      if (next.skip_if && next.skip_if(data)) return findNextStep(flow, next, data);
      return next;
    }
  }
  const idx = flow.steps.findIndex(s => s.id === currentStep.id);
  for (let i = idx + 1; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    if (step.skip_if && step.skip_if(data)) continue;
    return step;
  }
  return null;
}

// ── Dynamic Choice Resolution ──────────────────────────────────────────────

async function resolveStepChoices(serviceBase44: any, userEmail: string, step: FlowStep): Promise<FlowStep> {
  if (step.dynamic_choices) {
    try {
      const choices = await step.dynamic_choices(serviceBase44, userEmail);
      return { ...step, choices };
    } catch {
      return { ...step, choices: [] };
    }
  }
  return step;
}

// ── Freeform Text Parsing ──────────────────────────────────────────────────

function parseFreeformInput(step: FlowStep, text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (step.input_type === 'choice' && step.choices) {
    const lower = trimmed.toLowerCase();
    const match = step.choices.find(c =>
      c.value === trimmed ||
      c.label.toLowerCase() === lower ||
      c.value.toLowerCase() === lower ||
      c.label.toLowerCase().includes(lower)
    );
    return match?.value || null;
  }
  if (step.input_type === 'number') {
    const num = parseInt(trimmed);
    return isNaN(num) ? null : String(num);
  }
  return trimmed;
}

// ── Card Rendering ──────────────────────────────────────────────────────────

function renderStepCard(flow: Flow, step: FlowStep): any {
  const card: any = {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      { type: 'TextBlock', text: '🧠 Atreus', weight: 'Bolder', color: 'Accent' },
      { type: 'TextBlock', text: step.prompt, wrap: true },
    ],
    actions: [],
  };

  if (step.input_type === 'choice' && step.choices) {
    card.body.push({
      type: 'Input.ChoiceSet',
      id: 'step_value',
      label: step.label || '',
      choices: step.choices.map(c => ({ title: c.label, value: c.value })),
    });
  } else if (step.input_type === 'text') {
    card.body.push({
      type: 'Input.Text',
      id: 'step_value',
      label: step.label || '',
      placeholder: step.placeholder || '',
      isMultiline: true,
    });
  } else if (step.input_type === 'number') {
    card.body.push({
      type: 'Input.Text',
      id: 'step_value',
      label: step.label || '',
      placeholder: step.placeholder || 'Enter a number',
    });
  }

  card.actions.push({
    type: 'Action.Submit',
    title: step.optional ? 'Skip' : 'Submit',
    data: { action: 'flow_step', flow_id: flow.id, step_id: step.id },
  });

  card.actions.push({
    type: 'Action.Submit',
    title: 'Cancel',
    data: { action: 'flow_cancel' },
  });

  return card;
}

function renderCompletionCard(message: string, suggestedActions: any[]): any {
  const card: any = {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      { type: 'TextBlock', text: '🧠 Atreus', weight: 'Bolder', color: 'Accent' },
      { type: 'TextBlock', text: message, wrap: true },
    ],
    actions: [],
  };

  suggestedActions.slice(0, 3).forEach(action => {
    card.actions.push({
      type: 'Action.Submit',
      title: action.label,
      data: { action: 'flow_start', flow_id: action.flow_id },
    });
  });

  card.actions.push({
    type: 'Action.Submit',
    title: 'Menu',
    data: { action: 'menu' },
  });

  return card;
}

export function renderMenuCard(flows: Flow[], extraActions: any[] = []): any {
  const card: any = {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      { type: 'TextBlock', text: '🧠 Atreus — Manager Development Companion', weight: 'Bolder', size: 'Medium' },
      { type: 'TextBlock', text: 'What would you like to do?', wrap: true },
    ],
    actions: [],
  };

  flows.forEach(flow => {
    card.actions.push({
      type: 'Action.Submit',
      title: `${flow.trigger_icon} ${flow.trigger_label}`,
      data: { action: 'flow_start', flow_id: flow.id },
    });
  });

  extraActions.forEach(action => card.actions.push(action));

  return card;
}

// ── Turn Handler ────────────────────────────────────────────────────────────

export async function processTurn(
  serviceBase44: any,
  userEmail: string,
  channel: string,
  conversationId: string,
  input: { type: string; flow_id?: string; step_id?: string; value?: string; text?: string }
): Promise<TurnResponse | null> {
  // ── Flow start ──────────────────────────────────────────────────────────
  if (input.type === 'flow_start' && input.flow_id) {
    const flow = getFlow(input.flow_id);
    if (!flow) return { message: 'Unknown flow.', is_complete: true, matched: false };

    const activeState = await loadActiveState(serviceBase44, userEmail, channel);
    if (activeState) await abandonActiveFlow(serviceBase44, activeState);

    // If flow has no steps, complete immediately (e.g. view_alerts)
    if (flow.steps.length === 0) {
      const completionMessage = await flow.onComplete(serviceBase44, userEmail, {});
      const suggestions = getAllFlows()
        .filter(f => f.group <= 3 && f.id !== flow.id)
        .slice(0, 3)
        .map(f => ({ label: `${f.trigger_icon} ${f.trigger_label}`, flow_id: f.id }));
      return { message: completionMessage, card: renderCompletionCard(completionMessage, suggestions), is_complete: true, matched: true, suggested_actions: suggestions };
    }

    const firstStep = await resolveStepChoices(serviceBase44, userEmail, flow.steps[0]);
    if (firstStep.input_type === 'choice' && (!firstStep.choices || firstStep.choices.length === 0)) {
      return { message: 'No items available right now.', card: renderMenuCard(getAllFlows()), is_complete: true, matched: true };
    }
    await createState(serviceBase44, userEmail, channel, conversationId, flow.id, firstStep.id);
    return { message: firstStep.prompt, card: renderStepCard(flow, firstStep), is_complete: false, matched: true };
  }

  // ── Menu ────────────────────────────────────────────────────────────────
  if (input.type === 'menu') {
    const activeState = await loadActiveState(serviceBase44, userEmail, channel);
    if (activeState) await abandonActiveFlow(serviceBase44, activeState);
    return { message: 'What would you like to do?', card: renderMenuCard(getAllFlows()), is_complete: true, matched: true };
  }

  // ── Flow cancel ─────────────────────────────────────────────────────────
  if (input.type === 'flow_cancel') {
    const activeState = await loadActiveState(serviceBase44, userEmail, channel);
    if (activeState) await abandonActiveFlow(serviceBase44, activeState);
    return { message: 'Flow cancelled. What would you like to do?', card: renderMenuCard(getAllFlows()), is_complete: true, matched: true };
  }

  // ── Step submit ─────────────────────────────────────────────────────────
  if (input.type === 'step_submit' && input.step_id) {
    const activeState = await loadActiveState(serviceBase44, userEmail, channel);
    if (!activeState) {
      return { message: 'No active flow. What would you like to do?', card: renderMenuCard(getAllFlows()), is_complete: true, matched: false };
    }

    const flow = getFlow(activeState.flow_id);
    if (!flow) {
      await abandonActiveFlow(serviceBase44, activeState);
      return { message: 'Flow not found. What would you like to do?', card: renderMenuCard(getAllFlows()), is_complete: true, matched: false };
    }

    const currentStep = flow.steps.find(s => s.id === input.step_id);
    if (!currentStep) {
      await abandonActiveFlow(serviceBase44, activeState);
      return { message: 'Step not found. What would you like to do?', card: renderMenuCard(getAllFlows()), is_complete: true, matched: false };
    }

    // Store the value
    const collectedData = { ...(activeState.collected_data || {}) };
    if (input.value !== undefined && input.value !== '') {
      collectedData[currentStep.field] = currentStep.input_type === 'number'
        ? parseInt(input.value)
        : input.value;
    }

    const nextStep = findNextStep(flow, currentStep, collectedData);

    if (!nextStep) {
      // Flow complete
      const completionMessage = await flow.onComplete(serviceBase44, userEmail, collectedData);
      await markStateCompleted(serviceBase44, activeState);
      const suggestions = getAllFlows()
        .filter(f => f.group <= 2 && f.id !== flow.id)
        .slice(0, 3)
        .map(f => ({ label: `${f.trigger_icon} ${f.trigger_label}`, flow_id: f.id }));
      return { message: completionMessage, card: renderCompletionCard(completionMessage, suggestions), is_complete: true, matched: true, suggested_actions: suggestions };
    }

    const nextStepResolved = await resolveStepChoices(serviceBase44, userEmail, nextStep);
    if (nextStepResolved.input_type === 'choice' && (!nextStepResolved.choices || nextStepResolved.choices.length === 0)) {
      return { message: 'No items available right now.', card: renderMenuCard(getAllFlows()), is_complete: true, matched: true };
    }
    await updateState(serviceBase44, activeState, { step_id: nextStepResolved.id, collected_data: collectedData });
    return { message: nextStepResolved.prompt, card: renderStepCard(flow, nextStepResolved), is_complete: false, matched: true };
  }

  // ── Freeform text ───────────────────────────────────────────────────────
  if (input.type === 'freeform_text' && input.text) {
    const activeState = await loadActiveState(serviceBase44, userEmail, channel);

    if (activeState) {
      const flow = getFlow(activeState.flow_id);
      if (flow) {
        const currentStep = flow.steps.find(s => s.id === activeState.step_id);
        if (currentStep) {
          const parsedValue = parseFreeformInput(currentStep, input.text);
          if (parsedValue !== null) {
            return processTurn(serviceBase44, userEmail, channel, conversationId, {
              type: 'step_submit',
              step_id: currentStep.id,
              value: parsedValue,
            });
          }
          // Could not parse — re-prompt
          return { message: `I didn't catch that. ${currentStep.prompt}`, card: renderStepCard(flow, currentStep), is_complete: false, matched: true };
        }
      }
    }

    // No active flow — try to match trigger
    const matchedFlow = matchFlowTrigger(input.text);
    if (matchedFlow) {
      if (matchedFlow.steps.length === 0) {
        const completionMessage = await matchedFlow.onComplete(serviceBase44, userEmail, {});
        const suggestions = getAllFlows()
          .filter(f => f.group <= 3 && f.id !== matchedFlow.id)
          .slice(0, 3)
          .map(f => ({ label: `${f.trigger_icon} ${f.trigger_label}`, flow_id: f.id }));
        return { message: completionMessage, card: renderCompletionCard(completionMessage, suggestions), is_complete: true, matched: true, suggested_actions: suggestions };
      }
      const firstStep = await resolveStepChoices(serviceBase44, userEmail, matchedFlow.steps[0]);
      if (firstStep.input_type === 'choice' && (!firstStep.choices || firstStep.choices.length === 0)) {
        return { message: 'No items available right now.', card: renderMenuCard(getAllFlows()), is_complete: true, matched: true };
      }
      await createState(serviceBase44, userEmail, channel, conversationId, matchedFlow.id, firstStep.id);
      return { message: firstStep.prompt, card: renderStepCard(matchedFlow, firstStep), is_complete: false, matched: true };
    }

    // No match — return null so the router can fall back to the orchestrator
    return null;
  }

  // ── Default ─────────────────────────────────────────────────────────────
  return { message: 'What would you like to do?', card: renderMenuCard(getAllFlows()), is_complete: true, matched: false };
}