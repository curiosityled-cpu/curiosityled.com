# Phase 3 — Batch 2 (Enforcement)

Scope: the three items carried out of batch 1 that could be closed without a data
migration, plus the provisioning blocker that made a shipped endpoint unusable.

Status: applied. Nothing migrated, nothing deleted.

---

## What changed

| Item | Before | After |
| --- | --- | --- |
| `Goal` update / delete | inherited-open — any signed-in user could edit or delete **any** goal, in any client | creator · assignee · coach · shared-in-own-client · manager over a direct report · program admin over a managed program · client-scoped admins · partner over portfolio · Platform Admin |
| `LearningResource` create | role-only — an admin could stamp **any** `client_id` on the payload | every branch requires the record's client to match the writer's own (partner: their portfolio); Platform Admin keeps the platform catalogue |
| Two resource creation dialogs | did not stamp a client | stamp the resolved active client |
| `provisioningGenerateApiKey` | verified the request against the empty `Tenant` table, so it could never succeed | verifies against `Client`; tested live, returns a key |

`Goal` reads are unchanged from batch 1. `LearningResource` read / update / delete
are unchanged.

---

## Why `Goal` writes could be closed now

Batch 1 deferred this because 44 goals carry no client. That turned out not to block
it: the creator branch carries access by identity, not by client, and every real goal
has a creator. The 44 unstamped rows are private seed-account goals with no
assignments and no members — nobody but their creator reaches them, before or after.

### The member-edit question, answered honestly

Goal membership is a list of objects (`{user_email, role}`), and a write rule cannot
reach into an object list. Member *editors* therefore cannot be granted edit by role.
Rather than silently demote them, the rule keeps a branch that already existed in
spirit: a **shared** goal stays editable by users of its own client. That is tighter
than today (it no longer crosses tenants) without taking the edit away from people who
have it now.

Delete is stricter than edit on purpose: a shared goal is editable by its client but
only deletable by its creator, its coach, or an administrator.

---

## Verification (simulated over live rows: 52 goals, 3 real users)

| User | Role | Goals where update is allowed — before → after |
| --- | --- | --- |
| team@ | Platform Admin | 52 → 52 |
| eosoria@ | Super Administrator | 52 → 1 — the one goal they created |
| ceo@ | User Level 1 | 52 → 0 — and they can see 0 |

This is the same picture batch 1 produced on reads, for the same reason: Go Flat Bridge
has no goals of its own, and neither `ceo@` nor `eosoria@` created the HealthCo or
unstamped rows they were previously allowed to edit. The drop is the cross-tenant write
path closing, not a screen going dark.

Row distribution: 44 goals unstamped, 8 owned by one client.

---

## Verified live

- `provisioningGenerateApiKey` called with a real client id: **200**, key issued and
  stored. The test key record was deleted immediately; no live credential was left
  behind. This closes the "endpoint cannot succeed" item from batch 1.

---

## Field locks, and the invitation claim moved to the server

Every rule above trusts a field on the person's own record: `client_id`,
`app_role`, `partner_id`, `partner_client_ids`, `subordinate_emails`,
`managed_program_ids`, `custom_role_id`. Until now any signed-in person could
rewrite those on themselves through a profile update — including their own role.
A rule that trusts a value the user can set is not a rule.

| Change | Effect |
| --- | --- |
| Field-level write locks on those seven `User` fields | only the service role (and the app's editors, from the dashboard) can write them |
| `ManagerProfileCard` no longer spreads the whole `data` object | saving a profile can no longer carry a locked field back through |
| New `claimPendingInvitation` function | applies the invited role and client from the **session's** email; the browser sends nothing but the call |
| `pendingInvitation.js` | calls that function instead of writing `app_role` / `client_id` itself |

The invitation claim was the reason this could not be done earlier, and it was worse
than a blocker: it was the escalation path. A person could call the profile update with
`app_role: "Platform Admin"` at any time. The invitation is now read server-side by the
caller's verified email, verified against the `Client` record it names, and written with
the service role in a single merged update — the same write path as every other
membership change.

Verified live: rehearsed with a real invitation for the Platform Admin account carrying
their existing role and client. The claim applied both and marked the invitation
claimed; the account's stored values were unchanged, and the rehearsal invitation was
deleted afterwards.

---

## Still open

1. **Shared-goal editing is client-wide, not member-only.** The precise form needs
   `members` denormalized to a list of plain emails; the field-level lock above is the
   same piece of work.
3. **158 unscoped service-role functions, and the `succession*` family (125).** Next
   unit, verifiable as a group.