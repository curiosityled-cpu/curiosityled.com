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

## What capacity never touches

Sign-in, check-ins, reviews, goals, exports and reports never consult the
allowance. It is enforced only when someone is added: invite, manual create and
roster import.
