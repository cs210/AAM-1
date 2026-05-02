/** Local calendar YYYY-MM-DD (device timezone), aligned with native date pickers */
export function formatLocalYyyyMmDd(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** UTC calendar key for legacy check-ins without visitCalendarDate */
export function utcYyyyMmDd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function checkInCalendarKey(row: {
  visitCalendarDate?: string;
  visitDate?: number;
  createdAt: number;
}): string {
  return row.visitCalendarDate ?? utcYyyyMmDd(row.visitDate ?? row.createdAt);
}
