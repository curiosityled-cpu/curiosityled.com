# Phase 5 — the two-client proof, measured

**Run:** 5 November 2026 · **Result: 18 of 18 categories pass, 156 of 156 attempts held, 0 failures.**
**Harness:** `phase5TwoClientProof` (Platform Admin only, re-runnable).

Phase 4 proved the resolver *decides* correctly when handed a principal. Phase 5 asks the
harder question: with two real clients in the database and a real record of every category in
each one, does a request that names the **other** client actually reach it?

## 1. The two clients

Created by the proof if they do not exist, and left in place so the run can be repeated and
inspected. Both are synthetic: `type: direct_customer`, `status: trial`, and their `notes`
field reads *"Phase 5 proof tenant — synthetic, safe to delete"*.

| Role | Name | Id |
| --- | --- | --- |
| A | Phase 5 Proof — Alpha | `6aec062d10f4474d813adce1` |
| B | Phase 5 Proof — Beta | `6aec062d2f619cf5f76f203a` |

The attempts are made as synthetic principals — an Admin Level 1 member of A, an Admin Level 1
member of B, and a Platform Admin — so no real account is ever used to write a probe.

## 2. What was attempted, per category

Every category is tested in **both directions** (A→B and B→A). Per direction:

| Attempt | What is asked | Must be |
| --- | --- | --- |
| cross-read | read the other client's row, scoped to the caller's client | 0 rows |
| cross-write | move the other client's row into the caller's client | 0 rows moved |

Plus three control and two claim checks on every category:

| Attempt | What is asked | Must be |
| --- | --- | --- |
| own-scope control (A, B) | may the member act on their *own* client? | yes — so a refusal above cannot come from a guard that refuses everything |
| platform scopes to any client | is the Platform Admin still unrestricted? | yes |
| claim A→B / B→A | may this member act on the other client at all? | no |

## 3. Results — every category

| # | Category | Entity | Boundary | Attempts | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Check-in questions | `CheckInCustomQuestion` | client | 9 | pass |
| 2 | Goals | `Goal` | client | 9 | pass |
| 3 | Learning resources | `LearningResource` | client | 9 | pass |
| 4 | Report templates | `ReportTemplate` | client | 9 | pass |
| 5 | Courses | `Course` | client | 9 | pass |
| 6 | Roles | `Role` | client | 9 | pass |
| 7 | Competencies | `Competency` | client | 9 | pass |
| 8 | Signals / custom forms | `CustomForm` | client | 9 | pass |
| 9 | Cohorts | `Cohort` | client | 9 | pass |
| 10 | Certifications | `Certification` | client | 9 | pass |
| 11 | Development requests | `DevelopmentRequest` | client | 9 | pass |
| 12 | KPIs | `KPI` | client | 9 | pass |
| 13 | Workforce metrics | `WorkforceMetrics` | client | 9 | pass |
| 14 | Learning certificates | `LearningCertificate` | client | 9 | pass |
| 15 | Branding configuration | `BrandingConfiguration` | client | 9 | pass |
| 16 | External learning records | `ExternalLearningRecord` | client | 9 | pass |
| 17 | Daily check-ins | `DailyCheckIn` | person | 6 | pass, with a finding |
| 18 | User profiles | `UserProfile` | person | 6 | pass, with a finding |

16 categories × 9 attempts = 144, plus 2 × 6 = 12 → **156 attempts**, all held.

Fixtures: 36 records created (2 per category, one per client) and **36 removed** in the same
run. Nothing is left behind except the two tenant records themselves.

## 4. The two findings

Both are the same shape, and both are already on the Phase 2 list of types that still need a
tenant column (§5 of the inventory). They are recorded here rather than rounded up:

1. **`DailyCheckIn` carries no client column.** The boundary is the person's own email in the
   access rule, and browsing check-ins for a cohort means matching emails, not filtering a
   tenant. Correct at one record at a time; not scopeable in a report.
2. **`UserProfile` carries `tenant_id`, not `client_id`.** The tenant is derivable, but no
   query in the app filters on it, so the same limit applies.

Neither leaks: the attempt to claim the other client is refused, and one person's email cannot
become another's. What is missing is a column a *report* can group by — which is why these two
remain reported rather than declared closed.

## 5. What this proof does and does not measure

**It measures the server path.** The attempts run with the service role on purpose: a scoped
query is refused because it does not match, not because an access rule happened to hide it.
That answers the question the 552-function audit left open — whether the code that builds a
tenant query actually applies the tenant, rather than accepting the client on trust.

**It does not measure the access rules.** RLS is evaluated against a signed-in session, and a
session cannot be minted here; the Platform Admin who runs this proof legitimately spans every
client, so an RLS test made as them would pass by design and prove nothing. The rules were the
subject of Phase 3 batches 1–12, which record each rule change, and the write-rule constraint
learned there (`$elemMatch` is rejected on writes) is still enforced.

The honest statement is therefore: **A tenant query cannot cross once the tenant is applied, and
the tenant is applied on every path measured here.** A browser-session refusal is a different
assertion, and it belongs to a member-signed-in session, not to this harness.

## 6. Re-running

Invoke `phase5TwoClientProof` as a Platform Admin. It returns
`{ categories_tested, categories_passed, attempts, passed, failed, failures[], person_bound[], fixtures, categories[] }`
with every individual attempt recorded — so a regression appears as a named failure
(`"B→A cross-write: expected 0 rows moved, got row changed tenant"`), not as a vague "looks fine".