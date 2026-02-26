import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Get user by id. Exposed so the main app can resolve userId to name/email for display.
 */
export const getUser = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id as Id<"user">);
    if (!user) return null;
    return { name: user.name, email: user.email };
  },
});

/** Batch get users by ids (one component call for admin list). */
export const getUsers = query({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: { id: string; name: string; email: string }[] = [];
    for (const id of args.ids) {
      const user = await ctx.db.get(id as Id<"user">);
      if (user) results.push({ id, name: user.name, email: user.email });
    }
    return results;
  },
});
