/**
 * DecisionAuditRubrics — Dynamic audit guidance based on decision type
 * Maps decision_type to context-specific questions and competency guidance
 */

export const AUDIT_RUBRICS = {
  operational: {
    label: 'Operational Decision',
    steps: [
      {
        id: 1,
        title: 'Frame the decision',
        prompt: "What's the core operational decision you're making?",
        followUp: "What operational areas does this NOT affect?",
        guidance: "Operational decisions often have ripple effects — tight framing prevents scope creep.",
        competency: 'Situational Intelligence',
      },
      {
        id: 2,
        title: 'Surface real alternatives',
        prompt: 'What are 2–3 operational approaches you could take?',
        followUp: 'Which alternative would operational teams most resist, and why?',
        guidance: 'Strong operational decisions consider feasibility and team buy-in, not just efficiency.',
        competency: 'Decision Making',
      },
      {
        id: 3,
        title: 'Check information quality',
        prompt: 'What operational data are you relying on? What is still uncertain?',
        followUp: 'Are you assuming something about process compliance or team capacity?',
        guidance: 'Operational decisions often fail on hidden assumptions about how work actually happens.',
        competency: 'Evidence-Based Management',
      },
      {
        id: 4,
        title: 'Make trade-offs explicit',
        prompt: 'What are you optimizing for — speed, quality, cost, or team capacity?',
        followUp: 'What operational cost or risk are you willing to accept?',
        guidance: 'Naming the trade-off signals that you have thought through consequences, not just benefits.',
        competency: 'Resource Management',
      },
      {
        id: 5,
        title: 'Test the logic',
        prompt: 'Why is this operational approach better than the others?',
        followUp: 'If this implementation fails, what operational bottleneck will likely cause it?',
        guidance: 'Pre-mortem on operational decisions surfaces resource constraints and dependency risks.',
        competency: 'Problem Solving',
      },
      {
        id: 6,
        title: 'Commit to execution and review',
        prompt: 'What will you do first to operationalize this, and by when?',
        followUp: 'What operational metric or team feedback would tell you this needs adjustment?',
        guidance: 'Operational decisions require clear owner, timeline, and success signal.',
        competency: 'Execution Discipline',
      },
    ],
  },
  people: {
    label: 'People Decision',
    steps: [
      {
        id: 1,
        title: 'Frame the decision',
        prompt: "What's the core people decision you're making?",
        followUp: "Who is directly affected by this decision, and who is not involved?",
        guidance: "People decisions have emotional impact — clear framing prevents unintended consequences.",
        competency: 'Situational Intelligence',
      },
      {
        id: 2,
        title: 'Surface real alternatives',
        prompt: 'What are 2–3 approaches to this people situation?',
        followUp: 'What alternative would be fairest to the people involved, even if harder for you?',
        guidance: 'Strong people decisions balance organizational needs with individual fairness.',
        competency: 'Judgment',
      },
      {
        id: 3,
        title: 'Check information quality',
        prompt: 'What do you know directly about this person/team? What are you inferring?',
        followUp: 'What are you assuming about their motivation, capability, or context?',
        guidance: 'People decisions often fail because we unknowingly project assumptions onto others.',
        competency: 'Critical Thinking',
      },
      {
        id: 4,
        title: 'Make trade-offs explicit',
        prompt: 'What are you optimizing for — individual growth, team morale, performance, or retention?',
        followUp: 'What human cost or risk are you willing to accept?',
        guidance: 'Explicit trade-offs protect psychological safety by showing you considered the person.',
        competency: 'Judgment',
      },
      {
        id: 5,
        title: 'Test the logic',
        prompt: 'Why is this the fairest approach for the person and the organization?',
        followUp: 'If this people decision goes poorly, what will probably have caused it?',
        guidance: 'Pre-mortem on people decisions exposes bias, miscommunication, or timing risks.',
        competency: 'Emotional Intelligence',
      },
      {
        id: 6,
        title: 'Commit to execution and review',
        prompt: 'How will you communicate this decision, and what support will you offer?',
        followUp: 'How and when will you check whether the person is thriving under this decision?',
        guidance: 'People decisions require care in delivery and accountability for follow-through.',
        competency: 'Accountability',
      },
    ],
  },
  strategic: {
    label: 'Strategic Decision',
    steps: [
      {
        id: 1,
        title: 'Frame the decision',
        prompt: "What's the core strategic choice you're making?",
        followUp: "What strategic directions are you explicitly rejecting, and why?",
        guidance: "Strategic decisions define what you will NOT do — clear boundaries enable focus.",
        competency: 'Strategic Thinking',
      },
      {
        id: 2,
        title: 'Surface real alternatives',
        prompt: 'What are 2–3 strategic directions you seriously considered?',
        followUp: 'What would a credible skeptic argue for instead, and why is it compelling?',
        guidance: 'Strong strategic decisions acknowledge the best case for rejected alternatives.',
        competency: 'Strategic Thinking',
      },
      {
        id: 3,
        title: 'Check information quality',
        prompt: 'What market, competitive, or trend data inform this choice?',
        followUp: 'What are you assuming about the market, your capability, or your competition?',
        guidance: 'Strategic decisions often fail on hidden assumptions about the future or your strengths.',
        competency: 'Evidence-Based Strategy',
      },
      {
        id: 4,
        title: 'Make trade-offs explicit',
        prompt: 'What strategic value are you optimizing for — growth, profitability, innovation, or stability?',
        followUp: 'What strategic risk or capability are you willing to sacrifice?',
        guidance: 'Strategic trade-offs signal that you have thought through long-term consequences.',
        competency: 'Strategic Judgment',
      },
      {
        id: 5,
        title: 'Test the logic',
        prompt: 'Why is this strategic direction better positioned for your market than the alternatives?',
        followUp: 'If this strategy fails, what external factor or capability gap will likely cause it?',
        guidance: 'Pre-mortem on strategy exposes market risks, execution gaps, or competitive blind spots.',
        competency: 'Risk Awareness',
      },
      {
        id: 6,
        title: 'Commit to execution and review',
        prompt: 'What are your first 90-day actions to operationalize this strategy?',
        followUp: 'What strategic signal or milestone would tell you to pivot or double down?',
        guidance: 'Strategic decisions require clear milestones and the discipline to revisit when conditions shift.',
        competency: 'Strategic Execution',
      },
    ],
  },
};

export const COMPETENCY_MAP = {
  frame: ['Situational Intelligence', 'Judgment'],
  alternatives: ['Decision Making', 'Strategic Thinking', 'Judgment'],
  information: ['Evidence-Based Management', 'Critical Thinking', 'Evidence-Based Strategy'],
  tradeoffs: ['Judgment', 'Resource Management', 'Strategic Judgment'],
  reasoning: ['Problem Solving', 'Emotional Intelligence', 'Risk Awareness'],
  commitment: ['Accountability', 'Execution Discipline', 'Strategic Execution'],
};

export function getRubricForType(decisionType) {
  return AUDIT_RUBRICS[decisionType] || AUDIT_RUBRICS.operational;
}