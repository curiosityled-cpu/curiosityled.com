// Curiosity Led Leadership Reboot Diagnostic
// Copy library: all copy blocks for report assembly

export const OVERALL_RESULT_BLOCKS = {
  "Earlier-Intervention Ready":
    "Your results suggest that the foundations of a stronger leadership support system are already in place. Support appears more likely to reach leaders before issues fully escalate, and the organization has a better chance than most of connecting leadership activity to a clearer account of progress and intervention. The next opportunity is not to add more programs, but to tighten consistency, reduce manual effort, and make the system easier to sustain across populations and over time.",
  "In Transition":
    "Your results suggest that meaningful leadership support is already happening, but it is not yet operating as one timely, reliable system. Some pieces are likely working well, but support may still arrive late, sit outside daily work, or depend too heavily on manual effort to stay coordinated. The next 90 days should focus on reducing friction, clarifying where support needs to begin earlier, and creating a clearer through-line from leadership need to action to progress.",
  "Reactive & Fragmented":
    "Your results suggest that leadership support is still largely reactive and harder to manage than it should be. The organization likely has activity in motion, but risk is surfacing late, support is not consistently easy to use, and the burden of making it all work is falling too heavily on HR, Talent, or L&D. The immediate priority is to create earlier intervention points, simplify how support is delivered, and reduce the amount of manual coordination required to keep progress moving.",
};

export const CONSTRUCT_INTERPRETATION_BLOCKS = {
  signal_delay: {
    Strong:
      "You appear to have stronger early awareness than most organizations of where leadership support is needed. That does not mean every issue is visible in advance, but it does suggest that managers are less likely to be left unsupported until team impact is already obvious. The next step is to make sure those signals translate quickly into action rather than simply producing more awareness.",
    Mixed:
      "Your organization is likely catching some leadership risk early, but not consistently enough to rely on it. In some cases support probably starts before issues escalate, while in others the need becomes obvious only after performance, engagement, or team strain is already visible. The opportunity is to make earlier detection more systematic instead of dependent on individual managers, local judgment, or isolated escalation points.",
    Weak:
      "Your results suggest that leadership support is still starting too late. Concerns may be becoming visible only after the effects have already reached team performance, engagement, readiness, or retention. That usually forces the organization into reaction mode and makes even strong support harder to use well because the window for earlier intervention has already narrowed.",
  },
  support_friction: {
    Strong:
      "Support appears relatively well aligned to what leaders need in practice. Managers are more likely to experience development as useful help rather than as one more requirement layered onto an already full workload. The next opportunity is to keep simplifying delivery so support stays close to the work and easy to act on.",
    Mixed:
      "Some leadership support is likely landing well, but not consistently enough to reduce friction across the system. Managers may still experience certain parts of the current approach as late, generic, disconnected from real work, or difficult to act on in the moment. The priority is to identify where support still feels like \u201cextra program\u201d and redesign at least one part of it around current manager reality.",
    Weak:
      "Your results suggest that support is not translating easily into real help. Even if useful content, coaching, or programs exist, the delivery model may be adding load instead of relieving it. When support shows up too late, too generically, or outside the flow of work, managers are far less likely to use it consistently, and the system starts to feel heavier than it should.",
  },
  proof_defensibility: {
    Strong:
      "You appear to have a stronger foundation than most for explaining what your leadership support efforts are doing and why they matter. That likely makes it easier to show where support is happening, where progress is building, and where attention should go next. The next opportunity is to make that story simpler, more repeatable, and easier to use in high-stakes leadership conversations.",
    Mixed:
      "There is likely some meaningful proof in the system, but not yet one fully coherent story. You may be able to point to activity, selected wins, or isolated progress, while still struggling to explain the whole picture clearly across cohorts, interventions, and outcomes. The next priority is to tighten the story so leadership can understand not just what is happening, but what is changing and why.",
    Weak:
      "Your results suggest that leadership support is hard to defend clearly today. Activity may be happening across programs, coaching, and tools, but the connection between leadership need, intervention, and progress is not yet visible enough to explain with confidence. That makes it harder to justify investment, harder to focus attention, and harder to build trust that the current approach is producing meaningful change.",
  },
  fragmentation_admin: {
    Strong:
      "The current system appears less manually burdensome than most. That does not mean it is effortless, but it suggests HR, Talent, or L&D is not carrying as much unnecessary coordination, follow-up, and reporting burden just to keep leadership support moving. The next opportunity is to further reduce hidden drag so more time can go toward improvement rather than maintenance.",
    Mixed:
      "Some parts of the system are likely manageable, while others still depend too heavily on manual effort. Reporting, follow-up, or coordination may be workable at smaller scale, but become harder to sustain as the number of leaders, programs, or tools increases. The next priority is to identify where the operating drag is highest and simplify that first.",
    Weak:
      "Your results suggest that the current system depends too much on manual effort. Leadership support information may be spread across too many tools, updates may need to be chased down, and reporting may require more stitching than it should. When the operating model is this manual, the work of keeping support coordinated can start competing with the work of actually improving it.",
  },
  cost_of_inaction: {
    Strong:
      "You appear to have a relatively clear understanding of why delayed or fragmented leadership support matters. That awareness is useful because it makes it easier to prioritize action before hidden costs build across readiness, team performance, or retention. The next opportunity is to use that clarity to drive sharper intervention choices rather than broader activity.",
    Mixed:
      "There is likely some awareness that the current state carries cost, but that cost may still be easier to sense than to act on. Leadership support gaps may be affecting readiness, manager strain, or team performance in ways that feel important without yet being consistently translated into urgency. The next step is to make one or two of those hidden costs more visible and easier to discuss.",
    Weak:
      "Your results suggest the cost of the current approach may still be too hidden. Delayed support, fragmented systems, and manual patchwork can create real downstream effects, but if those effects are not being seen clearly, improvement will keep competing with other priorities. Making the cost of delay more concrete is often necessary before the system gets the attention it needs.",
  },
};

export const MER_BLOCKS = {
  "Low risk":
    "Managers are relatively more likely to experience support as relevant and usable than as another burden. That is an important strength because even strong development efforts lose value when support feels disconnected from real work. The focus now is to preserve that ease of use as the system grows.",
  "Emerging risk":
    "Managers may be receiving support, but parts of the experience likely still feel additive, late, or difficult to use in the moment. That creates a risk that support exists in theory while manager uptake stays inconsistent in practice. The priority is to simplify at least one support path so it feels more like relief and less like obligation.",
  "High risk":
    "Your current support environment may be contributing to manager strain rather than reducing it. When support arrives outside the work, adds another requirement, or depends on too much self-navigation, even well-intended efforts can quietly lose traction. Reducing manager friction is not a secondary issue here; it is part of whether the system works at all.",
};

export const LSC_BLOCKS = {
  "Clear story":
    "The pieces of your leadership support system are more likely to be understandable as one connected story. That makes it easier to explain where risk is showing up, what support is happening, and what progress appears to be following. The next step is to keep that story simple enough that it can travel well across leadership conversations without heavy translation.",
  "Partial story":
    "Some pieces of the story are visible, but the overall picture is still likely incomplete. Different programs or interventions may each make sense on their own while still not adding up to one shared account of what the organization is doing and what is changing. The next priority is to connect those pieces more clearly.",
  "Fragmented story":
    "The current leadership story likely feels too fragmented to explain with confidence. Leaders may know that support exists, but not see clearly how the parts fit together or what they are collectively changing. Without a coherent story, even good work is harder to defend, fund, and sustain.",
};

// 90-Day Leadership Support Reboot Plan modules
export const BLUEPRINT_MODULES = {
  signal_delay: {
    title: "Build earlier intervention points",
    whyItMatters:
      "The longer it takes to spot leadership strain or readiness gaps, the more likely support is to arrive after the impact is already visible. That makes every intervention harder and more expensive than it needs to be.",
    days: {
      "1-30":
        "Define 3\u20135 leading indicators that should trigger earlier support for the population most in scope. Keep these practical and visible rather than over-engineered.",
      "31-60":
        "Set a simple review rhythm for those indicators and decide who is responsible for noticing them before issues escalate.",
      "61-90":
        "Pilot one earlier-support pathway for the highest-priority leader population so the system begins acting sooner, not just observing sooner.",
    },
  },
  support_friction: {
    title: "Reduce the \u201cextra program\u201d effect",
    whyItMatters:
      "Support loses value when it feels late, generic, or disconnected from the work managers are already trying to do. The goal is not more activity, but support that is easier to use in the moment it is needed.",
    days: {
      "1-30":
        "Identify one part of the current support experience that managers are most likely to experience as extra load.",
      "31-60":
        "Redesign that support touchpoint so it appears inside an existing workflow, routine, or manager conversation instead of standing alone.",
      "61-90":
        "Track whether that one change improves uptake, follow-through, or perceived usefulness before expanding the model further.",
    },
  },
  proof_defensibility: {
    title: "Create a clearer leadership support story",
    whyItMatters:
      "If leadership cannot see how support connects to need, action, and progress, even meaningful work is harder to defend. The organization needs a clearer explanation of what is changing and where intervention is working.",
    days: {
      "1-30":
        "Create a one-page view for one priority cohort that shows leadership need, current support actions, and early signs of progress.",
      "31-60":
        "Standardize the 3\u20134 measures or signals you will use consistently in leadership conversations.",
      "61-90":
        "Use that structure in one real executive or leadership review so the story becomes a working management tool rather than a background document.",
    },
  },
  fragmentation_admin: {
    title: "Reduce manual coordination first",
    whyItMatters:
      "When too much effort goes into chasing updates, stitching reports, and coordinating across tools, the system becomes harder to improve and harder to sustain. Simplifying the operating burden is often one of the fastest ways to create momentum.",
    days: {
      "1-30":
        "Map where the most manual effort is happening today across tracking, follow-up, reporting, and coordination.",
      "31-60":
        "Choose one burden point to simplify rather than trying to fix the whole system at once.",
      "61-90":
        "Create one cleaner operating path for that activity, with clearer ownership and fewer handoffs.",
    },
  },
  cost_of_inaction: {
    title: "Make the hidden cost easier to see",
    whyItMatters:
      "If the cost of delayed or fragmented leadership support stays abstract, it will keep losing to more visible priorities. One of the fastest ways to create action is to make one meaningful cost easier to describe and discuss.",
    days: {
      "1-30":
        "Identify one visible consequence of the current approach for your highest-priority population, such as readiness delays, manager overload, turnover exposure, or uneven team performance.",
      "31-60":
        "Collect one or two examples or signals that make that cost easier to show without over-claiming certainty.",
      "61-90":
        "Use that evidence to focus the next leadership conversation on earlier intervention rather than on more leadership activity in general.",
    },
  },
  // Cross-cutting modules (used for P3 when derived index is weaker)
  manager_engagement_risk: {
    title: "Make support feel more useful than burdensome",
    whyItMatters:
      "If managers experience support as one more requirement, even strong development intent will not translate into strong participation. Reducing friction for the manager is one of the fastest ways to improve the odds that support gets used.",
    days: {
      "1-30": "Identify where support currently creates the most cognitive load for managers.",
      "31-60": "Remove or simplify one layer of effort, navigation, or duplication.",
      "61-90": "Test whether managers report better clarity, easier follow-through, or better fit with real work.",
    },
  },
  leadership_story_coherence: {
    title: "Connect scattered efforts into one working story",
    whyItMatters:
      "Programs, coaching, tools, and support activities are easier to sustain when they can be explained as one connected system. The goal is not perfect reporting, but a shared understanding of what the organization is doing and why.",
    days: {
      "1-30": "List the major leadership support efforts currently in place for the highest-priority population.",
      "31-60":
        "Clarify how each one connects to a common support story: early signal, action, reinforcement, or progress.",
      "61-90": "Use that structure to reduce redundancy and communicate the system more clearly to leadership.",
    },
  },
};

// Modifier library
export const POPULATION_MODIFIERS = {
  "Newly promoted managers":
    "This matters most for newly promoted managers, where early support gaps often compound quickly because the transition burden is already high.",
  "Newly hired managers":
    "This matters most for newly hired managers, where early support gaps often compound quickly because the transition burden is already high.",
  "Frontline leaders":
    "For frontline leaders, support needs to stay practical and close to the work or it will be crowded out by immediate operational demands.",
  "Mid-level leaders":
    "For mid-level leaders, support needs to bridge strategic direction and operational reality without adding another layer of complexity.",
  "Senior leaders":
    "For senior leaders, support should strengthen decision-making and succession readiness rather than adding another development obligation.",
  "Mixed population":
    "With a mixed leader population, prioritization matters\u2014start with the group where early intervention will have the most visible impact.",
};

export const OBSTACLE_MODIFIERS = {
  "Executive buy-in":
    "Because executive buy-in is a current constraint, early wins should be framed in terms leadership can recognize quickly: earlier intervention, clearer focus, and reduced manual drag.",
  "Capacity / team bandwidth":
    "Because team bandwidth is already tight, the first 90 days should focus on simplification rather than expansion.",
  Budget:
    "Because budget is a current constraint, the first 90 days should focus on leveraging existing systems and reducing manual waste rather than adding new spend.",
  "Fragmented tools or systems":
    "Because tools and systems are already fragmented, the first 90 days should focus on creating one clearer operating path rather than adding another tool.",
  "Low manager adoption":
    "Because manager adoption is low, the first 90 days should focus on reducing friction in existing support rather than introducing new programs.",
  "Unclear ownership":
    "Because ownership is unclear, the first 90 days should focus on assigning clear accountability for the first priority before expanding scope.",
  "Weak measurement or reporting":
    "Because measurement is weak, the first 90 days should focus on 3\u20134 consistent signals rather than a full reporting overhaul.",
  "No clear process for follow-through":
    "Because follow-through is the gap, the first 90 days should focus on one clear rhythm for tracking action and progress rather than more planning.",
};

export const TOOL_MODIFIERS = {
  teams: "Where possible, support should show up inside existing manager routines and tools rather than as a separate destination.",
  slack: "Where possible, support should show up inside existing manager routines and tools rather than as a separate destination.",
  email: "Where possible, support should show up inside existing manager routines and communication channels rather than as a separate destination.",
  spreadsheet: "Where possible, support should reduce reliance on manual spreadsheets and move toward simpler, more visible tracking.",
  hris: "Where possible, support should connect to existing HRIS data rather than requiring a separate reporting layer.",
};

// "What to bring to leadership" framing
export const LEADERSHIP_TALKING_POINTS = {
  signal_delay:
    "We are seeing leadership risk too late, and that is making every intervention harder and more expensive than it needs to be.",
  support_friction:
    "Our support exists, but it is not translating easily into real help for managers in the flow of work.",
  proof_defensibility:
    "We cannot yet explain clearly what our leadership development efforts are changing, which makes it harder to justify investment.",
  fragmentation_admin:
    "Too much effort is going into manual coordination, and that is competing with the work of actually improving support.",
  cost_of_inaction:
    "The hidden cost of our current approach is likely higher than it looks, and it will keep growing without earlier intervention.",
};

export const LEADERSHIP_FRAMING_SENTENCE =
  "The next 90 days should focus on earlier intervention, simpler support delivery, and a clearer story\u2014not more programs.";

// "Where implementation usually gets hard"
export const IMPLEMENTATION_HARD_PARTS = [
  "Coordination burden tends to spike once support moves from a single program to a system across populations and tools.",
  "Adoption friction shows up when support still feels like an extra program rather than something embedded in existing workflows.",
  "Sustaining measurement and follow-through is where most plans stall\u2014early momentum fades without a simple rhythm for tracking progress.",
];

// "Curiosity Led bridge"
export const CURIOSITY_LED_BRIDGE = {
  sentence1:
    "Meaningful progress on this plan can be made internally with the resources and ownership you already have.",
  sentence2:
    "What typically slows internal execution is the manual coordination, fragmented tooling, and follow-through burden this diagnostic surfaced.",
  sentence3:
    "Curiosity Led reduces that burden by embedding earlier signals, simpler support delivery, and a coherent leadership story inside the systems managers already use\u2014without replacing internal ownership.",
};