import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveApprovedRequest } from "./organizationRequests";

const geospatial = new GeospatialIndex(components.geospatial);
// Add a museum
export const addMuseum = mutation({
  args: {
    point: v.object({ latitude: v.number(), longitude: v.number() }),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    location: v.object({
      address: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string())
    }),
    imageUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { point, ...args}) => {
    const id = await ctx.db.insert("museums", args);
    await geospatial.insert(ctx, id, point, { category: args.category });
  },
});

// List all museums
export const listMuseums = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("museums").collect();
  },
});

// Get museum by ID
export const getMuseum = query({
  args: { id: v.id("museums") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
