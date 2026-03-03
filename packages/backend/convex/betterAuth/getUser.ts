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

/** Resolve a user by email (case-insensitive exact match). */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email) return null;
    const users = await ctx.db.query("user").collect();
    const match = users.find((user) => user.email.trim().toLowerCase() === email);
    if (!match) return null;
    return { id: match._id as string, name: match.name, email: match.email };
  },
});

/** Search users by email fragment for admin member assignment UX. */
export const searchUsersByEmail = query({
  args: { emailQuery: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const queryText = args.emailQuery.trim().toLowerCase();
    if (queryText.length < 2) return [];
    const limit = Math.max(1, Math.min(args.limit ?? 10, 25));
    const users = await ctx.db.query("user").collect();
    return users
      .filter((user) => user.email.toLowerCase().includes(queryText))
      .slice(0, limit)
      .map((user) => ({ id: user._id as string, name: user.name, email: user.email }));
  },
});
