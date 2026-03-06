import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Create a museum check-in
export const createCheckIn = mutation({
  args: {
    museumId: v.id("museums"),
    rating: v.optional(v.number()),
    review: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    friendUserIds: v.optional(v.array(v.string())),
    visitDate: v.optional(v.number()), // If not provided, use current time
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Validate rating if provided
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    const visitDate = args.visitDate ?? Date.now();
    const imageUrls = args.imageUrls ?? [];
    const friendUserIds = args.friendUserIds ?? [];

    // Insert the check-in record
    const checkInId = await ctx.db.insert("museumCheckIns", {
      userId: user._id,
      museumId: args.museumId,
      rating: args.rating,
      review: args.review,
      imageUrls,
      friendUserIds,
      visitDate,
      createdAt: Date.now(),
    });

    // Update user profile with check-in data
    let userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
      

    if (!userProfile) {
      // Auto-create user profile if it doesn't exist
      const profileData = {
        userId: user._id,
        name: user.name,
        email: user.email,
        ...(user.image && { imageUrl: user.image }),
        updatedAt: Date.now(),
      };
      const profileId = await ctx.db.insert("userProfiles", profileData);
      userProfile = { _id: profileId, _creationTime: Date.now(), ...profileData };
    }

    // Update existing profile
    const museumData = userProfile.museumData ?? {
      totalCheckIns: 0,
      totalMuseums: 0,
      checkIns: {},
    };

    const museumIdStr = args.museumId;
    const existingCheckIns = museumData.checkIns[museumIdStr] ?? [];

    // Check if this museum is new
    const isNewMuseum = !museumData.checkIns[museumIdStr];

    museumData.checkIns[museumIdStr] = [...existingCheckIns, checkInId];
    museumData.totalCheckIns += 1;
    if (isNewMuseum) {
      museumData.totalMuseums += 1;
    }

    await ctx.db.patch(userProfile._id, {
      museumData,
      updatedAt: Date.now(),
    });

    return {
      _id: checkInId,
      userId: user._id,
      museumId: args.museumId,
      rating: args.rating,
      review: args.review,
      imageUrls,
      friendUserIds,
      visitDate,
      createdAt: Date.now(),
    };
  },
});

// Get current user's check-ins
export const getCurrentUserCheckIns = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    return userProfile?.museumData ?? null;
  },
});

// Get a specific user's check-ins
export const getUserCheckIns = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return userProfile?.museumData ?? null;
  },
});

// Get all check-ins for a museum
export const getMuseumCheckIns = query({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const checkIns = await ctx.db
      .query("museumCheckIns")
      .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
      .collect();

    return checkIns;
  },
});

// Get check-ins for a user at a specific museum
export const getUserMuseumCheckIns = query({
  args: { userId: v.string(), museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const checkIns = await ctx.db
      .query("museumCheckIns")
      .withIndex("by_user_and_museum", (q) =>
        q.eq("userId", args.userId).eq("museumId", args.museumId)
      )
      .collect();

    return checkIns;
  },
});

// Update a check-in
export const updateCheckIn = mutation({
  args: {
    checkInId: v.id("museumCheckIns"),
    rating: v.optional(v.number()),
    review: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    friendUserIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    // Validate rating if provided
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn) throw new ConvexError("Error thrown in updateCheckIn(): Check-in not found");
    if (checkIn.userId !== user._id)
      throw new ConvexError("Error thrown in updateCheckIn(): Unauthorized to update this check-in");

    const updateData: any = {};
    if (args.rating !== undefined) updateData.rating = args.rating;
    if (args.review !== undefined) updateData.review = args.review;
    if (args.imageUrls !== undefined) updateData.imageUrls = args.imageUrls;
    if (args.friendUserIds !== undefined)
      updateData.friendUserIds = args.friendUserIds;

    await ctx.db.patch(args.checkInId, updateData);

    return { ...checkIn, ...updateData };
  },
});

// Delete a check-in
export const deleteCheckIn = mutation({
  args: { checkInId: v.id("museumCheckIns") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn) throw new ConvexError("Error thrown in deleteCheckIn(): Check-in not found");
    if (checkIn.userId !== user._id)
      throw new ConvexError("Error thrown in deleteCheckIn(): Unauthorized to delete this check-in");

    await ctx.db.delete(args.checkInId);

    // Update user profile to remove the check-in
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (userProfile?.museumData) {
      const museumData = userProfile.museumData;
      const museumIdStr = checkIn.museumId;
      const checkIns = museumData.checkIns[museumIdStr] ?? [];

      // Remove the check-in ID from the array
      const updatedCheckIns = checkIns.filter((id) => id !== args.checkInId);

      if (updatedCheckIns.length === 0) {
        // Remove the museum entry if no check-ins left
        delete museumData.checkIns[museumIdStr];
        museumData.totalMuseums -= 1;
      } else {
        museumData.checkIns[museumIdStr] = updatedCheckIns;
      }

      museumData.totalCheckIns -= 1;

      await ctx.db.patch(userProfile._id, {
        museumData,
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});

// Get check-in statistics for a museum
export const getMuseumCheckInStats = query({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const checkIns = await ctx.db
      .query("museumCheckIns")
      .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
      .collect();

    const totalCheckIns = checkIns.length;
    const uniqueUsers = new Set(checkIns.map((ci) => ci.userId)).size;
    const ratedCheckIns = checkIns.filter((ci) => ci.rating !== undefined);
    const averageRating =
      ratedCheckIns.length > 0
        ? ratedCheckIns.reduce((sum, ci) => sum + (ci.rating || 0), 0) /
          ratedCheckIns.length
        : 0;

    return {
      totalCheckIns,
      uniqueVisitors: uniqueUsers,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratedCheckIns.length,
    };
  },
});

// Get checkins from users the current user is following
export const getFollowingCheckins = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    // Get list of users being followed
    const follows = await ctx.db
      .query("userUserFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();

    const followingIds = follows.map((f) => f.followingId);

    if (followingIds.length === 0) return [];

    // Get checkins from followed users
    const checkIns = await ctx.db
      .query("museumCheckIns")
      .collect();

    // Filter for checkins from followed users and sort by most recent
    const followingCheckIns = checkIns
      .filter((ci) => followingIds.includes(ci.userId))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50); // Limit to 50 most recent

    // Enrich with user and museum data
    const enriched = await Promise.all(
      followingCheckIns.map(async (ci) => {
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", ci.userId))
          .first();

        const museum = await ctx.db.get(ci.museumId);

        return {
          _id: ci._id,
          userId: ci.userId,
          userName: userProfile?.name || "Unknown User",
          userImage: userProfile?.imageUrl,
          museumId: ci.museumId,
          museumName: museum?.name || "Unknown Museum",
          rating: ci.rating,
          review: ci.review,
          createdAt: ci.createdAt,
        };
      })
    );

    return enriched;
  },
});
