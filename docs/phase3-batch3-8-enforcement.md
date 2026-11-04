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
**50 operations across 23 types** still carry one.

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

## 4. Still open

1. **Batch 5a — three rule-only fixes** (`UserProfile.create`,
   `UserRoleAssignment.create`, `Client.read`).
2. **Batch 5b — the column-first unit**, five types: `LoginHistory`,
   `ActiveSession`, `BrandingTheme`, `AssessmentQuestion`, `DiagnosticSession`.
3. **Batch 5d — two product decisions**: `BlogPost` and `UATTestCase` reads.
4. **The remaining 28 functions** from the batch 7/8 audit, by name:
   bulk/move — `assignUserToOrganization`, `bulkAssignUsersToOrganization`,
   `bulkImportAssessmentQuestions`, `bulkInviteUsersDiagnostic`,
   `bulkInviteUsersE2ETest`, `bulkInviteUsersTest`,
   `getAIAssignmentRecommendations`, `getReviewRoster` (fixed),
   `importCompetencies`, `importUATTestCasesFromPDF`; reporting/export —
   `atreusNightlySummary`, `exportAssessmentAnalyticsPDF`, `exportAssessmentPDF`,
   `exportBusinessManagerPDF`, `exportConversationPDF`,
   `exportCustomAssessmentPDF`, `exportGoalsAnalyticsPDF` (verified),
   `exportJourneyAnalyticsPDF`, `exportLeadershipIndexPDF`,
   `exportLearningAnalyticsPDF`, `exportPlatformAnalyticsPDF`,
   `exportProgramPerformancePDF`, `generateDiagnosticReport`,
   `generateProactiveInsights`, `getManagerInsights` (both files),
   `getProgramGoalsAnalytics`, `getProgramPerformanceReport`,
   `scheduleReportProcessor`.
5. **The two-client proof**, once a second client exists.