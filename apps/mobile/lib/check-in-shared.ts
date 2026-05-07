import type { Id } from '@packages/backend/convex/_generated/dataModel';

/** Long edge cap before upload (matches museum check-in flow). */
export const CHECK_IN_MAX_UPLOAD_DIMENSION = 512;

export const CHECK_IN_DURATION_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '2 hours', value: 2 },
  { label: '3 hours', value: 3 },
  { label: '4 hours', value: 4 },
  { label: '5 hours', value: 5 },
] as const;

export type CheckInDurationHours = (typeof CHECK_IN_DURATION_OPTIONS)[number]['value'];

/** Pairs URLs with Convex `_storage` ids by index so removals persist correctly. */
export function zipCheckInImageUrlsAndIds(
  urls: string[] | undefined,
  ids: Id<'_storage'>[] | undefined
): { urls: string[]; ids: Id<'_storage'>[] } {
  const u = urls ?? [];
  const i = ids ?? [];
  const n = Math.min(u.length, i.length);
  return { urls: u.slice(0, n), ids: i.slice(0, n) };
}
