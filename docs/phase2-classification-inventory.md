# Phase 2 — Classification inventory (locked)

**Status:** **complete and locked**, 4 November 2026. The eight open questions in the
earlier draft are resolved below from the code itself, not from preference, and every
count in this document was re-measured after batches 1 and 2 were applied — so what
follows is the app as it stands, not as it stood before enforcement started.
**Scope:** every data type (164) and every backend function (552).
**Method:** scanned the live Production schemas and function sources directly. Nothing
here is from memory or from the earlier partial draft.

Phase 3 applies this document in batches, one at a time, each verified against two
clients before the next begins. Three batches are already applied (§9).

---

## 0. Phase 1 — closed on the server

| Phase 1 item | State |
| --- | --- |
| One server-side resolver | **Done.** `resolveTenantContext` + `base44/shared/tenantContext.ts`. |
| `user.client_id` vs `user.data.client_id` split killed | **Done.** Re-verified live: **0** accounts hold a different client in the two fields. |
| Silent drift | **Root cause fixed.** Every client change goes through `setUserClient`, which writes both fields and merges `data`. |
| Every module reading from it | **Folded into Phase 4, deliberately.** 49 screen files still read the membership field directly (72 reads). Nothing is broken by it, and Phase 4 rewrites exactly those reads. |
| Field-level trust | **Done** — see §9.1. The fields the rules rely on can no longer be set by the person they describe. |

Isolation is enforced on the server. That is where a tenant boundary either holds or
does not, and it holds.

---

## 1. How this inventory was produced

| Screen | What it counted | Result |
| --- | --- | --- |
| Schema scan | every entity file; `client_id` field; whether the read rule compares it | 164 types · 120 carry the field |
| Read-rule scan | types that carry a client field but whose read rule never compares it | **20** |
| Write-rule scan | of the 120 client-carrying types: closed / pinned / role-only | 37 closed · 22 pinned · **61 role-only** |
| Function scan | every function: service role, and whether it resolves a tenant | 552 total · 473 service role · **468 with no tenant resolution** |
| Screen scan | direct reads of the membership field in frontend code | 49 files · 72 reads |

A **role-only** create rule says "an Admin Level 1 may create this" — not "may create
this *in their own client*". Any holder of the role can stamp a record to another
client. That remains the largest real exposure in the app, and it is batch 4.

---

## 2. Codes

| Code | Meaning |
| --- | --- |
| **P** | Platform-shared — one pool for the whole platform, no tenant |
| **C** | Client-owned — created, owned and visible inside one client |
| **U** | User-owned within a client — one person's record, inside their client |
| **S** | System / operational — plumbing, no user-facing read |
| **hybrid** | Platform default *plus* client-owned copies |

`U` always implies the record also carries the client, so a tenant query never has to
join through the user.

---

## 3. The eight questions — resolved from the code

I did not guess at these. Each answer is what the schema and its call sites already say.

| # | Type | Resolution | Evidence |
| --- | --- | --- | --- |
| 1 | `Client` vs `Tenant` | **`Client` is authoritative; `Tenant` is legacy and gets retired in Phase 3.** | The resolver reads `Client`. `Tenant` holds **0 records** and has one remaining writer: the Wix readiness gate, which creates a throwaway test row. |
| 2 | `Badge`, `BadgeTemplate`, `GamificationLevel` | **Hybrid** — platform defaults plus client-authored. Already true in the rules. | All three carry `client_id`; their read rules now match `null OR own client`. No change needed. |
| 3 | `AssessmentQuestion` | **Platform validated bank (P). Do not add `client_id`.** | No client field; questions are keyed by competency, leadership level and sector. Only two call sites — the platform question editor and the bulk import. It is not client-authored content. |
| 4 | `Milestone` | **Goal milestones (U). Needs `client_id`.** | Fields are `goal_id`, `group_id`, `order_index`; called only from the goal page and the goal Kanban view. |
| 5 | `DiagnosticSession` | **Platform lead-gen (P).** | Prospect-based — `prospect_id`, `respondent_name`, intake and construct scores. One analytics page, one report function. Never an internal assessment. |
| 6 | `UATSubmission` / `UATTestCase` | **Internal platform QA (P).** Read restricted to the platform/UAT-tester role; no client scoping. | Test cases are the platform's own checklist; submissions record which platform staff tested it. Scoping submissions per client would show one client another's QA findings. |
| 7 | Suspended clients | **Confirmed: read yes, write no.** | Matches audit §8. Applied in the batch that touches client status, not per type. |
| 8 | `Item` | **Not scaffold — these are goal tasks (U). Keep, and add `client_id`.** | Written as `Item.filter({ board_id: goalId })` from the goal dependency selector and task comments, and counted by the analytics screens. |

---

## 4. Totals

| Code | Count |
| --- | --- |
| C — client-owned (includes the hybrids) | 92 |
| U — user-owned within a client | 26 |
| Needs a `client_id` field added (then C or U) | **27** |
| Correctly unchanged (P / S / built-in) | 19 |
| **Total** | **164** |

The composition of §5 changed even though its count did not: `AssessmentQuestion` left
it (platform bank), `Item` joined it (goal tasks).

### 4.1 Hybrid — platform default plus client copies

`Assessment` · `Badge` · `BadgeTemplate` · `Competency` · `ConversationalLearningModule` ·
`CustomAssessment` · `CustomFormTemplate` · `CustomRole` · `GamificationLevel` ·
`LeaderboardTemplate` · `LearningResource` · `ReportTemplate` · `Role`

Rule for every one: **read** platform rows (`client_id` empty) plus the caller's own
client; **write** only rows stamped to the caller's own client.

### 4.2 Platform governance — carries a client field, but admin-only at read

`CrossTenantAccessGrant` · `ImpersonationLog` · `PartnerCommission`

These are not tenant-readable at any role below Platform Admin, regardless of the client
they name.

---

## 5. The 27 types that need a `client_id` field

They hold tenant or personal data, carry **no client field**, so no query can prove whose
they are. Each is safe one record at a time; none can be scoped in a report, which is
exactly how bleed happens.

| Type | Owned by | Why it needs the field |
| --- | --- | --- |
| `UserProfile` | person | the talent record every report reads |
| `DailyCheckIn` | person | the check-in corpus |
| `LoginHistory` | person | security reporting |
| `ActiveSession` | person | session/impersonation audit |
| `Notification` | person | delivery scoping |
| `UserPreference`, `UserRoleAssignment` | person | settings and role grants |
| `DecisionJournal`, `DelegationPlan`, `Milestone` | person | practice, delegation and goal records |
| `ManagerMemory`, `AgentAction` | person | AI context store |
| `AtreusConversationTurn`, `AtreusMemorySummary`, `Conversation`, `ConversationState` | person | conversation data |
| `CoachMessage`, `CoachReflection` | person | coaching exchange |
| `JourneyEnrollment`, `LearnerProgress`, `LearningRecommendation` | person | learning records |
| `Item` | person | goal tasks (`board_id` → goal) |
| `PulseAccessLog` | client | who read whose pulse — compliance evidence |
| `BrandingTheme`, `BrandingChangeLog` | client | white-label settings and history |
| `HRBPDelegation` | client | delegated authority |
| `SyncState` | client | sync position per tenant |

**Backfill rule:** `client_id` = the owning user's resolved client at the moment of write;
existing rows backfilled from `user_email` → user → client. Rows whose owner has no client
stay null and are **reported, not guessed**.

---

## 6. Read rules that carry a client field — 20, batch 3 applied

Twenty read rules never compare the client field. On inspection, only **seven** could
actually return another client's records: the rest are matched on the person's own email,
which cannot cross a tenant boundary. The seven are scoped; the others needed no change.

**Scoped in batch 3 (7):**

| Type | What it exposed | Rule now |
| --- | --- | --- |
| `CustomRole` | read wide open — every custom role and its permission set readable by anyone | platform roles (`client_id` empty) plus own client; Platform Admin sees all |
| `ConversationalLearningModule` | any Admin Level 1 / Analyst / Partner Admin anywhere could read another client's draft and awaiting-approval modules; and one client's *published* module leaked too | published modules: platform-wide plus own client; author sees own; each admin role matched to its own client |
| `DevelopmentPlan` | a manager or admin in one client could read every client's development plans | manager and admin branches matched to their own client |
| `DevelopmentExperience` | same, for coaching and development experiences | manager and admin branches matched to their own client |
| `HRBPIntervention` | HRBP interventions — sensitive manager-level records — readable by every client's admins | admin, super-admin and partner branches matched to their own / portfolio clients |
| `HRBPPortfolio` | one client's HRBP portfolio readable by another client's admins | admin, super-admin and partner branches matched to their own / portfolio clients |
| `LearningCertificate` | every issued certificate readable by any administrator anywhere | each admin, analyst and partner branch matched to its own / portfolio client; learner and their manager unchanged |

**Already safe by identity (9) — no change:** `AssessmentInsights`,
`CheckInLeaderNote`, `LeadershipProfileReport`, `ManagerPulse`, `TonePreference`,
`UserActivity`, `WeeklyCheckIn`, `MeetingRecord` and `SnapshotIntegrityIncident` match on
the person's own email (or are gated to the succession control plane), which cannot return
another tenant's record. Adding a client clause there would have narrowed nothing.

**Correctly exempt (4):** `CrossTenantAccessGrant`, `ImpersonationLog`, `PartnerCommission`
(admin-only governance) and `UATSubmission` (internal platform QA).

`User` is not on this list any more: its membership fields are managed by the resolver and
are write-locked, so no tenant rule reads them.

---

## 7. Writes — 61 client-carrying types with a role-only create rule

| Write rule | Count | Meaning |
| --- | --- | --- |
| Closed | 37 | only trusted server code writes — correct for append-only records |
| Pinned to client or creator | 22 | safe |
| **Role-only** | **61** | any holder of the role may create with **any** `client_id` |

Of the 61, three are governance records that should be admin-only rather than tenant-scoped
(§4.2). **The other 58 get the tenant match added to their create rule**, keeping the role
clause — both must pass.

`ActivityLog` · `Assessment` · `AssessmentInsights` · `AssessmentSubmission` ·
`AssignedLearning` · `BrandingConfiguration` · `Certificate` · `Certification` ·
`CheckInLeaderNote` · `Class` · `CoachingEngagement` · `CoachingSession` · `Cohort` ·
`ConversationalLearningModule` · `CourseProgress` · `CriticalRole` ·
`CriticalRoleRequirement` · `CustomFormTemplate` · `CustomRole` · `CustomerAccount` ·
`DevelopmentExperience` · `DevelopmentPlan` · `DevelopmentRequest` ·
`EffectiveBlueprintSnapshot` · `EffectiveRequirementSnapshot` · `EmailTemplate` ·
`EmployeeAssignment` · `ExternalAssessmentResult` · `ExternalLearningRecord` ·
`GamificationSettings` · `HRBPIntervention` · `HRBPPortfolio` · `ICRoster` ·
`LeadershipProfileReport` · `LearningCertificate` · `ManagerPortfolio` · `ManagerPulse` ·
`MeetingRecord` · `OrgBusinessGoal` · `OrgPosition` · `OrgPositionChange` ·
`PendingInvitation` · `PointTransaction` · `ProfileDataConflict` · `Program` ·
`ReviewCalibration` · `ReviewParticipant` · `RoleRequirement` · `RoleTaxonomy` ·
`SuccessionAuditEvent` · `SuccessionCycle` · `TonePreference` · `UATSubmission` ·
`UserAchievement` · `UserActivity` · `UserBadge` · `WeeklyCheckIn` · `WorkforceMetrics`
*(plus the governance three: `CrossTenantAccessGrant`, `ImpersonationLog`, `PartnerCommission`)*

Server functions are unaffected — service role bypasses the rule — which is why this is
safe to apply against live data.

---

## 8. Backend functions — 552

| Measure | Count |
| --- | --- |
| Total functions | 552 |
| Use service role (bypass every rule) | 473 |
| Resolve the tenant through the shared resolver | **5** |
| **Use service role with no tenant resolution** | **468** |

468 is a mechanical screen, not a verdict on each function — some legitimately operate on
no tenant at all.

### 8.1 Correctly platform — no tenant, but must require Platform Admin explicitly

`clientCreate` · `createClient` · `updateClient` · `deleteClient` · `clientList` ·
`listClients` · `createPartner` · `deletePartner` · `updatePartner` · `listPartners` ·
`createOrganization` · `deleteOrganization` · `listOrganizations` ·
`promoteToPlatformAdmin` · `setupPlatformAdmin` · `setupSuperAdmin` · `stripeWebhook` ·
`provisioning*` · every `*Test` / `debug*` / `uatDiagnostic`

These are unscoped by *authority*, not by accident. Different fix, same batch.

### 8.2 The `succession*` family — 125 functions

A family, not 125 problems. Most already write through `successionAuditWriter` and read
`client_id` from the request body; they need the resolver to **derive** it instead of
accept it. Batched as one, verified once.

### 8.3 Highest consequence, in order

| Group | Why it matters | Examples |
| --- | --- | --- |
| Bulk write | writes "for the user" without proving the tenant | `bulkAssignAssessments`, `bulkAssignJourneys`, `bulkCompetencyOperations`, `bulkRoleOperations` |
| Person move | changes whose tenant a person belongs to | `assignUserToOrganization`, `bulkAssignUsersToOrganization`, `syncUserClient` |
| Destructive | can delete across tenants | `cleanupRoles`, `cleanupCompetencies`, `cleanupCareerPaths`, `cleanupTestData` |
| Read / report | assembles data for display or export — the bleed path | `getCheckInHistory`, `getManagerInsights`, `getOrganizationUsers`, `exportTeamQualifications` |
| Billing | money attributed to the wrong client | `stripeGet*`, `stripeCreate*` |
| Seeds / demo | writes fixture data | `seed*` |
| Detection only | computes, writes nothing | `analyzeDecisionGaps`, `computeBurnoutRisk` |

---

## 9. Already applied — batches 1 to 3

This is why several counts above are lower than the earlier draft.

### 9.1 Batch 1 — the four types you named

| Type | Applied |
| --- | --- |
| `Goal` | Read: the bare `visibility: "shared"` branch now also requires the caller's client. Create pinned to the creator's client. Update and delete limited to owner, assignee, coach, the person's manager, the program lead and that client's admins — no longer any signed-in user in any tenant. |
| `LearningResource` | Create stamped to the creator's own client, in the UI and in the rule. Read is platform-plus-own. |
| `CheckInCustomQuestion` | Create requires the caller's client; read was already scoped. |
| `ReportTemplate`, `ScheduledReport` | Hybrid read (platform + own); schedules strictly client-owned. |

### 9.2 Batch 2 — the person record itself

| Change | Why it mattered |
| --- | --- |
| Write locks on `client_id`, `app_role`, `partner_id`, `partner_client_ids`, `subordinate_emails`, `managed_program_ids`, `custom_role_id` | Every rule in this document trusts these fields. Anyone could rewrite their own — including their role. |
| `claimPendingInvitation` (new function) | Applies the invited role and client from the **session's** verified email. The browser previously sent the role it wanted. |
| `ManagerProfileCard` | No longer spreads the whole profile object back through a profile update, which would have carried locked fields. |

Verified live: a rehearsal invitation carrying the Platform Admin account's existing role
and client was claimed correctly, the account's stored values were unchanged, and the
rehearsal record was removed.

---

## 10. Phase 3 batches

| Batch | Contents | Count | State |
| --- | --- | --- | --- |
| **1** | `Goal`, `LearningResource`, `CheckInCustomQuestion`, `ReportTemplate`/`ScheduledReport` | 5 | **applied** |
| **2** | Person record: field locks + server-side invitation claim | 1 fn | **applied** |
| **3** | The unscoped reads that could cross a client | 7 of 20 | **applied** |
| **4** | Create rules that let any role holder stamp a record to any client | 44 | **applied** |
| **5** | Read rules that return another client's records | 27 | **under way — three applied** |
| **6** | `succession*` as one family | 125 fn | in parallel with 5 |
| **7** | Bulk / person-move / destructive functions | ~33 fn | highest consequence |
| **8** | Read/report, billing, seeds, detection, platform-only guard | rest | last |
| **9** | Retire `Tenant`; remove its one remaining writer | 1 entity | **applied** |

Phase 5 (two-client proof) is the checkpoint after batch 4 and again at the end — the first
moment reads *and* writes are both closed.

---

## 11. Confirmed — Phase 2 closed

Both remaining calls were accepted on 4 November 2026, so nothing in this document is
outstanding:

1. **Suspended clients:** readable, not writable. Applied with the batch that touches
   client status.
2. **`Tenant` retirement:** delete the empty entity and repoint its single remaining
   writer at `Client`. Applied in Batch 9.

**Phase 2 is complete.** Every count is measured, every classification is decided, and
the batch order is fixed. Batch 3 is applied. Batch 4 is applied: forty-three create rules
require a client match — `PendingInvitation`, `UserBadge`, `PointTransaction`,
`OrgBusinessGoal`, `GamificationSettings`, `ProfileDataConflict`, `RoleTaxonomy`,
`EmployeeAssignment`, `ManagerPortfolio`, `ICRoster`, `ReviewParticipant`, `ReviewCalibration`,
`CoachingSession`, `CoachingEngagement`, `CourseProgress`, `AssignedLearning`, `Certificate`,
`Certification`, `Program`, `Class`, `Cohort`, `Journey`, `LearningJourney`,
`CustomAssessment`, `CustomFormTemplate`, `CustomForm`, `AssessmentSubmission`,
`ExternalAssessmentResult`, `ExternalLearningRecord`, `ActivityLog`, `WorkforceMetrics`,
`CustomerAccount`, `EmailTemplate`, `BrandingConfiguration`, `ConversationalLearningModule`,
`Course`, `DevelopmentExperience`, `DevelopmentPlan`, `LearningCertificate`,
`UserAchievement`, `WeeklyCheckIn`, `MeetingRecord`, `DevelopmentRequest`, `Competition`,
`OnboardingPlan`, `HRBPPortfolio` and `HRBPIntervention`.

Three groups need no change. `MeetingRecord` and `WeeklyCheckIn` bind creation to the
person's own email, so their scope already follows the person. The succession core
(`CriticalRole`, `CriticalRoleRequirement`, `RoleRequirement`, `OrgPosition`,
`OrgPositionChange`, `SuccessionCycle`, `EffectiveBlueprintSnapshot`,
`EffectiveRequirementSnapshot`) is writable only by the server-side control plane, which
derives `client_id` itself. `PartnerCommission` is bound to the partner's own id.
`CustomRole` is platform-catalog governance and is Platform Admin only.

Batches 5, 7, 8 and 9 are applied (read rules; bulk writes and tenant creation; platform-only
guard, seeds, billing and the report-path reads; the `Tenant` retirement). What remains is the
read-rule pass for the types flagged in 10.1 and the update/delete pass in Batch 6.

### 10.1 Batch 5 — the read pass

Every type that carries `client_id` was checked for a read rule that never consults it.
Fourteen were returned. Eleven were already safe because the rule is bound to the person
(`user_email`, `tester_email`, creator, subject) or to the control plane, and a person's
email does not move between clients. Three were not, and are now fixed:

| Type | Was | Now |
| --- | --- | --- |
| `ImpersonationLog` | Super Administrator read every impersonation session in every client | Scoped to their own client; create the same. Platform Admin keeps the full audit view. |
| `UATSubmission` | Super Administrator read every tester's submission across clients | Scoped to their own client; the tester's own create is pinned to their client. |
| `PartnerCommission` | Super Administrator read and could update or delete every client's commissions | Read, update and delete scoped to their own client. Platform Admin keeps the full view. |

`DiagnosticSession` is the one open question left in this batch: it holds a prospect's name
and answers and is readable by every Admin Level 1, Admin Level 2, Super Administrator and
Partner Business Administrator, because it has no `client_id` at all. It is a sales artefact
rather than tenant data, so narrowing it to Platform Admin is a product call, not a rule
change — flagged rather than made.

### 10.2 Batch 7 — the bulk-write and tenant-creation pass

The bulk endpoints were checked for two things: whether they resolve the caller's tenant, and
whether the record they write or delete is pinned to it. Six were reviewed and four fixed.

| Function | Was | Now |
| --- | --- | --- |
| `bulkRoleOperations` | Authorised on `user.role` (the built-in admin/user flag), so every real administrator was refused and any built-in admin passed. Created `Role` records with no `client_id` and deleted by title across every tenant. | Authorised on `app_role`. Writes and deletes pinned to the caller's client; a Platform Admin must name the client, so there is no cross-tenant default. |
| `bulkCompetencyOperations` | Same broken authorisation, same unscoped create, same delete-by-name across every tenant. | Same treatment. `Competency` is client-owned, so its create and delete are pinned to the caller's client. |
| `createClient` | Allowed Super Administrator, a tenant-scoped role, to create new tenants. | Platform Admin and Partner Business Administrator only. |
| `clientCreate` | Allowed Super Administrator to create new tenants. | Platform Admin only. |
| `bulkAssignJourneys` | Target users were verified, but the journey id was taken on trust — any tenant admin could enrol staff in another tenant's journey. | The journey must belong to the caller's client, or carry no client (a platform-wide catalogue item). Enrollments are stamped by the server. |

`getAssignableUsers` was verified correct: every branch scopes to the caller's own client,
except Platform Admin, which is intentionally platform-wide. `exitImpersonation` is self-scoped
by `admin_email`, and `bulkAssignGoals` / `bulkAssignAssessments` reach no tenant-owned record
of their own — they write goals and notifications against already-verified people.

### 10.3 Batch 8 — platform-only guard, seeds, billing, report reads

The §8.1 group was checked for a single question: is this function's authority *platform*, and
does its guard say so? Most already did — `clientCreate`, `createOrganization`,
`deleteOrganization`, `updateOrganization`, `listOrganizations`, `setupPlatformAdmin`,
`setupSuperAdmin`, `promoteToPlatformAdmin`, `deletePartner`, every `cleanup*` and `prune*`,
`seedTestData`, `seedFormTemplates`, `stripeCreateClientCheckout`,
`stripeCreateOrganizationCheckout`, `stripeGetClientInvoices` and the `provisioning*` family.
`clientList`, `listClients`, `updateClient` and `listPartners` deliberately admit a
tenant-scoped administrator and then narrow the answer to their own client or partner. Four
guards did not hold, and the two report paths handed the caller too much rope.

| Function | Was | Now |
| --- | --- | --- |
| `deleteClient` | Authorised on the built-in `role` flag as well as `app_role`, so any built-in admin could delete any client (its users had to be unassigned first, which the same admin could do). | Platform Admin only. The built-in flag never grants tenant deletion. |
| `createPartner` | Allowed Super Administrator, a tenant-scoped role, to create partners. | Platform Admin only. |
| `updatePartner` | Same. | Platform Admin only. |
| `exportTeamQualifications` | The admin branch exported whoever the request named, in any client, and returned their names and qualifications. | The named emails are intersected with the caller's own client first. Platform Admin keeps the unrestricted path. |
| `getCheckInHistory` | Built the reporting tree with the service role over every user on the platform, so a `manager_email` pointing across tenants pulled that tenant's check-ins into the response. | Traversal stays inside the caller's client. Verified live: the endpoint returns the caller's own history after the change. |

Verified sound and left alone: `stripeGetInvoices` / `stripeGetSubscription` read only the
caller's own Stripe ids. `stripeCreateCustomer` and `stripeCreateCheckoutSession` resolve the
client from the caller's own membership. `cleanupDemoData` fails closed without a client and
deletes only the caller's own records. `importCompetencies` extracts and maps in memory, writes
nothing. `listAllUsers`, `clientList`, `listClients`, `updateClient`, `listPartners`,
`getManagerInsights` and `getOrganizationUsers` each narrow to the caller's client, partner or
reporting line. `seedCompetencies` and `seedDefaultBadges` are gated to Platform Admin and
Super Administrator, writing the platform-default catalogue by design.

### 10.4 Batch 9 — `Tenant` retired

`Tenant` was the first name for a client organization. `Client` replaced it, and every record
that once pointed at a tenant now points at a client — provisioning batches and user profiles
keep the column name `tenant_id`, and the id inside it is a client id.

The entity held no records (zero, verified before deletion), so nothing needed migrating. Its
one remaining writer was `provisioningWixReadinessGate`, the self-test that proves provisioning
and client resolution end to end by creating throwaway organizations and deleting them again;
it now creates `Client` records, marks them `trial`, and removes them in its own cleanup. No
frontend page, function, agent, workflow or MCP config named `Tenant` any more, and the schema
is deleted, so the entity no longer resolves.

Batch 9 closes the last structural item of Phase 3: one name for a tenant (`Client`), one id
column feeding it, and nothing left that can write an organization of the old kind.

### 10.5 Batch 10 — read rules on catalogue and shared-visibility types

Ten read rules granted a role access without naming a tenant, so a holder of that role in one
client could read every other client's records of that type. Each was narrowed to the client
the record belongs to, keeping the same roles:

| Entity | Branch that crossed tenants | Now |
| --- | --- | --- |
| `Role` | Analyst, Admin Level 1/2, Super Administrator, Partner Business Administrator | role **and** (`client_id` = caller's client, or a tenant-less row for those same roles); platform defaults still shared |
| `CareerPath` | same five roles | same shape as `Role` |
| `LeaderboardTemplate` | same five roles | same shape as `Role` |
| `CourseVersion` | User Level 2, Analyst | role **and** tenant-less version; the caller's own client's versions stay open to all its learners |
| `Certification` | Super Administrator | Super Administrator **and** `client_id` match |
| `DevelopmentRequest` | Super Administrator, Partner Business Administrator | client match, and partner branch narrowed to `partner_client_ids` |
| `ExternalAssessmentResult` | Super Administrator, plus the `is_private: false` shares to User Level 2 / Admin Level 1 / Analyst | all four now require `client_id` match |
| `WorkforceMetrics` | Executive | Executive **and** `client_id` match |
| `KPI` | `visibility: shared` | shared **and** (`client_id` match or tenant-less), so an org-wide KPI no longer crosses into another org |
| `BrandingConfiguration` | `is_active: true` | active **and** (`client_id` match, or the tenant-less platform default); a partner's active branding is readable only through the partner branch |

Every writer already stamps `client_id` on these records — `learningRecordCommand` for course
versions, `LeaderboardDesigner` for leaderboards, `bulkRoleOperations` for roles,
`CareerPathModal` for career paths, and the admin tier rules for the rest — so narrowing the
read side orphans nothing. Tenant-less rows were deliberately left readable by the same roles
that could already see them, so no catalogue entry disappears from a screen.

Left open on purpose, and why: `Journey` (`in_content_library`), `LearningJourney`
(`is_template`), `OnboardingPlan` (`is_template`), `Competency` and `CustomFormTemplate`
(`is_platform_default`), `CustomForm` (`public_access_enabled`) and `Role`
(`is_platform_default`) publish content intended for every tenant. `Goal`, `CustomForm` and
`ReviewParticipant` keep role branches bounded by `managed_program_ids`,
`coaching_engagement_id` or the caller's own line, which are already tenant-bound.

### 10.6 Batch 11 — the update/delete pass, part one: append-only records

Thirty-six types carry `client_id` and declare `"update": null, "delete": null`. A null rule
does not mean "nobody" — it falls back to the create rule, and failing that to read. So on
every one of those types, anyone who could *see* a record could also rewrite or erase it.
For configuration that is a privilege-escalation problem; for evidence it is a compliance
one, because a transcript or an audit trail that the person it records can delete is worth
nothing in an audit.

The first half of the pass closes the records that must be append-only: audit trails,
compliance evidence, ledgers and legally owed notices. Ten types, each now updatable and
deletable only by a Platform Admin — which is also the platform's remediation path, and which
server functions bypass anyway because they act with the service role.

| Type | What it holds | Why it may not be edited |
| --- | --- | --- |
| `LearningRecordEvent` | Every consequential learning action, immutable by design | A transcript must be reconstructable and provably unaltered |
| `CourseVersion` | The published body of a course at a point in time | Completions point at a version; editing it rewrites history |
| `ImpersonationLog` | Who impersonated whom, when, and why | The audit trail of privileged access |
| `ActivityLog` | Administrative actions taken on people and requests | Same class of audit record |
| `PointTransaction` | The points ledger | A balance must be derivable from its entries |
| `UATSubmission` | Tester results and evidence | QA evidence is only worth something if the tester cannot amend it |
| `SuccessionDecisionRecord` | The ratifiable decision artefact | A correction is a new superseding version, never an edit |
| `SuccessionLegalHold` | Active and released legal holds | A freeze that can be erased defends nothing |
| `SuccessionSealedDemographic` | Sealed attributes used only for adverse-impact analysis | Purge is the only sanctioned removal, and it is audited |
| `SuccessionCandidateNotice` | What a candidate was actually told | Versioned rather than edited, by design |

Checked before locking: every mutation of these records in the codebase goes through
`asServiceRole` (`learningRecordCommand`, `logImpersonationEvent`, `exitImpersonation`,
`successionRecordDecision`, `successionManageLegalHold`, `successionSealedDemographics`,
`successionCandidateNotice`, `cleanupOldActivityData`, `cleanupTestData`). No screen writes
them directly, so nothing in the product breaks; the only thing that stops working is a
signed-in user editing evidence from the browser.

Remaining in this pass: twenty-six client-owned configuration types whose update and delete
rules are still null — `Program`, `Cohort`, `Class`, `Journey`, `LearningJourney`,
`OnboardingPlan`, `CustomAssessment`, `CustomForm`, `CustomFormTemplate`, `GamificationSettings`,
`OrgBusinessGoal`, `WorkforceMetrics`, `BrandingConfiguration`, `KPI`, `Certification`,
`Certificate`, `UserBadge`, `UserAchievement`, `DevelopmentRequest`, `Competition`,
`AssessmentSubmission`, `CoachingEngagement`, `CoachingSession`, `Automation`,
`ReviewCycleEvent`, `ExternalAssessmentResult`. These need a per-type write rule rather than a
single lock — each one has its own legitimate editor — so they are the next batch.