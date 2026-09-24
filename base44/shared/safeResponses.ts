/**
 * Shared security helpers for backend functions.
 *
 * - escapeHtml: neutralizes user-supplied content before interpolation into
 *   outbound email HTML (prevents XSS / content spoofing).
 * - isValidActionUrl: restricts action links to relative app paths or https URLs.
 * - safeErrorResponse: returns a generic error to the client while logging
 *   full details (including stack) server-side only — prevents disclosure of
 *   internal paths, entity names, and SDK internals.
 * - getAppUrl: derives the canonical app redirect base from a server-side
 *   config value (APP_URL env var) rather than the attacker-controlled Origin
 *   header, preventing open-redirect abuse of Stripe success/cancel URLs.
 */

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isValidActionUrl(url: unknown): boolean {
  if (!url) return true; // optional field
  const trimmed = String(url).trim();
  if (!trimmed) return true;
  // Relative paths are safe (app-internal navigation)
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Build a client-safe error response. The full error (message + stack) is
 * logged server-side; only a generic message reaches the client.
 */
export function safeErrorResponse(
  error: unknown,
  defaultMessage = 'An unexpected error occurred',
  status = 500,
): Response {
  const err = error as Error;
  console.error('[safeErrorResponse]', defaultMessage, err?.message, err?.stack);
  return Response.json(
    { error: defaultMessage },
    { status },
  );
}

/**
 * Canonical app URL for redirect targets (Stripe success/cancel/return URLs).
 * Reads from the APP_URL env var so it can never be influenced by the
 * request's Origin header. Falls back to the published app URL.
 */
export function getAppUrl(): string {
  const configured = Deno.env.get('APP_URL');
  if (configured) return configured.replace(/\/$/, '');
  return 'https://curiosity-led.base44.app';
}