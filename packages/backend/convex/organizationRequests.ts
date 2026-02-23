import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUser } from "./auth";

export const submitRequest = mutation({
  args: {
    museumName: v.string(),
    city: v.string(),
    state: v.string(),
    website: v.optional(v.string()),
    staffRole: v.optional(v.string()),
    betterAuthOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    return await ctx.db.insert("organizationRequests", {
      userId: user.userId,
      museumName: args.museumName,
      city: args.city,
      state: args.state,
      website: args.website,
      staffRole: args.staffRole,
      status: "pending",
      betterAuthOrgId: args.betterAuthOrgId,
      createdAt: Date.now(),
    });
  },
});

export const getMyRequest = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) return null;

    const requests = await ctx.db
      .query("organizationRequests")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .collect();

    return requests.length > 0 ? requests[requests.length - 1] : null;
  },
});

export const listAllRequests = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("organizationRequests").collect();
  },
});

export const updateRequestStatus = mutation({
  args: {
    requestId: v.id("organizationRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      status: args.status,
      reviewedAt: Date.now(),
    });
  },
});
