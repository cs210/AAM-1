import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Rate a museum or event
export const rateContent = mutation({
  args: {
    contentType: v.union(v.literal("museum"), v.literal("event")),
    contentId: v.string(),
    rating: v.number(), // 1-5
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const userId = (user as { userId?: string; _id: string }).userId ?? String((user as { _id: string })._id);

    // Check if user already rated this
    const existing = await ctx.db
      .query("userRatings")
      .withIndex("by_user_and_content", q =>
        q.eq("userId", userId)
         .eq("contentType", args.contentType)
         .eq("contentId", args.contentId)
      )
      .first();

    const now = Date.now();
    if (existing) {
      // Update existing rating
      await ctx.db.patch(existing._id, {
        rating: args.rating,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new rating
      return await ctx.db.insert("userRatings", {
        userId,
        contentType: args.contentType,
        contentId: args.contentId,
        rating: args.rating,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get user's ratings
export const getUserRatings = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];
    const userId = (user as { userId?: string; _id: string }).userId ?? String((user as { _id: string })._id);

    return await ctx.db
      .query("userRatings")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();
  },
});

// Get average rating for a museum/event
export const getAverageRating = query({
  args: {
    contentType: v.union(v.literal("museum"), v.literal("event")),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("userRatings")
      .withIndex("by_content", q =>
        q.eq("contentType", args.contentType).eq("contentId", args.contentId)
      )
      .collect();

    if (ratings.length === 0) return null;

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: sum / ratings.length,
      count: ratings.length,
    };
  },
});
