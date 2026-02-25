import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

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

// Get events from followed museums (one random event per museum)
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

    // Get upcoming events for followed museums
    const eventsArrays = await Promise.all(
      museumIds.map((museumId) =>
        ctx.db
          .query("events")
          .withIndex("by_museum", (q) => q.eq("museumId", museumId))
          .filter((q) => q.gte(q.field("endDate"), now))
          .collect()
      )
    );

    // Randomly select one event per museum (if museum has events)
    const randomEvents = eventsArrays
      .filter((events) => events.length > 0)
      .map((events) => {
        const randomIndex = Math.floor(Math.random() * events.length);
        return events[randomIndex];
      });

    // Attach museum info to each event
    const eventsWithMuseum = await Promise.all(
      randomEvents.map(async (event) => {
        const museum = event.museumId ? await ctx.db.get(event.museumId) : null;
        return {
          ...event,
          museum: museum ? { name: museum.name, category: museum.category } : null,
        };
      })
    );

    return eventsWithMuseum;
  },
});
