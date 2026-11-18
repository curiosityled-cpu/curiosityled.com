/**
 * Proxy-as-user detection for screens that keep their own local state.
 *
 * AuthContext replaces `user` with the proxied person, so any one-time setup
 * flow keyed off that person's records (Atreus tone onboarding, for example)
 * would otherwise fire for the admin who is proxying. The admin's choice is
 * recorded in localStorage by the proxy flow, so read it synchronously here.
 */
export function isImpersonating() {
  try {
    const parsed = JSON.parse(localStorage.getItem("impersonation") || "null");
    return !!parsed?.target_user_id;
  } catch {
    return false;
  }
}