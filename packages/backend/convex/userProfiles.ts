import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const MAX_PROFILE_NAME_LENGTH = 80;

function isSafeExternalUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function assertStorageOwnership(ctx: MutationCtx, userId: string, storageId: Id<"_storage">) {
  const owner = await ctx.db
    .query("storageOwnership")
    .withIndex("by_userId_and_storageId", (q) =>
      q.eq("userId", userId).eq("storageId", storageId)
    )
    .first();
  if (!owner) throw new Error("Storage ownership not found");
}

function toPublicProfile(
  profile: {
    userId: string;
    name?: string;
    imageUrl?: string;
    bannerUrl?: string;
    museumData?: unknown;
    updatedAt: number;
  }
) {
  return {
    userId: profile.userId,
    name: profile.name ?? null,
    imageUrl: profile.imageUrl ?? null,
    bannerUrl: profile.bannerUrl ?? null,
    museumData: profile.museumData ?? null,
    updatedAt: profile.updatedAt,
  };
}

// Generate a short-lived upload URL for Convex file storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const claimProfileStorage = mutation({
  args: {
    storageId: v.id("_storage"),
    purpose: v.union(v.literal("profile_image"), v.literal("banner_image")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("storageOwnership")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
    if (existing && existing.userId !== user._id) {
      throw new Error("Storage already claimed by another user");
    }
    if (!existing) {
      await ctx.db.insert("storageOwnership", {
        storageId: args.storageId,
        userId: user._id,
        purpose: args.purpose,
        createdAt: Date.now(),
      });
    }
  },
});

// Update the profile picture from a Convex storage upload
export const updateProfileImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await assertStorageOwnership(ctx, user._id, storageId);

    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) throw new Error("Storage file not found");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, { imageUrl, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        name: user.name,
        imageUrl,
        updatedAt: Date.now(),
      });
    }
  },
});

// Update the banner image from a Convex storage upload
export const updateBannerImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await assertStorageOwnership(ctx, user._id, storageId);

    const bannerUrl = await ctx.storage.getUrl(storageId);
    if (!bannerUrl) throw new Error("Storage file not found");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, { bannerUrl, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        name: user.name,
        bannerUrl,
        updatedAt: Date.now(),
      });
    }
  },
});

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
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) return null;
    if (user._id === args.userId || (user as { role?: string | null }).role === "admin") {
      return profile;
    }
    return toPublicProfile(profile);
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

export const getPublicProfileForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    return profile ? toPublicProfile(profile) : null;
  },
});

export const listFriendOptions = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const following = await ctx.db
      .query("userUserFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();
    const followers = await ctx.db
      .query("userUserFollows")
      .withIndex("by_following", (q) => q.eq("followingId", user._id))
      .collect();
    const relatedUserIds = Array.from(
      new Set([
        ...following.map((row) => row.followingId),
        ...followers.map((row) => row.followerId),
      ])
    ).slice(0, 50);
    const profiles = await Promise.all(
      relatedUserIds.map((userId) =>
        ctx.db.query("userProfiles").withIndex("by_userId", (q) => q.eq("userId", userId)).first()
      )
    );
    return profiles.filter(Boolean).map((profile) => toPublicProfile(profile!));
  },
});

// List all user profiles (for friend selection, etc.)
export const listAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    if ((user as { role?: string | null }).role !== "admin") {
      throw new Error("Admin access required");
    }
    const profiles = await ctx.db.query("userProfiles").collect();
    return profiles.map((profile) => toPublicProfile(profile));
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.name !== undefined && args.name.length > MAX_PROFILE_NAME_LENGTH) {
      throw new Error(`name must be at most ${MAX_PROFILE_NAME_LENGTH} characters`);
    }
    if (args.imageUrl !== undefined && args.imageUrl && !isSafeExternalUrl(args.imageUrl)) {
      throw new Error("imageUrl must be a valid https URL");
    }

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
    if (args.imageUrl !== undefined) updateData.imageUrl = args.imageUrl;

    await ctx.db.patch(profile._id, updateData);

    return { ...profile, ...updateData };
  },
});
