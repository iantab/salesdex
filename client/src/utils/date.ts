/**
 * Shared date formatting utilities.
 */

/** "January", "February", … */
export function monthName(month: number): string {
  return new Date(2000, month - 1).toLocaleString("en-US", { month: "long" });
}

/** "Jan", "Feb", … */
export function monthAbbr(month: number): string {
  return new Date(2000, month - 1).toLocaleString("en-US", { month: "short" });
}

/** Formats an ISO date string as a long US date, or returns null. */
export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
