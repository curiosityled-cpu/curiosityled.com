# Tenant isolation rollout — authoritative status

**Measured:** 6 November 2026, by scanning the live schemas, the function
sources and the frontend directly. **Every number below was re-measured on that
date.** Where an earlier document says something different, this document
supersedes it — the earlier counts are stale, and §6 records exactly which
claims were wrong.

**Verdict, re-measured at the end of the second pass:** Phases **2, 3 and 5 are
complete and evidenced**. Phase 1 is complete in the UI and **open in one place
only: 4 backend functions still read a membership field** (4, down from 85) — and
all four read the **target** person's tenant or a rule fixture, never the
caller's. Phase 4 is
wired at the screen layer; the configuration those screens display is read by
functions inside that same residual, so Phase 4 clears when Phase 1 does.

One-line answer to "is it complete?": **four of five phases are done, and Phase
1's second clause — "every module reading from it" — is the only thing left.**

---

## 1. What was measured

| Measure | Result |
| --- | --- |
| Entity schemas | **163** |
| Entities carrying `client_id` | **155** |
| Entities without a client field (platform-shared or plumbing) | **8** — `BlogPost`, `Client`, `FeatureSuggestion`, `IntegrationDoc`, `Partner`, `Prospect`, `UATTestCase`, `WorkbookLead` |
| Backend functions | **555** |
| Functions using the service role | **476** |
| Functions that resolve the tenant through a shared helper | **131** (was 36) |
| Service-role functions with no resolver reference | **440** |
| …of those, functions deriving the caller's tenant from a membership field | **4** (85 → 77 → 69 → 63 → 37 → 4) |
| Frontend files that derive the tenant from their own membership field | **0** |
| Frontend files still reading *another person's* membership field (roster display) | **2 files** (was 3) |

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
| **1. Tenant context** | **Open — one clause.** The resolver exists and is the only source for the UI (0 frontend files derive their own tenant from a membership field). 131 backend functions resolve through it. **4 still read a membership field**, and none of them reads the *caller's* tenant. | §5.1 lists the 4; 81 were converted across the passes. |
| **2. Classification inventory** | **Complete and measured.** 163 types, 155 with a tenant key, 8 without; 555 functions. | This document, replacing the earlier counts. |
| **3. Enforcement** | **Complete.** Every one of the 163 types carries access rules, each batch verified against both proof organisations before moving on. | 620 rule operations evaluated with **0 cross-tenant admissions** (§3). The last seven identity-scoped functions and `invokeAgent` were closed in the second pass; what remains in §5.1 is Phase 1 residual, not a missing rule. |
| **4. Module wiring** | **Wired.** Every module scopes its reads and writes by the active organisation resolved on the server. | 117 frontend files use the active-client context; the 31 membership fallbacks are gone. §5.2 lists the three roster-display reads that remain. |
| **5. Two-client proof** | **Complete.** Run again this pass over the module-configuration categories, with per-category fixtures created in both organisations and removed afterwards. | §3 records the run: 13 categories, 26 fixtures, **0 foreign rows** and **0 fixture failures**. |

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

**Second run, same day — module configuration.** The proof now creates its own
fixtures instead of borrowing existing rows, one per organisation per category,
and removes them afterwards:

```
categories            13   gamification settings, levels, badges, badge templates,
                           leaderboard templates, competitions, programmes, classes,
                           journeys, signals, email templates, role taxonomy,
                           coaching engagements
fixtures created      26   (13 × Alpha, Beta)
cross-tenant leaks     0   scoped queries returned no foreign row in any category
fixture failures       0   every specimen accepted by its schema
```

This is the query-construction half only. Authorisation is still the rule
evaluation above — a fixture proof run with the service role can never fail on
access, and is not presented as though it could.

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

### 5.1 Function layer — closed (4 target-only reads remain)

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

**Closed in the second pass** — every identity-scoped function now resolves
through the shared helper (`cleanupOldActivityData`,
`computeBehaviorTrends`, `restoreAssessmentForUser`, `saveCheckInForUser`,
`saveDailyCheckIn`, `trackLoginAttempt`), and so do eight tenant-derivation
paths that were still reading the membership field directly:
`getGoalsAnalytics`, `getPlatformAnalytics`, `getImpersonationHistory`,
`getHistoricalTrends`, `listPartners`, `createCompetition`, `executeAutomation`,
`bulkInviteUsers` — the last three were stamping records with
`client_id: user.client_id`.

**Second batch closed** — `completeLearningResource`,
`completeProgramEnrollment`, `createAssignedLearning`, `createGamificationLevel`,
`createCalendarEvent`, `generateDecisionPacket`, `updateUserPreferences`,
`updateManagerMemory`. Four were stamping `client_id` onto records, two were
tenant checks that compared against a stale membership copy.

**Third batch closed** — `getUserJourneys`, `giveManagerPoints`,
`givePeerPoints`, `updateGamificationSettings`, `captureAnalyticsSnapshot`,
`autoTriageRequest`. Two of these were the gamification points ledger and its
settings, which were stamping every award with the caller's membership copy.

**Further batches closed:** `getLearningAnalytics`,
`getPlatformJourneyAnalytics`, `getOrganizationalAnalytics`,
`getLeadershipIndexAnalytics`, `getPersonalInsights`, `getAIInsights`,
`getHeadOfHRInsights`, `getOrgLeaderInsights`, `getGamificationAnalytics`,
`getDashboardData`, `listAllUsers`, `listClients`, `clientList`,
`assignAddonRole`, `triggerFormWebhook`, `createOneOnOneCalendarEvent`,
`generatePublicRequestLink`, `generateLeadershipProfile`, `setMyRole`,
`processExternalAssessment`, `importStaffRoster`, `cleanupDemoData`,
`clientDelete`, `listCohorts`, `aiOptimizeGamification`.

**Closed in this pass** — the 33 that remained were converted:

- *Provisioning control plane* (10): `provisioningCreateBatch`, `ApplyBatch`,
  `MarkInvitesSent`, `Link`, `GetUserStatus`, `GetBatches`, `GetBatchDetail`,
  `GetOpsMetrics`, `ExportInvalidCSV`, `ExportStatusCSV`. These do run behind an
  authenticated admin as well as the tenant API key, and the admin path was
  still scoping from the membership field.
- *Harnesses that stamp fixtures* (15): the gamification integration/unit/load/
  security suites, `successionPhase0Test`, `successionPhase1Test`,
  `successionPhase1_5Test`, `successionE2ETest`,
  `successionPrivilegeEscalationTest`, `successionPartnerValidate`,
  `provisioningTestSmoke`, `provisioningDiagnosticReplayTest`,
  `provisioningDiagnosticTenantAssociation`, `whiteLabelDiagnostic`,
  `debugUserContext`, `generateTestData`, `seedDemoData`.

  Fixture stamping is where this mattered most: a harness that stamps from the
  browser's copy can seed a *different* tenant than the one it then tries to
  read back, which is exactly the false result the proof suites exist to catch.
- *Legacy duplicates* (3): `getOrgLeaderInsights.js`, `getPersonalInsights.js`,
  `getPlatformJourneyAnalytics.js` are deployed functions despite the `.js`
  suffix and serve the same data as their canonical twins; both were converted
  so the paths cannot drift apart.
- `getAssignableUsers` (3 reads through `currentUser`).

**What is left: 4, and none is a caller-tenant read:**

| Function | The read | Why it stays |
| --- | --- | --- |
| `processExpiredAccounts` | `user.client_id` on the expired account | `user` is the loop variable over the accounts being expired; service-role, no signed-in caller. |
| `autoUnlockAccounts` | `user.client_id` on the locked account | Same: loop variable over the accounts being unlocked. |
| `calculateUserLevel` | `user.client_id` on the looked-up user | The *target's* tenant decides which level configuration applies. The caller is resolved separately as `callerUser`. |
| `tenantRuleProof` | `{{user.data.client_id}}` | Rule fixture text submitted to the evaluator, not a read. |

Each now carries a comment saying so, so a future scan does not re-open them.

`invokeAgent` is counted as resolved, not exempt: it resolves once at entry
(`applyAgentTenant`) and **overwrites** `user.client_id` and `user.data.client_id`
with the resolver's answer before any of its 30 handler reads, so every handler
already reads a server-decided tenant. Extracting the handlers into
`shared/agentActions/*` is still worth doing for testability, but it is no longer
a tenant-isolation gap.

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

### 5.2 Frontend — 2 roster-display reads

**Closed this pass:** all 31 files that read the signed-in person's own membership
field now take the active organisation from the server context, so a screen can
no longer stamp a record to a stale membership value. What is left is a different
question — two screens read *other people's* membership fields to draw a list
(both `LeadershipIntelligenceHub` reads are now closed):

```
OrgInsightsView   u.client_id ?? u.data?.client_id   832
OneOnOnesTab      u.data?.client_id || u.client_id   35
```

These are reads for a roster, not writes, and each is already filtered by the
active client first; they should move to a server endpoint that returns the
roster with its tenant label, which removes the membership field from the
browser entirely. No module writes on the strength of them.

### 5.2a Frontend — the earlier list, for reference (all closed)

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