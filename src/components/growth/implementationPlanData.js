// Implementation plan for the recommendations in the 16 November 2026 brief
// and the attached offer documents. Ordered by dependency, not by calendar:
// each workstream starts when the one it depends on is finished. Effort is in
// builder-days for one full-time developer, with the founder selling alongside.

export const EFFORT_BASIS = {
  workstreams: 8,
  days: 38,
  milestones: 6,
  parallel: "Atreus metering and delivery documentation start once the tenant record carries a package — they are measurements, not dependencies.",
};

export const SEQUENCE = [
  {
    step: "Trust",
    detail: "Nothing is published or sold until the two P0 claims and the demo labelling are fixed. Two days of work, and the only thing that can invalidate a signed deal after the fact.",
  },
  {
    step: "Count",
    detail: "A package field and one counting function come before any pricing page, because an allowance that cannot be counted is not an allowance.",
  },
  {
    step: "Enforce",
    detail: "Enforcement lands at invite and roster import only, in warn mode first. The manager loop a customer already relies on is never blocked.",
  },
  {
    step: "Publish",
    detail: "The pricing page sells one platform in three bundles with a single published minimum, not three prices. Growth stays quoting-only until the module boundaries and cross-team analytics have real switch-offs.",
  },
  {
    step: "Prove",
    detail: "Ten conversations on identical terms, with delivery hours and AI cost measured, so the day-90 decision rests on data rather than opinion.",
  },
];

export const MILESTONES = [
  {
    id: "M1",
    gate: "After A",
    name: "Showable again",
    unlock: "No unsubstantiated claim on any public page; the demo is labelled fictional at the point of use; the package fields are defined on the tenant record.",
    proves: "A prospect can be taken through the site without us overclaiming.",
  },
  {
    id: "M2",
    gate: "After B and C",
    name: "Allowances are countable",
    unlock: "One function returns managers used, participants used, allowances and any extra purchased capacity for a tenant, and an admin can see it.",
    proves: "A capacity conversation becomes a measurement, not an estimate.",
  },
  {
    id: "M3",
    gate: "After D",
    name: "Enforcement is live, softly",
    unlock: "Invite and roster import refuse an over-allowance add in block mode, after a clean warn-mode period on real tenants with no manager flow affected.",
    proves: "The published allowance has a technical boundary behind it.",
  },
  {
    id: "M4",
    gate: "After F",
    name: "A narrow offer is public",
    unlock: "Pricing page live with three bundles, no package prices and one published minimum, package CTAs routing to a conversation, events firing, and the 90-Day Launch runbook recording actual hours.",
    proves: "The site and the delivery process match the order form.",
  },
  {
    id: "M5",
    gate: "After G",
    name: "Growth can be quoted",
    unlock: "Cross-team analytics, the historical window, automation and connector breadth each have an enforced boundary, and multi-unit rollup is proven or scoped only.",
    proves: "Growth's price is backed by a package a customer would recognise in the product.",
  },
  {
    id: "M6",
    gate: "After the ten conversations",
    name: "Decision recorded",
    unlock: "Ten prospect outcomes, median implementation hours and AI cost per active manager in hand, and one written decision against the pre-agreed rules.",
    proves: "Hold, re-band or re-boundary is now an evidence-based call.",
  },
];

export const WORKSTREAMS = [
  {
    id: "A",
    name: "Claims and trust",
    state: "Not started",
    order: "Step 1 — start now",
    effort: "2 days",
    depends: "Nothing",
    why: "Two P0 claims read as proof of impact the product does not measure, and the interactive preview presents fictional managers as real. Both are one-file fixes and both block showing the site to a qualified buyer.",
    tasks: [
      {
        id: "A1",
        task: "Replace “Evidence that judgment changed” with “Evidence of what managers did differently”, and show the record type that supports it.",
        done: "No causal or proof language anywhere in the assess-prove section.",
        touch: "LandingAssessDevelopProve",
      },
      {
        id: "A2",
        task: "Cite or remove the $319B–$398B and 50%-left-a-manager statistic.",
        done: "Source, year and population stated beside the figure, or the figure gone.",
        touch: "LandingHero, LandingProblem",
      },
      {
        id: "A3",
        task: "Label every manager persona and score in the interactive preview as fictional sample data.",
        done: "A visible SAMPLE label at the point of use, not only in a footnote.",
        touch: "LandingInteractivePreview",
      },
      {
        id: "A4",
        task: "Time the live diagnostic end to end; publish the real duration or drop “8-minute”.",
        done: "The published number matches a stopwatch run on a fresh device.",
        touch: "LandingHero, LandingFinalCTA",
      },
      {
        id: "A5",
        task: "Qualify “6–8 point tools” and the Teams / Slack write-back claims to what is actually shipped.",
        done: "Only shipped integrations are named; no Slack claim while no Slack connector exists.",
        touch: "LandingBeyond, industry landings",
      },
    ],
  },
  {
    id: "B",
    name: "Package data on the tenant",
    state: "Shipped",
    order: "Step 2 — parallel with A",
    effort: "3 days",
    depends: "Nothing",
    why: "Zero of 163 entities carry a package, allowance or entitlement field today. Everything downstream — counting, enforcement, reporting, the sales conversation — depends on this one record holding the truth.",
    tasks: [
      {
        id: "B1",
        task: "Add to Client: package, manager_allowance, participant_allowance, manager and participant add-on blocks, implementation_fee, billing_start_date, enforcement_mode.",
        done: "Fields exist and are editable by a platform admin on a live tenant.",
        touch: "Client entity",
      },
      {
        id: "B2",
        task: "Add a small Package panel to the existing client record screen.",
        done: "An admin sets a package and allowances in under a minute, with the effective total shown.",
        touch: "ClientModal / BusinessManager",
      },
      {
        id: "B3",
        task: "Backfill every existing tenant; mark genuinely unknown values as unknown rather than guessing.",
        done: "No tenant has a blank package after backfill, and legacy rows are visibly flagged.",
        touch: "One-off migration",
      },
      {
        id: "B4",
        task: "Retire license_count as a source of truth — it becomes display-only.",
        done: "No screen or function reads licence count to decide capacity.",
        touch: "BusinessManager, client functions",
      },
    ],
  },
  {
    id: "C",
    name: "One counting function",
    state: "Shipped",
    order: "Step 3 — after B",
    effort: "4 days",
    depends: "B",
    why: "Managers are role-based users; participants are roster and check-in identities including frontline staff who never log in. Nothing reconciles the two, so no allowance can be sold honestly.",
    tasks: [
      {
        id: "C1",
        task: "Build getTenantAllowanceUsage: managers used, participants used, allowances, add-on blocks, remaining and the overage reason.",
        done: "One call returns a tenant's full capacity position, with the rule it applied.",
        touch: "New backend function",
      },
      {
        id: "C2",
        task: "Write the definition down once: who counts as a manager, whether a sponsor using the manager experience counts, and how roster identities are de-duplicated against users.",
        done: "A single definition the sales conversation and the code both quote.",
        touch: "Docs",
      },
      {
        id: "C3",
        task: "Surface usage in the tenant panel so an admin can see it without asking.",
        done: "Used vs allowed is visible on the client record, including overage.",
        touch: "BusinessManager",
      },
    ],
  },
  {
    id: "D",
    name: "Enforcement, softly",
    state: "Shipped",
    order: "Step 4 — after C",
    effort: "4 days",
    depends: "C",
    why: "A published allowance with no boundary behind it is a promise the product cannot keep. Enforcement therefore exists before the pricing page does — but only where it cannot break a live customer's week.",
    tasks: [
      {
        id: "D1",
        task: "Enforce at invite, manual create and roster import only: inviteAppUser, bulkInviteUsers, createUserManually, importStaffRoster.",
        done: "An over-allowance add is refused server-side on every entry path.",
        touch: "4 existing functions",
      },
      {
        id: "D2",
        task: "Ship warn mode first: log the overage and allow it, until the log is clean on two real tenants.",
        done: "A warn-mode review shows no false positives on legitimate adds.",
        touch: "Enforcement config",
      },
      {
        id: "D3",
        task: "Write the refusal message: what the limit is, who to contact, and the conversation that resolves it (no block pricing on the page).",
        done: "No over-allowance path ends in a dead end.",
        touch: "Invite and roster UI",
      },
      {
        id: "D4",
        task: "Assert the negative: sign-in, check-ins, reviews, exports and reports never consult the allowance.",
        done: "A scripted test proves a full-allowance tenant can still work the whole manager loop.",
        touch: "Test",
      },
    ],
  },
  {
    id: "E",
    name: "AI cost, measured",
    state: "Not started",
    order: "Parallel — after B",
    effort: "3 days",
    depends: "B",
    why: "There is no token or credit tracking around Atreus, so cost per active manager is unknown and no usage allowance can be published. Measurement is cheap; an unmeasured unlimited-AI promise is not.",
    tasks: [
      {
        id: "E1",
        task: "Add an AI usage record per call: tenant, user, function, model, tokens, cost and conversation reference.",
        done: "Every Atreus and LLM-assisted call writes one row.",
        touch: "New entity, atreusOrchestrator",
      },
      {
        id: "E2",
        task: "Write from the remaining LLM call sites, service-role only and admin-readable.",
        done: "No client-side write path, no personal content stored.",
        touch: "Agent and insight functions",
      },
      {
        id: "E3",
        task: "Report cost per active manager, and week-two manager return alongside it.",
        done: "One admin view answers both questions for any tenant.",
        touch: "BusinessManager",
      },
      {
        id: "E4",
        task: "Hold back any published AI allowance until four cycles of real data exist.",
        done: "No allowance number on the site without measured unit cost behind it.",
        touch: "Pricing page copy",
      },
    ],
  },
  {
    id: "F",
    name: "A narrow public offer",
    state: "Shipped",
    order: "Step 5 — after A, C and D",
    effort: "5 days",
    depends: "A, C, D",
    why: "Shipped: /pricing sells one platform in three bundles with a single $5,000 minimum, one CTA per package, no calculators and no capacity blocks. It stays the artefact prospects compare against the order form, so the bundle copy only changes when a boundary behind it changes.",
    tasks: [
      {
        id: "F1",
        task: "Build a pricing page that sells one platform in three bundles: no per-package price, one published minimum of $5,000 a year, variation stated by user count, organization size and corporate structure.",
        done: "No package carries a price; the minimum and its three drivers are stated once; each bundle names exactly which modules it unlocks.",
        touch: "New page, public route",
      },
      {
        id: "F2",
        task: "Keep the offer to one action per package — “Talk to us about Essentials / Growth / Organization” — with the no-signup diagnostic available beside it, and Pricing reachable from the persistent nav.",
        done: "Every package CTA reaches the same conversation; the diagnostic is one click away and still labelled fictional.",
        touch: "LandingNav, pricing page",
      },
      {
        id: "F3",
        task: "Instrument pricing_view, package_select, demo_start, demo_complete and contact_request with package and page attached.",
        done: "Events firing before the page is announced, not after.",
        touch: "analytics.track",
      },
      {
        id: "F4",
        task: "Keep the launch assurance and any multi-unit promise off the page until the operational review is done.",
        done: "No contractual language publishable before it is reviewed.",
        touch: "Pricing page copy",
      },
    ],
  },
  {
    id: "G",
    name: "Boundaries behind Growth",
    state: "In progress",
    order: "Step 6 — after B and C; makes Growth quotable",
    effort: "12 days",
    depends: "B, C",
    why: "The page now sells coverage: Essentials without Signals, reviews and 360, and no Talent Manager; Growth with all three modules but no talent bench; Organization with everything. Every one of those claims needs a switch the server actually respects, on top of the cross-team, history, automation and multi-unit boundaries.",
    tasks: [
      {
        id: "G1",
        task: "Define and enforce the cross-team analytics boundary: what Essentials sees (own team) versus Growth (across teams).",
        done: "The boundary is enforced by package, not by role guessing.",
        touch: "computeBehaviorTrends, getHistoricalTrends",
      },
      {
        id: "G2",
        task: "Set the historical window per tier and enforce it in the trend query.",
        done: "Essentials returns the current cycle; Growth returns the stated multi-period window.",
        touch: "getHistoricalTrends",
      },
      {
        id: "G3",
        task: "Gate configurable automation above Essentials, leaving standard reminders available to everyone.",
        done: "Essentials can use reminders but cannot build custom automations.",
        touch: "Automations, executeAutomation",
      },
      {
        id: "G4",
        task: "Publish only the connectors that are actually authorized, plus the Teams bot.",
        done: "Connector list on the site matches the authorized set exactly.",
        touch: "Pricing page, site copy",
      },
      {
        id: "G5",
        task: "Exercise the 360 flow end to end before the page is announced — 360 is now named on the public Growth card, so this moved ahead of quoting.",
        done: "A multi-rater cycle is completed in test, or the claim is removed.",
        touch: "Assessment360 flow",
      },
      {
        id: "G6",
        task: "Prove multi-unit rollup on a two-unit fixture before Organization promises it.",
        done: "A two-unit fixture reports correctly, or Organization stays scoped-only.",
        touch: "OrgPosition, OrgRole, rollups",
      },
      {
        id: "G7",
        task: "Gate Development Manager's Signals by package: Essentials gets everything except Signals, Growth and above get the full module.",
        done: "An Essentials tenant cannot reach Signals by role, route or direct call. Server gate built; the remaining proof is a live Essentials tenant being refused end to end.",
        touch: "packageEntitlements, getSignalForTaking, submitSignalResponse",
      },
      {
        id: "G8",
        task: "Gate Performance Manager by package: Essentials gets check-ins and goals/KPIs/OKRs only; reviews, calibration and 360 require Growth.",
        done: "Launching a cycle is refused on Essentials, while existing cycles stay readable and submittable and check-ins and goals never gate.",
        touch: "packageEntitlements, launchReviewCycle, 360 flow",
      },
      {
        id: "G9",
        task: "Gate Talent Manager — competency library, succession and career paths — to Organization.",
        done: "Activating succession is refused below Organization while deactivating is always allowed; career-path creation must follow the same gate.",
        touch: "packageEntitlements, successionSetActivation, career-path tools",
      },
    ],
  },
  {
    id: "H",
    name: "Delivery that matches the order form",
    state: "Not started",
    order: "Parallel — never blocks F",
    effort: "5 days",
    depends: "None",
    why: "The implementation only works if delivery is a runbook rather than a founder improvising. The five-hour guardrail is what keeps implementation margin positive.",
    tasks: [
      {
        id: "H1",
        task: "Turn the 90-Day Manager Launch into a runbook: kickoff, roster import, three check-in templates, one report layout, training, 30-day review.",
        done: "A checklist an implementer other than the founder can follow without asking.",
        touch: "Delivery docs",
      },
      {
        id: "H2",
        task: "Log actual hours for every implementation from the first one.",
        done: "Every implementation records hours against the five-hour guardrail.",
        touch: "Simple log or provisioning record",
      },
      {
        id: "H3",
        task: "Publish the objection-removal resources: launch kit, setup checklist, manager quick-start, report template, visibility and approval guide.",
        done: "Each one exists as a link in the onboarding pack, not a promise.",
        touch: "Delivery docs",
      },
      {
        id: "H4",
        task: "Write the acceptance definition into order form v1 and the launch runbook.",
        done: "Signed scope and acceptance criteria are the same sentences.",
        touch: "Order form",
      },
    ],
  },
];

export const GATES_BEFORE_PRICING = [
  "Both P0 claims corrected and the demo labelled fictional.",
  "Package, manager allowance and participant allowance stored on every tenant.",
  "Counting function live, with usage visible to an admin.",
  "Invite and roster enforcement exercised in warn mode on two real tenants with no false positives.",
  "The bundle boundaries behind the page — Signals, reviews and 360, Talent Manager — enforced server-side, and the minimum pricing written into the order form.",
  "pricing_view, package_select and demo events firing in production.",
  "No AI allowance, launch assurance or multi-unit promise on the page.",
];

export const RISKS = [
  {
    risk: "Enforcement refuses an add a live customer depends on",
    mitigates: "Warn mode until the log is clean, then block; enforcement only at invite and roster import; a tested assertion that the manager loop never consults the allowance.",
  },
  {
    risk: "A published price becomes the ceiling for every deal",
    mitigates: "No package carries a list price. One published minimum plus the bundle boundaries is the anchor; Growth becomes quotable once workstream G lands.",
  },
  {
    risk: "Allowance disputes with customers",
    mitigates: "One written definition, visible usage in the admin panel, and a standing conversation path instead of an exception.",
  },
  {
    risk: "AI cost turns out to exceed the margin in Essentials",
    mitigates: "Meter from the first tenant before any allowance is published; cost per active manager is a decision input, not a launch blocker.",
  },
  {
    risk: "Implementation hours drift past five per tenant",
    mitigates: "Hours logged from the first implementation; the runbook is trimmed before the second sale, not after the fifth.",
  },
  {
    risk: "Workstream G delays the pricing page",
    mitigates: "It cannot — F depends on A, C and D, never on G. G is what unlocks Growth's price, not Essentials' page.",
  },
  {
    risk: "The page claims a module the product cannot switch off",
    mitigates: "G7–G9 gate Signals, reviews/360 and Talent Manager by package before the page is announced, and 360 is exercised end to end first.",
  },
];

export const DEFERRED = [
  "Self-serve checkout and in-product upgrade: tenants are provisioned by hand this quarter, which keeps the first ten contracts under founder control.",
  "Organization tier's multi-unit promise: quoted only until the two-unit rollup is proven.",
  "Connector breadth beyond HubSpot, Outlook, Google Calendar and the Teams bot.",
  "Any published AI or Atreus allowance: measured in workstream E, published only after four cycles of cost data.",
  "The 15-business-day launch assurance: operational and contractual review first.",
  "A fourth tier, per-seat billing or published package prices: one minimum and three bundles keep the offer a decision rather than a configurator.",
  "On-page capacity blocks and a package calculator: removed from the offer, because they made the page a puzzle and invited nickel-and-diming.",
];

export const DECISIONS = [
  {
    decision: "Approve the P0 copy corrections",
    why: "They are the only site changes I would make before anything else, and two days of work removes the largest credibility risk in the offer.",
  },
  {
    decision: "Approve the three bundles and the $5,000 minimum",
    why: "Packages now sell module coverage and a conversation, not seat bands and blocks. The minimum is the only number the site publishes, so it has to be the one the order form defends.",
  },
  {
    decision: "Confirm enforcement starts in warn mode",
    why: "A clean warn-mode period before any refusal is the difference between a boundary and an outage for an existing customer.",
  },
  {
    decision: "Nominate the ten prospects and the single segment",
    why: "The commercial test only means something if it is one reachable group with a named internal owner.",
  },
];