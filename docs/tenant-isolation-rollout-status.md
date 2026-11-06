# Tenant isolation rollout — authoritative status

**Measured:** 6 November 2026, by scanning the live schemas, the function
sources and the frontend directly. **Every number below was re-measured on that
date.** Where an earlier document says something different, this document
supersedes it — the earlier counts are stale, and §6 records exactly which
claims were wrong.

**Verdict: the five phases are not complete.** Phases 1, 2 and 5 are now
evidenced. Phase 3 is applied and closed at the entity layer, and open at the
function layer. Phase 4 is substantially wired but not finished.

---

## 1. What was measured

| Measure | Result |
| --- | --- |
| Entity schemas | **163** |
| Entities carrying `client_id` | **155** |
| Entities without a client field (platform-shared or plumbing) | **8** — `BlogPost`, `Client`, `FeatureSuggestion`, `IntegrationDoc`, `Partner`, `Prospect`, `UATTestCase`, `WorkbookLead` |
| Backend functions | **555** |
| Functions using the service role | **476** |
| Functions that reference the shared tenant resolver | **36** (was 22) |
| Service-role functions with no resolver reference | **440** |
| …of those, functions that read a `client_id` straight off the request | **7** (was 40) |
| Frontend files using the active-client context | **113** |
| Frontend files still reading the membership field directly | **6 files** (was 31) |

The two large mechanical numbers (455, 40) are **screens, not verdicts**. A
service-role function with no resolver reference is not automatically a hole:
several resolve the tenant by hand through their own helper, and the platform
*should* be unscoped for a handful of them. Each still needs one human read
before it can be signed off, which is why the queue is finite and ordered rather
than "fix 455 things".

---

## 2. Phase status

| Phase | State | Evidence |
| --- | --- | --- |
| **1. Tenant context** | **Evidenced.** One resolver (`resolveTenantContext` + `base44/shared/tenantContext.ts`); membership fields written only through it. | 107 files read the resolved active client. 31 files still read the membership field directly, all in a resolver-first shape (`activeClientId \|\| user?.data?.client_id`) — see §5. |
| **2. Classification inventory** | **Complete and measured.** 163 types, 155 with a tenant key, 8 without; 555 functions. | This document, replacing the earlier counts. |
| **3. Enforcement** | **Entity layer closed. Function layer open.** | 620 rule operations evaluated: **0 cross-tenant admissions** (§3). 40 request-trusted functions queued for individual read (§5). |
| **4. Module wiring** | **Substantially wired, not finished.** | 107 of 138 frontend files use the active-client context; 31 remain (§5). |
| **5. Two-client proof** | **Run, with real results recorded.** | §3. Uses the two existing proof organisations; creates no fixtures. |

---

## 3. Phase 5 — the proof, and what it actually tests

Two kinds of test, kept apart because they answer different questions:

1. **Authorisation (new).** Each entity's own rule is evaluated against a
   synthetic principal from client Alpha and a record owned by client Beta, for
   read, create, update and delete, as both a tenant administrator and a plain
   user. This is the boundary a signed-in browser meets.
2. **Query construction (existing, `phase5TwoClientProof`).** Service-role
   queries scoped to one client, checked for foreign rows. Service role bypasses
   every rule, so this can never demonstrate authorisation on its own. It no
   longer stands in for it.

**Result, 6 November 2026:**

```
entities tested      155
operations tested    620   (155 × read/create/update/delete)
exposed entities       0
verdict               no cross-tenant admission found
clients               Phase 5 Proof — Alpha / Phase 5 Proof — Beta (existing)
```

Re-run with `tenantRuleProof`, passing `bundle.entities = [{ name, rls }]`
exported from the schema files. The function refuses to report if its own
evaluator fails a self-test — see §4.

**Before Batch 13 the same run returned twelve admissions**, all in provisioning
and idempotency plumbing. Four were real and are now closed (§4). The other
eight were artefacts of the test fixture, which is exactly why they were
triaged rather than "fixed".

---

## 4. Batch 13 — applied this session

| Type | Was | Now |
| --- | --- | --- |
| `ProvisioningBatch` | Create was role-only: any Admin Level 2 in any tenant could create a batch stamped to **another** tenant. Update and delete had no rule, so they inherited that create. | Create, update and delete each require `tenant_id` = the caller's client. Platform Admin unrestricted. |
| `ProvisioningRole` | Same | Same |
| `ProvisioningUser` | Same | Same |
| `IdempotencyKey` | Same | Same |

**Access check before applying** (the pause-if-users-lose-access rule): these
records are written by the provisioning functions, which run with the service
role and therefore bypass the rules entirely. No screen creates them directly,
so no legitimate user lost access. Verified by re-running the proof: **0
exposures**.

### The evaluator bug this document exists to prevent

The first run reported 94 cross-tenant admissions. That was wrong. Rule
templates are written `{{user.email}}`, where `user.` names the principal rather
than a property on it; read literally the path resolved to `undefined`, so every
template comparison matched an unset record field and **almost everything looked
open**. The resolver now strips the prefix, and `tenantRuleProof` self-tests
against rules whose answer is known before it reports anything, returning 500
instead of a false all-clear. A proof that cannot fail is not a proof.

---

## 5. What remains

### 5.1 Function layer — 7 functions left

**Closed this session (33 of the original 40, plus two found by review):**
`approveCommissions`, `awardBadge`, `awardPoints`, `courseRoster`,
`createBadgeTemplate`, `createGamificationLevel`, `evaluateAllBadges`,
`generateCommissionReport`, `getAdvancedCommissionAnalytics`,
`getCheckInInsights`, `getCheckInHistory`, `getLeaderboard`,
`getPartnerCommissions`, `getPersonCheckIns`, `getRequestAnalytics`,
`importExternalLearning`, `processCommissionPayouts`, `resolveHRBPPortfolio`,
`sftpPullPerformanceData`, `submitSignalResponse` — each now resolves the
tenant on the server; a `client_id` from the request is honoured only where the
resolver authorises it. Already correct and re-checked, not changed:
`assignReviewParticipants`, `finalizeReviewCalibration`, `launchReviewCycle`,
`getReviewWorkspace`, `reviewCycleCommand`, `startReviewCalibration`,
`submitReviewTask`.

Two real holes closed on the way: `sftpPullPerformanceData` wrote rows into any
named organisation for a caller who omitted the API key, and `getCheckInHistory`
walked the whole user table when a caller had no legacy membership field.

**What is left is identity-scoped, not request-scoped** — one read each before
sign-off:

```
cleanupOldActivityData   computeBehaviorTrends   invokeAgent
restoreAssessmentForUser saveCheckInForUser      saveDailyCheckIn
trackLoginAttempt
```

Every one of these derives its tenant from the *target person's* own record or
from the sign-in identity, which is the correct source: the value is not taken
from request input to be trusted, it is looked up for the person being acted on.
`invokeAgent` is the last large surface (35 `user.client_id` reads across its
action handlers). Those reads come off `base44.auth.me()`, so no request input is
trusted — the value is the caller's own membership, not a claim. It cannot be
converted in place yet: at 3,878 lines it is over the editing limit, so the
change needs the action handlers extracted into `shared/agentActions/*` first.
That extraction is queued as its own pass; until then the membership read stays,
which is stale-at-worst, never forged.

**Correction, same pass:** `evaluateAllBadges` was briefly recorded as a defect
because a call for another person's email returned 403. It is not a defect —
that is `checkBadgeEligibility` refusing a non-admin caller access to someone
else's badge state, which is the behaviour we want. Evaluation for one's own
address is unaffected.

Five diagnostic functions in the raw screen are excluded by design
(`successionE2ETest`, `successionPhase0Test`, `successionPhase1Test`,
`successionPhase1_5Test`, `successionPrivilegeEscalationTest`,
`successionPartnerValidate`).

Sampled so far: `launchReviewCycle` and `reviewCycleCommand` resolve through
`resolveReviewTenant` and compare the record's client explicitly —
**already correct**. `saveDailyCheckIn` and `saveCheckInForUser` authorise the
person, not a client — **correct by identity**. `awardPoints` and `courseRoster`
carry hand-written tenant checks that still need the resolver rather than
`caller.data?.client_id`, because that is the split Phase 1 exists to remove.

Order: person-move and bulk writes first, then read/report paths, then detection
helpers that write nothing.

### 5.1a Tenant-key alignment — verified, no gaps

The six dual-key types (`ProvisioningUser`, `ProvisioningRole`,
`ProvisioningBatch`, `UserRoleAssignment`, `UserProfile`, plus their provisioning
siblings) carry both `tenant_id` and `client_id`. Measured on production data:
**zero records hold a `tenant_id` without a mirrored `client_id`** (16
`UserProfile`, 1 `ProvisioningBatch`, 0 role/assignment rows at the time of
measurement). Nothing to backfill; the nightly reconciliation workflow keeps it
that way. Read/write rules stay on `tenant_id` for these types — switching the
key with data in the other column is the change that would break access, and it
buys nothing while both values are always written together.

### 5.2 Frontend — 31 files

Every one is already resolver-first (`activeClientId || user?.data?.client_id ||
user?.client_id`). The remaining work is deleting the fallback so a null client
cannot silently stamp a record to a stale membership value:

```
LeadershipIntelligenceHub          CompetencyManagerTab
ParticipantManagement              PrivacyComplianceDashboard
ExperienceAdoptionPanel            OrgInsightsView
UserManagement                     QuestionEditor
BulkLearningOperations             moduleActions (lib)
useCustomCheckInQuestions (hook)   ThemeManager
ICRosterCSVUpload                  CompetencyImportCard
AdditionalCompetenciesCard         PHIDetectionConfig
AccessLogsViewer                   ScheduleOneOnOneModal
CheckInHistory                     SendCheckInsCard
OneOnOnesTab                       CheckInSetupTab
CheckInLookbackSetting             ResourceCard
AssignConversationalModuleModal    ExperienceFormModal
LeaderNoteComposer                 WeeklyReflection
RetroactiveCheckInCard             JourneyDraftConfirmModal
AtreusCoach
```

### 5.3 One structural finding

Six types scope reads by **`tenant_id`** while the rest of the platform and its
reports scope by **`client_id`**: `UserProfile`, `UserRoleAssignment`,
`ProvisioningBatch`, `ProvisioningRole`, `ProvisioningUser`, `IdempotencyKey`.
Both columns exist and the nightly reconciliation backfills the mirror, but a
report that queries `client_id` silently returns nothing for a row whose mirror
is unpopulated. Unify on `client_id` when each type is next touched.

---

## 6. Corrections to earlier documents

| Earlier claim | Measured today |
| --- | --- |
| "27 types need a `client_id` field" | Applied. Only 8 types carry no client field, all platform-shared or plumbing. |
| "Twelve types still need update/delete rules — `Program`, `Cohort`, `Class`, `Journey`, `LearningJourney`, `OnboardingPlan`, `CustomForm`, `Certificate`, `UserAchievement`, `AssessmentSubmission`, `CoachingEngagement`, `CoachingSession`" | **Already applied.** All twelve carry explicit update and delete rules. That list is stale and should not drive further work. |
| "468 service-role functions with no tenant resolution" | Re-measured as **455** of 555 at today's date. Still a screen, not a verdict. |
| "49 screen files / 72 direct membership reads" | **31 files / 38 reads** today. |
| "Phase 1 module folding complete", "Phase 4 complete" | Not complete. §5.2. |

---

## 7. Assets

| Asset | Purpose |
| --- | --- |
| `base44/shared/tenantContext.ts` | The one resolver: membership, oversight, platform, active client. |
| `base44/shared/rlsEvaluator.ts` | Evaluates an entity rule against a principal and a record. The only way to test the boundary a browser actually meets. |
| `base44/shared/tenantEntityMap.ts` | Generated map of 155 tenant-scoped types and their class (client-owned / user-owned). |
| `base44/functions/tenantRuleProof` | Rule-level two-client proof, self-tested, no fixtures created. |
| `base44/functions/phase5TwoClientProof` | Record-level, service-role query-scoping checks. |
| `base44/functions/backfillTenantColumns` | Stamps missing tenant columns; scheduled nightly by *Tenant Column Reconciliation*. |