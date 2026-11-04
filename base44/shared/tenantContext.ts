/**
 * Tenant context — the single trusted answer to "which client is this request for?"
 *
 * Before this module the answer came from two fields that were allowed to
 * disagree: `user.client_id` (read by getClientContext and the browser) and
 * `user.data.client_id` (read by the entity access rules). A user could
 * therefore be shown one client's screens while their data was scoped to
 * another. Every server-side path that needs a tenant resolves it here instead,
 * and the browser never decides it.
 *
 * The membership model, as confirmed by the product owner:
 *
 *   member      one person, exactly one client. Their client is their identity;
 *               they cannot change it from the browser.
 *   oversight   a partner administrator, consultant or portfolio company that
 *               acts across a declared list of clients (partner_client_ids).
 *               They are not a member of each one, so their active client must
 *               be *selected* — and the selection is validated against the
 *               declared list on every request.
 *   platform    Platform Admin (and the app's built-in admin). Spans every
 *               client and may act at platform level, which is the only way to
 *               reach platform-wide data.
 *   none        no client and not a platform principal → blocked. Platform-wide
 *               and client data are both refused rather than guessed at.
 */

export const PLATFORM_ROLE = "Platform Admin";
export const OVERSIGHT_ROLE = "Partner Business Administrator";

/** The client fields that are safe to send to any member of that client. */
function projectClient(client) {
  if (!client) return null;
  return {
    id: client.id,
    name: client.name,
    slug: client.slug,
    type: client.type,
    status: client.status,
    business_timezone: client.business_timezone,
    settings: client.settings || {},
    branding_config_id: client.branding_config_id,
    custom_domain: client.custom_domain,
    onboarding_status: client.onboarding_status,
    selected_competency_ids: client.selected_competency_ids || [],
    competencies_configured: !!client.competencies_configured,
  };
}

function emptyContext() {
  return {
    email: null,
    app_role: null,
    membership: "none",
    client_id: null,
    client: null,
    client_status: null,
    authorized_client_ids: [],
    all_clients: false,
    is_platform: false,
    can_select_client: false,
    needs_selection: false,
    requested_client_id: null,
    requested_client_rejected: false,
    blocked: false,
    blocked_reason: null,
    conflicts: [],
  };
}

export function readAppRole(user) {
  return user?.app_role || user?.data?.app_role || null;
}

/**
 * Platform level is the *app* role, not the built-in owner flag. A built-in
 * `admin` who carries a client (ceo@… is a built-in admin with app role
 * User Level 1) is that client's member; treating the flag as platform would
 * widen them to every tenant without anyone asking for it.
 */
export function isPlatformPrincipal(user) {
  return readAppRole(user) === PLATFORM_ROLE;
}

export function isOversightPrincipal(user) {
  return readAppRole(user) === OVERSIGHT_ROLE;
}

/** The membership client, whichever of the two historical fields holds it. */
export function membershipClientId(user) {
  return user?.data?.client_id || user?.client_id || null;
}

function declaredPartnerClientIds(user) {
  const list = user?.data?.partner_client_ids;
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

async function fetchClient(base44, id) {
  if (!id) return null;
  const found = await base44.asServiceRole.entities.Client
    .filter({ id })
    .catch(() => []);
  const rows = Array.isArray(found) ? found : (found?.items || []);
  return rows[0] || null;
}

/** Only the declared ids that actually resolve to a client record. */
async function existingClientIds(base44, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  const found = await base44.asServiceRole.entities.Client
    .filter({ id: { $in: unique } })
    .catch(() => []);
  const rows = Array.isArray(found) ? found : (found?.items || []);
  return rows.map((c) => c.id);
}

function applyActiveClient(ctx, client) {
  ctx.client = projectClient(client);
  ctx.client_id = client.id;
  ctx.client_status = client.status || null;
  return ctx;
}

/**
 * Resolve the tenant for a request.
 *
 * `requestedClientId` is a *hint* from the caller (a partner administrator
 * choosing a portfolio company). It is only honoured when it appears in the
 * caller's authorized list — a member can never move themselves to another
 * tenant by sending it.
 */
export async function resolveTenantContext(base44, user, requestedClientId = null) {
  const ctx = emptyContext();
  ctx.email = user?.email || null;
  ctx.app_role = readAppRole(user);
  ctx.requested_client_id = requestedClientId || null;

  if (!ctx.email) {
    ctx.blocked = true;
    ctx.blocked_reason = "NO_SESSION";
    return ctx;
  }

  // ── Platform principals ────────────────────────────────────────────────────
  // They span every client, so nothing is out of scope; an explicit selection
  // is honoured when it names a real client, and no selection means "platform".
  if (isPlatformPrincipal(user)) {
    ctx.membership = "platform";
    ctx.is_platform = true;
    ctx.all_clients = true;
    ctx.can_select_client = true;
    if (requestedClientId) {
      const client = await fetchClient(base44, requestedClientId);
      if (client) {
        applyActiveClient(ctx, client);
      } else {
        ctx.requested_client_rejected = true;
      }
    }
    return ctx;
  }

  // ── Which membership id is authoritative ──────────────────────────────────
  // `user.data.client_id` is the field the entity rules already use, so it
  // wins. A disagreement with the legacy `user.client_id` is recorded rather
  // than hidden: silently choosing either one is how the two got out of step.
  const dataClientId = user?.data?.client_id || null;
  const legacyClientId = user?.client_id || null;
  if (dataClientId && legacyClientId && dataClientId !== legacyClientId) {
    ctx.conflicts.push({
      field: "client_id",
      kept_source: "data.client_id",
      kept_value: dataClientId,
      ignored_source: "client_id",
      ignored_value: legacyClientId,
    });
  }
  const membershipId = membershipClientId(user);

  // ── Oversight principals ──────────────────────────────────────────────────
  const declared = declaredPartnerClientIds(user);
  if (isOversightPrincipal(user) && (declared.length || membershipId)) {
    const authorized = await existingClientIds(
      base44,
      membershipId ? [...declared, membershipId] : declared
    );
    ctx.membership = "oversight";
    ctx.authorized_client_ids = authorized;
    ctx.can_select_client = true;

    if (!authorized.length) {
      ctx.blocked = true;
      ctx.blocked_reason = "TENANT_NOT_ASSIGNED";
      return ctx;
    }

    if (requestedClientId) {
      if (authorized.includes(requestedClientId)) {
        const client = await fetchClient(base44, requestedClientId);
        if (client) return applyActiveClient(ctx, client);
      }
      ctx.requested_client_rejected = true;
    }

    // One client in the portfolio needs no choice; several do.
    if (authorized.length === 1) {
      const client = await fetchClient(base44, authorized[0]);
      if (client) return applyActiveClient(ctx, client);
      ctx.blocked = true;
      ctx.blocked_reason = "TENANT_NOT_FOUND";
      return ctx;
    }

    ctx.needs_selection = true;
    return ctx;
  }

  // ── Members ───────────────────────────────────────────────────────────────
  if (!dataClientId && !legacyClientId) {
    ctx.blocked = true;
    ctx.blocked_reason = "TENANT_NOT_ASSIGNED";
    return ctx;
  }

  // The authoritative field first, then the other one. Falling back instead of
  // blocking protects an account whose authoritative id was never written; the
  // fallback is recorded as a conflict so the drift stays visible.
  let client = await fetchClient(base44, dataClientId);
  if (!client && legacyClientId) {
    client = await fetchClient(base44, legacyClientId);
    if (client) {
      ctx.conflicts.push({
        field: "client_id",
        note: "data.client_id did not resolve to a client record; used client_id instead",
        kept_source: "client_id",
        kept_value: legacyClientId,
        ignored_source: "data.client_id",
        ignored_value: dataClientId,
      });
    }
  }

  if (!client) {
    ctx.blocked = true;
    ctx.blocked_reason = "TENANT_NOT_FOUND";
    return ctx;
  }

  // A member cannot switch tenant. A request that tries is refused, not obeyed.
  if (requestedClientId && requestedClientId !== client.id) {
    ctx.requested_client_rejected = true;
  }

  ctx.membership = "member";
  ctx.authorized_client_ids = [client.id];
  return applyActiveClient(ctx, client);
}

/**
 * Whether this context may act on the given client at all. Every function that
 * writes a client_id taken from request input calls this before writing.
 */
export function canActOnClient(ctx, clientId) {
  if (!ctx || ctx.blocked) return false;
  if (ctx.is_platform) return true;
  if (!clientId) return false;
  return (ctx.authorized_client_ids || []).includes(clientId);
}

/** The scope to apply to a query: the one field every tenant query filters by. */
export function tenantScope(ctx) {
  if (!ctx || !ctx.client_id) return null;
  return { client_id: ctx.client_id };
}

/**
 * The 403 a function returns when the tenant cannot be resolved. Callers get a
 * reason they can act on, and the request does no work.
 */
export function tenantBlockedResponse(ctx) {
  const reason = ctx?.blocked_reason || "TENANT_NOT_ASSIGNED";
  const message =
    reason === "NO_SESSION"
      ? "Sign in to continue."
      : reason === "TENANT_NOT_FOUND"
        ? "Your organization record could not be found."
        : "Your account is not yet assigned to an organization.";
  return Response.json(
    { success: false, error: reason, message },
    { status: 403 }
  );
}

/**
 * Put a person into a client — the only supported way to write a membership.
 *
 * Both fields are written in one update. Writing just one of them is what
 * produced two live accounts whose `client_id` named Go Flat Bridge while
 * `data.client_id` named HealthCo: the screens read one field and every access
 * rule reads the other, so a half-write is not a transfer at all. It leaves the
 * person in the tenant they were moved out of while showing them the new one.
 *
 * `data` is merged rather than replaced because it also carries app_role,
 * permissions, partner_client_ids and subordinate_emails — overwriting it would
 * take the person's role with it. Passing `null` removes the membership.
 */
export async function setUserClient(base44, userId, clientId) {
  const found = await base44.asServiceRole.entities.User.filter({ id: userId });
  const user = Array.isArray(found) ? found[0] : found?.items?.[0];
  if (!user) throw new Error(`User ${userId} not found`);

  const data = { ...(user.data || {}) };
  if (clientId) data.client_id = clientId;
  else delete data.client_id;

  await base44.asServiceRole.entities.User.update(userId, {
    client_id: clientId || null,
    data,
  });

  return { id: userId, email: user.email, client_id: clientId || null };
}