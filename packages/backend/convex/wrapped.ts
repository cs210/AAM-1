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

/**
 * Compute majority category from a list of museum docs (same logic as getTasteProfile).
 */
function majorityCategory(museums: { category?: string }[]): string | null {
  const normalized = museums
    .filter((m) => m != null)
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
  return bestCategory;
}

/**
 * Compatibility matcher: check-ins from other users who share your taste profile (e.g. Picasso ↔ Picasso).
 * Used on Explore "For You" to show posts from people with the same majority museum category.
 */
export const getCompatibleCheckIns = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    // 1) My taste profile category
    const myProfile = await ctx.db
      .query("userFollows")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const myMuseums = await Promise.all(
      myProfile.map((f) => ctx.db.get(f.museumId))
    );
    const myCategory = majorityCategory(
      myMuseums.filter((m): m is NonNullable<typeof m> => m != null)
    );
    if (myCategory == null) return [];

    // 2) All userFollows grouped by userId; unique museum IDs
    const allFollows = await ctx.db.query("userFollows").collect();
    const museumIds = [...new Set(allFollows.map((f) => f.museumId))];
    const museumDocs = await Promise.all(museumIds.map((id) => ctx.db.get(id)));
    const museumCategory = new Map(
      museumDocs
        .filter((m): m is NonNullable<typeof m> => m != null)
        .map((m) => [m._id, (m.category || "").trim().toLowerCase()])
    );

    // 3) For each userId, compute majority category; keep those matching myCategory
    const followsByUser = new Map<string, typeof allFollows>();
    for (const f of allFollows) {
      if (!followsByUser.has(f.userId)) followsByUser.set(f.userId, []);
      followsByUser.get(f.userId)!.push(f);
    }
    const compatibleUserIds = new Set<string>();
    for (const [userId, follows] of followsByUser) {
      if (userId === user._id) continue;
      const categories = follows
        .map((f) => {
          const raw = museumCategory.get(f.museumId) ?? "";
          return CATEGORIES.includes(raw) ? raw : "culture";
        })
        .filter(Boolean);
      if (categories.length === 0) continue;
      const count: Record<string, number> = {};
      for (const c of CATEGORIES) count[c] = 0;
      for (const c of categories) count[c] = (count[c] ?? 0) + 1;
      let best = CATEGORIES[0];
      let bestN = count[best] ?? 0;
      for (const cat of CATEGORIES) {
        const n = count[cat] ?? 0;
        if (n > bestN) {
          bestN = n;
          best = cat;
        }
      }
      if (best === myCategory) compatibleUserIds.add(userId);
    }

    if (compatibleUserIds.size === 0) return [];

    // 4) Check-ins from compatible users (museum only), sorted by recent
    const allCheckIns = await ctx.db.query("checkIns").collect();
    const compatible = allCheckIns
      .filter(
        (ci) =>
          ci.contentType === "museum" &&
          compatibleUserIds.has(ci.userId)
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);

    // 5) Enrich like getFollowingCheckins
    const enriched = await Promise.all(
      compatible.map(async (ci) => {
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", ci.userId))
          .first();
        const content = await ctx.db.get(ci.contentId as any);
        const contentName =
          (content && "name" in content ? content.name : "Unknown") ?? "Unknown";
        return {
          _id: ci._id,
          userId: ci.userId,
          userName: userProfile?.name ?? "Unknown User",
          userImage: userProfile?.imageUrl,
          contentType: ci.contentType,
          contentId: ci.contentId,
          contentName: String(contentName),
          rating: ci.rating,
          review: ci.review,
          createdAt: ci.createdAt,
          editedAt: ci.editedAt,
        };
      })
    );

    return enriched;
  },
});
