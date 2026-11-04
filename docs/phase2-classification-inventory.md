# Phase 2 — Classification inventory

**Status:** complete, awaiting your corrections.
**Scope:** every data type (164) and every backend function (551) in the app.
**Produced:** 4 November 2026, by scanning the live Production schemas and the
function sources — not from memory, and not from the earlier draft, whose counts
were from a partial pass and are corrected here.

This is a review document. Nothing in it has been applied. Phase 3 applies it in
batches, one batch at a time, each verified against two clients.

---

## 0. Phase 1 — what is actually done

Before calling this phase closed, here is the honest state of it.

| Phase 1 item | State |
| --- | --- |
| One server-side resolver | **Done.** `resolveTenantContext` + `base44/shared/tenantContext.ts`. Roles, portfolio oversight, membership, active client, blocked reasons. |
| `user.client_id` vs `user.data.client_id` split killed | **Done.** Both fields verified identical on every account. |
| Silent drift | **Root cause fixed.** All client changes now go through one write, `setUserClient`, which writes both fields and merges `data` instead of replacing it. Four functions routed through it; `assignUserToClient` tested live. |
| Every module reading from it | **Not done** — and it is deliberately not done here. |

**Why the last row is open.** 80 screen files still read `user.client_id` or
`user.data.client_id` directly — 151 reads. None of them is *broken*, because the
two fields no longer disagree. But as Phase 1 was defined, "every module reading
from it" is not finished.

Phase 4 is "each module reads the active client's configuration and content rather
than a shared pool" — it rewrites exactly those reads. Doing them now would be the
same work twice. **Recommendation: fold the 80 files into Phase 4** and treat Phase
1 as complete on the server, which is where isolation is actually enforced.

Say so if you would rather I close the 80 first.

---

## 1. How this inventory was produced

| Screen | What it counted | Result |
| --- | --- | --- |
| Schema scan | every entity file; whether it declares a `client_id` field; whether its read rule references it; whether it has a personal read branch | 164 types |
| Read-rule scan | types whose read rule carries a client field but never compares it | **25** |
| Write-rule scan | per type, whether `create` is closed, pinned to client/creator, or role-only | 35 closed · 17 pinned · **67 role-only** |
| Function scan | every function: does it use service role, does it resolve the tenant | 551 total · 472 service role · **467 with no tenant resolution** |
| Screen scan | direct reads of the membership field in frontend code | 80 files · 151 reads |

A "role-only" write rule means: any holder of that role may create the record with
**any** `client_id` in the payload. That is the finding of this phase that matters
most, and it is not in the earlier draft at all — the draft audited reads.

---

## 2. Codes

| Code | Meaning |
| --- | --- |
| **P** | Platform-shared — one pool for the whole platform, no tenant |
| **C** | Client-owned — created, owned and visible inside one client |
| **U** | User-owned within a client — one person's record, inside their client |
| **S** | System / operational — plumbing, no user-facing read |
| **hybrid** | Platform default *plus* client-owned copies (a library a client may add to) |

`U` always implies the record also carries the client, so a tenant query never has
to join through the user.

---

## 3. The four areions you named — decided

These decide Phase 3's first batch, so they are stated apart from the bulk.

| Type | Code | Why | What Phase 3 changes |
| --- | --- | --- | --- |
| `CheckInCustomQuestion` | **C** | A client's own check-in questions. Already carries `client_id` and its read rule scopes. | Write rule is role-only: any Admin Level 1/2 can create a question **into another client**. Add the tenant match on create. |
| `Goal` | **U + C** | Personal goals belong to a person; organisation and team goals belong to the client. Both carry the client. | Read has a bare `visibility: "shared"` branch with **no tenant clause** — a shared goal is readable across clients. Add the clause; scope `create`. |
| `LearningResource` | **hybrid** | Platform catalog plus client uploads. | Platform rows have empty `client_id`; clients read platform + own, write only own. |
| `ReportTemplate` + `ScheduledReport` | **hybrid / C** | Templates: platform library plus client-authored. A schedule is a client's own. | Read/write scoped to client + platform; schedules strictly client-owned. |

---

## 4. Inventory totals

| Code | Count |
| --- | --- |
| C — client-owned (includes the hybrids) | **92** |
| U — user-owned within a client | **27** |
| Needs a `client_id` field added (then C or U) | **27** |
| Correctly unchanged (P / S / built-in) | **18** |
| **Total** | **164** |

### 4.1 Client-owned — 92

Most also have an unscoped **write** rule (see §7).

`ActivityLog` · `Assessment`* · `Automation` · `Badge`* · `BadgeTemplate`* ·
`BrandingConfiguration` · `CalibrationCase` · `CalibrationJudgment` ·
`CalibrationSession` · `CandidateSelfDisclosure` · `CareerPath` ·
`CheckInCustomQuestion` · `Class` · `CoachingEngagement` · `CoachingRequest` ·
`CoachingSession` · `Cohort` · `Competency`* · `Competition` ·
`ConversationalLearningModule`* · `Course` · `CourseVersion` · `CriticalRole` ·
`CriticalRoleRequirement` · `CrossTenantAccessGrant`† · `CustomAssessment`* ·
`CustomForm` · `CustomFormTemplate`* · `CustomRole`* · `CustomerAccount` ·
`DevelopmentAction` · `DevelopmentPlanLink` · `DevelopmentRequest` ·
`EffectiveBlueprintSnapshot` · `EffectiveRequirementSnapshot` · `EmailTemplate` ·
`EmployeeAssignment` · `EvidenceRecord` · `EvidenceReviewDecision` ·
`GamificationLevel`* · `GamificationSettings` · `Goal` · `GovernanceApproval` ·
`HRBPIntervention` · `HRBPPortfolio` · `ICRoster` · `ImpersonationLog`† ·
`Journey` · `KnowledgeTransferPlan` · `LeaderboardTemplate`* ·
`LeadershipIndexRequirementMapping` · `LearningJourney` · `LearningResource`* ·
`ManagerPortfolio` · `OnboardingPlan` · `OrgBusinessGoal` · `OrgPosition` ·
`OrgPositionChange` · `OrgRole` · `PartnerCommission`† · `PendingInvitation` ·
`PositionAssignment` · `ProfileDataConflict` · `Program` · `ReadinessConclusion` ·
`ReadinessCondition` · `ReadinessEvidenceCitation` · `ReportTemplate`* ·
`ReviewCalibration` · `ReviewCycleEvent` · `Role`* · `RoleRequirement` ·
`RoleSuccessBlueprint` · `RoleTaxonomy` · `ScheduledReport` ·
`SnapshotIntegrityIncident` · `SuccessionAuditEvent` · `SuccessionCycle` ·
`SuccessionDecisionRecord` · `SuccessionLegalHold` · `SuccessionMonitorAlert` ·
`SuccessionOperation` · `SuccessionReviewRecord` · `SuccessionSealedDemographic` ·
`SuccessorCandidacy` · `TalentPool` · `TalentPoolMembership` ·
`TransitionInitiation` · `TransitionPlan` · `UATSubmission` · `User` ·
`WorkforceMetrics`

`*` hybrid — platform-owned while `client_id` is empty, client-owned once set.
`†` carries `client_id` but is a **platform governance** record (cross-tenant
grants, impersonation, partner commission) and should be admin-only at read, not
client-readable.

### 4.2 User-owned within a client — 27

`AssessmentInsights` · `AssessmentSubmission` · `AssignedLearning` · `Certificate` ·
`Certification` · `CheckInLeaderNote` · `CourseProgress` · `CustomFormSubmission` ·
`DevelopmentExperience` · `DevelopmentPlan` · `ExternalAssessmentResult` ·
`ExternalLearningRecord` · `KPI` · `LeadershipProfileReport` · `LearningCertificate` ·
`LearningRecordEvent` · `ManagerPulse` · `ManagerTrends` · `MeetingRecord` ·
`PointTransaction` · `ReviewParticipant` · `SuccessionCandidateNotice` ·
`TonePreference` · `UserAchievement` · `UserActivity` · `UserBadge` · `WeeklyCheckIn`

---

## 5. The 27 types that need a `client_id` field

These hold tenant or personal data and carry **no client field**, so no query can
prove whose they are. They are safe one record at a time (each is readable by its
own user), but no admin view, report or export can scope them — and a report that
joins them is exactly how bleed happens.

| Type | Owned by | Why it needs the field |
| --- | --- | --- |
| `UserProfile` | person | the talent record every report reads |
| `DailyCheckIn` | person | the check-in corpus |
| `LoginHistory` | person | security reporting |
| `ActiveSession` | person | session/impersonation audit |
| `Notification` | person | delivery scoping |
| `UserPreference`, `UserRoleAssignment` | person | settings and role grants |
| `DecisionJournal`, `DelegationPlan`, `Milestone` | person | practice and goal records |
| `ManagerMemory`, `AgentAction` | person | AI context store |
| `AtreusConversationTurn`, `AtreusMemorySummary`, `Conversation`, `ConversationState` | person | conversation data |
| `CoachMessage`, `CoachReflection` | person | coaching exchange |
| `JourneyEnrollment`, `LearnerProgress`, `LearningRecommendation` | person | learning records |
| `AssessmentQuestion` | client | question bank authored per client |
| `PulseAccessLog` | client | who read whose pulse — compliance evidence |
| `BrandingTheme`, `BrandingChangeLog` | client | white-label settings and history |
| `HRBPDelegation` | client | delegated authority |
| `SyncState` | client | sync position per tenant |

**Backfill rule:** `client_id` = the owning user's resolved client at the moment of
write; existing rows backfilled from their `user_email` → user → client. Rows whose
owner has no client are left null and reported, not guessed.

`Milestone` and `AssessmentQuestion` are the two I am least sure of — see §9.

---

## 6. Read rules that ignore the client — 25

Each carries a client field and a read rule that never compares it. Every one is a
live cross-tenant read the moment two real clients exist.

`AssessmentInsights` · `Badge` · `BadgeTemplate` · `CheckInLeaderNote` ·
`ConversationalLearningModule` · `CrossTenantAccessGrant` · `CustomRole` ·
`DevelopmentExperience` · `DevelopmentPlan` · `GamificationLevel` ·
`HRBPIntervention` · `HRBPPortfolio` · `ImpersonationLog` ·
`LeadershipProfileReport` · `LearningCertificate` · `ManagerPulse` ·
`MeetingRecord` · `PartnerCommission` · `SnapshotIntegrityIncident` ·
`SuccessionOperation` · `TonePreference` · `UATSubmission` · `User` ·
`UserActivity` · `WeeklyCheckIn`

Of these, four are correctly platform and need no client clause — `Badge`,
`BadgeTemplate`, `GamificationLevel`, and the governance three (`CrossTenantAccessGrant`,
`ImpersonationLog`, `PartnerCommission`) which become admin-only. **The other 19 get
a tenant clause.** `User` is special: membership fields are managed by the resolver,
never read through a tenant rule.

---

## 7. Writes — the larger hole, 67 types

Read rules are half the story. Of the 119 types that carry a client field:

| Write rule | Count | Meaning |
| --- | --- | --- |
| Closed (`create: false`/`null`) | 35 | only trusted server code writes — correct for append-only records |
| Pinned to client or creator | 17 | safe |
| **Role-only** | **67** | any holder of the role may create with **any** `client_id` |

A role-only rule is not a tenant rule. It says "an Admin Level 1 may create this",
not "may create this **in their own client**". So a client administrator can write
a record stamped to another client today.

`ActivityLog` · `Assessment` · `AssessmentInsights` · `AssessmentSubmission` ·
`AssignedLearning` · `Badge` · `BadgeTemplate` · `BrandingConfiguration` ·
`Certificate` · `Certification` · `CheckInCustomQuestion` · `CheckInLeaderNote` ·
`Class` · `CoachingEngagement` · `CoachingSession` · `Cohort` ·
`ConversationalLearningModule` · `CourseProgress` · `CriticalRole` ·
`CriticalRoleRequirement` · `CrossTenantAccessGrant` · `CustomFormTemplate` ·
`CustomRole` · `CustomerAccount` · `DevelopmentExperience` · `DevelopmentPlan` ·
`DevelopmentRequest` · `EffectiveBlueprintSnapshot` ·
`EffectiveRequirementSnapshot` · `EmailTemplate` · `EmployeeAssignment` ·
`ExternalAssessmentResult` · `ExternalLearningRecord` · `GamificationLevel` ·
`GamificationSettings` · `HRBPIntervention` · `HRBPPortfolio` · `ICRoster` ·
`ImpersonationLog` · `LeadershipProfileReport` · `LearningCertificate` ·
`ManagerPortfolio` · `ManagerPulse` · `MeetingRecord` · `OrgBusinessGoal` ·
`OrgPosition` · `OrgPositionChange` · `PartnerCommission` · `PendingInvitation` ·
`PointTransaction` · `ProfileDataConflict` · `Program` · `ReportTemplate` ·
`ReviewCalibration` · `ReviewParticipant` · `RoleRequirement` · `RoleTaxonomy` ·
`SuccessionAuditEvent` · `SuccessionCycle` · `TonePreference` · `UATSubmission` ·
`User` · `UserAchievement` · `UserActivity` · `UserBadge` · `WeeklyCheckIn` ·
`WorkforceMetrics`

**Fix:** add `data.client_id == {{user.data.client_id}}` to the create rule, keeping
the role clause. Both must pass. Records written by server functions are unaffected
(service role bypasses the rule), which is why this is safe to apply against live data.

---

## 8. Backend functions — 551

| Measure | Count |
| --- | --- |
| Total functions | 551 |
| Use service role (bypass every rule) | 472 |
| Resolve the tenant through the shared resolver | **6** |
| **Use service role with no tenant resolution** | **467** |

467 is a mechanical screen, not a judgement on each function — some legitimately
operate on no tenant at all. Grouped by family, largest first:

`succession*` 125 · `get*` 48 · `send*` 18 · `provisioning*` 18 · `create*` 16 ·
`stripe*` 14 · `seed*` 13 · `generate*` 12 · `bulk*` 12 · `update*` 10 ·
`schedule*` 9 · `process*` 9 · `assign*` 7 · `test*` 6 · `cleanup*` 6 · rest single

### 8.1 Correctly platform — no tenant, no change

`clientCreate` · `createClient` · `updateClient` · `deleteClient` · `clientList` ·
`listClients` · `createPartner` · `deletePartner` · `updatePartner` · `listPartners` ·
`createOrganization` · `deleteOrganization` · `listOrganizations` ·
`promoteToPlatformAdmin` · `setupPlatformAdmin` · `setupSuperAdmin` ·
`stripeWebhook` · `provisioning*` (8) · every `*Test` / `debug*` / `uatDiagnostic`

These must require **Platform Admin explicitly**, rather than being unscoped by
accident. Different fix, same batch.

### 8.2 The 125 `succession*` functions

A family, not 125 problems. 121 of them already write through
`successionAuditWriter` and read `client_id` from the body — they need the resolver
wired to *derive* it instead of accept it. Batch as one, verified once.

### 8.3 Highest consequence, in order

| Group | Why it matters | Examples |
| --- | --- | --- |
| Bulk write | writes records "for the user" without proving the tenant | `bulkAssignAssessments`, `bulkAssignJourneys`, `bulkCompetencyOperations`, `bulkRoleOperations`, `bulkImportAssessmentQuestions` |
| Person move | changes whose tenant a person belongs to — the drift path | `assignUserToOrganization`, `bulkAssignUsersToOrganization`, `syncUserClient`, `syncUserOrganization` |
| Destructive | can delete across tenants | `cleanupRoles`, `cleanupCompetencies`, `cleanupCareerPaths`, `cleanupTestData` |
| Read / report | assembles data for display or export — the bleed path | `getCheckInHistory`, `getManagerInsights`, `getOrganizationUsers`, `exportTeamQualifications`, `generateDiagnosticReport` |
| Billing | money attributed to the wrong client | `stripeGet*`, `stripeCreate*` (14) |
| Seeds / demo | writes fixture data | `seed*` (13) |
| Detection only | computes, writes nothing | `analyzeDecisionGaps`, `computeBurnoutRisk` — lowest risk |

---

## 9. What I need you to correct

Eight judgement calls. Everything else above is derived from the schemas and I am
confident in it.

1. **`Client` vs `Tenant`.** Two registries with the same meaning. Which is
   authoritative? `Client` is what the resolver reads today; `Tenant` looks legacy.
   If `Tenant` is dead I will retire it in Phase 3.
2. **`Badge`, `BadgeTemplate`, `GamificationLevel`.** I have them platform-shared. If
   clients are meant to design their own badges, they are hybrid instead — that
   changes their read rules.
3. **`AssessmentQuestion`.** I add `client_id` and treat empty as the platform bank.
   Confirm a platform question bank exists and is meant to stay shared.
4. **`Milestone`.** Goal milestones (needs `client_id`) or a scaffold type? It is the
   only entry in §5 I cannot infer.
5. **`DiagnosticSession`.** I classify it platform (public lead-gen), not client data.
   Confirm it is never used for internal assessments.
6. **`UATSubmission` / `UATTestCase`.** Internal QA. Per-client (so a client sees its
   own) or platform-only? Today `UATSubmission` carries a client field and ignores it.
7. **Suspended clients.** Read yes / write no, per §8 of the audit — confirm or
   overrule.
8. **`Item`.** Still looks like default scaffold. Leave, or remove?

Answer by number; anything you skip, I take the proposal above.

---

## 10. Phase 3 batches — the order I will apply them

Each batch is applied, then verified against two clients before the next starts.

| Batch | Contents | Types | Why this order |
| --- | --- | --- | --- |
| **1** | Your four: `CheckInCustomQuestion`, `Goal`, `LearningResource`, `ReportTemplate`/`ScheduledReport` | 5 | the ones you named; highest visibility |
| **2** | The 27 types that need the field, then `UserProfile` and `DailyCheckIn` first | 27 | nothing else can be scoped until the field exists |
| **3** | The 19 unscoped reads | 19 | read isolation |
| **4** | The 67 role-only writes | 67 | write isolation — the largest real exposure |
| **5** | `succession*` as one family | 125 fn | derived `client_id`, not accepted |
| **6** | Bulk / person-move / destructive functions | 33 fn | highest consequence |
| **7** | Read/report, billing, seeds, detection | rest | remaining |

Phase 5 (two-client proof) runs after batch 4 as a checkpoint and again at the end —
that is the first moment reads *and* writes are both closed.

---

## 11. What does not change

- No rule in this document has been applied. The app behaves exactly as it does now.
- Service-role functions are unaffected by rule changes, so batches 1–4 cannot break
  a scheduled job — the risk is only in *user-facing* writes, which is what the
  two-client verification checks.
- The demo data (`HealthCo`) stays as-is until you decide on the 57 re-tagged records
  from §2.1 of the audit.