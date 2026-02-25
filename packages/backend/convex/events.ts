import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

// List events that are currently ongoing
export const listOngoingEvents = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("events")
      .withIndex("by_dates", (q) => q.lte("startDate", now))
      .filter((q) => q.gte(q.field("endDate"), now))
      .take(100);
  },
});

// Get event by ID
export const getEvent = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
