// Sample content for the redesign mockups. Nothing here is real learner data.
export const SAMPLE = {
  firstName: "Maya",
  resume: {
    title: "Leading Through Ambiguity",
    kind: "Course",
    step: "Lesson 3 of 7",
    meta: "12 min left",
    percent: 46,
    due: "Due in 4 days",
  },
  journeys: [
    { title: "First 90 Days as a Manager", meta: "8 steps · 6 weeks", done: 3, total: 8, state: "in_progress" },
    { title: "Coaching Conversations", meta: "6 steps · 4 weeks", done: 0, total: 6, state: "not_started" },
    { title: "Leading Change", meta: "10 steps · 8 weeks", done: 10, total: 10, state: "completed" },
  ],
  courses: [
    { title: "Giving Feedback That Lands", meta: "5 lessons · 45 min", percent: 80, due: "Due in 2 days" },
    { title: "Decision Quality Under Pressure", meta: "7 lessons · 1 hr 10 min", percent: 0, due: null },
    { title: "Running a One-on-One", meta: "4 lessons · 30 min", percent: 100, due: null },
  ],
  experiences: [
    { title: "Shadow a Regional Ops Lead", meta: "Stretch · Q4", state: "in_progress" },
    { title: "Facilitate a Team Retrospective", meta: "Practice · 60 min", state: "not_started" },
  ],
  journeyDetail: {
    title: "First 90 Days as a Manager",
    deck: "A sequenced path for your first quarter in role — from listening tour to your first performance conversation.",
    percent: 38,
    due: "Due 12 Dec",
    steps: [
      { n: 1, title: "The listening tour", kind: "Course", state: "done" },
      { n: 2, title: "Map your stakeholders", kind: "Worksheet", state: "done" },
      { n: 3, title: "Set your operating rhythm", kind: "Course", state: "done" },
      { n: 4, title: "Your first one-on-one", kind: "Conversation", state: "next", meta: "18 min" },
      { n: 5, title: "Calibrate expectations with your manager", kind: "Guide", state: "locked" },
      { n: 6, title: "Write your 90-day review", kind: "Reflection", state: "locked" },
    ],
    optional: ["Shadow a peer manager's stand-up", "Run a listening-tour debrief"],
  },
  activity: {
    lesson: "Your first one-on-one",
    course: "Leading Through Ambiguity",
    step: "Step 3 of 7",
    minutes: "18 min",
    purpose: "Open a first conversation that sets expectations without taking over.",
    body: [
      "The first one-on-one sets the tone for every conversation that follows. Most managers open with status updates; the ones people remember open with context.",
      "Start by naming why you are meeting. Not the agenda — the intent. “I want to understand what's blocking you before I ask for anything.”",
      "Then leave room. The first meeting is mostly listening, and the silence you are tempted to fill is usually where the useful thing gets said.",
    ],
    takeaway: "Intent before agenda. Listening before asking.",
    next: "Lesson 4 — Calibrate expectations",
  },
};