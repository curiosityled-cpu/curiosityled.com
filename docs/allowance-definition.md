# Tenant capacity: the counting definition

One definition, quoted by the sales conversation and applied by the code
(`base44/shared/tenantAllowance.ts`). If this document and that file disagree,
the file is wrong — change both together.

## Who counts as a manager

A **manager** is a registered user in the tenant who has at least one direct
report, where a direct report is:

- another tenant user whose `manager_email` (or `data.manager_email`) points at
  them, or
- someone listed in that user's `subordinate_emails`.

A sponsor, executive or HR partner who uses the manager experience but has
nobody reporting to them is **not** a manager. They count as a participant.

## Who counts as a participant

Everyone else in the tenant who uses the product:

- registered non-managers, and
- active front line roster identities (`ICRoster`, `is_active` not `false`) —
  people who receive check-ins without ever logging in.

**De-duplication:** one person is counted once, keyed by lowercased email. A
front line identity whose email matches a registered user is counted as that
user, not twice. Inactive roster identities are not counted.

## What the allowance is

- Managers allowed = `manager_allowance` + 5 × `manager_addon_blocks`.
- Participants allowed = `participant_allowance` + 100 × `participant_addon_blocks`.
- An allowance that has never been set is reported as **not set**, never as
  zero. A tenant whose package is `unknown` shows usage with allowances unset
  until a human confirms them.

## Which pool an addition is charged to

Usage always follows the counting rule above. An *addition*, before any
reporting line exists, is charged to the manager pool when the person is created
at Team Leader (User Level 2) or above, and to the participant pool otherwise.
Frontline roster rows are always participants.

## Warn before block

Every tenant starts in **warn** mode: an over-allowance add goes through and is
recorded in `CapacityOverageLog` for review. A tenant moves to **block** only
after a clean warn period on real traffic. A tenant whose allowance has not been
set is never refused — usage is reported, not enforced.

## The refusal

A refused add names the allowance, the number in use, how far over the add would
go, the block that resolves it, and who to ask for it. No add path ends in a
dead end.

## What capacity never touches

Sign-in, check-ins, reviews, goals, exports and reports never consult the
allowance. It is enforced only when someone is added: invite, bulk invite,
manual create and roster import. `scripts/assert-capacity-isolation.sh` asserts
this and must pass.
