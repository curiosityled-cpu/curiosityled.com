import { useClient } from "@/components/contexts/ClientContext";

/**
 * useOrgLock — reads the current organization's lock state and locked values.
 * Returns helpers personal-settings components use to gate their controls.
 *
 * Usage:
 *   const { isLocked, getLockedValue, locks } = useOrgLock();
 *   if (isLocked('check_in_preset')) { ... render disabled with org value }
 */
export function useOrgLock() {
  const { client } = useClient();
  const locks = client?.settings?.locks || {};

  const isLocked = (key) => Boolean(locks[key]);

  // Resolve a dotted path (e.g. "check_in_config.preset_id") from client.settings
  const getLockedValue = (path) => {
    if (!client?.settings) return undefined;
    return path.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), client.settings);
  };

  return { locks, isLocked, getLockedValue, client };
}