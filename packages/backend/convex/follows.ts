// Follow a user
export const followUser = mutation({
  args: { userId: v.string() }, // userId to follow
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Prevent following self
    if (user._id === args.userId) throw new Error("Cannot follow yourself");

    // Check if already following
    const existing = await ctx.db
      .query("userUserFollows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.userId)
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("userUserFollows", {
      followerId: user._id,
      followingId: args.userId,
      followedAt: Date.now(),
    });
  },
});

// Unfollow a user
export const unfollowUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userUserFollows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.userId)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

// Check if current user follows another user
export const isFollowingUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return false;
    if (user._id === args.userId) return false;
    const existing = await ctx.db
      .query("userUserFollows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.userId)
      )
      .first();
    return !!existing;
  },
});

// Get followers for a user
export const getFollowers = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("userUserFollows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();
    return follows.map(f => f.followerId);
  },
});

// Get users a user is following
export const getFollowing = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("userUserFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();
    return follows.map(f => f.followingId);
  },
});

// Get recommended people based on who your following follows (top 5 most followed)
export const getPeopleYouMayKnow = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    // Get the users this user is following
    const userFollowing = await ctx.db
      .query("userUserFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();
    
    if (userFollowing.length === 0) return [];

    const followingIds = userFollowing.map(f => f.followingId);

    // For each person they follow, get who those people are following
    const recommendationCounts = new Map<string, number>();
    
    for (const followingId of followingIds) {
      const theirFollowing = await ctx.db
        .query("userUserFollows")
        .withIndex("by_follower", (q) => q.eq("followerId", followingId))
        .collect();

      for (const follow of theirFollowing) {
        // Don't recommend the current user or people already following
        if (follow.followingId === user._id || followingIds.includes(follow.followingId)) {
          continue;
        }

        const count = recommendationCounts.get(follow.followingId) || 0;
        recommendationCounts.set(follow.followingId, count + 1);
      }
    }

    // Sort by count and get top 5
    const recommendations = Array.from(recommendationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId]) => userId);

    // Fetch user profiles for the recommendations
    const profiles = await ctx.db.query("userProfiles").collect();
    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    return recommendations
      .map(userId => {
        const profile = profileMap.get(userId);
        return {
          userId,
          name: profile?.name ?? null,
          email: profile?.email ?? null,
          imageUrl: profile?.imageUrl ?? null,
        };
      })
      .filter(p => p.userId); // Filter out any missing profiles
  },
});
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

