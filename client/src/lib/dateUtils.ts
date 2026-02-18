import { parseISO } from "date-fns";

/**
 * Parse a date string from the database as a local date.
 * 
 * The database stores dates as UTC midnight (e.g., "2026-02-28T00:00:00.000Z").
 * When JavaScript parses this, it converts to local time, which can show the
 * previous day in US timezones (e.g., Feb 27 instead of Feb 28).
 * 
 * This function extracts the date components and creates a local date,
 * preserving the intended date regardless of timezone.
 */
export function parseLocalDate(dateString: string | Date): Date {
  if (dateString instanceof Date) {
    // If it's already a Date, extract the UTC date components to create a local date
    return new Date(
      dateString.getUTCFullYear(),
      dateString.getUTCMonth(),
      dateString.getUTCDate(),
      12, // Use noon to avoid any DST edge cases
      0,
      0
    );
  }
  
  // Parse the ISO string and extract UTC components
  const parsed = parseISO(dateString);
  return new Date(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
    12, // Use noon to avoid any DST edge cases
    0,
    0
  );
}
