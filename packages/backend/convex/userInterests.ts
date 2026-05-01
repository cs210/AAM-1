import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

export const getForCurrentAccount = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("userInterests")
      .withIndex("by_accountId", (q) => q.eq("accountId", user._id as string))
      .first();
  },
});

export const saveForCurrentAccount = mutation({
  args: {
    userInfo: v.record(
      v.string(), // question id
      v.union(v.string(), v.number(), v.array(v.string())), // answer (choice/text, scale, or multi-select)
    ),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const accountId = user._id as string;

    const existing = await ctx.db
      .query("userInterests")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userInfo: args.userInfo,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("userInterests", {
      accountId,
      userInfo: args.userInfo,
      createdAt: now,
      updatedAt: now,
    });
  },
});
