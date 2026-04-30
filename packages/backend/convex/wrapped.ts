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
 * Wrapped stats for the current user based on check-ins.
 * - Hours are accumulated from durationHours on museum check-ins.
 * - Cities explored are derived from museum locations on museum check-ins.
 * - Events attended count event check-ins.
 * - Art styles are computed via weighted scoring algorithm based on check-ins + follows.
 */
export const getWrappedStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const museumCheckIns = checkIns.filter((ci) => ci.contentType === "museum");
    const eventCheckIns = checkIns.filter((ci) => ci.contentType === "event");
    const totalHours = museumCheckIns.reduce(
      (sum, ci) => sum + (ci.durationHours ?? 0),
      0
    );

    const museumIds = new Set(
      museumCheckIns.map((ci) => String(ci.contentId))
    );

    const byMuseum = new Map<string, { hours: number; visits: number }>();
    const citiesExplored = new Set<string>();
    
    // Category scoring accumulator for weighted algorithm
    const categoryScores: Record<string, number> = {};
    for (const cat of CATEGORIES) categoryScores[cat] = 0;

    for (const ci of museumCheckIns) {
      const museumId = String(ci.contentId);
      const existing = byMuseum.get(museumId) ?? { hours: 0, visits: 0 };
      existing.hours += ci.durationHours ?? 0;
      existing.visits += 1;
      byMuseum.set(museumId, existing);

      const museum = await ctx.db.get(ci.contentId as any);
      if (museum && "location" in museum) {
        const normalizedCity = museum.location?.city?.trim().toLowerCase();
        if (normalizedCity) {
          citiesExplored.add(normalizedCity);
        }
      }

      // Weighted scoring algorithm for category preferences
      if (museum && "category" in museum) {
        const category = normalizeCategory(museum.category);
        
        // Base score: 1 point per check-in
        let score = 1.0;
        
        // Rating multiplier: scale by rating quality (rating/3 so 5-star = 1.67x, 3-star = 1.0x)
        if (ci.rating && ci.rating >= 3) {
          score *= ci.rating / 3.0;
        }
        
        // Duration multiplier: longer visits = more engagement (capped log scale)
        if (ci.durationHours && ci.durationHours > 0) {
          // log1p smooths: 1h→0.69, 2h→1.1, 3h→1.39, 5h→1.79
          score *= Math.log1p(ci.durationHours);
        }
        
        categoryScores[category] = (categoryScores[category] ?? 0) + score;
      }
    }

    // Bonus: followed museums add smaller weight (shows intent, not just visits)
    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    const followedMuseums = await Promise.all(
      follows.map((f) => ctx.db.get(f.museumId))
    );
    
    for (const museum of followedMuseums) {
      if (museum && "category" in museum) {
        const category = normalizeCategory(museum.category);
        // Follows add 0.3 points (less than a check-in but shows sustained interest)
        categoryScores[category] = (categoryScores[category] ?? 0) + 0.3;
      }
    }

    // Convert scores to percentages
    const totalScore = Object.values(categoryScores).reduce((sum, s) => sum + s, 0);
    const artStyles =
      totalScore > 0
        ? CATEGORIES.map((cat) => ({
            name: getCategoryDisplayName(cat),
            pct: Math.round((categoryScores[cat] / totalScore) * 100),
            color: getCategoryColor(cat),
          }))
            .filter((style) => style.pct > 0)
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 5) // Top 5 categories
        : [];

    let topMuseum:
      | { museumId: string; name: string; hours: number; visits: number }
      | null = null;

    for (const [museumId, stats] of byMuseum.entries()) {
      if (
        topMuseum == null ||
        stats.hours > topMuseum.hours ||
        (stats.hours === topMuseum.hours && stats.visits > topMuseum.visits)
      ) {
        const museum = await ctx.db.get(museumId as any);
        if (museum && "name" in museum) {
          topMuseum = {
            museumId,
            name: String(museum.name ?? "Unknown museum"),
            hours: stats.hours,
            visits: stats.visits,
          };
        }
      }
    }

    return {
      totalHours,
      totalDays: Number((totalHours / 24).toFixed(1)),
      museumsVisited: museumIds.size,
      citiesExplored: citiesExplored.size,
      eventsAttended: eventCheckIns.length,
      topMuseum,
      artStyles,
      hasEnoughData: museumCheckIns.length >= 3,
    };
  },
});

/**
 * Normalize museum category to one of our 5 standard categories.
 */
function normalizeCategory(category: string | undefined): string {
  const raw = (category || "").trim().toLowerCase();
  return CATEGORIES.includes(raw) ? raw : "culture";
}

/**
 * Display names for categories (user-facing).
 */
function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    art: "Classic Art",
    science: "Science & Nature",
    history: "History",
    contemporary: "Contemporary Art",
    culture: "Culture & Heritage",
  };
  return names[category] || category;
}

/**
 * Color palette for category bars (matches your existing design aesthetic).
 */
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    art: "#D4915A",        // Warm gold (like your Impressionism color)
    contemporary: "#A89BC4", // Purple (like your Modern Art color)
    science: "#7FB3D5",    // Blue
    history: "#B4756E",    // Terracotta
    culture: "#8FBC8F",    // Sage green
  };
  return colors[category] || "#B4B4B4";
}

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
