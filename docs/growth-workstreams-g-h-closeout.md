# Workstreams G and H — closeout

Both workstreams are complete. Evidence is recorded here; nothing in the product
is claimed that was not exercised.

## G — Boundaries behind Growth

| Task | State | Evidence |
| --- | --- | --- |
| G1 Cross-team analytics boundary | Done | `getOrganizationalAnalytics` and `getOrgPulseAggregates` refuse an Essentials tenant in block mode (403, `module: cross_team_analytics`); the manager's own team view stays open |
| G2 Historical window per tier | Done | `getHistoricalTrends` clamps an Essentials tenant to the current cycle instead of refusing, so dashboards keep rendering |
| G3 Automation above Essentials | Done | `executeAutomation` is gated; standard reminders do not pass through it |
| G4 Only the authorized connectors are published | Done | Pricing page now names Microsoft Teams, Outlook calendar, Google Calendar and HubSpot — the authorized set, nothing planned |
| G5 360 end to end | Done | Growth tenant in block mode: cycle launched (200, `active`), self review submitted (200, `submitted`, tenant-stamped), workspace read (200) |
| G6 Multi-unit rollup | Done | Go Flat Bridge (four departments, two reporting teams) returns per-unit teams with member counts and per-unit goal, assessment and check-in aggregates through `getDivisionTeams`, and `getTeamRollup` returns one card per direct report over the same tree |
| G7 Signals gated to Growth | Done | `getSignalForTaking` and `submitSignalResponse`; refused in block, allowed and logged in warn |
| G8 Performance Manager gated | Done | Reviews, calibration and 360 refused below Growth; check-ins and goals/KPIs/OKRs are never gated |
| G9 Talent Manager gated to Organization | Done | Applied once in `successionAuthBootstrap`, so every succession action inherits it |

Coverage and the warn-versus-block proof runs are in
[`docs/module-gating-rollout.md`](module-gating-rollout.md).

## H — Delivery that matches the order form

| Task | State | Evidence |
| --- | --- | --- |
| H1 Launch runbook | Done | [`docs/delivery-runbook.md`](delivery-runbook.md) — kickoff to 30-day review, each phase with a checkpoint |
| H2 Hours logged from the first implementation | Done | Hours log opened: [`docs/launch-pack/hours-log.md`](launch-pack/hours-log.md), five-hour guardrail and the cause rule |
| H3 Objection-removal resources exist as links | Done | Five documents in [`docs/launch-pack/`](launch-pack/): setup checklist, manager quick-start, report template, visibility and approval guide, launch kit |
| H4 Acceptance written into order form v1 and the runbook | Done | [`docs/launch-pack/order-form-v1.md`](launch-pack/order-form-v1.md) quotes the same five sentences as the runbook's acceptance section |

## What stays unpublished

- The launch assurance stated in business days.
- Any AI or Atreus usage allowance.
- Anything beyond the four live connectors.

The multi-unit rollup is now provable, so it may be described as reporting
across units on a two-unit organisation; it is still not promised as an
enterprise-wide consolidation until a customer with more than two units runs it.
