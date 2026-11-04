# Tenant isolation — audit and rollout

**Status:** Phase 1 complete. Phase 2 draft for review — nothing has been locked
down yet. Phase 3 (rule enforcement) has *not* started; no access rule has been
changed.

Measured against the app as it stands:

| Measure | Value |
| --- | --- |
| Data types | 163 |
| Carry a `client_id` field | 126 |
| Read rule already scopes by client | 102 |
| **Carry a client field but read rule does not scope** | **24** |
| No `client_id` field at all | 37 |
| Backend functions | 549 |
| Use service role (bypasses every access rule) | 471 |
| Service-role functions with no `client_id` in the function itself | 158 |
| …of those, delegating to a shared module that *does* scope | 17 |
| **…genuinely unscoped** | **141** |

---

## 1. Decisions locked from your answers

| Question | Decision |
| --- | --- |
| Can one person belong to more than one client? | **No.** A member holds exactly one client. Partner administrators, consultants and portfolio companies *oversee* several without being a member of each. Platform Admin spans all. |
| Users with no client | **Blocked.** Only Platform Admin reaches platform level. |
| Platform-wide types | `Permission`, `BadgeTemplate`, `GamificationLevel`, the default competency library, **the report library**, **validated signals** (Leadership Index assessment and its questions). |

Consequence: the tenant context is **single-valued for members**, a **validated
selection for oversight**, and **all-clients for platform**. Nothing else.

---

## 2. The resolver (Phase 1, done)

`base44/shared/tenantContext.ts` — one implementation, used by every server path
that needs a tenant. `base44/functions/resolveTenantContext` exposes it.

| Principal | `membership` | `client_id` | Authorized clients |
| --- | --- | --- | --- |
| Platform Admin | `platform` | only if one is explicitly selected | all (`all_clients: true`) |
| Partner Business Administrator | `oversight` | selected from `partner_client_ids`; auto-selected when the list holds exactly one | the declared list, validated to existing client records |
| Everyone else with a client | `member` | their client | their client only |
| No client, not platform | `none` | `null` | none — **blocked**, reason `TENANT_NOT_ASSIGNED` |

Rules the resolver enforces:

- **The browser never picks the tenant.** A `client_id` in the request is a
  preference, honoured only if it is in the caller's authorized list. A member
  who sends a different client is refused (`requested_client_rejected`), not obeyed.
- **Precedence is `data.client_id`, then `client_id`.** `data.client_id` is what
  the entity rules already read, so screens and data now follow the same tenant.
  If the authoritative field does not resolve to a client record, the other one
  is used and the fallback is recorded as a conflict rather than locking the
  person out.
- **Built-in `admin` is not platform.** Platform level is the app role
  `Platform Admin`. This keeps ceo@… (built-in admin, app role *User Level 1*)
  inside their own client instead of widening them to every tenant.
- **The client record is projected.** Only identity, status, timezone, settings,
  branding, custom domain and competency config are returned. Previously
  `getClientContext` returned the whole record, including `annual_contract_value`,
  `stripe_customer_id` and `stripe_subscription_id`, to any signed-in member.

`src/components/contexts/ClientContext.jsx` — the single client context every
module reads — now takes the client from the resolver instead of `user.client_id`.

### 2.1 Resolved — both accounts are Go Flat Bridge

Both fields were populated on every account that had them, and on **both** such
accounts they disagreed. You decided **Go Flat Bridge** is the tenant, so the
stale field was corrected rather than the precedence flipped:

| Account | `client_id` | `data.client_id` before | after |
| --- | --- | --- | --- |
| ceo@curiosityled.com | Go Flat Bridge | HealthCo | **Go Flat Bridge** |
| eosoria@curiosityled.com | Go Flat Bridge | HealthCo | **Go Flat Bridge** |

Both now read Go Flat Bridge in both fields — verified against the live records.

**Records left behind.** Anything these two created while the rules read HealthCo
is stamped HealthCo, and is therefore no longer visible to them:

| Type | Records |
| --- | --- |
| `ActivityLog` | 47 |
| `Goal` | 5 |
| `SuccessorCandidacy` | 3 |
| `WeeklyCheckIn` | 1 |
| `AssessmentSubmission` | 1 |

HealthCo is the synthetic demo client, so this is probably demo data — confirm
before I re-tag any of it. Re-tagging is a `client_id` update on those rows; it is
not a rule change.

### 2.2 Why it happened — a transfer only ever wrote half a membership

`assignUserToClient` updated `client_id` and nothing else. So every time an
administrator moved a person to another client, the screens moved and the access
rules did not. That is the same defect as the drifted accounts, at its source.

**Any client change is now written through `setUserClient` in
`base44/shared/tenantContext.ts`,** which writes both fields in one update and
merges `data` rather than replacing it — replacing it would erase `app_role`.
Routed through it: `assignUserToClient`, `userUpdateClient`,
`bulkAssignUsersToClient`, `configureUsers`.

Still to check: the CSV provisioning path (`bulkCreateUsersFromCSV`) and the
first-login provisioning path (`activateLicenseOnFirstLogin`, `applyRoleProfiles`).
A person who *joins* a client rather than *transfers* between them must land in
both fields too.

### 2.3 Joining a second client

Transferring a person from one client to another is supported (§2.2). Belonging to
two at once is not, and is not meant to be: a member holds exactly one client.
When someone moves, they leave the old client behind entirely and its records stay
with it, which is what an audit expects. A person who genuinely works across two
clients is the oversight model (`partner_client_ids`), not a second membership.

---

## 3. Classification legend

| Code | Meaning |
| --- | --- |
| **P** | Platform-shared — one pool for the whole platform, no tenant |
| **C** | Client-owned — created, owned and visible inside one client |
| **U** | User-owned within a client — one person's own record, inside their client |
| **S** | System / operational — plumbing, no user-facing read |
| **hybrid** | Platform default *plus* client-owned copies (a shared library a client may also add to) |

`U` always implies the record also carries the client, so a tenant query can be
made without joining through the user.

---

## 4. Classification — all 163 data types

### 4.1 Platform-shared (P)

`Permission` · `BadgeTemplate` · `GamificationLevel` · `Tenant` · `Client` ·
`Partner` · `FeatureSuggestion` · `IntegrationDoc` · `Prospect` · `WorkbookLead` ·
`UATTestCase` · `CrossTenantAccessGrant` · `ImpersonationLog` · `PartnerCommission`

Notes: `Client` and `Tenant` are the registry itself — read by the resolver via
service role, never by tenant clients. `WorkbookLead` holds public marketing
submissions. `CrossTenantAccessGrant`, `ImpersonationLog` and `PartnerCommission`
are governance/billing records and should be admin-only at read.

### 4.2 Hybrid — platform default plus client-owned (P + C)

| Type | Platform part | Client part |
| --- | --- | --- |
| `Competency` | default Leadership Index library | client's own competencies |
| `LearningResource` | platform catalog | client uploads (your example 3) |
| `ReportTemplate` | report library | client-authored templates |
| `Assessment` + `AssessmentQuestion` | validated signals (Leadership Index) | client-authored signals |
| `CustomAssessment`, `CustomFormTemplate` | starter templates | client copies |
| `ConversationalLearningModule` | platform modules | client modules |
| `Badge`, `LeaderboardTemplate` | definitions | client-created instances |
| `Role`, `CustomRole` | system roles | client custom roles |
| `LeadershipIndexRequirementMapping` | platform mapping | — |

Rule for hybrids: a hybrid record is platform-owned when its `client_id` is
empty, client-owned when it is set. A client **reads** platform rows plus its
own; it **writes** only its own. No client may edit a platform row.

### 4.3 Client-owned (C)

`ActivityLog` · `AssessmentInsights` · `AssignedLearning` · `Automation` ·
`BrandingConfiguration` · `BrandingChangeLog` · `BrandingTheme` · `CalibrationCase` ·
`CalibrationJudgment` · `CalibrationSession` · `CandidateSelfDisclosure` ·
`CareerPath` · `Certificate` · `Certification` · `CheckInCustomQuestion` ·
`CheckInLeaderNote` · `Class` · `CoachingEngagement` · `CoachingRequest` ·
`CoachingSession` · `Cohort` · `Competition` · `Course` · `CourseVersion` ·
`CriticalRole` · `CriticalRoleRequirement` · `CustomForm` · `CustomRole` ·
`CustomerAccount` · `DevelopmentExperience` · `DevelopmentPlan` ·
`DevelopmentPlanLink` · `DevelopmentRequest` · `EffectiveBlueprintSnapshot` ·
`EffectiveRequirementSnapshot` · `EmailTemplate` · `EmployeeAssignment` ·
`EvidenceRecord` · `EvidenceReviewDecision` · `GamificationSettings` ·
`GovernanceApproval` · `HRBPDelegation` · `HRBPIntervention` · `HRBPPortfolio` ·
`ICRoster` · `Journey` · `KnowledgeTransferPlan` · `LeadershipProfileReport` ·
`LearningCertificate` · `LearningJourney` · `LearningRecordEvent` ·
`ManagerPortfolio` · `ManagerPulse` · `ManagerTrends` · `MeetingRecord` ·
`OnboardingPlan` · `OrgBusinessGoal` · `OrgPosition` · `OrgPositionChange` ·
`OrgRole` · `PendingInvitation` · `PositionAssignment` · `ProfileDataConflict` ·
`Program` · `PulseAccessLog` · `ReadinessConclusion` · `ReadinessCondition` ·
`ReadinessEvidenceCitation` · `ReviewCycleEvent` · `RoleRequirement` ·
`RoleSuccessBlueprint` · `RoleTaxonomy` · `ScheduledReport` ·
`SnapshotIntegrityIncident` · `SuccessionAuditEvent` · `SuccessionCandidateNotice` ·
`SuccessionCycle` · `SuccessionDecisionRecord` · `SuccessionLegalHold` ·
`SuccessionMonitorAlert` · `SuccessionOperation` · `SuccessionReviewRecord` ·
`SuccessionSealedDemographic` · `SuccessorCandidacy` · `TalentPool` ·
`TalentPoolMembership` · `TransitionInitiation` · `TransitionPlan` ·
`WorkforceMetrics`

### 4.4 User-owned within a client (U)

`ActiveSession` · `AgentAction` · `AssessmentSubmission` · `AtreusConversationTurn` ·
`AtreusMemorySummary` · `CoachMessage` · `CoachReflection` · `Conversation` ·
`ConversationState` · `CourseProgress` · `CustomFormSubmission` ·
`DailyCheckIn` · `DecisionJournal` · `DelegationPlan` · `DevelopmentAction` ·
`DiagnosticSession` · `ExternalAssessmentResult` · `ExternalLearningRecord` ·
`JourneyEnrollment` · `KPI` · `LearnerProgress` · `LearningRecommendation` ·
`LoginHistory` · `ManagerMemory` · `Milestone` · `Notification` ·
`PointTransaction` · `ReviewParticipant` · `TonePreference` · `User` ·
`UserAchievement` · `UserActivity` · `UserBadge` · `UserPreference` ·
`UserProfile` · `UserRoleAssignment` · `WeeklyCheckIn`

`Goal` belongs here **and** to C: personal goals are U, organization/team goals
are C (your example 2). Both carry the client.

### 4.5 System / operational (S)

`IdempotencyKey` · `ProvisioningApiKey` · `ProvisioningBatch` · `ProvisioningRole` ·
`ProvisioningUser` · `RequestNonce` · `SyncState` · `Item` · `UATSubmission`

`Item` looks like the platform's default scaffold entity — please confirm it is
unused so it can be removed rather than scoped.

---

## 5. Records that cannot be tenant-scoped today

These 22 rows hold tenant or personal data but carry **no `client_id`**, so no
query can prove which client they belong to. They are readable only by their own
user today (`user_email` rules), which is safe one record at a time but makes any
cross-person report, admin view or export impossible to scope — and a report that
joins them is exactly how bleed happens.

| Type | Owned by | Action |
| --- | --- | --- |
| `DailyCheckIn` | person | add `client_id` |
| `DecisionJournal` | person | add `client_id` |
| `DelegationPlan` | person | add `client_id` |
| `DiagnosticSession` | person | add `client_id` |
| `ManagerMemory` | person | add `client_id` |
| `CoachMessage` | person | add `client_id` |
| `CoachReflection` | person | add `client_id` |
| `Conversation` | person | add `client_id` |
| `ConversationState` | person | add `client_id` |
| `AtreusConversationTurn` | person | add `client_id` |
| `AtreusMemorySummary` | person | add `client_id` |
| `Notification` | person | add `client_id` |
| `UserProfile` | person | add `client_id` |
| `UserPreference` | person | add `client_id` |
| `UserRoleAssignment` | person | add `client_id` |
| `LoginHistory` | person | add `client_id` |
| `ActiveSession` | person | add `client_id` |
| `PulseAccessLog` | client | add `client_id` |
| `BrandingTheme` | client | add `client_id` |
| `BrandingChangeLog` | client | add `client_id` |
| `HRBPDelegation` | client | add `client_id` |
| `JourneyEnrollment` | client + person | add `client_id` |
| `LearnerProgress` | client + person | add `client_id` |
| `LearningRecommendation` | client + person | add `client_id` |
| `Milestone` | client + person | add `client_id` |

Backfill rule: `client_id` = the owning user's resolved client at time of write;
existing rows backfilled from their `user_email` → user → client. `AgentAction`
and `ExternalLearningRecord` need the same decision — confirm.

---

## 6. The 24 read rules that do not scope by client

These carry a client field but a read rule that ignores it. Each is a live
cross-tenant read path once two real clients exist.

| Type | Proposed |
| --- | --- |
| `AssessmentInsights` | scope read to client |
| `CheckInLeaderNote` | scope read to client |
| `ConversationalLearningModule` | scope read to client + platform rows |
| `CustomRole` | scope read to client |
| `DevelopmentExperience` | scope read to client |
| `DevelopmentPlan` | scope read to client |
| `HRBPIntervention` | scope read to client |
| `HRBPPortfolio` | scope read to client |
| `LeadershipProfileReport` | scope read to client |
| `LearningCertificate` | scope read to client |
| `ManagerPulse` | scope read to client |
| `MeetingRecord` | scope read to client |
| `SnapshotIntegrityIncident` | scope read to client |
| `SuccessionOperation` | scope read to client |
| `TonePreference` | scope read to client |
| `UserActivity` | scope read to client |
| `WeeklyCheckIn` | scope read to client |
| `Badge` | confirm platform, then no client scope |
| `BadgeTemplate` | platform — no change |
| `GamificationLevel` | platform — no change |
| `Permission` | platform — no change |
| `CrossTenantAccessGrant` | platform — admin-only read |
| `ImpersonationLog` | platform — admin-only read |
| `PartnerCommission` | platform/partner — admin-only read |

Also worth noting: `Goal` and `KPI` both have a bare `visibility: "shared"` read
branch with **no tenant clause**, so a shared goal is readable across clients.
Both need the tenant clause added.

---

## 7. Backend functions — the larger exposure

471 of 549 functions use service role. Service role bypasses access rules
entirely, so a function is only tenant-safe if it filters by client itself.
**141 functions neither filter by client nor delegate to a shared module that
does.** By prefix:

`send*` 12 · `get*` 11 · `seed*` 10 · `stripe*` 8 · `bulk*` 6 · `create*` 6 ·
`schedule*` 6 · `cleanup*` 5 · `update*` 5 · `compute*` 4 · rest single.

Highest consequence first:

| Group | Why it matters | Examples |
| --- | --- | --- |
| Write/bulk | writes records for "the user" without proving the tenant | `bulkAssignAssessments`, `bulkAssignJourneys`, `bulkCompetencyOperations`, `bulkRoleOperations`, `bulkImportAssessmentQuestions` |
| Destructive | can delete across tenants | `cleanupRoles`, `cleanupCompetencies`, `cleanupCareerPaths`, `cleanupTestData`, `cleanupDuplicateUATTests` |
| Read/report | assembles data for display or export — the bleed path | `getCheckInHistory`, `getManagerInsights`, `getOrganizationUsers`, `getOrganizationContext`, `getCoacheeBrief`, `exportTeamQualifications`, `generateDiagnosticReport` |
| Decline/assign | changes a person's tenant or role | `assignUserToOrganization`, `bulkAssignUsersToOrganization`, `createOrganization`, `deleteOrganization` |
| Billing | money attributed to the wrong client | `stripeGet*`, `stripeCreate*` |
| Seeds/demo | writes fixture data | `seed*` 10 |
| Detection-only | computes something, writes nothing | `analyzeDecisionGaps`, `computeBurnoutRisk`, `evaluatePredictiveTriggers` — lower risk, still worth the tenant check |

`clientCreate`, `createClient`, `createPartner`, `deletePartner` are legitimately
platform-level and should require Platform Admin explicitly rather than being
"unscoped by accident".

---

## 8. Decisions

**Answered:** the drifted accounts are Go Flat Bridge (§2.1).

The remaining five need no answer from you to proceed. Each has a safe, reversible
default and none locks anyone out. Say "go with these" and Phase 3 continues:

| Question | Proposed default | Why it is safe |
| --- | --- | --- |
| Suspended client's users | **read yes, write no** | People keep their history and can export it; nobody adds or changes records in a client that is not paying. Per-client, reversible. |
| Partner admin with an empty portfolio | **blocked, `TENANT_NOT_ASSIGNED`** | Already how it behaves today — this keeps it. An admin assigns clients and they are back; no data touched. |
| `AgentAction`, `ExternalLearningRecord` | **add `client_id`** | Both are per-person activity; without it they can never appear in a tenant-scoped report. |
| `Item` | **leave it alone** | It looks like the platform's default scaffold and is harmless. Removing it is cleanup, not isolation, and I would rather not delete a type you might use. |
| `EmailTemplate`, `BrandingTheme`, `LeaderboardTemplate` | **template client-owned; the other two hybrid** | Templates carry your wording and should follow the client. A theme and a leaderboard can ship as a platform default a client then customises. |

Only one of these changes behaviour for existing accounts (suspended clients), and
it does nothing until Phase 3 writes the rules — so nothing changes on your live
app today.

---

## 9. Rollout and exit criteria

| Phase | Work | Done when |
| --- | --- | --- |
| **1. Tenant context** | resolver + `resolveTenantContext` + client context rewired | ✅ built and tested; platform principal resolves correctly |
| **2. Classification** | this document | you have reviewed §4, §5, §6 and answered §8 |
| **3. Enforcement, batched** | rules + service-role functions, ~6 batches | per batch: two clients, cross-read and cross-write attempted, results recorded |
| **4. Module wiring** | each module reads the active client's config and content | no module reads a shared pool it should not |
| **5. Two-client proof** | second test client, full matrix | neither client can read or change the other's records in any category |

**Phase 3 batch order** — your four examples first, so the pattern is settled
before it is applied 150 more times:

1. Check-in questions and check-ins (`CheckInCustomQuestion`, `DailyCheckIn`, `WeeklyCheckIn`, `CheckInLeaderNote`, `getCheckInHistory`, `resolveCheckInQuestions`, `saveDailyCheckIn`, `saveCheckInForUser`)
2. Goals and KPIs (`Goal`, `KPI`, `OrgBusinessGoal`, cascade/assign/complete functions)
3. Learning (`LearningResource`, `Course`, `CourseVersion`, `CourseProgress`, `AssignedLearning`, `*Learning*` functions)
4. Reports (`ReportTemplate`, `ScheduledReport`, `ScheduledReport` generation, all `export*` and `get*Analytics` functions)
5. Write/destructive service-role functions (`bulk*`, `cleanup*`, `assign*`)
6. Detection and remaining reads (`analyze*`, `compute*`, `get*`)

Each batch is verified against two clients before the next starts, because a
rule that is too tight fails silently by returning fewer records — the person
sees an empty screen, not an error.