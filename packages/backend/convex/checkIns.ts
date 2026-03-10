import { ConvexError, v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Create a check-in (museum or event)
export const createCheckIn = mutation({
  args: {
    contentType: v.union(v.literal("museum"), v.literal("event")),
    contentId: v.union(v.id("museums"), v.id("events")),
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
    const checkInId = await ctx.db.insert("checkIns", {
      userId: user._id,
      contentType: args.contentType,
      contentId: args.contentId,
      rating: args.rating,
      review: args.review,
      imageUrls,
      friendUserIds,
      visitDate,
      createdAt: Date.now(),
    });

    // Update user profile with check-in data (museum check-ins only)
    if (args.contentType === "museum") {
      let userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();
      
      if (!userProfile) {
        throw new ConvexError("Error in createCheckIn(): User profile doesn't exist.")
      }

      // Update existing profile
      const museumData = userProfile.museumData ?? {
        totalCheckIns: 0,
        totalMuseums: 0,
        checkIns: {},
      };

      const contentIdStr = args.contentId;
      const existingCheckIns = museumData.checkIns[contentIdStr] ?? [];

      // Check if this museum is new
      const isNewMuseum = !museumData.checkIns[contentIdStr];

      museumData.checkIns[contentIdStr] = [...existingCheckIns, checkInId];
      museumData.totalCheckIns += 1;
      if (isNewMuseum) {
        museumData.totalMuseums += 1;
      }

      await ctx.db.patch(userProfile._id, {
        museumData,
        updatedAt: Date.now(),
      });
    }

    return {
      _id: checkInId,
      userId: user._id,
      contentType: args.contentType,
      contentId: args.contentId,
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

// Get check-ins with museum details for profile "cultural passport" (own or another user)
export const getProfileVisits = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    const targetUserId = args.userId ?? currentUser?._id;
    if (!targetUserId) return [];

    const checkIns = await getCheckInsRaw(ctx, { userId: targetUserId });

    const visits = await Promise.all(
      checkIns.map(async (ci) => {
        const museum = await ctx.db.get(ci.museumId);
        const city = museum?.location?.city;
        return {
          checkIn: {
            _id: ci._id,
            museumId: ci.museumId,
            rating: ci.rating,
            visitDate: ci.visitDate,
            createdAt: ci.createdAt,
            review: ci.review,
            editedAt: ci.editedAt,
          },
          museum: museum
            ? {
                _id: museum._id,
                name: museum.name,
                imageUrl: museum.imageUrl,
                category: museum.category,
                city,
              }
            : null,
        };
      })
    );

    const valid = visits.filter((entry) => entry.museum != null) as {
      checkIn: { _id: Id<"museumCheckIns">; museumId: Id<"museums">; rating?: number; visitDate: number; createdAt: number; review?: string; editedAt?: number };
      museum: { _id: Id<"museums">; name: string; imageUrl?: string; category: string; city?: string };
    }[];

    valid.sort((a, b) => b.checkIn.visitDate - a.checkIn.visitDate);
    return valid;
  },
});

// Get all check-ins for a museum
export const getMuseumCheckIns = query({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_content", (q) =>
        q.eq("contentType", "museum").eq("contentId", args.museumId)
      )
      .collect();

    return checkIns;
  },
});

// Get check-ins for a user at a specific museum
export const getUserMuseumCheckIns = query({
  args: { userId: v.string(), museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_user_and_content", (q) =>
        q.eq("userId", args.userId).eq("contentType", "museum").eq("contentId", args.museumId)
      )
      .collect();

    return checkIns;
  },
});

// Update a check-in
export const updateCheckIn = mutation({
  args: {
    checkInId: v.id("checkIns"),
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

    const updateData: Record<string, unknown> = {};
    if (args.rating !== undefined) updateData.rating = args.rating;
    if (args.review !== undefined) updateData.review = args.review;
    if (args.imageUrls !== undefined) updateData.imageUrls = args.imageUrls;
    if (args.friendUserIds !== undefined)
      updateData.friendUserIds = args.friendUserIds;
    // Only mark as edited when something actually changed
    if (Object.keys(updateData).length > 0) {
      updateData.editedAt = Date.now();
    }

    await ctx.db.patch(args.checkInId, updateData);

    return { ...checkIn, ...updateData };
  },
});

// Delete a check-in
export const deleteCheckIn = mutation({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn) throw new ConvexError("Error thrown in deleteCheckIn(): Check-in not found");
    if (checkIn.userId !== user._id)
      throw new ConvexError("Error thrown in deleteCheckIn(): Unauthorized to delete this check-in");

    await ctx.db.delete(args.checkInId);

    // Update user profile to remove the check-in (for museum check-ins only)
    if (checkIn.contentType === "museum") {
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();

      if (userProfile?.museumData) {
        const museumData = userProfile.museumData;
        const museumIdStr = checkIn.contentId as string;
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
    }

    return true;
  },
});

// Convenience mutation: Create a museum check-in
export const createMuseumCheckIn = mutation({
  args: {
    museumId: v.id("museums"),
    rating: v.optional(v.number()),
    review: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    friendUserIds: v.optional(v.array(v.string())),
    visitDate: v.optional(v.number()),
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
    const checkInId = await ctx.db.insert("checkIns", {
      userId: user._id,
      contentType: "museum",
      contentId: args.museumId,
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
      throw new ConvexError("Error in createMuseumCheckIn(): User profile doesn't exist.")
    }

    // Update existing profile
    const museumData = userProfile.museumData ?? {
      totalCheckIns: 0,
      totalMuseums: 0,
      checkIns: {},
    };

    const contentIdStr = args.museumId;
    const existingCheckIns = museumData.checkIns[contentIdStr] ?? [];

    // Check if this museum is new
    const isNewMuseum = !museumData.checkIns[contentIdStr];

    museumData.checkIns[contentIdStr] = [...existingCheckIns, checkInId];
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
      contentType: "museum" as const,
      contentId: args.museumId,
      rating: args.rating,
      review: args.review,
      imageUrls,
      friendUserIds,
      visitDate,
      createdAt: Date.now(),
    };
  },
});

// Convenience mutation: Create an event check-in
export const createEventCheckIn = mutation({
  args: {
    eventId: v.id("events"),
    rating: v.optional(v.number()),
    review: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    friendUserIds: v.optional(v.array(v.string())),
    visitDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    // Validate rating if provided
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    const visitDate = args.visitDate ?? Date.now();
    const imageUrls = args.imageUrls ?? [];
    const friendUserIds = args.friendUserIds ?? [];

    // Insert the check-in record
    const checkInId = await ctx.db.insert("checkIns", {
      userId: user._id,
      contentType: "event",
      contentId: args.eventId,
      rating: args.rating,
      review: args.review,
      imageUrls,
      friendUserIds,
      visitDate,
      createdAt: Date.now(),
    });

    return {
      _id: checkInId,
      userId: user._id,
      contentType: "event" as const,
      contentId: args.eventId,
      rating: args.rating,
      review: args.review,
      imageUrls,
      friendUserIds,
      visitDate,
      createdAt: Date.now(),
    };
  },
});

// Get check-in statistics for a museum
export const getMuseumCheckInStats = query({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_content", (q) =>
        q.eq("contentType", "museum").eq("contentId", args.museumId)
      )
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

// Get all check-ins for an event
export const getEventCheckIns = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_content", (q) =>
        q.eq("contentType", "event").eq("contentId", args.eventId)
      )
      .collect();

    return checkIns;
  },
});

// Get check-ins for a user at a specific event
export const getUserEventCheckIns = query({
  args: { userId: v.string(), eventId: v.id("events") },
  handler: async (ctx, args) => {
    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_user_and_content", (q) =>
        q.eq("userId", args.userId).eq("contentType", "event").eq("contentId", args.eventId)
      )
      .collect();

    return checkIns;
  },
});

// Get check-in statistics for an event
export const getEventCheckInStats = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_content", (q) =>
        q.eq("contentType", "event").eq("contentId", args.eventId)
      )
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

    // Get checkins from followed users (museums and events)
    const checkIns = await ctx.db
      .query("checkIns")
      .collect();

    // Filter for checkins from followed users and sort by most recent
    const followingCheckIns = checkIns
      .filter((ci) => (ci.contentType === "museum" || ci.contentType === "event") && followingIds.includes(ci.userId))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50); // Limit to 50 most recent

    // Enrich with user and content data (museum or event)
    const enriched = await Promise.all(
      followingCheckIns.map(async (ci) => {
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", ci.userId))
          .first();

        const content = await ctx.db.get(ci.contentId as any);
        const contentName = content && "name" in content ? content.name : "Unknown";

        return {
          _id: ci._id,
          userId: ci.userId,
          userName: userProfile?.name || "Unknown User",
          userImage: userProfile?.imageUrl,
          contentType: ci.contentType,
          contentId: ci.contentId,
          contentName: contentName,
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
