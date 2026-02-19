import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add an event
export const addEvent = mutation({
  args: {
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
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", args);
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
