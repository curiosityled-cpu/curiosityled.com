# Module gating — status and evidence

**Measured:** 17 November 2026. This document records what is enforced, how it
was proved, and what is left. It supersedes ad-hoc notes in chat.

The commercial model sells **coverage, not seats**: a tenant's package decides
which modules it can reach. The boundary therefore lives on the server, in one
place, so a locked module is refused the same way whether the request comes from
a screen, a scheduled job or a direct function call.

---

## 1. Where the boundary lives

| Asset | Role |
| --- | --- |
| `base44/shared/moduleGate.ts` | The single source of truth: module → required package, and the enforcement decision per tenant. |
| `enforceModule(base44, clientId, module, { actorEmail, source })` | Returns `null` when the tenant may proceed, or a 403 `Response` when it may not. Called after the tenant is resolved and before any work is done. |
| `ModuleGateLog` | One row per attempt on an excluded module: tenant, module, package, mode, outcome, actor, message. |
| `src/components/modules/ModuleRoute` · `ModuleLocked` | Screen-level counterpart: a locked module renders the package explanation instead of the screen. |
| `getModuleGateStatus` | Read-only admin view of each tenant's package, mode and excluded modules. |

**Two modes.** `warn` (the default for every existing tenant) records the attempt
and lets it through. `block` refuses it. A tenant only moves to `block` after a
clean warn-mode period, because enforcement must never break a live manager
workflow.

---

## 2. Modules under the boundary

| Module | Minimum package | Refused at the server by |
| --- | --- | --- |
| Signals | growth | `getSignalForTaking`, `submitSignalResponse` |
| Reviews & 360 | growth | `launchReviewCycle`, `reviewCycleCommand`, `assignReviewParticipants`, `startReviewCalibration`, `finalizeReviewCalibration`, `submitReviewTask` |
| Cross-team analytics | growth | `getOrganizationalAnalytics`, `getOrgPulseAggregates` |
| Extended history | growth | `getHistoricalTrends` — an Essentials tenant is **clamped** to the current cycle rather than refused, so existing dashboards keep rendering |
| Custom automations | organization | `executeAutomation` — standard reminders do not pass through it and stay available to everyone |
| Talent Manager | organization | applied once in the shared succession authorisation (`successionAuthBootstrap`), so every succession action inherits it |

A manager's own team view is deliberately outside the boundary: it never passes
through the cross-team analytics gate.

---

## 3. What was proved, and how

Every proof ran against a temporary tenant created for the purpose and deleted
afterwards. No production tenant's package or mode was changed, and no fixture
survives.

| # | Claim | Evidence |
| --- | --- | --- |
| 1 | A blocked tenant is refused **Signals** | `getSignalForTaking` on an Essentials tenant in `block`: **403**, `module: signals` |
| 2 | A blocked tenant is refused **Reviews** | `reviewCycleCommand` on an Essentials tenant in `block`: **403**, `module: reviews` |
| 3 | `warn` mode still lets the work through | Same Signals call in `warn`: **200** with the assessment returned |
| 4 | Every attempt is recorded | `ModuleGateLog` held the `reviews / blocked / reviewCycleCommand` row, and the `signals / warned` row in warn mode |
| 5 | A blocked tenant is refused **cross-team analytics** | `getOrganizationalAnalytics` on an Essentials tenant in `block`: **403**, `module: cross_team_analytics` |
| 6 | The boundary does not break a manager's team view | `getTeamRollup` under the **same** blocked tenant: **200**, returning `scope_type`, `scope_size`, `members`, `aggregates` |
| 7 | An entitled tenant's **360 round** runs end to end through the gate | Growth tenant in `block`: cycle launched (**200**, status `active`), self review submitted (**200**, submission `submitted`, tenant-stamped), workspace read (**200**) |
| 8 | Career-path screens read inside the boundary | Every career-path screen reads `base44.entities.CareerPath`, which carries a tenant-scoped read rule; no screen reads the table through a service-role function. Creation from the browser now stamps the active client, which the create rule requires |

After the runs: `Client` count back to **4**, `ModuleGateLog` **0 rows**.

---

## 4. What is left

1. **Packages are assigned; the warn period is not yet producing evidence.**
   As of 17 Nov: Alpha `essentials`, Beta `growth`, Go Flat Bridge and HealthCo
   `organization`, all in `warn` mode, so nothing is refused. Three things stand
   between this and a warn report worth signing off:
   - **Audiences are still empty, and only invitations can fill them.** User
     records cannot be inserted directly — writing one silently does not persist
     — so people exist in a tenant only after an invitation is accepted. Four
     test invitations are queued (Alpha manager, Alpha participant, Beta
     manager, HealthCo manager); each person then needs their tenant and role
     placed on the record. A warn row is written only when a signed-in person
     *in that tenant* opens a gated screen, so the log stays empty until then.
     Note that HealthCo is `organization`, which includes every module: it can
     never produce a module row, only a capacity overage.
   - **No allowances are set.** `manager_allowance` and `participant_allowance`
     are blank on every tenant, which is permissive, so no capacity overage is
     recorded either — only module attempts would be.
   - **No timezone on Alpha or Beta.** `business_timezone` is set on Go Flat
     Bridge and HealthCo only; date-sensitive succession writes reject without
     it.
   After a clean warn period, the flip to `block` is a tenant-record change, one
   tenant at a time, starting with Alpha.
2. **Read-level career paths.** The create rule requires the record's tenant to
   match the caller's, so a platform-wide default (`client_id: null`) can no
   longer be created or edited from a tenant screen. That is the correct
   default-creation path to design deliberately, not a defect to patch in the
   modal.
3. **Sign-off queue.** The 421 un-read backend functions in
   `docs/tenant-isolation-rollout-status.md` §5.4 stay in that queue; module
   gating does not depend on them.

---

## 5. Delivery

The 90-day implementation kit sits in `docs/delivery-runbook.md`: kickoff to
30-day review, the acceptance definition in the sentences an order form can
quote, and the claims that must not be published until the capability behind
them exists.
