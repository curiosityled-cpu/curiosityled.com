# 90-Day Manager Launch — delivery runbook

The delivery half of the offer. Anyone implementer, not only the founder, should
be able to run a launch from this page without asking a question. If a step
needs knowledge that is not written here, the step is not finished.

Two numbers govern the whole thing:

- **Five hours of implementation per tenant.** Anything beyond that is a
  margin problem, not a service level. Logging actual hours is what makes that
  visible before the fifth sale rather than after it.
- **Fifteen business days from signed order to live.** Not promised on any page
  until operations and the contract agree to it (see "Not yet published").

Order of work: kickoff → access and roster → configuration → training → launch
→ 30-day review. Each phase ends with a checkpoint that is either met or the
launch date moves; nothing is carried silently into the next phase.

---

## Phase 0 — Before kickoff (0.5 h)

- [ ] Order form signed, with scope from "Acceptance" below copied into it.
- [ ] Package (`essentials` / `growth` / `organization`) recorded on the tenant
      record, with manager and participant allowances.
- [ ] Named customer owner identified: the person who will be in the room for
      kickoff and can approve configuration decisions.
- [ ] Named internal owner for the launch (who answers questions from the
      customer during week one).
- [ ] Hours log row opened (see "Hours log").

**Checkpoint:** a tenant record exists with a package and an owner, or nothing
downstream can be configured correctly.

## Phase 1 — Kickoff (1 h, week 1)

- [ ] Confirm the outcome the customer wants in 90 days, in their words, and
      write it into the hours log row. Not a feature list.
- [ ] Agree the manager population: who manages people, who is a participant,
      and who the frontline roster includes if any.
- [ ] Agree the check-in cadence and the day of the weekly reflection.
- [ ] Agree the one report layout the customer will review in month one.
- [ ] Agree data handling: what managers see about their team, what HR sees,
      and what the org does not collect. Written down, not implied.

**Checkpoint:** the four configuration decisions above are agreed and recorded.
A kickoff where these are "to be decided later" is a launch that fails in week
three.

## Phase 2 — Access and roster (1.5 h, week 1)

- [ ] Import the manager list and the participant list.
- [ ] Confirm the invite writer shows used versus allowed before sending, so an
      over-allowance add is caught before it becomes a conversation.
- [ ] Send invites; confirm at least one manager signs in during week one.
- [ ] If frontline staff are included: import the roster, confirm each person's
      route in (Teams or the private link), and that no one is invited twice.
- [ ] Confirm every identity is in the right tenant before any data is written.

**Checkpoint:** one manager has completed a real check-in in the live tenant.
Not a test account.

## Phase 3 — Configuration (1.5 h, week 1–2)

- [ ] Three check-in templates set up: the default morning question set, the
      evening set, and any custom questions the customer asked for.
- [ ] Custom questions limited to what the customer will actually use in month
      one. Five questions that are answered beat fifteen that are not.
- [ ] One report layout configured and shared with the customer owner.
- [ ] Goals/KPIs/OKRs framework selected (goals, KPIs, OKRs, or a mix) and
      review cadence set.
- [ ] If the package includes reviews: cycle dates and the participant roster
      drafted, not launched. (Review cycles are a package boundary — confirm the
      tenant's package includes Reviews before promising one.)

**Checkpoint:** the customer owner has seen the report layout with real week-one
data in it.

## Phase 4 — Training (0.5 h)

- [ ] One 30-minute manager session: what a check-in is for, what Atreus will
      and will not do, and where to find their team view.
- [ ] One 15-minute admin session: invites, allowances, reports, and how to ask
      for a change.
- [ ] Send the manager quick-start (below) and the visibility and approval
      guide, so the answer exists after the call.

**Checkpoint:** at least one manager other than the owner has opened the app
since training, or the session is repeated before launch is called complete.

## Phase 5 — Launch (0.5 h, week 2)

- [ ] Automated check-ins switched on at the agreed cadence and local send time.
- [ ] The customer owner confirms the first automated send reached a manager.
- [ ] Support route stated: who to contact, and the response expectation.
- [ ] Hours logged and the launch marked live on the tenant record.

**Checkpoint:** the customer can point at a check-in that arrived, not at a
setting that was enabled.

## Phase 6 — 30-day review (0.5 h, week 5)

- [ ] Review participation: how many managers checked in, how often.
- [ ] Review the one report layout with the customer owner against the 90-day
      outcome agreed at kickoff.
- [ ] Agree one change for month two — a question, a cadence, a report — not a
      list.
- [ ] Log any product gap the launch exposed; that is a roadmap input, not a
      support ticket.
- [ ] Log hours; if the run exceeded five, record what caused it here so the
      next launch is shorter.

**Checkpoint:** a month-two change is agreed in writing, or the customer states
the launch met the outcome and no change is needed.

---

## Hours log

One row per implementation, kept with the tenant record. The guardrail is five
hours; there is no target below it and no tolerance above it without a written
reason.

| Tenant | Package | Kickoff date | Live date | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 | Total | Over/under 5 h | Cause if over |
| ------ | ------- | ------------ | --------- | ------- | ------- | ------- | ------- | ------- | ------- | ----- | -------------- | ------------- |
|        |         |              |           |         |         |         |         |         |         |       |                |               |

Rules for the log:

- Phases are recorded in hours to one decimal; a phase with no time against it
  did not happen.
- The cause column is completed whenever the total exceeds five hours, in the
  implementer's words, not a category.
- The median across launches is the number used in the commercial review, never
  the best launch.

## Launch pack (what the customer receives)

Each item is sent as a link in the onboarding pack. Nothing on this list is
promised on the pricing page.

- [ ] **Setup checklist** — the customer-side version of phases 0–2: who to
      invite, what to send us, and what we do with it.
- [ ] **Manager quick-start** — one page: what a check-in is for, how long it
      takes, what a manager gets back, and what their manager can see.
- [ ] **Report template** — the month-one layout defined at kickoff, with a
      worked example on fictional data, labelled as fictional.
- [ ] **Visibility and approval guide** — who sees individual check-ins, who
      sees aggregates only, and how a change of visibility is approved.
- [ ] **Launch kit** — the internal version of this runbook, trimmed to the
      phases, with the checkpoints as the definition of done.

## Acceptance (order form v1)

The signed scope and the acceptance criteria are the same sentences:

1. The agreed manager population has been invited, and at least one manager has
   completed a check-in in the live tenant.
2. The agreed check-in cadence is switched on and has delivered at least one
   automated prompt to a manager.
3. The agreed report layout exists and shows real tenant data.
4. The manager training session has been delivered and the manager quick-start
   and visibility guide have been sent.
5. The 30-day review is booked at launch and held within five working days of
   day 30.

The launch is complete when items 1–4 hold. Item 5 is the first month-two
commitment, not a condition of go-live. Any deviation is agreed in writing
before the launch date, never discovered at the review.

## Not yet published

These remain unwritten promises and must not appear on any public page or in a
proposal until they exist:

- The 15-business-day launch assurance: needs operational and contractual review.
- Any published AI or Atreus usage allowance: needs four cycles of measured cost.
- Multi-unit rollup: quoted only until proven on a two-unit fixture.
- Connectors beyond HubSpot, Outlook, Google Calendar and the Teams bot.
