import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";

const geospatial = new GeospatialIndex(components.geospatial);

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");
  const role = (user as { role?: string | null }).role;
  if (role !== "admin") throw new Error("Admin access required");
  return user;
}

// Add a museum (admin only).
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
  handler: async (ctx, { point, ...args }) => {
    await requireAdmin(ctx);
    const id = await ctx.db.insert("museums", args);
    await geospatial.insert(ctx, id, point, { category: args.category });
    return id;
  },
});

// List all museums
export const listMuseums = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("museums").collect();
  },
});

// List all museums with computed stats (average rating, rating count)
export const listMuseumsWithStats = query({
  args: {},
  handler: async (ctx) => {
    const museums = await ctx.db.query("museums").collect();

    // Get stats for each museum
    const museumsWithStats = await Promise.all(
      museums.map(async (museum) => {
        const ratings = await ctx.db
          .query("userRatings")
          .withIndex("by_content", (q) =>
            q.eq("contentType", "museum").eq("contentId", museum._id)
          )
          .collect();

        const ratingCount = ratings.length;
        const averageRating =
          ratingCount > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount
            : null;

        return {
          ...museum,
          averageRating,
          ratingCount,
        };
      })
    );

    return museumsWithStats;
  },
});

// Get museum by ID
export const getMuseum = query({
  args: { id: v.id("museums") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
