/**
 * successionPayloadCanonical — deterministic payload canonicalization.
 *
 * Produces a stable SHA-256 hash for operation payloads so retries can be
 * validated: same operation_id + same payload_hash = legitimate retry;
 * same operation_id + different payload_hash = rejected.
 *
 * Canonicalization rules:
 *   - Object keys sorted recursively (ascending)
 *   - undefined values omitted
 *   - numbers normalized (no -0, NaN → null)
 *   - arrays preserve order
 *   - strings UTF-8 encoded
 */

export function canonicalize(value: any): string {
  if (value === undefined) return "null";
  if (value === null) return "null";
  if (typeof value === "number") {
    if (Number.isNaN(value) || !Number.isFinite(value)) return "null";
    return Object.is(value, -0) ? "0" : String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const parts = keys
      .filter((k) => value[k] !== undefined)
      .map((k) => JSON.stringify(k) + ":" + canonicalize(value[k]));
    return "{" + parts.join(",") + "}";
  }
  return "null";
}

export async function computePayloadHash(value: any): Promise<string> {
  const canonical = canonicalize(value);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Deterministic event_key for at-least-once audit deduplication.
 * Same logical action across retries produces the same key.
 */
export function computeEventKey(parts: Record<string, any>): string {
  return canonicalize(parts);
}