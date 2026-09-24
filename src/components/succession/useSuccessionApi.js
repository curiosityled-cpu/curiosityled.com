import { useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * useSuccessionApi — shared hook for invoking succession backend functions.
 *
 * All reads and writes go through approved backend functions via
 * base44.functions.invoke(). No direct entity writes are performed.
 * Errors are mapped to generic user-friendly messages — no stack traces
 * or internal IDs are surfaced to the user.
 */
export function useSuccessionApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadingRef = useRef(false);

  const invoke = useCallback(async (functionName, payload) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { data } = await base44.functions.invoke(functionName, payload || {});
      return data;
    } catch (err) {
      const rawMsg =
        err?.response?.data?.error ||
        err?.data?.error ||
        err?.message ||
        "";

      // Map known server errors to generic user-facing messages.
      // Never expose whether a cross-tenant record exists.
      let friendly;
      if (/Tenant resolution/i.test(rawMsg)) {
        friendly = "Unable to verify your organization. Please contact your administrator.";
      } else if (/Missing permission/i.test(rawMsg)) {
        friendly = "You do not have permission to perform this action.";
      } else if (/Cross-tenant|no active grant|grant feature disabled/i.test(rawMsg)) {
        friendly = "Access denied. This action requires additional authorization.";
      } else if (/not found/i.test(rawMsg)) {
        friendly = "The requested record could not be found.";
      } else if (/lock|LOCK_HELD|423/i.test(rawMsg)) {
        friendly = "This record is currently locked by another operation. Please try again shortly.";
      } else if (/payload mismatch|409/i.test(rawMsg)) {
        friendly = "A conflict occurred. The record may have been modified. Please refresh and try again.";
      } else if (/validation|400/i.test(rawMsg)) {
        friendly = "Some required information is missing or invalid. Please check your inputs.";
      } else {
        friendly = "Something went wrong. Please try again.";
      }
      setError(friendly);
      throw new Error(friendly);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { invoke, loading, error, clearError };
}