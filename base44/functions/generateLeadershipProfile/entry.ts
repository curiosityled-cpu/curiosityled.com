import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ARCHETYPE_CONTENT = {
  "Adaptive Strategist": {
    dna_headline: "Excels at seeing the big picture and flexing plans in fast-changing environments",
    dna_unique_value: "You bring strategic clarity to chaos. When others feel overwhelmed by competing priorities or uncertain futures, you help them see the bigger picture and understand how current decisions will impact long-term success. You're the leader people turn to when they need to make sense of complex situations.",
    decision_tendencies: ["Weighs multiple scenarios before committing — you rarely accept the first option presented", "Needs time to process before deciding — pressure for instant answers triggers resistance", "Revisits decisions when new data emerges, which others may read as indecisiveness", "Naturally spots downstream risks that fast-movers miss entirely"],
    decision_derailers: ["Can stall at 80% certainty waiting for 100% clarity that never comes", "May over-engineer decisions that only need a simple yes/no"],
    communication_tendencies: ["Communicates in layers — context first, then conclusion — which can frustrate action-oriented colleagues", "Builds persuasive arguments over time rather than landing punchy one-liners", "Highly effective in writing where nuance can be expressed without time pressure"],
    communication_derailers: ["Can lose audiences by front-loading too much background before the point", "May under-communicate urgency because complexity feels more honest"],
    stress_triggers: [{ title: "Rigidity and Micromanagement", detail: "When you're forced to follow inflexible processes without the ability to adapt based on new information." }, { title: "Information Overload Without Time to Process", detail: "Being pushed to make quick decisions without adequate time to consider implications or gather necessary perspectives." }, { title: "Short-Term Pressure at Expense of Long-Term Success", detail: "When organizational demands focus only on immediate results without considering sustainable strategies." }],
    blind_spot_primary: { title: "Analysis Paralysis: Your #1 Challenge", why: "Your strength in seeing multiple perspectives can become a weakness when quick action is needed. You naturally want to explore all options thoroughly, but sometimes good enough decisions made quickly are better than perfect decisions made too late.", shows_up: ["Taking too long to choose between several good options", "Continuing to gather information when a decision is overdue", "Revising plans repeatedly as new information emerges", "Missing opportunities while analyzing potential risks"], solutions: ["Set decision deadlines for yourself and stick to them", "Use the 'Good, Better, Best' framework: identify the minimum viable option, then improve from there", "Ask yourself: 'What's the cost of waiting versus the cost of being wrong?'", "Practice making reversible decisions quickly and irreversible decisions more slowly"] },
    blind_spot_secondary: { title: "Over-Complexity: When Your Strength Becomes a Weakness", why: "You see interconnections and nuances that others miss, which leads you to create comprehensive solutions. However, complex solutions are often harder to implement and communicate.", shows_up: ["Explaining decisions with too much background context", "Building processes with too many steps or contingencies", "Struggling to give simple, direct answers to straightforward questions"], solutions: ["Practice the 'Elevator Pitch' rule: explain any strategy in 30 seconds or less", "Start with the simplest version that could work, then add complexity only if needed", "Use the 'So What?' test: for each piece of information, ask if it's essential for action"] },
    morning_practices: ["Review how today's activities connect to strategic objectives", "Identify one strategic insight you can share with your team", "Choose one complex topic you'll practice explaining simply"],
    midday_practices: ["Ask yourself: 'Am I overthinking any current decisions?'", "Identify one thing you can simplify or accelerate", "Check if you're providing too much context in communications"],
    evening_practices: ["Review decisions made today: were any unnecessarily complex?", "Identify one strategic connection you observed that might benefit others", "Plan tomorrow's strategic communication priorities"]
  },
  "Influential Connector": {
    dna_headline: "Builds strong networks and unites stakeholders to drive outcomes",
    dna_unique_value: "You build bridges that others can't see or don't think to build. When others focus on tasks and processes, you focus on the relationships that make everything else possible. You're the leader who ensures that no one is left behind and that solutions work for everyone involved.",
    decision_tendencies: ["Seeks broad input before deciding — you trust group wisdom over solo judgment", "Reads the room before announcing a direction — wants to sense alignment first", "Avoids decisions that create clear winners and losers among people you value", "Often knows the 'right' answer but delays to preserve relationships"],
    decision_derailers: ["May defer decisions too long in pursuit of full consensus", "Can reverse a good decision under social pressure even when the logic was sound"],
    communication_tendencies: ["Naturally warm and personally attuned — people feel heard in conversations with you", "Adept at finding common ground and reframing conflict as shared purpose", "Remembers personal details and uses them to build trust and loyalty"],
    communication_derailers: ["May soften difficult messages to the point they don't land with the right weight", "Can struggle to deliver hard feedback directly when it risks harming a relationship"],
    stress_triggers: [{ title: "Interpersonal Conflict That Seems Irreconcilable", detail: "When people you care about are in conflict and traditional mediation approaches aren't working." }, { title: "Being Forced to Choose Sides", detail: "Political situations where you're pressured to support one group over another, especially when both have valid concerns." }, { title: "Isolation from Collaborative Decision-Making", detail: "Working environments where decisions are made without consultation or where relationship-building is seen as inefficient." }],
    blind_spot_primary: { title: "Consensus-Seeking Delays: Your #1 Challenge", why: "Your natural inclination to include everyone and find solutions that work for all stakeholders can slow down decision-making when speed is essential.", shows_up: ["Continuing to seek input when a decision needs to be made", "Revising decisions multiple times to accommodate different concerns", "Missing deadlines while trying to get everyone on board", "Creating decision fatigue in yourself and others"], solutions: ["Set consultation deadlines: 'I'll gather input until Friday, then decide'", "Use the 'Consult vs. Consensus' framework: identify when you need input vs. agreement", "Practice the 'Good Enough' principle: aim for solutions most people can live with", "Develop comfort with making decisions that some people might not love"] },
    blind_spot_secondary: { title: "Boundary Challenges: When Caring Becomes Overwhelming", why: "Your strength in relationship building can lead to taking on too much responsibility for others' problems and emotions.", shows_up: ["Working excessive hours to help everyone who asks", "Feeling responsible for team conflicts you didn't create", "Saying yes to commitments that overload your schedule"], solutions: ["Create 'office hours' for relationship conversations", "Practice phrases like: 'I care about this issue, and I can't take it on right now'", "Build your own support network for processing work stress"] },
    morning_practices: ["Identify three key relationships to nurture today", "Check if any conflicts need attention", "Plan one meaningful connection with someone in your network"],
    midday_practices: ["Ask yourself: 'Am I taking on others' problems as my own?'", "Identify any commitments you should reconsider", "Practice one 'no' if you're overcommitted"],
    evening_practices: ["Review relationship interactions: what went well?", "Identify any relationships that need repair or attention", "Plan tomorrow's relationship priorities"]
  },
  "Resourceful Optimizer": {
    dna_headline: "Makes the most of resources — keeps teams focused, efficient, and calm under pressure",
    dna_unique_value: "You bring clarity and efficiency to chaos. When others feel overwhelmed by competing demands and limited resources, you help them focus on what matters most and eliminate what doesn't. You're the leader who makes difficult situations manageable and helps teams feel confident they can deliver excellent results.",
    decision_tendencies: ["Makes decisions by rapidly identifying the highest-leverage option — instinctively trades off effort vs. impact", "Prefers concrete data over abstract possibilities when evaluating choices", "Moves quickly once a clear best path emerges — dislikes revisiting settled decisions", "Naturally eliminates scope creep and trims options to a manageable shortlist"],
    decision_derailers: ["May dismiss creative or unconventional options too early in the evaluation", "Can optimize for efficiency at the expense of buy-in from people who needed to be heard"],
    communication_tendencies: ["Direct and outcome-focused — communicates what needs to happen and why it matters", "Excellent at translating complexity into clear, actionable priorities", "Comfortable with brevity; respects others who are equally concise"],
    communication_derailers: ["May come across as blunt or dismissive when cutting to the point", "Can under-explain the 'why' behind decisions, leaving others feeling excluded"],
    stress_triggers: [{ title: "Disorganized Systems and Unclear Processes", detail: "Working in environments where inefficiency is built into the system and you can't make improvements." }, { title: "Waste of Time, Money, or Human Resources", detail: "Seeing resources squandered on low-impact activities while important work goes undone." }, { title: "Unrealistic Deadlines Without Adequate Resources", detail: "Being asked to achieve results that require more time or resources than available." }],
    blind_spot_primary: { title: "Efficiency Over Innovation: Your #1 Challenge", why: "Your focus on optimization can discourage experimentation or creative approaches that seem 'inefficient' in the short term but might lead to breakthrough innovations.", shows_up: ["Dismissing new ideas because they require initial inefficiency to test", "Focusing on improving existing processes rather than questioning if they're necessary", "Missing opportunities for innovation while perfecting current approaches"], solutions: ["Schedule specific time for 'inefficient' experimentation and learning", "Partner with innovation-focused colleagues to balance efficiency with creativity", "Ask: 'What if we didn't do this at all?' not just 'How can we do this better?'"] },
    blind_spot_secondary: { title: "People vs. Process: When Efficiency Dehumanizes", why: "Your strength in creating efficient systems can sometimes prioritize process optimization over individual needs or development opportunities.", shows_up: ["Implementing changes without considering impact on team morale", "Focusing on productivity metrics without considering work-life balance", "Becoming impatient with team members who need more development time"], solutions: ["Include team member input in efficiency improvement processes", "Balance productivity goals with development and relationship objectives", "Build learning and growth opportunities into efficient processes"] },
    morning_practices: ["Identify one process you can improve today", "Review your calendar for time optimization opportunities", "Choose your top three priorities for maximum impact"],
    midday_practices: ["Ask yourself: 'Am I working on the most important thing right now?'", "Identify any activities you can eliminate or delegate", "Check if you're maintaining balance between efficiency and team development"],
    evening_practices: ["Review what worked efficiently today and what didn't", "Identify one improvement for tomorrow's workflow", "Consider how efficiency improvements affected team dynamics"]
  },
  "Performance Catalyst": {
    dna_headline: "Elevates team performance with clear standards, coaching, and accountability",
    dna_unique_value: "You accelerate human potential. When others see current performance, you see future possibility. You're the leader who helps people bridge the gap between where they are and where they could be, creating sustainable high performance through development rather than pressure.",
    decision_tendencies: ["Evaluates options through the lens of what will build team capability long-term, not just solve today's problem", "Sets high bars for acceptable solutions — mediocre options genuinely frustrate you", "Tends to involve direct reports in decisions as a coaching opportunity, not just for input", "Comfortable making bold calls when you believe in the growth potential of the outcome"],
    decision_derailers: ["May delay on purely operational decisions because they don't feel 'developmental' enough", "Can hold others to decision-making standards they aren't ready for yet"],
    communication_tendencies: ["Gives detailed, specific feedback — notices exactly what someone did well or poorly and names it", "Uses questions more than directives — coaching conversations are your default mode", "Holds people to their stated commitments — your follow-through creates accountability culture"],
    communication_derailers: ["Feedback can feel relentless to people who need encouragement before challenge", "May over-coach in moments where people just want a direct answer"],
    stress_triggers: [{ title: "Team Members Who Resist Feedback or Development", detail: "When people you're trying to help don't want to improve or actively resist coaching efforts." }, { title: "Organizational Cultures That Don't Value Growth", detail: "Working in environments where development is seen as 'nice to have' rather than essential for success." }, { title: "Pressure to Deliver Results Without Time for Development", detail: "Being forced to choose between short-term results and long-term capability building." }],
    blind_spot_primary: { title: "High Expectations: Your #1 Challenge", why: "Your ability to see potential in others can lead to setting standards that feel overwhelming or unrealistic to team members who aren't yet ready for that level of challenge.", shows_up: ["Setting goals that stretch people beyond their current comfort zone", "Providing feedback that feels critical rather than developmental", "Moving too quickly from basic to advanced skill development", "Assuming others share your level of commitment to continuous improvement"], solutions: ["Practice 'meeting people where they are' before challenging them to grow", "Break large development goals into smaller, achievable steps", "Celebrate progress at each level, not just final achievements", "Ask team members what level of challenge feels appropriate to them"] },
    blind_spot_secondary: { title: "Development Over Delivery: When Coaching Delays Results", why: "Your natural focus on long-term development can sometimes conflict with immediate business needs and deadline pressures.", shows_up: ["Choosing coaching approaches when faster directive approaches are needed", "Investing development time when crisis management is required", "Prioritizing learning opportunities over efficiency in time-sensitive situations"], solutions: ["Learn to recognize when immediate performance is needed vs. when development is appropriate", "Use situational leadership: adjust your approach based on urgency and individual readiness", "Balance coaching with directive leadership based on situational requirements"] },
    morning_practices: ["Identify one coaching opportunity for each direct report", "Plan one developmental question to ask in meetings", "Choose one team member to check in with about their growth goals"],
    midday_practices: ["Ask yourself: 'Am I balancing coaching with business needs appropriately?'", "Identify any performance issues that need immediate vs. developmental attention", "Consider whether your current approach is meeting people where they are"],
    evening_practices: ["Review coaching interactions: what worked well and what could improve?", "Identify progress you observed in team members' development", "Plan tomorrow's development priorities"]
  },
  "Steady Operator": {
    dna_headline: "Ensures reliability and structure, keeping everything on track — especially in uncertain times",
    dna_unique_value: "You bring reliability and excellence to uncertainty. When situations become chaotic or unpredictable, you help others stay focused on what matters most and maintain the quality standards that protect long-term success. You're the leader people trust to keep important things running smoothly.",
    decision_tendencies: ["Anchors decisions in precedent and proven approaches — if it worked before, that carries significant weight", "Moves deliberately and methodically — prefers to validate assumptions before committing to action", "Naturally stress-tests options for risk, not just upside potential", "Seeks clarity on roles, processes, and success criteria before executing"],
    decision_derailers: ["May resist decisions that lack precedent even when the situation clearly demands innovation", "Can slow momentum by seeking certainty in inherently uncertain situations"],
    communication_tendencies: ["Calm, measured, and consistent — your communication style itself builds confidence in others", "Excellent at documenting and tracking commitments — what you say is what you do", "Conveys reliability through specificity: you set clear expectations and deliver against them"],
    communication_derailers: ["May struggle to communicate vision or inspire with big-picture language", "Can default to caution in messaging when the team needs bold reassurance"],
    stress_triggers: [{ title: "Constant Organizational Change Without Clear Rationale", detail: "When change happens for change's sake without clear benefits or adequate planning." }, { title: "Pressure to Cut Corners or Compromise Quality Standards", detail: "Being asked to reduce quality to meet deadlines or budget constraints." }, { title: "Unclear Expectations or Frequently Changing Priorities", detail: "Working in environments where what's important changes constantly." }],
    blind_spot_primary: { title: "Change Resistance: Your #1 Challenge", why: "Your strength in maintaining stability and quality can make you cautious about changes that might disrupt proven systems, even when those changes are necessary for growth or adaptation.", shows_up: ["Questioning new initiatives more than embracing their potential", "Focusing on risks and downsides rather than opportunities", "Preferring incremental improvements over significant changes", "Taking longer to adopt new tools, processes, or approaches"], solutions: ["Practice asking 'What opportunities might this create?' alongside 'What risks does this present?'", "Seek to understand the rationale for changes before evaluating them", "Look for ways to test changes safely before full implementation", "Partner with change-oriented colleagues to balance perspective"] },
    blind_spot_secondary: { title: "Perfectionism: When Quality Standards Become Bottlenecks", why: "Your high standards for quality and consistency can sometimes slow down progress when 'good enough' would be sufficient for the situation.", shows_up: ["Spending too much time perfecting work that meets standards already", "Delaying decisions or deliverables to achieve ideal rather than acceptable quality", "Difficulty delegating because others might not meet your quality standards"], solutions: ["Develop 'good, better, best' frameworks for different situations", "Practice identifying when 80% quality is sufficient vs. when 100% is required", "Create quality standards that others can achieve, not just ideals"] },
    morning_practices: ["Identify which quality standards are most important to maintain today", "Review any changes or new initiatives for potential stability impacts", "Plan how to balance consistency with any necessary adaptations"],
    midday_practices: ["Ask yourself: 'Are we maintaining appropriate standards while being flexible enough?'", "Identify any areas where perfectionism might be slowing down progress unnecessarily", "Consider whether any resistance you're feeling is protective or limiting"],
    evening_practices: ["Review what worked well in balancing stability with change today", "Identify any improvements that could enhance both quality and adaptability", "Plan tomorrow's approach to maintaining excellence while remaining open to necessary changes"]
  },
  "Change Navigator": {
    dna_headline: "Thrives in ambiguity, adapts quickly, and inspires others through transitions",
    dna_unique_value: "You transform uncertainty into possibility. When others feel anxious about unknown futures, you help them see exciting opportunities for growth and improvement. You're the leader who makes change feel energizing rather than threatening.",
    decision_tendencies: ["Comfortable deciding with incomplete information — you trust your instincts and adapt as you go", "Energized by novel options — conventional solutions feel less compelling even when they're correct", "Moves fast and iterates — you prefer launching a 70% solution over waiting for a perfect one", "Reads shifting context quickly and pivots without drama or resistance"],
    decision_derailers: ["May underweight the stability needs of others when making fast pivots", "Can start new initiatives before previous decisions have been fully implemented"],
    communication_tendencies: ["Inspires through possibility and optimism — people leave conversations with you feeling energized", "Reframes challenges as opportunities naturally and without forced positivity", "Comfortable holding ambiguity and communicating in ways that make uncertainty feel safe"],
    communication_derailers: ["May underestimate how much others need structure and certainty alongside inspiration", "Can overlook the need to acknowledge the difficulty of change before jumping to the opportunity"],
    stress_triggers: [{ title: "Rigid Systems That Don't Allow for Adaptation", detail: "Working in bureaucratic environments where innovation is discouraged and flexibility is limited." }, { title: "Organizations That Punish Reasonable Risk-Taking", detail: "Cultures where any failure is criticized rather than viewed as learning." }, { title: "Micromanagement That Prevents Creative Problem-Solving", detail: "Working under leaders who want to control every detail of how work gets done." }],
    blind_spot_primary: { title: "Change Fatigue Blindness: Your #1 Challenge", why: "Your enthusiasm for change and natural comfort with uncertainty can make you less sensitive to others' need for stability and predictability.", shows_up: ["Introducing new initiatives before previous changes have been fully integrated", "Underestimating the emotional impact of change on team members", "Becoming impatient when others need more time to adapt", "Focusing on future possibilities rather than current stability needs"], solutions: ["Create 'change budgets' — limiting the number of simultaneous changes", "Check in regularly with team members about their comfort level with current changes", "Balance innovation initiatives with stability-building activities", "Practice acknowledging the difficulty of change alongside its benefits"] },
    blind_spot_secondary: { title: "Implementation Gaps: When Vision Outpaces Execution", why: "Your natural focus on initiating and embracing change might not include sufficient attention to the detailed work required for successful implementation.", shows_up: ["Starting new initiatives without completing previous ones", "Creating great ideas but lacking detailed implementation plans", "Moving to new opportunities before ensuring current changes are successful"], solutions: ["Partner with implementation-focused colleagues for all change initiatives", "Create accountability systems for seeing changes through to completion", "Measure success of changes over time, not just initial adoption"] },
    morning_practices: ["Review current changes: which need more implementation support?", "Identify one change initiative to focus on completing today", "Consider team members' change capacity and stress levels"],
    midday_practices: ["Ask yourself: 'Am I managing change at a sustainable pace?'", "Identify any changes that need more implementation attention", "Consider whether you're communicating change benefits clearly enough"],
    evening_practices: ["Review how well changes are being integrated into daily work", "Identify any team members who might need additional change support", "Plan tomorrow's balance between innovation and implementation"]
  },
  "Collaborative Problem-Solver": {
    dna_headline: "Excels at collaborative decision-making and bringing diverse perspectives to the table",
    dna_unique_value: "You unlock the wisdom of groups. When others see complexity and conflict, you see opportunity for creative solutions that leverage everyone's unique strengths and insights. You're the leader who ensures that all voices are heard and that final solutions truly serve everyone's interests.",
    decision_tendencies: ["Naturally scans for missing voices or underrepresented perspectives before settling on a direction", "Treats the quality of the process as equally important as the quality of the outcome", "Creates psychological safety in decision conversations — dissenting views surface more with you than with others", "Builds solutions collaboratively, which creates strong team ownership of outcomes"],
    decision_derailers: ["May create 'decision theater' — involving people for the feeling of inclusion more than actual input", "Can struggle to assert a position when the group is stuck and needs a tiebreaker"],
    communication_tendencies: ["Masterful at creating dialogue rather than monologue — your meetings generate insight, not just updates", "Skilled at surfacing conflict productively and helping groups reach synthesis", "Genuinely curious about others' perspectives — people can tell the difference between you and those who just appear to listen"],
    communication_derailers: ["May talk through problems when others need a clear directive", "Can read as indecisive when you're genuinely holding space for the group to arrive somewhere together"],
    stress_triggers: [{ title: "Pressure to Make Quick Decisions Without Consultation", detail: "Being forced to decide without gathering input from relevant stakeholders." }, { title: "Hierarchical Environments That Don't Value Input", detail: "Working in cultures where decisions are made top-down without considering different perspectives." }, { title: "Interpersonal Conflict That Can't Be Resolved Through Discussion", detail: "Situations where people are unwilling to engage in good-faith problem-solving." }],
    blind_spot_primary: { title: "Decision Speed: Your #1 Challenge", why: "Your commitment to inclusion and collaboration can slow down decision-making when speed is essential for success.", shows_up: ["Continuing to seek input when a decision deadline has passed", "Revising decisions multiple times to accommodate different perspectives", "Missing opportunities while building consensus", "Creating decision fatigue in yourself and others"], solutions: ["Set consultation deadlines and stick to them", "Use the 'Consult vs. Consensus' framework: sometimes you need input, not agreement", "Practice making decisions that most people can live with, even if not everyone loves them", "Develop comfort with explaining decisions after they're made rather than before"] },
    blind_spot_secondary: { title: "Responsibility Diffusion: When Shared Decision-Making Creates Unclear Accountability", why: "Your preference for collaborative decision-making can create confusion about who is responsible for outcomes when things don't work as planned.", shows_up: ["Unclear accountability for decision outcomes when multiple people were involved", "Team members feeling less ownership because decisions were made by groups", "Difficulty learning from failures when responsibility is diffused"], solutions: ["Clearly identify who has final accountability even when using collaborative processes", "Distinguish between input gathering and decision-making authority", "Create clear roles for who implements and who modifies collaborative decisions"] },
    morning_practices: ["Identify which decisions today need input vs. which you can make independently", "Plan which perspectives to include in important discussions", "Consider any conflicts or disagreements that need attention"],
    midday_practices: ["Ask yourself: 'Am I seeking too much consensus when action is needed?'", "Identify any decisions that are overdue due to collaboration efforts", "Consider whether current collaborative processes are efficient and effective"],
    evening_practices: ["Review collaborative interactions: what worked well and what could improve?", "Identify any relationships that need repair or attention", "Plan tomorrow's approach to balancing collaboration with decisiveness"]
  },
  "Visionary Architect": {
    dna_headline: "Focuses on long-term goals, aligns teams to purpose, and charts new paths",
    dna_unique_value: "You create clarity about direction and meaning. When others feel lost in day-to-day activities, you help them see how their work contributes to something larger and more meaningful. You're the leader who helps people understand not just what they're doing, but why it matters.",
    decision_tendencies: ["Filters every decision through a long-range lens — short-term tradeoffs feel less significant to you than they do to others", "Drawn to bold, transformative options over incremental improvements — safe bets rarely inspire you", "Connects decisions to purpose and meaning, which elevates team motivation during execution", "Can see the destination clearly before the path exists — and is energized rather than deterred by that ambiguity"],
    decision_derailers: ["May overlook operational constraints or execution complexity when vision is compelling enough", "Can be slow to let go of a chosen direction even when evidence suggests a course correction is needed"],
    communication_tendencies: ["Paints pictures of future possibility that others can step into emotionally, not just intellectually", "Extraordinarily effective at communicating 'why' — people work harder when you explain the mission", "Connects individual contributions to organizational purpose in ways that feel genuine, not just motivational"],
    communication_derailers: ["Can lose operationally-minded colleagues who need specifics before they can commit", "May communicate in compelling abstractions when the situation demands concrete next steps"],
    stress_triggers: [{ title: "Organizations Focused Only on Short-Term Results", detail: "Working in environments where quarterly pressures prevent investment in long-term success." }, { title: "Bureaucratic Systems That Prevent Innovation", detail: "Rigid processes that make it difficult to pursue new opportunities or approaches." }, { title: "Cynicism and Resistance to Forward-Thinking Initiatives", detail: "Team members or colleagues who dismiss visionary thinking as impractical." }],
    blind_spot_primary: { title: "Implementation Gaps: Your #1 Challenge", why: "Your natural focus on long-term vision and big-picture thinking can sometimes lack sufficient attention to the practical details required for successful execution.", shows_up: ["Creating inspiring visions without detailed implementation plans", "Assuming others will figure out execution while you focus on direction", "Underestimating the time and resources required to achieve visionary goals", "Moving to new vision elements before ensuring current initiatives are successful"], solutions: ["Partner with implementation-focused colleagues for all vision initiatives", "Create detailed project plans for vision elements, not just inspiring descriptions", "Practice staying involved through execution phases, not just initial visioning", "Set shorter-term milestones that clearly advance longer-term vision"] },
    blind_spot_secondary: { title: "Present Moment Neglect: When Future Focus Misses Current Reality", why: "Your strength in future-focused thinking can sometimes miss important current realities, constraints, or immediate needs that affect vision achievement.", shows_up: ["Setting goals that don't account for current resource limitations or capability gaps", "Overlooking team members' immediate concerns while focusing on future possibilities", "Creating timelines that don't reflect current operational constraints"], solutions: ["Regularly assess current state alongside future vision", "Include operational experts in vision planning and refinement", "Create realistic timelines that account for current capabilities and constraints"] },
    morning_practices: ["Review today's priorities and connect them to longer-term vision", "Identify one way to communicate vision relevance to your team", "Consider how current activities advance strategic objectives"],
    midday_practices: ["Ask yourself: 'Am I balancing vision communication with practical implementation support?'", "Identify any implementation challenges that need attention", "Consider whether current vision communication is inspiring and achievable"],
    evening_practices: ["Review progress toward vision: what's working and what needs adjustment?", "Identify any team members who need help connecting their work to larger purpose", "Plan tomorrow's approach to advancing vision through practical action"]
  }
};

const COMP_KEYS = [
  { key: "si_pct", name: "Situational Intelligence" },
  { key: "dm_pct", name: "Decision Making" },
  { key: "comm_pct", name: "Communication" },
  { key: "rm_pct", name: "Resource Management" },
  { key: "sm_pct", name: "Stakeholder Management" },
  { key: "pm_pct", name: "Performance Management" },
];

function getBand(score) {
  if (score >= 80) return "Mastery";
  if (score >= 65) return "Proficient";
  if (score >= 50) return "Developing";
  return "Awareness";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { assessment_id } = await req.json();
    if (!assessment_id) return Response.json({ error: "assessment_id required" }, { status: 400 });

    // Check if a report already exists for this assessment
    const existing = await base44.asServiceRole.entities.LeadershipProfileReport.filter({
      user_email: user.email,
      assessment_id,
      status: "generated"
    });
    if (existing.length > 0) {
      return Response.json({ report: existing[0] });
    }

    // Fetch the assessment
    const assessments = await base44.asServiceRole.entities.Assessment.filter({ email: user.email });
    const assessment = assessments.find(a => a.id === assessment_id);
    if (!assessment) return Response.json({ error: "Assessment not found" }, { status: 404 });

    // Normalize archetype label — strip leading "The " prefix if present
    const rawArchetype = assessment.archetype_label || "Adaptive Strategist";
    const archetype = rawArchetype.replace(/^The\s+/i, "").trim();
    const archetypeData = ARCHETYPE_CONTENT[archetype] || ARCHETYPE_CONTENT["Adaptive Strategist"];

    const compData = COMP_KEYS.map(c => ({
      competency: c.name,
      score: assessment[c.key] ?? 0,
      band: getBand(assessment[c.key] ?? 0)
    }));

    const sortedComps = [...compData].sort((a, b) => b.score - a.score);
    const top3 = sortedComps.slice(0, 3).map(c => `${c.competency} (${c.score}%)`).join(", ");
    const bottom3 = sortedComps.slice(-3).map(c => `${c.competency} (${c.score}%)`).join(", ");

    // Create placeholder record (service role to bypass RLS during creation)
    const placeholder = await base44.asServiceRole.entities.LeadershipProfileReport.create({
      user_email: user.email,
      assessment_id,
      client_id: user.client_id,
      archetype,
      status: "generating"
    });

    // Generate AI content for personalized narrative sections
    const aiPrompt = `You are an expert leadership development consultant. Generate personalized leadership report content for a leader based on their assessment results and archetype.

Leader: ${user.full_name || "the leader"}
Role: ${user.current_role || "leader"}
Sector: ${user.sector || "corporate"}
Leadership Archetype: ${archetype}
Overall Leadership Index: ${assessment.overall_pct}% (${assessment.band_overall || getBand(assessment.overall_pct)})

Competency Scores:
${compData.map(c => `- ${c.competency}: ${c.score}% (${c.band})`).join("\n")}

Top strengths: ${top3}
Development areas: ${bottom3}

Based on the ${archetype} archetype and these specific scores, generate the following in JSON:

{
  "leadership_dna_description": "2-3 sentence personalized description of this leader's DNA based on their specific archetype and scores. Reference their actual scores and strengths.",
  "behavioral_patterns_decision": "1-2 sentences describing how this specific leader makes decisions based on their archetype and top competencies",
  "behavioral_patterns_communication": "1-2 sentences describing their communication style based on archetype and scores",
  "behavioral_patterns_daily": [
    {"label": "Morning Planning", "description": "How they start their day based on their profile"},
    {"label": "Team Meetings", "description": "How they show up in meetings"},
    {"label": "Problem-Solving", "description": "Their problem-solving approach"},
    {"label": "Follow-Up", "description": "How they follow up on commitments"}
  ],
  "stress_early": ["3 early stage stress behaviors specific to this archetype"],
  "stress_moderate": ["3 moderate stress behaviors"],
  "stress_high": ["3 high stress behaviors"],
  "recovery_strategies": [
    {"number": 1, "title": "Strategy Name", "description": "How to recover from stress"},
    {"number": 2, "title": "Strategy Name", "description": "How to recover from stress"},
    {"number": 3, "title": "Strategy Name", "description": "How to recover from stress"},
    {"number": 4, "title": "Strategy Name", "description": "How to recover from stress"}
  ],
  "competency_insights": [
    ${compData.map(c => `{"competency": "${c.competency}", "score": ${c.score}, "strength_narrative": "1 sentence on what this score means as a strength or growth area", "growth_area": "1 actionable growth tip"}`).join(",\n    ")}
  ],
  "development_plan": [
    ${compData.map(c => `{"competency": "${c.competency}", "actionable_steps": "2-3 specific actionable development steps for this leader at ${c.score}%"}`).join(",\n    ")}
  ]
}

Return ONLY valid JSON, no markdown.`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          leadership_dna_description: { type: "string" },
          behavioral_patterns_decision: { type: "string" },
          behavioral_patterns_communication: { type: "string" },
          behavioral_patterns_daily: { type: "array", items: { type: "object", properties: { label: { type: "string" }, description: { type: "string" } } } },
          stress_early: { type: "array", items: { type: "string" } },
          stress_moderate: { type: "array", items: { type: "string" } },
          stress_high: { type: "array", items: { type: "string" } },
          recovery_strategies: { type: "array", items: { type: "object", properties: { number: { type: "number" }, title: { type: "string" }, description: { type: "string" } } } },
          competency_insights: { type: "array", items: { type: "object", properties: { competency: { type: "string" }, score: { type: "number" }, strength_narrative: { type: "string" }, growth_area: { type: "string" } } } },
          development_plan: { type: "array", items: { type: "object", properties: { competency: { type: "string" }, actionable_steps: { type: "string" } } } }
        }
      }
    });

    // Build the full report object
    const report = {
      status: "generated",
      archetype,
      leadership_dna: {
        headline: archetypeData.dna_headline,
        unique_value: archetypeData.dna_unique_value,
        description: aiResult.leadership_dna_description
      },
      behavioral_patterns: {
        decision_making: aiResult.behavioral_patterns_decision,
        decision_tendencies: archetypeData.decision_tendencies,
        decision_derailers: archetypeData.decision_derailers,
        communication_style: aiResult.behavioral_patterns_communication,
        communication_tendencies: archetypeData.communication_tendencies,
        communication_derailers: archetypeData.communication_derailers,
        daily_approach: aiResult.behavioral_patterns_daily || []
      },
      stress_analysis: {
        triggers: archetypeData.stress_triggers,
        early_stage: aiResult.stress_early || [],
        moderate_stage: aiResult.stress_moderate || [],
        high_stage: aiResult.stress_high || [],
        recovery_strategies: aiResult.recovery_strategies || []
      },
      blind_spots: {
        primary: {
          title: archetypeData.blind_spot_primary.title,
          why_it_happens: archetypeData.blind_spot_primary.why,
          how_it_shows_up: archetypeData.blind_spot_primary.shows_up,
          solutions: archetypeData.blind_spot_primary.solutions
        },
        secondary: {
          title: archetypeData.blind_spot_secondary.title,
          why_it_happens: archetypeData.blind_spot_secondary.why,
          how_it_shows_up: archetypeData.blind_spot_secondary.shows_up,
          solutions: archetypeData.blind_spot_secondary.solutions
        }
      },
      daily_practices: {
        morning: archetypeData.morning_practices,
        midday: archetypeData.midday_practices,
        evening: archetypeData.evening_practices
      },
      competency_insights: aiResult.competency_insights || compData.map(c => ({
        competency: c.competency,
        score: c.score,
        strength_narrative: `Your ${c.competency} score of ${c.score}% reflects ${c.band} level capability.`,
        growth_area: `Focus on targeted development activities to advance your ${c.competency} skills.`
      })),
      development_plan: aiResult.development_plan || compData.map(c => ({
        competency: c.competency,
        actionable_steps: `Build structured practice around ${c.competency} through mentorship, deliberate learning, and applied experience.`
      }))
    };

    // Update the placeholder record with the full report (service role)
    await base44.asServiceRole.entities.LeadershipProfileReport.update(placeholder.id, report);

    return Response.json({ report: { ...placeholder, ...report } });
  } catch (error) {
    console.error("generateLeadershipProfile error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});