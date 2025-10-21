import type { Lead } from '../types';

/**
 * Converts an array of Lead objects to a CSV string and triggers a download.
 * @param data The array of Lead objects to export.
 */
export function exportLeadsCsv(data: Lead[]): void {
  if (!data || data.length === 0) {
    alert("No data to export.");
    return;
  }

  // Define headers from the Lead type keys, providing a fallback for an empty array
  const headers = Object.keys(data[0] || {}) as (keyof Lead)[];
  
  // Function to safely handle values that might contain commas or quotes
  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    const stringValue = String(value);
    // If the value contains a comma, a quote, or a newline, wrap it in double quotes
    // and escape any existing double quotes by doubling them.
    if (/[",\n\r]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Convert data array to CSV string
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => escapeCsvValue(row[header])).join(',')
    )
  ].join('\n');

  // Create a Blob and trigger the download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  
  const today = new Date().toISOString().slice(0, 10);
  link.setAttribute("download", `leads_arenal_private_tours_${today}.csv`);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}