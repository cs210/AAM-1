/**
 * Wrapped / year-in-review: taste profile and stats derived from follows & check-ins.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

/**
 * Taste profiles (Wrapped): one per museum category. Shown on profile + Wrapped.
 * - art → Picasso   (classic & fine art)
 * - science → Curie (science & natural history)
 * - history → Herodotus (history museums)
 * - contemporary → Warhol (modern & contemporary art)
 * - culture → Explorer (cultural & identity museums)
 */
export const TASTE_PROFILES: Record<string, string> = {
  art: "Picasso",
  science: "Curie",
  history: "Herodotus",
  contemporary: "Warhol",
  culture: "Explorer",
} as const;

const CATEGORIES = Object.keys(TASTE_PROFILES);

/**
 * Get the current user's taste profile based on the majority category of museums they follow.
 * Returns { category, profileName } or null if they follow no museums (or no recognized category).
 */
export const getTasteProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (follows.length === 0) return null;

    const museums = await Promise.all(
      follows.map((f) => ctx.db.get(f.museumId))
    );
    // Normalize each museum's category to one of our 5 types (unknown → culture)
    const normalized = museums
      .filter((m): m is NonNullable<typeof m> => m != null)
      .map((m) => {
        const raw = (m.category || "").trim().toLowerCase();
        return CATEGORIES.includes(raw) ? raw : "culture";
      });

    if (normalized.length === 0) return null;

    const countByCategory: Record<string, number> = {};
    for (const c of CATEGORIES) countByCategory[c] = 0;
    for (const c of normalized) {
      countByCategory[c] = (countByCategory[c] ?? 0) + 1;
    }

    // Majority category (tie-break: first in CATEGORIES order)
    let bestCategory = CATEGORIES[0];
    let bestCount = countByCategory[bestCategory] ?? 0;
    for (const cat of CATEGORIES) {
      const n = countByCategory[cat] ?? 0;
      if (n > bestCount) {
        bestCount = n;
        bestCategory = cat;
      }
    }

    const profileName = TASTE_PROFILES[bestCategory];
    return profileName
      ? { category: bestCategory, profileName }
      : null;
  },
});

/**
 * Get taste profile for any user (for displaying on their profile to others).
 * Same logic as getTasteProfile but by userId.
 */
export const getTasteProfileForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (follows.length === 0) return null;

    const museums = await Promise.all(
      follows.map((f) => ctx.db.get(f.museumId))
    );
    const normalized = museums
      .filter((m): m is NonNullable<typeof m> => m != null)
      .map((m) => {
        const raw = (m.category || "").trim().toLowerCase();
        return CATEGORIES.includes(raw) ? raw : "culture";
      });

    if (normalized.length === 0) return null;

    const countByCategory: Record<string, number> = {};
    for (const c of CATEGORIES) countByCategory[c] = 0;
    for (const c of normalized) {
      countByCategory[c] = (countByCategory[c] ?? 0) + 1;
    }

    let bestCategory = CATEGORIES[0];
    let bestCount = countByCategory[bestCategory] ?? 0;
    for (const cat of CATEGORIES) {
      const n = countByCategory[cat] ?? 0;
      if (n > bestCount) {
        bestCount = n;
        bestCategory = cat;
      }
    }

    const profileName = TASTE_PROFILES[bestCategory];
    return profileName
      ? { category: bestCategory, profileName }
      : null;
  },
});
