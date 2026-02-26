import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/** List invitations, optionally filtered by status (e.g. "pending"). */
export const listInvitations = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("invitation")
        .withIndex("status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("invitation").collect();
  },
});

/** Delete/cancel an invitation by id. */
export const deleteInvitation = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id as Id<"invitation">);
  },
});
