import type { Href } from 'expo-router';

/** Full-screen user profile (no tab bar). */
export function userProfileHref(userId: string): Href {
  return `/user/${encodeURIComponent(userId)}` as Href;
}
