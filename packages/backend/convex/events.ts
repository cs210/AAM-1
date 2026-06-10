import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { assertDashboardMuseumAccess } from "./museums";
import { requireAuthenticatedUser } from "./permissions";

type MuseumPoint = { latitude: number; longitude: number } | null;

async function getMuseumPoint(ctx: QueryCtx, museumId: string): Promise<MuseumPoint> {
  const geospatialDoc = await ctx.runQuery(components.geospatial.document.get, {
    key: museumId,
  });
  return geospatialDoc?.coordinates ?? null;
}

async function resolvePointForDistance(
  ctx: QueryCtx,
  museumId: Id<"museums">,
  storedLat?: number,
  storedLon?: number
): Promise<MuseumPoint> {
  const fromIndex = await getMuseumPoint(ctx, museumId);
  if (fromIndex) return fromIndex;
  if (
    typeof storedLat === "number" &&
    typeof storedLon === "number" &&
    Number.isFinite(storedLat) &&
    Number.isFinite(storedLon)
  ) {
    return { latitude: storedLat, longitude: storedLon };
  }
  return null;
}

function haversineDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const earthRadiusMeters = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
}

type NormalizedFeedItem = {
  _id: Id<"events"> | Id<"exhibitions">;
  _creationTime: number;
  title: string;
  description?: string;
  category: string;
  museumId?: Id<"museums">;
  startDate: number;
  endDate: number;
  imageUrl?: string;
  kind: "event" | "exhibition";
};

type FeedItemWithMuseum = NormalizedFeedItem & {
  museum: { name: string; category: string } | null;
  distanceMeters?: number;
};

function feedItemKey(item: { kind?: string; _id: string }) {
  return `${item.kind ?? "event"}-${item._id}`;
}

async function getDirectFollowedMuseumIds(
  ctx: QueryCtx,
  userId: string
): Promise<Id<"museums">[]> {
  const follows = await ctx.db
    .query("userFollows")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return follows.map((f) => f.museumId);
}

async function fetchUpcomingItemsForMuseums(
  ctx: QueryCtx,
  museumIds: Id<"museums">[],
  now: number
): Promise<NormalizedFeedItem[]> {
  if (museumIds.length === 0) return [];

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

  const normalizedEvents = eventsArrays.flat().map((event) => ({
    ...event,
    kind: "event" as const,
  }));

  return [...normalizedEvents, ...normalizedExhibitions];
}

async function attachMuseumToFeedItems(
  ctx: QueryCtx,
  items: NormalizedFeedItem[],
  distanceByMuseumId?: Map<Id<"museums">, number>
): Promise<FeedItemWithMuseum[]> {
  return Promise.all(
    items.map(async (item) => {
      const museum = item.museumId ? await ctx.db.get(item.museumId) : null;
      const distanceMeters = item.museumId
        ? distanceByMuseumId?.get(item.museumId)
        : undefined;
      return {
        ...item,
        museum: museum ? { name: museum.name, category: museum.category } : null,
        distanceMeters,
      };
    })
  );
}

function mergeFeedsWithFollowedFirst(
  followed: FeedItemWithMuseum[],
  recommendations: FeedItemWithMuseum[],
  itemLimit: number
): FeedItemWithMuseum[] {
  const seen = new Set<string>();
  const merged: FeedItemWithMuseum[] = [];

  for (const item of [...followed, ...recommendations]) {
    const key = feedItemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= itemLimit) break;
  }

  return merged;
}

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

/** Upcoming events from followed museums, then at museums nearest to the viewer. */
export const getNearbyFeed = query({
  args: {
    viewer: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    museumLimit: v.optional(v.number()),
    itemLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const museumLimit = args.museumLimit ?? 20;
    const itemLimit = args.itemLimit ?? 40;
    const now = Date.now();
    const viewer = args.viewer;

    const followedMuseumIds = await getDirectFollowedMuseumIds(ctx, user._id);
    const followedItems = await fetchUpcomingItemsForMuseums(ctx, followedMuseumIds, now);
    followedItems.sort((a, b) => a.startDate - b.startDate);

    const museums = await ctx.db.query("museums").collect();
    const museumsWithDistance: Array<{
      museumId: Id<"museums">;
      distanceMeters: number;
    }> = [];

    for (const museum of museums) {
      const point = await resolvePointForDistance(
        ctx,
        museum._id,
        museum.latitude,
        museum.longitude
      );
      if (!point) continue;
      museumsWithDistance.push({
        museumId: museum._id,
        distanceMeters: haversineDistanceMeters(viewer, point),
      });
    }

    museumsWithDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);
    const nearestMuseumIds = museumsWithDistance
      .slice(0, museumLimit)
      .map((m) => m.museumId);
    const distanceByMuseumId = new Map(
      museumsWithDistance.map((m) => [m.museumId, m.distanceMeters])
    );

    const followedWithMuseum = await attachMuseumToFeedItems(
      ctx,
      followedItems,
      distanceByMuseumId
    );

    if (nearestMuseumIds.length === 0) {
      return followedWithMuseum.slice(0, itemLimit);
    }

    const nearbyItems = await fetchUpcomingItemsForMuseums(ctx, nearestMuseumIds, now);

    const nearbyWithMuseum = await attachMuseumToFeedItems(
      ctx,
      nearbyItems,
      distanceByMuseumId
    );

    nearbyWithMuseum.sort((a, b) => {
      const distA = a.distanceMeters ?? Number.POSITIVE_INFINITY;
      const distB = b.distanceMeters ?? Number.POSITIVE_INFINITY;
      if (distA !== distB) return distA - distB;
      return a.startDate - b.startDate;
    });

    return mergeFeedsWithFollowedFirst(followedWithMuseum, nearbyWithMuseum, itemLimit);
  },
});

/** Upcoming events from followed museums, then general picks when location is unavailable. */
export const getAvailableFeed = query({
  args: {
    itemLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const itemLimit = args.itemLimit ?? 24;
    const now = Date.now();

    const followedMuseumIds = await getDirectFollowedMuseumIds(ctx, user._id);
    const followedItems = await fetchUpcomingItemsForMuseums(ctx, followedMuseumIds, now);
    followedItems.sort((a, b) => a.startDate - b.startDate);

    const events = await ctx.db
      .query("events")
      .filter((q) => q.gte(q.field("endDate"), now))
      .collect();

    const exhibitions = await ctx.db.query("exhibitions").collect();

    const normalizedExhibitions = exhibitions
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

    const normalizedEvents = events.map((event) => ({
      ...event,
      kind: "event" as const,
    }));

    const allItems = [...normalizedEvents, ...normalizedExhibitions];

    const followedWithMuseum = await attachMuseumToFeedItems(ctx, followedItems);
    const recommendationsWithMuseum = await attachMuseumToFeedItems(ctx, allItems);

    recommendationsWithMuseum.sort((a, b) => b.startDate - a.startDate);

    return mergeFeedsWithFollowedFirst(
      followedWithMuseum,
      recommendationsWithMuseum,
      itemLimit
    );
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
  handler: async (ctx, { point, ...args }) => {
    const user = await requireAuthenticatedUser(ctx);
    if (args.museumId) {
      await assertDashboardMuseumAccess(ctx, user, args.museumId);
    } else if (user.role !== "admin") {
      throw new Error("museumId is required to create an event");
    }
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

    const now = Date.now();
    const museumIds = await getDirectFollowedMuseumIds(ctx, user._id);
    const items = await fetchUpcomingItemsForMuseums(ctx, museumIds, now);
    items.sort((a, b) => a.startDate - b.startDate);

    return attachMuseumToFeedItems(ctx, items);
  },
});
