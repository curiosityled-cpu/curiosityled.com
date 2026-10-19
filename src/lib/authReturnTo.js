/**
 * Resolve a safe same-origin return path from the `returnTo` query param.
 *
 * A bare same-origin test (startsWith('/') && !startsWith('//')) is bypassable:
 * `/.//evil.com` normalizes to a protocol-relative redirect in some browsers.
 * This uses the URL constructor to resolve the path against the current origin
 * and verifies the origin matches, blocking any open-redirect trick.
 *
 * @returns {string} a safe same-origin path, or '/' as fallback
 */
export function safeReturnTo() {
  try {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');
    if (!returnTo) return '/';
    // Must start with a single '/' to be a same-origin relative path
    if (!returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.startsWith('/\\')) return '/';
    // Resolve and verify origin matches — blocks protocol-relative tricks
    const resolved = new URL(returnTo, window.location.origin);
    if (resolved.origin !== window.location.origin) return '/';
    return returnTo;
  } catch {
    return '/';
  }
}