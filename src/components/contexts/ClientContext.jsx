import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export const ClientContext = createContext(null);

const EMPTY_STATS = {
  total_users: 0,
  total_goals: 0,
  total_assessments: 0,
  total_learning_assigned: 0,
};

const selectionKey = (user) =>
  `active_client_id_${user?.id || user?.email || 'anon'}`;

export const ClientProvider = ({ children }) => {
  // Anchored to the app-level auth context, which is mounted for every route.
  // The legacy provider is only present on screens that opt into it, and those
  // elsewhere would silently resolve to an empty client.
  const { user, loading: authLoadingFromProvider, isLoadingAuth } = useAuth();
  const authLoading = authLoadingFromProvider ?? isLoadingAuth;
  const [client, setClient] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  /**
   * The organisation this screen is scoped to.
   *
   * Decided on the server (base44/shared/tenantContext.ts): this module only
   * ever *asks*. For a member that is their own organisation; for a partner
   * administrator it is the one they picked from their portfolio, and the server
   * refuses any id that is not in their authorized list.
   */
  const loadClientContext = useCallback(
    async ({ force = false } = {}) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const stored = sessionStorage.getItem(selectionKey(user));
        const cacheKey = `client_context_${user.id || user.email}_${stored || 'auto'}`;
        if (force) {
          sessionStorage.removeItem(cacheKey);
          sessionStorage.removeItem(`${cacheKey}_timestamp`);
        }
        const cached = force ? null : sessionStorage.getItem(cacheKey);
        const cacheTimestamp = force ? null : sessionStorage.getItem(`${cacheKey}_timestamp`);

        if (cached && cacheTimestamp) {
          const age = Date.now() - parseInt(cacheTimestamp, 10);
          if (age < 5 * 60 * 1000) {
            const cachedData = JSON.parse(cached);
            // A cached null client is treated as a miss — it was likely caused
            // by a transient fetch error and should not block the UI for 5 min.
            if (cachedData.client) {
              setClient(cachedData.client);
              setTenant(cachedData.tenant || null);
              setStats(cachedData.stats || EMPTY_STATS);
              setLoading(false);
              return;
            }
          }
        }

        const response = await base44.functions.invoke('getClientContext', {
          client_id: stored || null,
        });

        if (response?.data?.success !== false) {
          const responseData = response.data?.data || response.data;
          const resolvedTenant = responseData.tenant || null;
          const contextData = {
            client: responseData.client || null,
            tenant: resolvedTenant,
            stats: responseData.stats || EMPTY_STATS,
          };

          // A preference the server refused is no longer a valid selection.
          if (stored && resolvedTenant?.requested_client_rejected) {
            sessionStorage.removeItem(selectionKey(user));
          }

          setClient(contextData.client);
          setTenant(resolvedTenant);
          setStats(contextData.stats);

          // Only cache non-null clients — caching a null (from a transient
          // rate-limit or fetch error) would hide the client for 5 minutes.
          if (contextData.client) {
            sessionStorage.setItem(cacheKey, JSON.stringify(contextData));
            sessionStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
          }
        } else {
          setClient(null);
          setStats(EMPTY_STATS);
        }
      } catch (error) {
        console.error('Error loading client context:', error);
        setClient(null);
        setStats(EMPTY_STATS);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!authLoading && user) {
      loadClientContext();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, loadClientContext]);

  /** Switch the active organisation. Ignored by the server if not authorized. */
  const selectClient = useCallback(
    async (clientId) => {
      if (!clientId || clientId === client?.id) return;
      setSwitching(true);
      try {
        sessionStorage.setItem(selectionKey(user), clientId);
        // Drop every cached context for this person: they are now a different
        // organisation and the previous client's counts must not be reused.
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith(`client_context_${user?.id || user?.email}`))
          .forEach((k) => sessionStorage.removeItem(k));
        setLoading(true);
        await loadClientContext({ force: true });
        // Counts and screens elsewhere still belong to the previous tenant.
        window.dispatchEvent(new CustomEvent('client-context-changed'));
      } finally {
        setSwitching(false);
      }
    },
    [client?.id, user, loadClientContext]
  );

  const refreshContext = useCallback(() => loadClientContext({ force: true }), [loadClientContext]);

  const value = useMemo(
    () => ({
      client,
      activeClientId: client?.id || null,
      // Resolved on the server for a principal who spans clients and has made no
      // selection. Screens use it instead of reading a membership field themselves.
      homeClientId: tenant?.home_client_id || null,
      tenant,
      stats,
      loading,
      switching,
      // Everything below comes from the server resolver, not from user fields.
      authorizedClientIds: tenant?.authorized_client_ids || [],
      authorizedClients: tenant?.authorized_clients || [],
      needsSelection: !!tenant?.needs_selection,
      canSelectClient: !!tenant?.can_select_client,
      isPlatform: !!tenant?.is_platform,
      blockedReason: tenant?.blocked_reason || null,
      selectClient,
      refreshContext,
    }),
    [client, tenant, stats, loading, switching, selectClient, refreshContext]
  );

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
};

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    // Return a safe default instead of throwing so components degrade
    // gracefully to a loading state when the provider is not in the tree.
    return {
      client: null,
      activeClientId: null,
      homeClientId: null,
      tenant: null,
      stats: EMPTY_STATS,
      loading: true,
      switching: false,
      authorizedClientIds: [],
      authorizedClients: [],
      needsSelection: false,
      canSelectClient: false,
      isPlatform: false,
      blockedReason: null,
      selectClient: async () => {},
      refreshContext: async () => {},
    };
  }
  return context;
};

/**
 * The one value a screen should scope its data by.
 *
 * The selected client when there is one, otherwise the server-resolved home
 * client. Both come from base44/shared/tenantContext.ts; neither is read from a
 * user field, so a screen can no longer stamp a record with a stale membership.
 * Returns null only when the server resolved no client at all, and callers must
 * not treat that as "all organisations".
 */
export const useActiveClientId = () => {
  const { activeClientId, homeClientId } = useClient();
  return activeClientId || homeClientId;
};