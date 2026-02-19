import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { query } from "./_generated/server";

const geospatial = new GeospatialIndex(components.geospatial);

export const nearestPoints = query({
  args: {
    point: v.object({ latitude: v.number(), longitude: v.number() }),
    maxRows: v.number(),
    maxDistance: v.optional(v.number()),
  },
  handler: async (ctx, { point, maxRows, maxDistance }) => {
    const results = await geospatial.nearest(ctx, {
      point,
      limit: maxRows,
      maxDistance,
    });
    return await Promise.all(
      results.map(async (result) => {
        const row = await ctx.db.get(result.key as Id<"museums"> | Id<"events">);
        if (!row) {
          throw new Error("Invalid locationId");
        }
        return result;
      }),
    );
  },
});