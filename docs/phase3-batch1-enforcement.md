# Phase 3 — Batch 1 (Enforcement)

Scope: the four named data types, plus the scheduled-report companion. Rules written,
then simulated against every live user before being accepted.

Status: applied. Nothing migrated, nothing deleted.

---

## What changed

| Data type | Read | Create | Update / delete |
| --- | --- | --- | --- |
| `Goal` | `shared` branch now requires the reader's client | unchanged (owner) | unchanged — deferred, see open items |
| `LearningResource` | platform (`client_id` empty) **or** own client, and every role branch now carries that condition | unchanged — deferred, see open items | newly closed: creator, or admin scoped to own client, or Super Administrator / Platform Admin |
| `ReportTemplate` | platform/built-in (`client_id` empty) **or** own client **or** partner's clients | admin must stamp own client | creator, or admin scoped to own client |
| `ScheduledReport` | unchanged (already scoped) | must stamp own client | creator or admin scoped to own client |
| `CheckInCustomQuestion` | unchanged (already scoped) | role **and** client match | role **and** client match, plus creator |

Two deliberate choices:

- **Super Administrator and Platform Admin stay unconditional** on update/delete.
  Narrowing them would have removed access from the two real administrators on
  records their own client does not own — a lockout with no security gain, since
  only Platform Admin is cross-tenant by design.
- **Platform rows stay readable.** A resource or template with no client is the
  platform catalogue, not another tenant's data. Every read keeps that branch.

---

## Verification (simulated over live rows, all three real users)

| User | Role | Client | Goals before → after | Resources | Questions |
| --- | --- | --- | --- | --- | --- |
| team@ | Platform Admin | Go Flat Bridge | 52 → 52 | 485 → 485 | 4 → 4 |
| eosoria@ | Super Administrator | Go Flat Bridge | 7 → 1 | 485 → 485 | 4 → 4 |
| ceo@ | User Level 1 | Go Flat Bridge | 6 → 0 | 485 → 485 | 4 → 4 |

### The goal drop is the leak closing, not a lockout

All six goals that `ceo@` and `eosoria@` lose were reachable **only** through the
`shared` branch:

- 3 belong to **HealthCo (demo)** — another tenant entirely.
- 3 have **no client at all** (CSAT Score, Ticket Resolution Time, SLA Adherence),
  written by a service account during seeding.

Neither user ever owned, was assigned, or was a member of any of them. Go Flat Bridge
has **no goals of its own** in the data — so after the change those screens are empty
for its members, correctly.

This is the exact class of failure the phased plan is designed to surface: a rule that
is right on paper and a screen that changes. It is reported here rather than papered
over.

---

## Open items carried into the next batch

1. **Three unattributed goals.** CSAT Score, Ticket Resolution Time, SLA Adherence have
   no client and are now visible only to Platform Admin. They need attribution before
   they can be seen by a tenant. Recommend HealthCo (demo), where the rest of that seed
   lives — needs your call.
2. **`Goal` writes are still inherited-open.** 47 of 52 goals have no client stamp, so
   client-scoped writes would lock real rows out. Backfill must precede it.
3. **`LearningResource` create is still role-only.** Neither creation dialog stamps a
   client, so requiring one would return 403 on save. Needs the two dialogs wired
   first; platform catalogue rows must be exempt for Platform Admin.
4. **`Tenant` is still live.** `provisioningGenerateApiKey` verifies against the empty
   table, so that endpoint cannot succeed. One-line repoint to `Client`, plus the
   readiness-gate fixtures that still create `Tenant` rows.
5. **`data.client_id` has no write lock.** Every rule above now trusts it. Profile
   saving already refuses to write it, but a direct self-update could. Field-level lock
   is the remaining hardening.

---

## Not yet touched

The 158 unscoped service-role functions, and the `succession*` family (125), remain
untouched by this batch. They are the next unit of work, verifiable as a group.