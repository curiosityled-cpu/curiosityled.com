/**
 * Tenant capacity: who counts as a manager, who counts as a participant, and
 * how a tenant's allowance position is derived.
 *
 * This module is the single source of truth for the counting rule. The written
 * definition that the sales conversation quotes lives in
 * docs/allowance-definition.md and must be changed together with this file.
 */

/** Each purchased manager add-on block adds five managers. */
export const MANAGER_BLOCK_SIZE = 5;

/** Each purchased participant add-on block adds one hundred participants. */
export const PARTICIPANT_BLOCK_SIZE = 100;

/** The rule, in the words the code and the sales conversation both use. */
export const ALLOWANCE_RULE =
  "A manager is a registered user in the tenant who has at least one direct report — another tenant user whose manager_email points at them, or someone listed in their subordinate_emails. Everyone else who uses the product is a participant: registered non-managers, plus active frontline roster identities. A frontline person whose email matches a registered user is counted once, as that user.";

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function emailOf(user) {
  return String(user?.email || "").toLowerCase().trim();
}

function managerEmailOf(user) {
  return String(user?.data?.manager_email || user?.manager_email || "").toLowerCase().trim();
}

function subordinateEmailsOf(user) {
  const list = user?.data?.subordinate_emails || user?.subordinate_emails;
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

/** Managers included in the base package plus everything bought in blocks. */
export function managerAllowanceTotal(client) {
  return num(client?.manager_allowance) + MANAGER_BLOCK_SIZE * num(client?.manager_addon_blocks);
}

/** Participants included in the base package plus everything bought in blocks. */
export function participantAllowanceTotal(client) {
  return num(client?.participant_allowance) + PARTICIPANT_BLOCK_SIZE * num(client?.participant_addon_blocks);
}

/** Whether an allowance was actually set on the tenant record. */
export function hasManagerAllowance(client) {
  return client?.manager_allowance !== null && client?.manager_allowance !== undefined;
}

export function hasParticipantAllowance(client) {
  return client?.participant_allowance !== null && client?.participant_allowance !== undefined;
}

function position(used, allowed, configured, addonBlocks) {
  return {
    used,
    allowed: configured ? allowed : null,
    remaining: configured ? allowed - used : null,
    over: configured ? Math.max(0, used - allowed) : 0,
    addon_blocks: num(addonBlocks),
    allowance_set: configured,
  };
}

/**
 * Compute a tenant's full capacity position from its client record, its users
 * and its frontline roster. Pure: no database access, so the same rule is used
 * by the function, any test and any future screen.
 */
export function computeTenantAllowanceUsage(client, users, roster) {
  const tenantUsers = Array.isArray(users) ? users : [];
  const rosterRows = (Array.isArray(roster) ? roster : []).filter((r) => r?.is_active !== false);

  // Who has somebody reporting to them. Both reporting-line signals count.
  const managerEmails = new Set();
  for (const user of tenantUsers) {
    const manager = managerEmailOf(user);
    const own = emailOf(user);
    if (manager && manager !== own) managerEmails.add(manager);
  }
  for (const user of tenantUsers) {
    if (subordinateEmailsOf(user).length > 0) managerEmails.add(emailOf(user));
  }

  // One entry per person, keyed by email so a roster identity that is also a
  // registered user is never counted twice.
  const people = new Map();
  for (const user of tenantUsers) {
    const email = emailOf(user);
    if (!email) continue;
    people.set(email, {
      email,
      kind: managerEmails.has(email) ? "manager" : "participant",
      source: "user",
    });
  }

  let rosterOnly = 0;
  for (const row of rosterRows) {
    const email = emailOf(row);
    if (!email || people.has(email)) continue;
    people.set(email, { email, kind: "participant", source: "roster" });
    rosterOnly += 1;
  }

  const managersUsed = [...people.values()].filter((p) => p.kind === "manager").length;
  const participantsUsed = [...people.values()].filter((p) => p.kind === "participant").length;

  const managers = position(
    managersUsed,
    managerAllowanceTotal(client),
    hasManagerAllowance(client),
    client?.manager_addon_blocks
  );
  const participants = position(
    participantsUsed,
    participantAllowanceTotal(client),
    hasParticipantAllowance(client),
    client?.participant_addon_blocks
  );

  const overage = [];
  if (managers.over > 0) overage.push(`${managers.over} manager${managers.over === 1 ? "" : "s"} over`);
  if (participants.over > 0) {
    overage.push(`${participants.over} participant${participants.over === 1 ? "" : "s"} over`);
  }

  let overageReason = null;
  if (overage.length > 0) {
    overageReason =
      managers.over > 0
        ? `Managers used (${managers.used}) exceed the allowance of ${managers.allowed} (base ${num(client?.manager_allowance)} + ${managers.addon_blocks} block${managers.addon_blocks === 1 ? "" : "s"} of ${MANAGER_BLOCK_SIZE}).`
        : `Participants used (${participants.used}) exceed the allowance of ${participants.allowed} (base ${num(client?.participant_allowance)} + ${participants.addon_blocks} block${participants.addon_blocks === 1 ? "" : "s"} of ${PARTICIPANT_BLOCK_SIZE}).`;
    if (managers.over > 0 && participants.over > 0) {
      overageReason = `${overageReason} Participants are also ${participants.over} over their allowance of ${participants.allowed}.`;
    }
  }

  const allowanceSet = managers.allowance_set || participants.allowance_set;

  return {
    client_id: client?.id || null,
    package: client?.package || "unknown",
    enforcement_mode: client?.enforcement_mode || "warn",
    managers,
    participants,
    overage,
    overage_reason: overageReason,
    allowance_set: allowanceSet,
    counts: {
      users: tenantUsers.length,
      roster: rosterRows.length,
      roster_only: rosterOnly,
    },
    rule: ALLOWANCE_RULE,
  };
}