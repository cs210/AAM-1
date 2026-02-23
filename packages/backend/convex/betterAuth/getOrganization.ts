import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Resolve an organization by id. Exposed so the main app can treat
 * betterAuthOrgId as a reference (resolve via this API instead of using a raw string).
 */
export const getOrganization = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id as Id<"organization">);
  },
});
