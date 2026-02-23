import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveApprovedRequest } from "./organizationRequests";

// Add a museum (org-scoped: only users with an approved org request can add).
// When museums are linked to org in schema, pass betterAuthOrgId from the approved request.
export const addMuseum = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    location: v.object({
      address: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      latitude: v.float64(),
      longitude: v.float64(),
    }),
    imageUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireActiveApprovedRequest(ctx);
    return await ctx.db.insert("museums", args);
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
