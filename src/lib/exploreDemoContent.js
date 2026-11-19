// Single source of truth for the public /explore demo.
// Everything a visitor sees lives here so the demo can be kept current by editing
// one file. When a feature changes in the app, update the matching block below and
// bump DEMO_VERSION. See docs/explore-demo-maintenance.md.

export const DEMO_VERSION = "2026.11.21";

export const DEMO_SOURCE_MAP = [
  { screen: "Leadership Index sample", mirrors: "Assessment / Leadership Index (3 sample items)", block: "LI_ITEMS" },
  { screen: "Atreus coaching", mirrors: "Atreus conversation (scripted)", block: "ATREUS" },
  { screen: "Daily check-in", mirrors: "Morning check-in + trend (Go Flat Bridge model)", block: "CHECKIN" },
  { screen: "Training module", mirrors: "Onboarding journey module completion", block: "TRAINING, ONBOARDING" },
  { screen: "Org view", mirrors: "Leadership Intelligence Hub — metrics, priority areas, lifecycle", block: "HUB, ORG" },
];

export const STEPS = [
  {
    id: "leadership",
    label: "See yourself",
    short: "Profile",
    minutes: 2,
    title: "See yourself clearly",
    subtitle: "Three questions from the Leadership Index. Not a personality quiz, and not pass or fail.",
  },
  {
    id: "atreus",
    label: "Get the support",
    short: "Atreus",
    minutes: 2,
    title: "Get support before the moment",
    subtitle: "Atreus works from your real week — the 1:1 you moved, the commitment you made.",
  },
  {
    id: "checkin",
    label: "Keep the rhythm",
    short: "Check-in",
    minutes: 1,
    title: "Keep the rhythm",
    subtitle: "Forty seconds a day, in Teams or email. This is what turns a feeling into a pattern.",
  },
  {
    id: "training",
    label: "Build the habit",
    short: "Training",
    minutes: 2,
    title: "Training that lands in the work",
    subtitle: "A module from the onboarding journey — read, reflect, commit.",
  },
  {
    id: "org",
    label: "Make it real",
    short: "For the org",
    minutes: 1,
    title: "What the organisation sees",
    subtitle: "The same data, read at the level a board asks about — aggregates only, never transcripts.",
  },
];

export const LI_ITEMS = [
  {
    id: "li_1",
    dimension: "feedback",
    statement:
      "When someone's performance slips, I can name the specific moment I first noticed it.",
  },
  {
    id: "li_2",
    dimension: "courage",
    statement: "In the last two weeks, I had the conversation I was avoiding.",
  },
  {
    id: "li_3",
    dimension: "delegation",
    statement: "I can hand work over without checking it twice.",
  },
];

export const DIMENSIONS = {
  feedback: {
    label: "Noticing early",
    strong: "You catch drift while it's still cheap to fix.",
    steady: "You usually notice, but often a few weeks after the moment.",
    stretch: "Problems tend to arrive as surprises. That's a signal habit, not a character flaw.",
    practice: "Name one thing you noticed this week, out loud, to the person.",
  },
  courage: {
    label: "Hard conversations",
    strong: "You go first. Your team doesn't have to guess where they stand.",
    steady: "You get there, but usually after carrying it for a while.",
    stretch: "You postpone. The cost shows up later, in someone else's resignation.",
    practice: "Book the conversation you've moved twice, for this week.",
  },
  delegation: {
    label: "Letting go",
    strong: "You set the bar and then trust it. Your team grows because of it.",
    steady: "You delegate, then quietly re-check. It costs you evenings.",
    stretch: "You take work back. It feels faster; it makes you the bottleneck.",
    practice: "Write the 'good enough' bar for one task in three lines.",
  },
};

export const SCALE_LABELS = ["Rarely", "Sometimes", "Half the time", "Often", "Almost always"];

export const ATREUS = {
  greeting:
    "I'm Atreus. I work from what's actually happening in your week — not from a course catalogue. Pick the situation closest to yours.",
  leadByDimension: {
    feedback:
      "Your profile flagged noticing early. This situation is exactly where that shows up.",
    courage:
      "Your profile flagged the conversations you postpone. This is one of them.",
    delegation:
      "Your profile flagged letting go. Watch what happens in this answer.",
  },
  prompts: [
    {
      id: "reschedule",
      label: "I keep rescheduling a 1:1",
      user: "I've moved my 1:1 with Dana three times. I don't know what to say.",
      turns: [
        "Three reschedules is information, not a scheduling problem. Something about that conversation feels expensive — usually that you suspect an answer you don't want.",
        "You don't need a plan for the whole relationship today. You need one honest question, and the willingness to sit in the silence after it.",
        "Try this: \u201cI've moved this three times and I don't think that's fair to you. What's it been like since the reorg?\u201d Then stop talking.",
      ],
      commitment: "Open the 1:1 with one question, then say nothing for a full minute.",
    },
    {
      id: "performer",
      label: "My best performer has gone quiet",
      user: "My strongest analyst stopped volunteering. Still delivers. Just flat.",
      turns: [
        "Flat but still delivering usually means the work isn't the problem — the ceiling is. Strong performers go quiet when they can't see what's next.",
        "Don't lead with performance. Lead with their future: what they want to be doing in a year that they aren't doing now.",
        "Try this: \u201cYou're not behind on anything. I'm asking because I want to know what you want next — and whether I'm in the way.\u201d",
      ],
      commitment: "Ask one question about their next twelve months. Write down their exact words.",
    },
    {
      id: "takeback",
      label: "I keep taking work back",
      user: "I delegated the QA review, then redid it myself at 11pm.",
      turns: [
        "You didn't take the work back because they failed. You took it back because watching was more uncomfortable than doing.",
        "That's a standard you never made explicit. If 'good enough' only exists in your head, every handoff is a setup.",
        "Try this: \u201cHere's what good looks like, here's what I don't care about. Send me the version you'd ship, not the version you think I want.\u201d",
      ],
      commitment: "Write the 'good enough' bar for one task in three lines, then hand it over.",
    },
  ],
  fallback:
    "In this demo I'm scripted, so I only answer the three prompts above. In the product I'd have your actual week — check-ins, commitments and 1:1s — to work from.",
};

export const CHECKIN = {
  measures: [
    { key: "energy", label: "Energy", low: "Drained", high: "Charged", start: 3 },
    { key: "load", label: "Load", low: "Light", high: "Overwhelming", start: 3 },
    { key: "focus", label: "Clarity of focus", low: "Scattered", high: "Sharp", start: 3 },
  ],
  anchored: [
    {
      id: "blocked",
      q: "How much of today's work is blocked by something you don't control?",
      options: ["None", "A little", "About half", "Most of it", "All of it"],
    },
    {
      id: "time",
      q: "Did you get the time you needed for the work that matters?",
      options: ["No", "Mostly no", "Half", "Mostly yes", "Yes"],
    },
  ],
  trend: [3, 3, 4, 3, 4, 4, 5],
  followUp:
    "At 4pm you'd get one question: \u201cDid the work you planned actually happen?\u201d That's what turns a feeling into a pattern.",
};

export const ONBOARDING = {
  title: "New manager onboarding",
  subtitle: "30 / 60 / 90 · assigned by HR, run by the manager",
  milestones: [
    { title: "Meet your team, one at a time", when: "Week 1", status: "done" },
    { title: "Run your first full 1:1 cycle", when: "Week 2", status: "done" },
    { title: "Share your team's operating rhythm", when: "Week 4", status: "due" },
    { title: "First quarterly review, with evidence", when: "Day 90", status: "locked" },
  ],
};

export const TRAINING = {
  title: "Leading the first 90 days",
  subtitle: "Module 2 of your new manager onboarding journey · assigned by HR",
  minutes: 6,
  steps: [
    {
      id: "tr_1",
      title: "What changes when you stop being the best doer",
      body: [
        "The thing that got you promoted is now the thing that limits you. Doing the work well and getting work done well are different jobs, and only one of them scales.",
        "Most new managers keep a hand in the work for comfort. It reads as commitment for about six weeks, then it reads as bottleneck.",
      ],
      prompt: "Which of these is closest to your last week?",
      options: [
        "I did the work myself because it was faster",
        "I handed it over and watched too closely",
        "I handed it over and let it land",
      ],
    },
    {
      id: "tr_2",
      title: "Making 'good enough' explicit",
      body: [
        "Every handoff carries a standard. If that standard only exists in your head, the other person is being set up to fail and neither of you knows it yet.",
        "Three lines is enough: what matters, what doesn't, and what to send me before it ships.",
      ],
      prompt: "Where does your standard stay unspoken?",
      options: ["Reviews I redo", "Anything client-facing", "Handoffs to my newest hire"],
    },
    {
      id: "tr_3",
      title: "The commitment you take into next week",
      body: [
        "A module only counts if something changes on Monday. This is the line next week's check-in will ask you about.",
      ],
      prompt: "Pick the one you'll actually do.",
      options: [
        "Write the good-enough bar for one task, in three lines",
        "Stop re-checking one handoff for two weeks",
        "Tell my team what I'm no longer reviewing",
      ],
    },
  ],
  completion:
    "Recorded against your onboarding journey and your development record — the same place a quarterly review would look. Nothing here is a certificate for its own sake; the evidence is the change in your week.",
};

// Mirrors the Leadership Intelligence Hub as the app renders it: filter bar,
// four headline metrics, priority areas and the lifecycle stage grid.
export const HUB = {
  title: "Leadership Intelligence Hub",
  subtitle: "Analytics and strategic insights",
  filters: ["All Time", "All Divisions", "All Levels", "All Tenure", "All Risk Profiles"],
  dataConfidence: 40,
  metrics: [
    {
      id: "health",
      label: "Leadership Health",
      value: "68%",
      tone: "blue",
      headline: "Building — targeted coaching recommended",
      foot: "Manager Effectiveness Index",
    },
    {
      id: "risk",
      label: "Immediate Risk",
      value: "0",
      tone: "green",
      headline: "All leaders above performance threshold",
      foot: "leaders requiring review this cycle",
    },
    {
      id: "succession",
      label: "Succession Coverage",
      value: "0%",
      tone: "purple",
      headline: "Thin bench — prioritise succession slate review",
      foot: "weighted bench score · 1 assessed leader",
    },
    {
      id: "confidence",
      label: "Data Confidence",
      value: "40%",
      tone: "gray",
      headline: "Platform-native only — 3 signals not connected",
      foot: "2 of 5 signals active",
    },
  ],
  priorityAreas: [
    { label: "Thin succession bench", tone: "amber" },
    { label: "Learning velocity low", tone: "amber" },
    { label: "Engagement not connected", tone: "gray" },
  ],
  lifecycle: [
    { label: "Attract & Hire", description: "Brand perception & pipeline quality", status: "ok" },
    { label: "Onboarding", description: "90-day integration & early signals", status: "watch" },
    { label: "Develop", description: "Growth, coaching & capability", status: "watch" },
    { label: "Perform", description: "Execution, goals & manager effectiveness", status: "ok" },
    { label: "Mobility & Succession", description: "Bench strength & readiness", status: "watch" },
    { label: "Retain", description: "Flight risk, engagement & loyalty", status: "ok" },
    { label: "Separation", description: "Exit signals & knowledge transfer", status: "watch" },
  ],
};

export const ORG = {
  managers: 12,
  practising: 8,
  atRisk: 3,
  bands: [
    { label: "Practising weekly", value: 8, tone: "green" },
    { label: "Started, then stalled", value: 1, tone: "amber" },
    { label: "Never started", value: 3, tone: "gray" },
  ],
  privacyNote:
    "Aggregates only. No manager's answers or conversations are visible here — the organisation sees movement, not transcripts.",
};