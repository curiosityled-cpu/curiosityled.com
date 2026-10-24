/**
 * roleTargeting — client-defined role taxonomy and role-aware check-in targeting.
 *
 * The hybrid audience model lives here:
 *   - Structured tiers and tracks are client-defined and are the primary
 *     targeting values (stored as ids so renames propagate).
 *   - Every employee job title maps onto a tier + track.
 *   - A question may also target exact titles, which keeps working for people
 *     whose title is not yet mapped to a tier/track.
 *
 * The pure helpers are shared by every backend function that needs them; the
 * loaders take a service-role client so they can read User profiles and the
 * tenant's RoleTaxonomy regardless of RLS.
 */

export interface TaxonomyValue {
  id: string;
  label: string;
  order: number;
}

export interface TitleMapping {
  title: string;
  tier_id: string;
  track_id: string;
}

export interface RoleTaxonomy {
  tiers: TaxonomyValue[];
  tracks: TaxonomyValue[];
  title_mappings: TitleMapping[];
}

export interface RoleProfile {
  job_title: string;
  tier_id: string;
  tier_label: string;
  track_id: string;
  track_label: string;
  source: string;
}

export type ProfileField = "job_title" | "tier" | "track";

/** Source precedence: HRIS is authoritative; otherwise the latest roster wins. */
export const SOURCE_RANK: Record<string, number> = { manual: 0, roster: 1, hris: 2 };

export function emptyTaxonomy(): RoleTaxonomy {
  return { tiers: [], tracks: [], title_mappings: [] };
}

export function normalizeTitle(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function sourceRank(source: string | undefined | null): number {
  return SOURCE_RANK[String(source || "manual").toLowerCase()] ?? 0;
}

function sanitizeValues(raw: any): TaxonomyValue[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: TaxonomyValue[] = [];
  raw.forEach((v: any, idx: number) => {
    const id = String(v?.id || "").trim();
    const label = String(v?.label || "").trim();
    if (!id || !label || seen.has(id)) return;
    seen.add(id);
    out.push({ id, label, order: Number.isFinite(Number(v?.order)) ? Number(v.order) : idx });
  });
  return out.sort((a, b) => a.order - b.order);
}

/** Coerces a stored taxonomy record into an always-safe shape. */
export function sanitizeTaxonomy(raw: any): RoleTaxonomy {
  if (!raw) return emptyTaxonomy();
  const mappings = Array.isArray(raw.title_mappings)
    ? raw.title_mappings
        .map((m: any) => ({
          title: String(m?.title || "").trim(),
          tier_id: String(m?.tier_id || "").trim(),
          track_id: String(m?.track_id || "").trim(),
        }))
        .filter((m: TitleMapping) => m.title)
    : [];
  return {
    tiers: sanitizeValues(raw.tiers),
    tracks: sanitizeValues(raw.tracks),
    title_mappings: mappings,
  };
}

export function labelFor(values: TaxonomyValue[], id: string): string {
  if (!id) return "";
  const match = (values || []).find((v) => v.id === id);
  return match?.label || id;
}

export function findTitleMapping(taxonomy: RoleTaxonomy, title: string): TitleMapping | null {
  const wanted = normalizeTitle(title);
  if (!wanted) return null;
  return taxonomy.title_mappings.find((m) => normalizeTitle(m.title) === wanted) || null;
}

/** Fills tier/track from the title mapping when the profile doesn't carry them. */
export function deriveTierTrack(taxonomy: RoleTaxonomy, title: string): { tier_id: string; track_id: string } {
  const mapping = findTitleMapping(taxonomy, title);
  return { tier_id: mapping?.tier_id || "", track_id: mapping?.track_id || "" };
}

export function resolveRoleProfile(user: any, taxonomy: RoleTaxonomy): RoleProfile {
  const jobTitle = String(user?.current_role || user?.data?.current_role || "").trim();
  const storedTier = String(user?.role_tier || user?.data?.role_tier || "").trim();
  const storedTrack = String(user?.role_track || user?.data?.role_track || "").trim();
  const derived = deriveTierTrack(taxonomy, jobTitle);
  const tierId = storedTier || derived.tier_id;
  const trackId = storedTrack || derived.track_id;
  return {
    job_title: jobTitle,
    tier_id: tierId,
    tier_label: labelFor(taxonomy.tiers, tierId),
    track_id: trackId,
    track_label: labelFor(taxonomy.tracks, trackId),
    source: String(user?.profile_source || user?.data?.profile_source || "manual"),
  };
}

/**
 * Audience match. Tiers and tracks are ANDed (an empty side means "any"),
 * exact titles are an additional OR branch so unmapped people still receive
 * questions aimed at their title.
 */
export function matchesAudience(question: any, profile: RoleProfile): boolean {
  const tiers: string[] = Array.isArray(question?.target_tiers) ? question.target_tiers : [];
  const tracks: string[] = Array.isArray(question?.target_tracks) ? question.target_tracks : [];
  const titles: string[] = (Array.isArray(question?.target_titles) ? question.target_titles : [])
    .map((t: any) => normalizeTitle(t))
    .filter(Boolean);

  // No targeting at all means the question is for everyone — the baseline case
  // every existing tenant relies on.
  if (tiers.length === 0 && tracks.length === 0 && titles.length === 0) return true;

  const titleMatch = titles.length > 0 && titles.includes(normalizeTitle(profile.job_title));

  if (tiers.length === 0 && tracks.length === 0) return titleMatch;

  const tierOk = tiers.length === 0 || (!!profile.tier_id && tiers.includes(profile.tier_id));
  const trackOk = tracks.length === 0 || (!!profile.track_id && tracks.includes(profile.track_id));
  return (tierOk && trackOk) || titleMatch;
}

/** True when a question carries any role/audience targeting at all. */
export function hasAudienceTargeting(question: any): boolean {
  return (
    (Array.isArray(question?.target_tiers) && question.target_tiers.length > 0) ||
    (Array.isArray(question?.target_tracks) && question.target_tracks.length > 0) ||
    (Array.isArray(question?.target_titles) && question.target_titles.length > 0)
  );
}

/** Human-readable summary of who a question is for. */
export function questionAudienceLabel(question: any, taxonomy: RoleTaxonomy): string {
  const parts: string[] = [];
  const tiers = (Array.isArray(question?.target_tiers) ? question.target_tiers : []).map((id: string) =>
    labelFor(taxonomy.tiers, id)
  );
  const tracks = (Array.isArray(question?.target_tracks) ? question.target_tracks : []).map((id: string) =>
    labelFor(taxonomy.tracks, id)
  );
  const titles = (Array.isArray(question?.target_titles) ? question.target_titles : []).filter(Boolean);

  if (tiers.length) parts.push(tiers.join(", "));
  if (tracks.length) parts.push(tracks.join(", "));
  if (titles.length) parts.push(titles.join(", "));

  if (parts.length === 0) return "Everyone in the organisation";
  return parts.join(" · ");
}

/** Snapshot stored with a check-in so historical analytics keep their context. */
export function buildSnapshot(profile: RoleProfile) {
  const hasAny = !!(profile.job_title || profile.tier_id || profile.track_id);
  if (!hasAny) return null;
  return {
    job_title: profile.job_title || "",
    tier_id: profile.tier_id || "",
    tier_label: profile.tier_label || "",
    track_id: profile.track_id || "",
    track_label: profile.track_label || "",
    source: profile.source || "manual",
  };
}

/** Label for a stored snapshot (preferred over the live profile for history). */
export function snapshotAudienceLabel(snapshot: any): string {
  if (!snapshot) return "No role profile";
  const parts = [snapshot.tier_label, snapshot.track_label, snapshot.job_title].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No role profile";
}

// ── Service-role loaders ────────────────────────────────────────────────────

export async function loadTaxonomy(svc: any, clientId: string): Promise<RoleTaxonomy> {
  if (!clientId) return emptyTaxonomy();
  try {
    const res = await svc.entities.RoleTaxonomy.filter({ client_id: clientId }, "-updated_date", 1);
    const rows = Array.isArray(res) ? res : res?.items || [];
    return sanitizeTaxonomy(rows[0]);
  } catch {
    return emptyTaxonomy();
  }
}

export async function loadUsers(svc: any, limit = 2000): Promise<any[]> {
  try {
    const res = await svc.entities.User.list(null, limit);
    return Array.isArray(res) ? res : res?.items || [];
  } catch {
    return [];
  }
}

export function clientIdOf(user: any): string {
  return user?.data?.client_id || user?.client_id || "";
}

export function emailKey(user: any): string {
  return String(user?.email || "").toLowerCase();
}

export function profileSourceOf(user: any): string {
  return String(user?.profile_source || user?.data?.profile_source || "").toLowerCase();
}

/** Snapshot for a single person, resolved from their stored profile. */
export async function buildAudienceSnapshot(svc: any, email: string, clientId: string) {
  try {
    const taxonomy = await loadTaxonomy(svc, clientId);
    const users = await loadUsers(svc);
    const wanted = String(email || "").toLowerCase();
    const record = users.find((u) => emailKey(u) === wanted);
    if (!record) return null;
    return buildSnapshot(resolveRoleProfile(record, taxonomy));
  } catch {
    return null;
  }
}

// ── Admin helpers ───────────────────────────────────────────────────────────

export const TENANT_ADMIN_ROLES = [
  "admin",
  "Admin Level 1",
  "Admin Level 2",
  "Super Administrator",
  "Partner Business Administrator",
  "Platform Admin",
];

export function appRoleOf(user: any): string {
  return String(user?.app_role || user?.data?.app_role || user?.role || "");
}

export function isTenantAdmin(user: any): boolean {
  return TENANT_ADMIN_ROLES.includes(appRoleOf(user));
}

export function isPlatformAdmin(user: any): boolean {
  return appRoleOf(user) === "Platform Admin";
}

/** Accepts either a tier/track id or its label and returns the canonical id. */
export function resolveValueId(values: TaxonomyValue[], raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const byId = (values || []).find((v) => v.id === s);
  if (byId) return byId.id;
  const byLabel = (values || []).find((v) => normalizeTitle(v.label) === normalizeTitle(s));
  return byLabel ? byLabel.id : "";
}

/** Tenant people, keyed by lower-cased email, resolved with the service role. */
export async function loadTenantPeople(svc: any, clientId: string): Promise<any[]> {
  const all = await loadUsers(svc, 5000);
  return all.filter((u) => clientIdOf(u) === clientId && u?.email);
}

/** The current value of one profile field, read defensively. */
export function userFieldValue(user: any, field: ProfileField): string {
  if (field === "job_title") return String(user?.current_role || user?.data?.current_role || "").trim();
  if (field === "tier") return String(user?.role_tier || user?.data?.role_tier || "").trim();
  return String(user?.role_track || user?.data?.role_track || "").trim();
}