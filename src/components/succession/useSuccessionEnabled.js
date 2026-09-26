import { useClient } from "@/components/contexts/ClientContext";

/**
 * useSuccessionEnabled — reads the tenant's Succession module activation flag.
 *
 * Returns { enabled, loading }:
 *   enabled — true only when Client.settings.succession_enabled === true
 *   loading — true while the client context is still being fetched
 *
 * The backend authorization gate (authorizeSuccessionAction) enforces the
 * same flag server-side, so this hook is a UX guard (hide nav, show a
 * "not activated" message) — not a security boundary.
 */
export function useSuccessionEnabled() {
  const { client, loading } = useClient();
  return {
    enabled: Boolean(client?.settings?.succession_enabled),
    loading,
  };
}