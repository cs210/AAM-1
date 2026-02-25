import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Follow a museum
export const followMuseum = mutation({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    // Check if already following
    const existing = await ctx.db
      .query("userFollows")
      .withIndex("by_user_and_museum", (q) =>
        q.eq("userId", user._id).eq("museumId", args.museumId)
      )
      .first();
    
    if (existing) return existing._id;
    
    return await ctx.db.insert("userFollows", {
      userId: user._id,
      museumId: args.museumId,
      followedAt: Date.now(),
    });
  },
});

// Unfollow a museum
export const unfollowMuseum = mutation({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    
    const existing = await ctx.db
      .query("userFollows")
      .withIndex("by_user_and_museum", (q) =>
        q.eq("userId", user._id).eq("museumId", args.museumId)
      )
      .first();
    
    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

// Check if user follows a museum
export const isFollowing = query({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return false;
    
    const existing = await ctx.db
      .query("userFollows")
      .withIndex("by_user_and_museum", (q) =>
        q.eq("userId", user._id).eq("museumId", args.museumId)
      )
      .first();
    
    return !!existing;
  },
});

// Get all museums user follows
export const getFollowedMuseums = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];
    
    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    const museums = await Promise.all(
      follows.map((follow) => ctx.db.get(follow.museumId))
    );
    
    return museums.filter(Boolean);
  },
});

