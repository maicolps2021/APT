
// lib/csv.ts

/**
 * Utility functions for handling CSV data.
 * This is a standalone module and is not currently integrated into the export flow,
 * which uses a self-contained function in `lib/export.ts`.
 */

/**
 * Escapes a single value for CSV to handle commas, quotes, and newlines.
 * @param value The value to escape.
 * @returns The escaped string, ready for CSV.
 */
const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    const stringValue = String(value);
    if (/[",\n\r]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

/**
 * Converts an array of objects into a CSV-formatted string.
 * @param data An array of objects.
 * @param headers An array of strings representing the headers for the CSV file. These should correspond to keys in the data objects.
 * @returns A string in CSV format.
 */
export function arrayToCsv(data: Record<string, any>[], headers: string[]): string {
    if (!data || data.length === 0) {
        return '';
    }

    const headerRow = headers.join(',');
    const dataRows = data.map(row =>
        headers.map(header => escapeCsvValue(row[header])).join(',')
    );

    return [headerRow, ...dataRows].join('\n');
}
