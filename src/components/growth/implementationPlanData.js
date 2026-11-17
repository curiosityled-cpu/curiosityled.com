// Implementation plan for the recommendations in the 16 November 2026 brief
// and the attached offer documents. Ordered by dependency, not by calendar:
// each workstream starts when the one it depends on is finished. Effort is in
// builder-days for one full-time developer, with the founder selling alongside.

export const EFFORT_BASIS = {
  workstreams: 8,
  days: 36,
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
    detail: "The pricing page sells bundles, not list prices: Essentials, Growth, Organization and Studio, quoted from user count and structure with a $5,000 a year minimum.",
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
    unlock: "One function returns managers used, participants used, allowances and add-on blocks for a tenant, and an admin can see it.",
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
    unlock: "Pricing page live with the four bundles and no list price on any package, demo as the primary CTA, events firing, and the 90-Day Launch runbook recording actual hours.",
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
        task: "Write the refusal message: what the limit is, who to contact, and the add-on block that resolves it.",
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
    order: "Step 5 — after A, C and D",
    effort: "6 days",
    depends: "A, C, D",
    why: "There is no pricing route and no price string on any public page. The page can go live once — and only once — enforcement exists and the copy is honest, because the price page is the one artefact prospects compare against the order form.",
    tasks: [
      {
        id: "F1",
        task: "Build a pricing page around four module bundles — Essentials (Lead, Team, Practice, Leadership Intelligence), Growth (adds Development Manager and Performance Manager), Organization (adds Talent Manager) and Studio (compose your own) — with no price on any package and capacity blocks as order-form line items.",
        done: "No bundle carries a list price; each names its modules; the $5,000 a year minimum is stated once and the quote follows user count and structure.",
        touch: "New page, public route",
      },
      {
        id: "F2",
        task: "Make the no-signup demo the primary CTA and put it in the persistent nav.",
        done: "Demo reachable from every public page, labelled fictional.",
        touch: "LandingNav, landing sections",
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
    order: "Step 6 — after B and C; makes Growth quotable",
    effort: "9 days",
    depends: "B, C",
    why: "Growth and Organization sell things that exist but are not bounded: cross-team analytics, historical windows, automation, connectors and multi-unit rollup. Each must have a boundary before Growth can carry a price — this is the workstream that turns a quote into a package.",
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
        task: "Exercise the 360 flow end to end or stop naming it as a differentiator.",
        done: "A multi-rater cycle is completed in test, or the claim is removed.",
        touch: "Assessment360 flow",
      },
      {
        id: "G6",
        task: "Prove multi-unit rollup on a two-unit fixture before Organization promises it.",
        done: "A two-unit fixture reports correctly, or Organization stays scoped-only.",
        touch: "OrgPosition, OrgRole, rollups",
      },
    ],
  },
  {
    id: "H",
    name: "Delivery that matches the order form",
    order: "Parallel — never blocks F",
    effort: "5 days",
    depends: "None",
    why: "The $750 implementation only works if delivery is a runbook rather than a founder improvising. The five-hour guardrail is what keeps implementation margin positive.",
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
  "Capacity blocks and the acceptance definition written into the order form.",
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
    mitigates: "Publish Essentials only. Growth becomes quotable once workstream G lands, not before.",
  },
  {
    risk: "Allowance disputes with customers",
    mitigates: "One written definition, visible usage in the admin panel, and add-on blocks as the resolution path instead of an exception.",
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
];

export const DEFERRED = [
  "Self-serve checkout and in-product upgrade: tenants are provisioned by hand this quarter, which keeps the first ten contracts under founder control.",
  "Organization tier's multi-unit promise: quoted only until the two-unit rollup is proven.",
  "Connector breadth beyond HubSpot, Outlook, Google Calendar and the Teams bot.",
  "Any published AI or Atreus allowance: measured in workstream E, published only after four cycles of cost data.",
  "The 15-business-day launch assurance: operational and contractual review first.",
  "A fourth tier or per-seat billing: capacity blocks answer the same problem without a new price point.",
];

export const DECISIONS = [
  {
    decision: "Approve the P0 copy corrections",
    why: "They are the only site changes I would make before anything else, and two days of work removes the largest credibility risk in the offer.",
  },
  {
    decision: "Approve the four-bundle packaging (Essentials / Growth / Organization / Studio) and the $5,000 annual minimum",
    why: "Bundles sell modules rather than prices, so the same page works for a 40-person and a 4,000-person buyer. Capacity blocks stay order-form line items keeping an 11–30 manager buyer on Essentials; block rates are derived from your tier rates and still need validating in the quote.",
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