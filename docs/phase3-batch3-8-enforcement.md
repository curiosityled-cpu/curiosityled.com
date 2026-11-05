# Phase 3 — batches 3 to 8: enforcement record

This document is the written trail for the Phase 3 work applied after
`phase3-batch2-enforcement.md`. It records what was enforced, what was measured,
and what is still open, so the inventory in `phase2-classification-inventory.md`
is no longer the newest statement of the work.

---

## 1. The learning and enrolment family — closed

Nine types hold a learner's progress, certificate or assignment. In all nine the
tenant-wide roles were checked against the record's own `client_id`, and the
learner, their manager and the person who made the assignment keep their
person-bound branches — an email does not move between clients, so those need no
tenant clause.

| Type | State |
| --- | --- |
| `JourneyEnrollment` | `client_id` added. Admin Level 1/2 create, and every tenant-wide read (Analyst, Admin 1, Admin 2, Super Administrator, Partner administrator), bound to the client. Learner and enroller branches kept. |
| `LearnerProgress` | `client_id` added. Admin 1/2 create and every tenant-wide read bound to the client. Learner and manager branches kept. |
| `AssignedLearning` | Base `admin` role branch was unbound on read, update and delete — a built-in admin could act on every tenant's assignments. Now bound to the client on all three. |
| `CourseProgress` | Same base-`admin` gap on read, update and delete. Now bound. |
| `Course` | Same gap on read, update and delete. Now bound; the course owner (`created_by_id`) and the open-course branch are unchanged. |
| `LearningCertificate` | Same gap on update and delete (read and create were already bound). Now bound. |
| `ConversationalLearningModule` | Already bound on every branch — verified, no change. |
| `ExternalLearningRecord` | Already bound on every branch — verified, no change. |
| `HRBPDelegation` | `client_id` added; delegate, delegatee and the tenant-wide roles are bound to it. |

The base `admin` branch was the pattern worth naming: the app's real
administrators hold `app_role` values (`Admin Level 1`, `Admin Level 2`,
`Super Administrator`), and each of those branches had already been bound in an
earlier batch — but the Base44 built-in `role: "admin"` branch beside them had
not, so a person holding that flag kept a cross-tenant door on the same record.

### Backfill, and why the first attempt was lost

Existing records were stamped from the owning person's client, because a person's
`client_id` is the only durable link between a progress row and a tenant:

| Type | Records | Stamped |
| --- | --- | --- |
| `LearnerProgress` | 55 | 55 |
| `AssignedLearning` | 24 | 21 were null, all stamped |
| `LearningCertificate` | 1 | 1 |
| `JourneyEnrollment`, `HRBPDelegation`, `CourseProgress`, `ExternalLearningRecord` | 0 | — |

The first backfill pass reported success and changed nothing: it ran through a
bulk update before the field existed in the schema, so the write was accepted and
the value dropped. Re-running it with the field in place, and reading the records
back rather than trusting the call, is what actually stamped them. That is the
lesson to carry forward: **verify a backfill by reading the rows afterwards, not
by the call returning.**

### Where the tenant label is written now

| Writer | Change |
| --- | --- |
| `JourneyBuilder` (assign learners) | Stamps the journey's client, falling back to the client in context. |
| `ParticipantManagement` (two enrolment paths) | Stamps the enrolling person's client. |
| `BulkLearningOperations` (assign module) | Stamps the assigning person's client. |
| `bulkAssignJourneys` (server) | Stamps the journey's client when it creates the enrolment. |
| `processFormSubmission` | Already stamped from the form's client. |

Learner-side creates (`ConversationalModule`, `ResourceCard`, the practice
workout writer, `LearningModuleCoach`, `JourneyInbox`) need no stamp to keep
working: the learner branch is person-bound, so those records are created with a
null client and stay readable to that learner and their manager. They are invisible
to tenant-wide administrators, which fails closed, and should be stamped if those
paths are ever widened.

---

## 2. Batch 5 (the read pass) — measured, not finished

The pass was re-measured rather than taken from the inventory. Every read rule was
walked for a tenant-wide role branch that is not inside a client-bound `$and`.
**50 operations across 23 types** carried one at the start of this pass. Batch 5 has since
been executed: three were rule-only fixes, five needed a tenant column before their reads could
be bound, and two were closed by decision rather than by rule. That leaves **33 operations
across 20 types**, every one of them bound to a partner, a program, or platform plumbing, or
deliberately wide — enumerated in section 4.

They split into four kinds, and only the first can be fixed as a rule change:

**a. Fixable as a rule change now** — the tenant label already exists, the branch
was simply never bound. `UserProfile.create`, `UserRoleAssignment.create` (both
already read-scoped by `tenant_id`), `Client.read` (the `admin` and Super
Administrator branches see every client row; they should see their own, with
Platform Admin keeping the full list).

**b. Needs a tenant column before the read can be scoped** — the record has no
`client_id` and no tenant-shaped field at all, so there is nothing to compare
against: `LoginHistory`, `ActiveSession`, `BrandingTheme`, `AssessmentQuestion`,
`DiagnosticSession`. Each needs the field, the writer stamped, and a backfill —
the same three-part unit as the learning family. `DiagnosticSession` also carries
the open product question already recorded in the inventory (is it sales artefact
or tenant data?).

**c. Bound to something other than a client, by design** — `Partner` and
`PartnerCommission` are bound to the partner's own id and its client list;
`Goal` and `CustomForm`'s Admin Level 1 branch are program-bound through
`managed_program_ids`; `IdempotencyKey`, `ProvisioningBatch`, `ProvisioningRole`,
`ProvisioningUser` and `IntegrationDoc` are platform plumbing written by the
service role. These hold, and are recorded as holding rather than silently
counted as fixed.

**d. Deliberately wide, and a product call** — `BlogPost` (the public blog) and
`UATTestCase` (cross-tenant QA) are readable across clients on purpose. Narrowing
either changes what the app does, not just what it allows, so neither was changed
without a decision.

---

## 3. Batches 7 and 8 (the function layer) — audited

Measured over all **552** functions:

| Measure | Count |
| --- | --- |
| Functions containing no reference to a client, tenant or tenant resolution at all | 2 |
| Bulk / assign / move / import family with no tenant reference in the file | 12 |
| Reporting / export / analytics family with no tenant reference in the file | 19 |

A file that mentions none of those words is not automatically wrong — a scheduled
job that sweeps every tenant is correct precisely because it is platform-wide. The
question the passes ask is whether the function acts on **a record the caller
named**. Three were read line by line against that question:

| Function | Finding |
| --- | --- |
| `getReviewRoster` | **Fixed.** Took a `review_cycle_id` from the caller and returned that cycle's roster and submission status with the service role, with no tenant check — any signed-in user could name another tenant's cycle. Now the cycle is loaded and its client compared to the caller's; Platform Admin keeps the cross-tenant path. |
| `bulkAssignAssessments` | Verified sound. Every target email is intersected with `getAssignableUsers`, which is client-scoped. |
| `exportGoalsAnalyticsPDF` | Verified sound. It renders analytics the caller's own screen already computed and reads no record itself, and the guard is Platform Admin / Super Administrator. |
| `processOverdueAssignments` | Verified sound as designed: a scheduled sweep with the service role and no caller-supplied selector. |

The remaining 28 flagged functions have not been through the line-by-line pass and
are listed below as open.

### The two-client proof has not been run

Every step above is static analysis plus data reads. The plan's checkpoint — the
same operation performed by an administrator of client A and an administrator of
client B, checking that neither sees the other's record — **has not been run for
this batch**, because the data does not currently support it: the app has one
client, and all three user records resolve to it. A real proof needs a second
client, one user in it, and a record of each mirrored type in both.

---

## 4. Batch 5 executed

### 4a. Three rule-only fixes — applied

| Type | Change |
| --- | --- |
| `UserProfile.create` | The `Admin Level 2` and `Super Administrator` branches could write a profile into **any** tenant; the read rule beside them was already bound. Both now require `data.tenant_id` to equal the caller's client. Platform Admin keeps the cross-tenant path. |
| `UserRoleAssignment.create` | Same gap, same fix. |
| `Client.read` | The bare `Super Administrator` and `admin` branches returned **every client row** — name, contact email, phone, ACV, Stripe ids, internal notes — to any tenant administrator. Both are now bound to `id == {{user.data.client_id}}`, which the first branch already granted to the row's own tenant. Platform Admin and Platform Administrator keep the full list; Partner administrator keeps its portfolio. |

### 4b. The column-first unit — five types, field plus writer plus rules

Each of these had no tenant-shaped field at all, so no rule could bind before the field existed.

| Type | Field | Rule shape | Writer stamped |
| --- | --- | --- | --- |
| `LoginHistory` | `client_id` | Hard bind: `Admin Level 2`, `Super Administrator` and Partner administrator reads require the client. Own-email and Platform Admin unchanged. | `trackLoginAttempt` resolves the account's client once and stamps both records it writes. |
| `ActiveSession` | `client_id` | Hard bind on the two tenant-wide reads. Own-session read, self-update and force-logout unchanged. | `trackLoginAttempt`. |
| `BrandingTheme` | `client_id` | Null-or-own: a theme that belongs to the shared library (null) stays readable by every tenant; a theme a tenant saved is theirs alone. | `ThemeManager` stamps the saving user's client. |
| `AssessmentQuestion` | `client_id` | Null-or-own on all four operations, so the shared Leadership Index bank keeps working for every tenant while a tenant's own questions stop leaking into another's. | `QuestionEditor` stamps the author's client. `bulkImportAssessmentQuestions` writes the platform bank and correctly leaves it null. |
| `DiagnosticSession` | `client_id` | Null-or-own for the tenant roles; Partner administrator scoped to its portfolio (or null). | `generateDiagnosticReport` runs the public diagnostic, which belongs to the platform — correctly null. |

**Backfill:** all three affected tables (`LoginHistory`, `ActiveSession`, `BrandingTheme`) are
empty in this environment, so there was nothing to stamp and no history was orphaned by the
new bind. Verified by reading the tables back, not by the absence of an error.

### 4c. Two decisions, recorded rather than patched

- **`BlogPost`** stays readable and writable across clients at the admin tiers, because the blog
  is a public site surface: `/blog` renders without a login and narrowing this rule would break
  the page rather than protect anything.
- **`UATTestCase`** stays platform-wide at `Super Administrator` because the UAT suite is
  internal QA material (`/blog`-style tenant content it is not), seeded by the platform and run
  against the app as a whole.

Both are now closed by decision. Reversing either is a product change, not a rule fix.

---

## 5. The function pass — completed, no further leaks found

Every one of the 28 functions carried forward from the first sweep was read against the same
question: *does it act on a record the caller named?* The verdicts:

| Function(s) | Verdict |
| --- | --- |
| `getManagerInsights` (both files) | Sound. Gated to `User Level 2`, then resolves the roster by `manager_email === user.email` — the caller's own reports. Service role is used to read those users only. |
| `generateProactiveInsights` | Sound. The team branch reads through the **user's** client (RLS applies) and resolves direct reports from the caller's email; service role is limited to that lookup. |
| `atreusNightlySummary`, `scheduleReportProcessor` | Sound as designed. Callerless scheduled sweeps over every tenant — correct precisely because they are platform-wide and take no selector. |
| `assignUserToOrganization`, `bulkAssignUsersToOrganization` | Sound. Platform Admin only, which is the correct tier for moving a person between tenants. (Separately: they still speak to the retired `Organization` entity — a legacy cleanup, not a tenant gap.) |
| `bulkInviteUsersE2ETest`, `bulkInviteUsersTest`, `bulkInviteUsersDiagnostic` | Sound. Platform Admin gated. |
| `bulkImportAssessmentQuestions`, `importUATTestCasesFromPDF`, `importCompetencies`, `getAIAssignmentRecommendations` | Sound. Platform/administrator gated, and none acts on a caller-named tenant record. |
| `exportAssessmentPDF`, `exportConversationPDF`, `exportCustomAssessmentPDF`, `exportJourneyAnalyticsPDF`, `exportProgramPerformancePDF`, `exportBusinessManagerPDF`, `generateDiagnosticReport` | Sound. None uses the service role, so every read they make is filtered by the caller's own rules; the PDF cannot contain what the caller could not already see. |
| `exportAssessmentAnalyticsPDF`, `exportLearningAnalyticsPDF`, `exportPlatformAnalyticsPDF`, `exportLeadershipIndexPDF`, `getProgramGoalsAnalytics`, `getProgramPerformanceReport` | Sound. Program-scoped or platform-tier, and the `export*` family renders an analytics payload the caller's screen already computed rather than reading records. |
| `successionCrossTenantRead` | Sound by design. A control-plane read behind a server-side feature flag, reachable only through a `CrossTenantAccessGrant`, and it writes an audit event on every attempt including the refused ones. It is the sanctioned cross-tenant path, not a leak. |

**One real gap was found in the whole pass, and it was already fixed:** `getReviewRoster`.

### The two-client proof — still not runnable

The checkpoint needs two tenants. This environment has one (`6ad63aa31e34c2b231b1a945`), and
because invitations are the only way a person is created, a second administrator cannot be
stood up from here. The static half of the proof is in place: the audit in section 1 walks
every rule branch of the nine learning types and reports zero unbound client-wide branches.
The dynamic half — client A's administrator attempting client B's record — needs a second
client and one user in it before it can be run.

---

## 6. What is left, and why

**33 unguarded operations across 20 types**, none of them in the learning family and none of
them newly discovered. They fall into three groups:

1. **Bound to something other than a client, by design** — `Partner`, `PartnerCommission`
   (partner id and portfolio), `Goal`, `CustomForm` (program scope), `Competency` writes
   (partner catalogue), `IdempotencyKey`, `ProvisioningBatch`, `ProvisioningRole`,
   `ProvisioningUser`, `IntegrationDoc` (service-role plumbing).
2. **Deliberately wide** — `BlogPost` and `UATTestCase`, both now recorded decisions.
3. **Two worth a look, not yet decided** — `User.read`, `User.update` and `User.delete` at
   `Partner Business Administrator` reach every user row rather than the partner's portfolio,
   and `WorkbookLead` at the base `admin` flag reaches all marketing leads. Neither is tenant
   data in the strict sense, but both widen further than their role names imply, and changing
   the built-in `User` rules carries real risk of locking the partner portal out, so neither
   was changed without a decision.

**The two-client proof** (section 5) remains the one item that cannot be closed from inside
this environment.