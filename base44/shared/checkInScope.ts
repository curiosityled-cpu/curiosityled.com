/**
 * Reporting-tree helpers shared by the check-in insight functions.
 *
 * Users carry their reporting line on `data.manager_email` (falling back to a
 * flat `manager_email`). Orgs that also maintain `data.subordinate_emails` get
 * those seeded into the tree, so a listed report is reachable even when their
 * manager_email is not set yet.
 *
 * One User.list() result per call, no per-level fetching.
 */

export const normalizeEmail = (email?: string): string => String(email || "").trim().toLowerCase();

const emailOf = (user: any): string => String(user?.email || "");

const managerOf = (user: any): string =>
  normalizeEmail(user?.data?.manager_email || user?.manager_email || "");

/** The `subordinate_emails` seed list an org may keep on the user record. */
export function subordinateSeeds(user: any): string[] {
  const seeds = user?.data?.subordinate_emails || user?.subordinate_emails || [];
  return Array.isArray(seeds) ? seeds.filter(Boolean) : [];
}

export function createReportingTree(allUsers: any[], nameLookup: (email: string) => string) {
  const index = new Map<string, any[]>();
  for (const u of allUsers || []) {
    if (!emailOf(u)) continue;
    const manager = managerOf(u);
    if (!manager) continue;
    if (!index.has(manager)) index.set(manager, []);
    index.get(manager).push(u);
  }

  const directReports = (email: string): any[] => index.get(normalizeEmail(email)) || [];

  const sizeCache = new Map<string, number>();
  const subtreeSize = (email: string): number => {
    const key = normalizeEmail(email);
    if (sizeCache.has(key)) return sizeCache.get(key);
    sizeCache.set(key, 0); // guards against reporting cycles
    let total = 0;
    for (const report of directReports(key)) total += 1 + subtreeSize(emailOf(report));
    sizeCache.set(key, total);
    return total;
  };

  /** Everyone below `email` (a leader's vertical). Seeds are extra known reports. */
  const resolveSubtree = (email: string, extraSeeds: string[] = []) => {
    const root = normalizeEmail(email);
    const seen = new Set<string>([root]);
    const queue: string[] = [root];
    const members: { email: string; name: string }[] = [];

    for (const raw of extraSeeds || []) {
      const seed = normalizeEmail(raw);
      if (!seed || seen.has(seed)) continue;
      seen.add(seed);
      members.push({ email: seed, name: nameLookup(seed) });
      queue.push(seed);
    }

    while (queue.length > 0) {
      const current = queue.shift();
      for (const report of directReports(current)) {
        const reportEmail = emailOf(report);
        const key = normalizeEmail(reportEmail);
        if (seen.has(key)) continue;
        seen.add(key);
        members.push({ email: reportEmail, name: nameLookup(reportEmail) });
        queue.push(key);
      }
    }

    return members;
  };

  /** The user plus everyone below them (a leader's whole vertical). */
  const emailsWithSubtree = (email: string, extraSeeds: string[] = []): string[] => {
    const emails = [email, ...resolveSubtree(email, extraSeeds).map((m) => m.email)];
    const unique = new Map<string, string>();
    for (const e of emails) {
      const key = normalizeEmail(e);
      if (key && !unique.has(key)) unique.set(key, e);
    }
    return [...unique.values()];
  };

  const leaderEntry = (email: string, viewerEmail: string) => ({
    email,
    name: nameLookup(email),
    is_self: normalizeEmail(email) === normalizeEmail(viewerEmail),
    direct_reports: directReports(email).length,
    subtree_size: subtreeSize(email),
  });

  return { directReports, subtreeSize, resolveSubtree, emailsWithSubtree, leaderEntry };
}