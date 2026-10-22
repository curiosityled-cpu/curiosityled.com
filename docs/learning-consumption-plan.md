# Learning Content: Consumption & Management Review + Implementation Plan

Curiosity Led · reviewed 2026-10-22 · scope: courses, journeys, resources, modules — learner consumption and admin management

---

## 1. Research — how established LMSs do this

**Content hierarchy.** The standard shape is Program/Path → Course → Module/Chapter → Lesson/Activity, where the lesson is the thing actually consumed (video, document, link, quiz, live session, SCORM/xAPI package). Two structural models coexist: linear/sequenced (lesson unlocks after the previous one) and modular (any order, completion = percentage). Mature LMSs expose both as configuration — "must complete all lessons, in order" vs "any order". Curiosity Led's `Course.modules[].lessons[]`, `lesson.gate`, `lesson.unlock_offset_days` and `Course.completion_rule` already model this correctly. Nothing in the product consumes it.

**Completion model.** Each lesson declares a completion trigger (view, minimum time, quiz pass, manual). The course rolls up to Not started / In progress / Completed (compliance LMSs add Failed / Expired / Renewal required). Completion status vocabulary must be identical between the learner view and the admin report, and status labels are often mapped to the organisation's own language (e.g. "Certified", "Compliant"). Completion records must outlive content changes (people leave, courses get retired, but the record of who completed what must survive audits).

**Learner experience conventions.**
- One "My Learning" landing: what's due, what's in progress, what's newly assigned, what's completed. Each card carries type, provider, estimated duration, due date, a progress bar and exactly one primary action (Start / Continue / Review).
- Launch, then resume. A player view with a content pane plus a lesson outline; progress persists automatically; a prominent "Continue where you left off"; deep links to an individual lesson so reminders can open the right place.
- The learner never self-reports status from a dropdown. Progress is derived from activity or an explicit "mark complete" on the content itself. Dropdown status editing is an admin back-office control, not learner UX.
- Feedback loops: progress percentage, completion confirmation, points/badges, certificates.
- Reminder escalation is tiered: learner reminder at ~75% of the deadline, manager alert at the deadline, HR escalation beyond it.
- Accessibility and mobile: large touch targets, captioned media, keyboard-navigable outlines, content that reads on a phone.

**Admin experience conventions.**
- A course roster/report: one row per learner with status, % complete, lessons completed, enrolled date, last activity, due date, completion date; sorting, filtering (status, overdue, cohort), search, and CSV/PDF export.
- Bulk actions: assign to individuals, departments, teams or cohorts; set a due date; send reminders; unassign; re-assign.
- Course-level rollups: enrolled, not started, in progress, completed, overdue, completion rate, average time to complete, and per-module completion rates (which reveals the lesson where learners stall).
- Reporting is segmented (department, cohort, role) and can be scheduled to managers. Role-based dashboards are the norm: HR sees everything, a manager sees their team, a learner sees themselves.

Sources: Absorb LMS (course content pacing, completion tracking features), LMSNinjas (LMS UX best practice), Docsie (completion tracking best practice), Devlin Peck (LMS reporting/user reports), eLeap (course management hierarchy), LMSpedia (learning path structure).

---

## 2. Audit — what exists today

### Data model (good bones, already present)
| Entity | Role today |
| --- | --- |
| `Course` | Structured course: modules → lessons, each lesson points at a resource / live class / assessment / form / conversational module. Has `completion_rule`, gating, `access_mode` (open/closed), `pacing`, `assigned_to_emails`, `enrollment_count`, `completion_count`. |
| `CourseProgress` | One row per learner per course: `status`, `completed_lessons[]`, `overall_percentage`, `enrolled_at`, `completed_at`, `last_accessed_at`, `certificate_issued`, `cohort_id`. |
| `AssignedLearning` | One row per learner per resource/module assignment: `status`, `due_date`, `priority`, `completion_date`, `learning_resource_id`, `conversational_learning_module_id`. |
| `LearnerProgress` | Consumption progress for resources and conversational modules; written by the conversational module player. |
| `Journey` + `JourneyEnrollment` | Unified journey model: `content_structure`, learning/signal/experience items, content library flag, assignees, plus per-learner enrolment with `content_progress`. |
| `DevelopmentPlan`, `LearningJourney` | Legacy journey/program entities still read by some screens. |
| `Notification`, `LearningCertificate`, `CertificateViewer`, points/badges | Supporting feedback machinery. |

### Learner side — critical gaps
1. **Assigned courses are invisible.** Assigning a course writes `CourseProgress` rows and a notification reading "You can find it in your learning library", but no learner screen reads `CourseProgress`. My Development loads only `AssignedLearning`, `DevelopmentPlan` and `DevelopmentExperience`. The assignment exists; there is nowhere to see or open it.
2. **No way to consume anything.** Even where items do appear (assigned learning rows, journey learning items), the only control is a manual status dropdown. There is no Open/Start/Continue, no link to a resource URL, no in-app file viewer, no module player entry, no assessment runner link. Progress is self-declared rather than derived.
3. **Nothing reads course structure.** `Course.modules` is read only by the builder and the assign modal. No lesson list, no writer of `completed_lessons` or `overall_percentage`, so course progress can never move and `completion_count` is never updated.
4. **Four stores, three vocabularies, no shared surface.** `AssignedLearning` (assigned/started/in_progress/completed), `CourseProgress` (not_started/in_progress/completed), `JourneyEnrollment` (not_started/in_progress/completed), journey `learning_items` (not_started/in_progress/completed) — each rendered by a different screen, none unified.
5. **Journeys are split across two models.** My Development reads legacy `DevelopmentPlan`; `MyJourneys` reads unified `Journey` + `JourneyEnrollment`. A journey created in the current builder can appear in one and not the other.
6. **No due-date loop.** Assignments can carry due dates but nothing reminds, tracks "due soon", or surfaces overdue to the learner.

### Admin side — critical gaps
1. **No roster at all.** Course cards in Development Manager → Learning → Courses show a single assignee-count badge. There is no list of who is assigned, their status or progress; the assign modal is write-only (no view, no due date, no unassign, no re-send).
2. **`CourseProgress` is unreadable by admins.** Its read/update/delete rules gate on app-role names (`Admin Level 1`, `Platform Admin`, …) which the platform does not match against the account's role — the same failure mode that blocked conversational-module creation. A roster UI would return zero rows until this is fixed.
3. **No course analytics.** No completion rate, no overdue list, no per-module stall analysis, no average time to complete. The one screen that implements this pattern (`JourneyDetails`) reads legacy `LearningJourney` and is therefore empty for current data.
4. **No content inventory per course** — you cannot see which resources/classes/assessments a course pulls in, nor spot dead references (a lesson pointing at a deleted resource).
5. **Assignments cannot be managed** — no edit of due date, no unassign, no bulk re-send, no enterprise-wide assign, no audit trail of who assigned what.
6. **Open writes.** `Course.update/delete` and `AssignedLearning.update/delete` are set to `null`, i.e. unguarded: any signed-in user can modify or delete any course or any learner's assignment.

### Root cause
The authoring half of an LMS was built (builder, assignment, storage). The consumption half (learner inbox + player) and the management half (roster + reporting) were never wired. Enrolment records are written into three stores and read by nobody, so both reported symptoms — "I can't take the course" and "I can't see who is assigned" — have the same origin.

---

## 3. Plan

### Decisions to confirm (recommendation in bold)
1. **Canonical journey model.** **Adopt unified `Journey` + `JourneyEnrollment` and migrate `DevelopmentPlan` reads in My Development** (a `migrateJourneysToUnified` function already exists); keep a read-only legacy section for one release. Alternative: leave personal plans on `DevelopmentPlan`.
2. **Course enrolment record.** **Keep `CourseProgress` as the course enrolment/progress row** (extend with `due_date`, `assigned_by`, `last_lesson_id`) rather than folding courses into `AssignedLearning`.
3. **Due dates on course assignments: yes**, optional per assignment, with reminders.
4. **Certificates on course completion: yes** — issue a `LearningCertificate` from a service-role function (creation is admin-gated today).
5. **Deployment scope: Phases 1–3.** Phase 4 (reporting/reminders/analytics depth) inside the first week after.

### Phase 0 — Access and data foundations (blocking, ~half a day)
- `CourseProgress.rls`: add a built-in `role: admin` branch to read/update/delete, keeping the learner self branches. Without this the roster cannot render and admins cannot correct a learner's record.
- `Course.rls`: add a built-in `role: admin` branch to read; replace `update/delete: null` with owner-or-admin.
- `AssignedLearning.rls`: replace `update/delete: null` with learner-self plus admin; add an admin read branch for organisation-wide reporting.
- Schema additions: `CourseProgress.due_date`, `assigned_by`, `last_lesson_id`, `reminder_sent_at`; denormalised `lesson_count` on `Course` for list views.
- Verify with a two-account harness (admin + learner) through the UI, not service-role probes, because RLS applies only to app-user requests.

### Phase 1 — Learner: make content consumable
New:
- `src/hooks/useMyLearning.js` — one loader normalising `AssignedLearning` + `CourseProgress` + `JourneyEnrollment` into a common item shape: `{ type: course|resource|module|journey, title, provider, due_date, status, percent, launch: { kind, id, lessonId? } }`.
- `src/pages/CoursePlayer.jsx` (route `/course/:courseId`) — the missing player:
  - Header: course title, progress %, due date, status; **Continue** resumes at the first incomplete lesson via `last_lesson_id`.
  - Left: module/lesson outline with completion ticks and locked states driven by `lesson.gate` / `unlock_offset_days`.
  - Right: the lesson content, delegated by `content_type` — resource → external URL, in-app viewer for uploads (private files via signed URL), or embed; conversational_module → existing `/ConversationalModule?id=` player; assessment/form → existing runner (`/FormSubmission`, `scoreAssessmentSubmission`); live_class → session details (date, facilitator, location) plus attendance completion.
  - **Mark complete** writes `completed_lessons` with a timestamp, recomputes `overall_percentage` and `status`, sets `completed_at` when the completion rule is met, and triggers points/badge plus optional certificate.
  - Lesson-level deep links so reminders can open the exact lesson.
- `src/components/learning/LearnerItemCard.jsx` — the single card used across the learner inbox: type icon, title, provider, due date, progress bar, one primary action (Start / Continue / Review / Open).

Changed:
- `src/pages/MyDevelopment.jsx`: Learning Progress becomes a real inbox — courses, resources and modules together, ordered due-soon → in progress → newly assigned, with filters (All / In progress / Not started / Overdue / Completed) and a launch action on every card. The self-reported status dropdown is removed except where there is genuinely no consumable content (an off-platform experience).
- Journeys tab: journey items launch through the same player/launcher; journey progress is derived from item progress instead of the dropdown; each journey shows a completion percentage.
- `AssignCourseModal` notification copy points to where the course actually appears.

### Phase 2 — Admin: assignment roster and course reporting
New:
- `src/components/dev-manager/CourseDetailDrawer.jsx` (opened from a course card):
  - Summary strip: enrolled / not started / in progress / completed / overdue, completion rate, average time to complete, per-module completion bars (reusing the `JourneyDetails` chart pattern).
  - **Roster table**: learner name and email, status, % complete, lessons done (n of total), enrolled date, last activity, due date, completed date — sortable, filterable (status, cohort, overdue), searchable, CSV export.
  - Row actions: learner detail (their lesson-by-lesson completion), send reminder, change due date, unassign. Bulk: select → remind / set due date / unassign.
  - Assignment form upgrade: due date, note, individuals or cohort, enterprise-wide for open courses, and a preview of what will be created.
- `base44/functions/courseRoster.js` — service-role aggregation of `CourseProgress` by course joined to user names plus per-module completion, so the drawer never pages through raw records.
- `base44/functions/sendCourseReminders.js` + workflow `Course Due-Date Reminders` — due-soon (learner), due-today, overdue (learner and manager), idempotent per learner per day.

Changed:
- `CoursesTab.jsx`: cards show enrolled / completed / overdue and completion %; the assignee badge opens the drawer; add "copy learner link" for open courses.
- Development Manager → Learning → Enrollments tab: same roster treatment for resource/module assignments (filters, export), since the same questions are asked there.
- `Course.enrollment_count` and `completion_count` maintained by the assignment and completion paths only, to stop drift.

### Phase 3 — Journeys end to end
- Journey assignment writes `JourneyEnrollment` with a due date and lands in the same learner inbox.
- Learner journey detail: ordered items using the same launcher/player, prerequisites enforced, completion producing points/badges and certificates.
- Retire the `DevelopmentPlan` read path in My Development once migrated (decision 1).
- Repoint or retire `JourneyDetails` (currently on legacy `LearningJourney`) so admin journey analytics show real data.

### Phase 4 — Reporting, notifications, depth (first-week follow-up)
- Course and journey analytics: completion rates, overdue learners, module stall analysis, PDF/CSV export, scheduled digest to admins.
- Manager view of "my team's learning" (overdue and in-progress), reusing the client/manager scoping patterns already in the app.
- Certificate issuance and verification (`LearningCertificate` + `CertificateViewer`, verification code lookup).

### Phase 5 — Acceptance criteria (must all pass before deployment)
1. Admin: create a two-module course containing a resource lesson, a conversational-module lesson and a live-class lesson; publish; assign to self with a due date.
2. Learner: course appears in My Development with due date and 0% progress; open → player shows the outline; open the resource lesson → content renders (external link, or in-app viewer for an upload stored privately); mark complete → outline ticks and % updates; open the module lesson → module player runs; completing it completes the course per the rule, awarding points and a certificate if configured; returning later resumes at the right lesson.
3. Admin: open the course → roster shows that learner with status, %, lessons done, last activity and due date; filter overdue; export CSV; send a reminder that delivers exactly once.
4. Cross-user isolation: a second learner sees only their own rows; a non-admin cannot read another learner's progress; no non-admin can edit or delete a course.
5. Broken reference: a lesson pointing at a deleted resource shows "content unavailable" rather than a dead click.
6. Mobile: outline collapses to a drawer, touch targets at least 44px, lesson content scrolls cleanly.

### Open risks
- RLS applies to app-user requests only, so every learner/admin fix must be verified through the UI (Testing Agent for the two-person flows).
- Legacy duplication (`DevelopmentPlan` vs `Journey`, `LearningJourney` vs `Journey`, three enrolment stores): Phases 1–2 work with what exists; Phase 3 must not add a fourth store.
- Points, badges and certificates are currently wired to no completion path — confirm whether course completion should award them (recommend yes, reusing `awardPoints` / `evaluateAllBadges`).