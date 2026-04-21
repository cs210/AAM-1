import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) throw new Error("Not authenticated");
  const currentUser = await ctx.db.get(identity.subject as Id<"user">);
  if (!currentUser) throw new Error("User not found");
  if (currentUser.role !== "admin") throw new Error("Admin access required");
}

/** List invitations, optionally filtered by status (e.g. "pending"). */
export const listInvitations = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    await ctx.db.delete(args.id as Id<"invitation">);
  },
});
