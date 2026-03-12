import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Unified feed: events from museums the user follows and museums followed by people the user follows
export const getUnifiedFeed = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    // Museums the user follows
    const directFollows = await ctx.db
      .query("userFollows")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const directMuseumIds = directFollows.map((f) => f.museumId);

    // People the user follows
    const userFollows = await ctx.db
      .query("userUserFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();
    const followedUserIds = userFollows.map((f) => f.followingId);

    // Museums followed by people the user follows
    let indirectMuseumIds: string[] = [];
    if (followedUserIds.length > 0) {
      const allFollows = await ctx.db
        .query("userFollows")
        .withIndex("by_user")
        .collect();
      indirectMuseumIds = allFollows
        .filter((f) => followedUserIds.includes(f.userId))
        .map((f) => f.museumId);
    }

    // Combine and dedupe museum IDs
    const allMuseumIds = Array.from(new Set([...directMuseumIds, ...indirectMuseumIds]));
    const now = Date.now();

    // Get upcoming events for each museum
    const eventsArrays = await Promise.all(
      allMuseumIds.map((museumId) =>
        ctx.db
          .query("events")
          .withIndex("by_museum", (q) => q.eq("museumId", museumId as Id<"museums">))
          .filter((q) => q.gte(q.field("endDate"), now))
          .collect()
      )
    );
    const exhibitionsArrays = await Promise.all(
      allMuseumIds.map((museumId) =>
        ctx.db
          .query("exhibitions")
          .withIndex("by_museum", (q) => q.eq("museumId", museumId as Id<"museums">))
          .collect()
      )
    );

    const normalizedExhibitions = exhibitionsArrays
      .flat()
      .filter((exhibition) => exhibition.endDate === undefined || exhibition.endDate >= now)
      .map((exhibition) => ({
        _id: exhibition._id,
        _creationTime: exhibition._creationTime,
        title: exhibition.name,
        description: exhibition.description,
        category: "exhibition",
        museumId: exhibition.museumId,
        startDate: exhibition.startDate ?? now,
        endDate: exhibition.endDate ?? exhibition.startDate ?? now,
        imageUrl: exhibition.imageUrl,
        kind: "exhibition" as const,
      }));

    // Flatten and sort by start date (descending for most recent first)
    const normalizedEvents = eventsArrays
      .flat()
      .map((event) => ({
        ...event,
        kind: "event" as const,
      }));
    const allFeedItems = [...normalizedEvents, ...normalizedExhibitions].sort(
      (a, b) => b.startDate - a.startDate
    );

    // Attach museum info to each event
    const feedWithMuseum = await Promise.all(
      allFeedItems.map(async (item) => {
        const museum = item.museumId ? await ctx.db.get(item.museumId) : null;
        return {
          ...item,
          museum: museum ? { name: museum.name, category: museum.category } : null,
        };
      })
    );

    return feedWithMuseum;
  },
});

const geospatial = new GeospatialIndex(components.geospatial);
// Add an event
export const addEvent = mutation({
  args: {
    point: v.object({ latitude: v.number(), longitude: v.number() }),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    museumId: v.optional(v.id("museums")),
    location: v.optional(v.object({
      address: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string())
    })),
    startDate: v.number(),
    endDate: v.number(),
    imageUrl: v.optional(v.string()),
    registrationUrl: v.optional(v.string()),
  },
  handler: async (ctx, { point, ...args}) => {
    const id = await ctx.db.insert("events", args);
    await geospatial.insert(ctx, id, point, { category: args.category });
  },
});

// List upcoming events
export const listUpcomingEvents = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db.query("events")
      .withIndex("by_dates", q => q.gte("startDate", now))
      .take(50);
  },
});

// Get event by ID
export const getEvent = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get events for a specific museum
export const getEventsByMuseum = query({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db
      .query("events")
      .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
      .filter((q) => q.gte(q.field("endDate"), now))
      .collect();
  },
});

// Get all upcoming events from followed museums
export const getEventsFromFollowedMuseums = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const museumIds = follows.map((f) => f.museumId);
    const now = Date.now();

    // Get upcoming events for each followed museum
    const eventsArrays = await Promise.all(
      museumIds.map((museumId) =>
        ctx.db
          .query("events")
          .withIndex("by_museum", (q) => q.eq("museumId", museumId))
          .filter((q) => q.gte(q.field("endDate"), now))
          .collect()
      )
    );
    const exhibitionsArrays = await Promise.all(
      museumIds.map((museumId) =>
        ctx.db
          .query("exhibitions")
          .withIndex("by_museum", (q) => q.eq("museumId", museumId))
          .collect()
      )
    );

    const normalizedExhibitions = exhibitionsArrays
      .flat()
      .filter((exhibition) => exhibition.endDate === undefined || exhibition.endDate >= now)
      .map((exhibition) => ({
        _id: exhibition._id,
        _creationTime: exhibition._creationTime,
        title: exhibition.name,
        description: exhibition.description,
        category: "exhibition",
        museumId: exhibition.museumId,
        startDate: exhibition.startDate ?? now,
        endDate: exhibition.endDate ?? exhibition.startDate ?? now,
        imageUrl: exhibition.imageUrl,
        kind: "exhibition" as const,
      }));

    // Flatten and sort by start date
    const normalizedEvents = eventsArrays
      .flat()
      .map((event) => ({
        ...event,
        kind: "event" as const,
      }));
    const allFeedItems = [...normalizedEvents, ...normalizedExhibitions].sort(
      (a, b) => a.startDate - b.startDate
    );

    // Attach museum info to each event
    const feedWithMuseum = await Promise.all(
      allFeedItems.map(async (item) => {
        const museum = item.museumId ? await ctx.db.get(item.museumId) : null;
        return {
          ...item,
          museum: museum ? { name: museum.name, category: museum.category } : null,
        };
      })
    );

    return feedWithMuseum;
  },
});
