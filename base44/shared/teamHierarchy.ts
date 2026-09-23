/**
 * Efficient in-memory reporting-tree helpers.
 *
 * Both functions operate on a single User.list() result so callers avoid the
 * N+1 recursion that a per-level fetch would require.
 */

/**
 * Build the full reporting tree under a manager, walking the `manager_email`
 * field (BFS). Returns all descendants (excluding the root manager), deduped.
 * Caps at maxDepth levels to prevent runaway cycles in malformed hierarchies.
 */
export function buildReportingTree(allUsers, managerEmail, maxDepth = 10) {
  const byManager = new Map();
  for (const u of allUsers) {
    const mgr = u.manager_email;
    if (!mgr) continue;
    if (!byManager.has(mgr)) byManager.set(mgr, []);
    byManager.get(mgr).push(u);
  }

  const seen = new Set([managerEmail]);
  const result = [];
  let frontier = [managerEmail];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next = [];
    for (const mgr of frontier) {
      const reports = byManager.get(mgr) || [];
      for (const r of reports) {
        if (seen.has(r.email)) continue;
        seen.add(r.email);
        result.push(r);
        next.push(r.email);
      }
    }
    frontier = next;
  }
  return result;
}

/**
 * Derive a manager's direct reports from a single user list, unioning the
 * `subordinate_emails` array with users whose `manager_email` matches.
 */
export function deriveDirectReports(allUsers, managerEmail) {
  const managerUser = allUsers.find((u) => u.email === managerEmail);
  const subEmails = (managerUser?.subordinate_emails || []).filter(Boolean);
  const result = [];
  const seen = new Set();

  for (const u of allUsers) {
    if (u.manager_email === managerEmail && u.email !== managerEmail && !seen.has(u.email)) {
      seen.add(u.email);
      result.push(u);
    }
  }
  for (const e of subEmails) {
    if (seen.has(e)) continue;
    const u = allUsers.find((x) => x.email === e);
    if (u) {
      seen.add(e);
      result.push(u);
    }
  }
  return result;
}