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

/** List all organizations (for admin invite dropdown). */
export const listOrganizations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("organization").collect();
  },
});

/** List organizations the given user is a member of (for "your affiliations"). */
export const listOrganizationsForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    const orgs = [];
    for (const m of members) {
      const org = await ctx.db.get(m.organizationId as Id<"organization">);
      if (org) orgs.push(org);
    }
    return orgs;
  },
});
