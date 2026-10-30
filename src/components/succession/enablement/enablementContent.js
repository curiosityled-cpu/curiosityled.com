/**
 * Content for the manager and sponsor enablement kit.
 *
 * Everything here is guidance a line manager or executive sponsor reads before
 * they are asked to act. It deliberately describes behaviour and conversations,
 * never a score, ranking, or readiness label — those are conclusions the system
 * keeps on the record and releases through the defined path.
 */

export const MANAGER_OBLIGATIONS = [
  {
    stage: "Evidence",
    title: "Contribute evidence, not verdicts",
    body: "When you are asked for input on someone, describe what you observed and when it happened. Specific situations, what the person did, and what changed as a result. Leave the judgement to the people who hold the full picture.",
  },
  {
    stage: "Evidence",
    title: "Answer within the window",
    body: "Evidence requests carry a due date because calibration cannot open without it. If you cannot contribute, say so early so the request can be reassigned rather than quietly stalling the cycle.",
  },
  {
    stage: "Accelerate",
    title: "Own the development conversation",
    body: "A development action only closes when someone confirms it happened. That person is usually you. Confirm what was actually done, not what was planned.",
  },
  {
    stage: "Transition",
    title: "Make the hand-over real",
    body: "Knowledge transfer is not a document dump. Every area on a transfer plan needs an owner, a method, and a date, and the transition cannot close while an area is untouched.",
  },
  {
    stage: "Monitor",
    title: "Raise what has changed",
    body: "If someone on the bench has moved on, declined, or grown faster than recorded, say so. The pipeline is only as current as the last person who updated it.",
  },
];

export const CONVERSATIONS = [
  {
    key: "evidence",
    title: "The evidence conversation",
    when: "You have been asked for input on someone's readiness.",
    purpose:
      "Give the panel specific, observable material it can weigh. Your job is not to rank the person against anyone else.",
    frame:
      "Open by saying why you are asking and what happens to what they tell you. Then keep to situations you saw yourself.",
    questions: [
      "What did they actually do in that situation, and what was the result?",
      "When did they last operate without you in the room, and how did it go?",
      "What would you want to see them do before you would hand them the whole scope?",
      "What is the strongest evidence against their readiness right now?",
    ],
    avoid:
      "Avoid adjectives with no situation behind them, comparisons to named colleagues, and anything about someone's personal circumstances.",
  },
  {
    key: "readiness",
    title: "The readiness conversation",
    when: "A readiness conclusion has been ratified and released, and you are talking it through with the person.",
    purpose:
      "Make sure the person understands what was concluded against the role, and what the conditions are. This is not a performance review and it is not a promise.",
    frame:
      "State the conclusion plainly, in the language of the role's requirements. Then go straight to what it means next.",
    questions: [
      "Which requirements do you feel strongest against, and where do you think the gap is?",
      "What would 'ready now' look like in your day-to-day work rather than on paper?",
      "What support would make the biggest difference over the next two quarters?",
      "Is anything about this conclusion surprising, or does it need a second look?",
    ],
    avoid:
      "Never imply a role is theirs, and never name a date that has not been recorded on the decision. A decision is not a succession announcement.",
  },
  {
    key: "development",
    title: "The development conversation",
    when: "A development plan exists and you are agreeing how the actions will actually happen.",
    purpose:
      "Turn a plan into work that fits the person's real week, with a named owner and a date on each action.",
    frame:
      "Bring the plan. Agree no more than three actions at a time and be explicit about what gets dropped to make room.",
    questions: [
      "Which of these can happen inside work you already own?",
      "What will you stop doing so this has room?",
      "Who else needs to be involved for this to be real?",
      "How will we both know it happened?",
    ],
    avoid:
      "Avoid adding actions you have no intention of protecting. An unowned action closes late or never, and both are visible on the record.",
  },
  {
    key: "handover",
    title: "The hand-over conversation",
    when: "A transition is approved and you are moving accountability to a successor.",
    purpose:
      "Transfer the knowledge, relationships, and access that make the role work, in an order that does not leave the seat empty in practice.",
    frame:
      "Work the transfer plan area by area. For each: who owns it, how it transfers, and by when.",
    questions: [
      "What do you know that is not written down anywhere?",
      "Which relationships will notice the change, and who introduces the successor?",
      "What breaks first if this is done badly?",
      "What should the successor be allowed to get wrong while you are still here?",
    ],
    avoid:
      "Avoid treating a shared folder as a hand-over. Access, relationships, and judgement are the parts that actually fail.",
  },
  {
    key: "not-now",
    title: "The 'not yet' conversation",
    when: "The decision was develop-and-revisit, or no viable successor was identified.",
    purpose:
      "Keep the person engaged and honest about where they stand, without turning a gap into a verdict on them.",
    frame:
      "Say clearly that the conclusion is about the role's requirements today, not about their value. Then name the specific gaps.",
    questions: [
      "Which of these gaps do you disagree with, and what should I look at again?",
      "What evidence would change the picture in six months?",
      "Would you rather close the widest gap first, or the one that interests you most?",
      "What would make you decide this role is not what you want?",
    ],
    avoid:
      "Avoid vagueness to soften the message. People manage a named gap; they cannot manage 'not quite ready'.",
  },
];

export const GUARDRAILS = [
  {
    title: "No ranking, ever",
    body: "Candidates are assessed against a role's requirements. There is no leaderboard, no nine-box, and no forced distribution to appeal to.",
  },
  {
    title: "Sealed demographics stay sealed",
    body: "Protected demographic data is held separately and used only in aggregate to test outcomes for adverse impact. It never appears beside a name and never influences a readiness conclusion.",
  },
  {
    title: "Nothing is promised before ratification",
    body: "A recorded decision is not ratified until a second authority countersigns it, and the person who recorded it cannot ratify it themselves.",
  },
  {
    title: "Everyone can see what is held about them",
    body: "Candidates can be told, and can ask, what evidence is being used and what conclusion it supported. Notices are versioned, so what someone was told stays readable exactly as sent.",
  },
];

export const WHEN_NOT_NOW = [
  {
    title: "Name the gap, not the label",
    body: "Say which requirement is not yet evidenced and what would evidence it. A named gap is workable; a verdict is not.",
  },
  {
    title: "Keep the development real",
    body: "A develop-and-revisit decision should leave the person with actions that close the named gaps, or it is a polite no.",
  },
  {
    title: "Set the revisit point",
    body: "Record when the picture will be looked at again. Without a date, 'not yet' quietly becomes 'never'.",
  },
];