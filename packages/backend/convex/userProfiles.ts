import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Get or create user profile
export const getOrCreateUserProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      const profileData = {
        userId: user._id,
        name: user.name,
        email: user.email,
        ...(user.image && { imageUrl: user.image }),
        updatedAt: Date.now(),
      };
      const profileId = await ctx.db.insert("userProfiles", profileData);
      return { _id: profileId, _creationTime: Date.now(), ...profileData };
    }

    return profile;
  },
});

// Get user profile by ID
export const getUserProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return profile ?? null;
  },
});

// Get current user's profile
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    return profile ?? null;
  },
});

// List all user profiles (for friend selection, etc.)
export const listAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("userProfiles").collect();
    return profiles;
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      // Create profile if it doesn't exist
      const newProfile = {
        userId: user._id,
        name: args.name || user.name,
        email: args.email || user.email,
        ...((user.image || args.imageUrl) && { imageUrl: user.image || args.imageUrl }),
        updatedAt: Date.now(),
      };
      const profileId = await ctx.db.insert("userProfiles", newProfile);
      return { _id: profileId, _creationTime: Date.now(), ...newProfile };
    }

    // Update existing profile
    const updateData: any = {
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) updateData.name = args.name;
    if (args.email !== undefined) updateData.email = args.email;
    if (args.imageUrl !== undefined) updateData.imageUrl = args.imageUrl;

    await ctx.db.patch(profile._id, updateData);

    return { ...profile, ...updateData };
  },
});
