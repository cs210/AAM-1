import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

export const upsertMuseumSource = mutation({
  args: {
    museumId: v.id("museums"),
    provider: v.string(),
    enabled: v.boolean(),
    providerConfig: v.optional(v.string()),
    externalMuseumId: v.optional(v.string()),
    syncIntervalMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("museumSources")
      .withIndex("by_museum_provider", (q) =>
        q.eq("museumId", args.museumId).eq("provider", args.provider)
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        providerConfig: args.providerConfig,
        externalMuseumId: args.externalMuseumId,
        syncIntervalMinutes: args.syncIntervalMinutes,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("museumSources", {
      museumId: args.museumId,
      provider: args.provider,
      enabled: args.enabled,
      providerConfig: args.providerConfig,
      externalMuseumId: args.externalMuseumId,
      syncIntervalMinutes: args.syncIntervalMinutes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listMuseumSources = query({
  args: { museumId: v.optional(v.id("museums")) },
  handler: async (ctx, args) => {
    if (args.museumId) {
      return await ctx.db
        .query("museumSources")
        .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
        .collect();
    }

    return await ctx.db.query("museumSources").collect();
  },
});

export const listEnabledSources = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("museumSources")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();
  },
});
