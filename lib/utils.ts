/**
 * Generates UTC ISO strings for the start and end of a given date.
 * @param date The date for which to generate the range.
 * @returns An object with startISO and endISO properties.
 */
export function getDayRange(date: Date): { startISO: string; endISO: string } {
  // Create a new date object to avoid modifying the original
  const start = new Date(date);
  // Set the time to the beginning of the day in UTC
  start.setUTCHours(0, 0, 0, 0);

  // Create a new date for the end, starting from the beginning of the day
  const end = new Date(start);
  // Add one full day
  end.setUTCDate(start.getUTCDate() + 1);

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}
