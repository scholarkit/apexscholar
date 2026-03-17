import { parseISO, isValid } from 'date-fns';

export function parseEntryDate(dateStr: string): Date {
  // Handle "YYYY-MM-DD to YYYY-MM-DD"
  if (dateStr.includes(' to ')) {
    const start = dateStr.split(' to ')[0];
    const date = new Date(start);
    if (isValid(date)) return date;
  }

  // Handle "YYYY-MM-DD" or ISO String
  const date = new Date(dateStr);
  if (isValid(date)) return date;

  // Fallback for safety
  return new Date();
}

export function displayEntryDate(dateStr: string): string {
  return dateStr; // For now, just return the string (it might be a range)
}
