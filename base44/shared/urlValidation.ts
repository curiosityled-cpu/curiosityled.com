/**
 * Validates a URL to prevent Server-Side Request Forgery (SSRF).
 * Only http/https schemes are allowed; internal/private hosts are blocked.
 * Reused across backend functions that fetch attacker-supplied URLs.
 */
export function validateExternalUrl(fileUrl: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(fileUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only http/https URLs are allowed' };
    }
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '0.0.0.0' || host === '169.254.169.254' ||
        host.endsWith('.internal') || host.endsWith('.local')) {
      return { valid: false, error: 'Internal hosts are not allowed' };
    }
    const ip = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ip) {
      const [a, b] = [Number(ip[1]), Number(ip[2])];
      if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
          (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
        return { valid: false, error: 'Private or internal IP addresses are not allowed' };
      }
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Invalid URL: ${e.message}` };
  }
}

/**
 * Constant-time string comparison to prevent timing attacks on shared secrets.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validates that the request carries the INTERNAL_FUNCTION_SECRET,
 * used for automation-to-automation and system-to-function calls.
 */
export function isInternalCall(req: Request): boolean {
  const secret = Deno.env.get('INTERNAL_FUNCTION_SECRET');
  if (!secret) return false;
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  return constantTimeEqual(token, secret);
}