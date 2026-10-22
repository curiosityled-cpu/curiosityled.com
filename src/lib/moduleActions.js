import { base44 } from "@/api/base44Client";

/**
 * Conversational learning modules: the coaching turn itself, plus the small set
 * of follow-through actions the coach may propose and the learner may approve.
 */

const TURN_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "Atreus's reply to the learner's latest message",
    },
    step_complete: {
      type: "boolean",
      description:
        "Whether the learner has met this step's objective AND confirmed they are ready to move on",
    },
    action_type: {
      type: "string",
      enum: ["none", "calendar_event", "create_task", "draft_communication"],
      description: "A single follow-through action to offer the learner, or none",
    },
    action_title: {
      type: "string",
      description: "Short label for the proposed action",
    },
    action_summary: {
      type: "string",
      description: "One sentence telling the learner exactly what would be done",
    },
    action_details: {
      type: "string",
      description: "The specifics needed to carry it out (who, what, wording)",
    },
    action_start_time: {
      type: "string",
      description: "ISO 8601 start time — only for calendar_event",
    },
    action_duration_minutes: {
      type: "number",
      description: "Length in minutes — only for calendar_event",
    },
  },
  required: ["reply", "step_complete", "action_type"],
};

/**
 * One coaching turn: reply to what the learner just said and decide whether the
 * current step is genuinely done. The step never advances on message length.
 */
export async function requestModuleTurn({ moduleData, stepIndex, messages, actionPending }) {
  const steps = moduleData.conversation_structure || [];
  const step = steps[stepIndex] || {};
  const isFinalStep = stepIndex >= steps.length - 1;

  const history = messages
    .map((m) => `${m.role === "user" ? "Learner" : "Atreus"}: ${m.content}`)
    .join("\n");

  const check = step.knowledge_check
    ? `\nKnowledge check — question: "${step.knowledge_check.question}". Options: ${(step.knowledge_check.options || []).join(" | ")}. Correct option: ${(step.knowledge_check.options || [])[step.knowledge_check.correct_answer_index]}. Treat this step as complete only once the learner's answer is essentially right; if it is wrong, explain briefly and invite another attempt.`
    : "";

  const today = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are Atreus, coaching one learner through the module "${moduleData.title}".
${moduleData.description ? `Module goals: ${moduleData.description}\n` : ""}
Today is ${today.toDateString()} (${today.toISOString()}), in the learner's timezone ${timeZone}.
Current step ${stepIndex + 1} of ${steps.length} (${step.step_type || "question"})${isFinalStep ? " — the final step, so completing it completes the module" : ""}.
The prompt the learner just saw: "${step.content || ""}"
Objective: ${step.learning_objective || "Guide the learner through this step."}
Coaching notes: ${step.coaching_notes || "Respond thoughtfully as a coach."}
${step.success_criteria ? `Success criteria: ${step.success_criteria}\n` : ""}${(step.required_topics || []).length ? `Topics that must be covered: ${step.required_topics.join(", ")}\n` : ""}${check}

Conversation so far:
${history}

Write Atreus's next message.
Rules:
- Answer the learner's latest message directly, in one to three short paragraphs, speaking to them as a coach. No headings, no long bullet lists.
- Ask at most one question, and only when you need their input. When step_complete is true, do not ask a question at all — the platform posts the next prompt immediately after your message, so end on a settled note instead.
- Never announce, preview, or summarise the next step or the module structure, and never say "let's move on" or "next up" — the platform posts the next step itself once this one is done.
- Never claim you have already done anything: never say you booked, scheduled, created, drafted, or sent something. You can only offer it and wait — the learner approves it first, and the platform then reports the result.
- Work inside the current step for as long as it takes. Additional questions, extra layers, and tangents are welcome — keep answering and keep coaching this same step until the learner is genuinely ready to move on, however many exchanges that needs.
- Set step_complete true only when BOTH are true: the step's objective${step.success_criteria ? " and success criteria" : ""} have been met, and the learner has confirmed they are ready to move on. As soon as you judge the objective met but they have not yet confirmed, keep step_complete false and ask one plain readiness question, such as "Are you ready to move on, or is there more you want to unpack here?" (on the final step, ask whether they are ready to wrap up the module). Completing the step as soon as they say yes — or when they say they are ready or done in their own words — is exactly right; never ask for confirmation twice in a row.
- Set step_complete false whenever the learner still has something to work through — including when they greeted you, changed the subject, gave a partial or off-target answer, asked you something first, or when you are still waiting on the input this step asks for — and respond to what they actually said with one focused follow-up.
${actionPending ? '- An action is already waiting for the learner\'s decision, so set action_type to "none".\n' : ""}- Propose one action only when the learner's own words point to concrete follow-through Curiosity Led can carry out: booking time (action_type "calendar_event"), creating a task or action item ("create_task"), or writing a message, email, or note ("draft_communication"). Use "none" otherwise, and never propose the same action twice.
- Write action_summary to the learner, plainly: "Add a 30-minute 1:1 with Jordan to your calendar for Friday at 2pm".
- For "calendar_event" fill action_start_time with an ISO 8601 timestamp in the learner's own timezone, with its offset (e.g. "2026-10-23T14:00:00-04:00"), plus action_duration_minutes. Work the date out from today's date above, taking the next occurrence of a named weekday, and never use a date in the past. Only propose a calendar event when a date and time is known or clearly implied — otherwise propose "create_task" instead.
- If the learner asks for more than one thing, propose the first and tell them you will come to the others next.`,
    response_json_schema: TURN_SCHEMA,
  });

  const action =
    result?.action_type && result.action_type !== "none"
      ? {
          type: result.action_type,
          title: (result.action_title || result.action_summary || "").trim(),
          summary: (result.action_summary || "").trim(),
          details: (result.action_details || "").trim(),
          start_time: result.action_start_time || null,
          duration_minutes: result.action_duration_minutes || 30,
        }
      : null;

  return {
    reply: (result?.reply || "").trim(),
    stepComplete: !!result?.step_complete,
    action,
  };
}

/** Carries out an approved action. Never throws — the learner always gets a straight answer. */
export async function executeModuleAction(action, user) {
  try {
    if (action.type === "create_task") return await createTask(action, user);
    if (action.type === "calendar_event") return await addToCalendar(action, user);
    if (action.type === "draft_communication") return await writeDraft(action, user);
    return { ok: false, message: "I couldn't carry that one out." };
  } catch (error) {
    return {
      ok: false,
      message: `I couldn't carry that out: ${error?.message || "something went wrong"}.`,
    };
  }
}

async function createTask(action, user) {
  const title = action.title || action.summary || "Follow-through from learning";
  const created = await base44.entities.Goal.create({
    title,
    description: action.details || action.summary,
    goal_type: "action_item",
    status: "active",
    visibility: "private",
    timeframe_start: new Date().toISOString().slice(0, 10),
    client_id: user?.data?.client_id || undefined,
  });
  return {
    ok: true,
    message: `Done — "${created.title}" is now an action item in your goals, ready to pick up.`,
  };
}

async function addToCalendar(action, user) {
  if (!action.start_time) {
    return {
      ok: false,
      message: "I need a date and time before I can book that — tell me when works and I'll set it up.",
    };
  }
  const res = await base44.functions.invoke("createModuleCalendarEvent", {
    title: action.title || action.summary || "Follow-up",
    description: action.details || action.summary || "",
    start_time: action.start_time,
    duration_minutes: action.duration_minutes || 30,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  });
  const data = res?.data || {};
  if (data.error) {
    return { ok: false, message: `I couldn't add that to the calendar: ${data.error}` };
  }
  const when = new Date(data.start_time || action.start_time).toLocaleString();
  return {
    ok: true,
    message: `Done — "${data.title}" is on the calendar for ${when}, and the invite is on its way to you.`,
  };
}

async function writeDraft(action, user) {
  const draft = await base44.integrations.Core.InvokeLLM({
    prompt: `Write the communication the learner asked for while working through a leadership module.
What is needed: ${action.summary}
${action.details ? `Details to cover: ${action.details}\n` : ""}Writer: ${user?.full_name || "the learner"}
Write the finished piece in a natural, warm, professional voice, ready to send as it stands. If it is an email, start with a subject line. Return only the message itself, with no commentary about writing it.`,
  });
  return { ok: true, message: `Here's the draft, ready to use:\n\n${draft}` };
}