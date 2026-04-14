/* src/lib/utils/warn-and-return.ts */

/* oxlint-disable no-console
 *
 * Route loaders and client-side refresh loops deliberately tolerate
 * dependency failures (missing KV entries, transient fetch errors) by
 * falling back to a safe default. Before this helper those catches
 * were `.catch(() => null)` — silent and invisible in production.
 * Logging via console.warn surfaces the underlying failure in
 * Wrangler tail / browser devtools without promoting it to a crash. */

/**
 * Build a `.catch(...)` handler that logs the error with a stable label
 * and returns a fallback value. Use sparingly: only where a missing or
 * broken resource is genuinely non-fatal for the caller. If the caller
 * cannot produce a meaningful fallback, let the error propagate so the
 * error boundary can show a real message instead.
 *
 * @param label short, stable context tag (e.g. `home:post-index`) so
 * log lines can be grepped across occurrences
 * @param fallback value returned when the upstream promise rejects
 */
export function warnAndReturn<T>(
  label: string,
  fallback: T,
): (error: unknown) => T {
  return (error) => {
    console.warn(`[${label}]`, error)
    return fallback
  }
}
