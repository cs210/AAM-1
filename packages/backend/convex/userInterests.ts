import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const ALLOWED_USER_INFO_KEYS = new Set([
  "visit_frequency",
  "favorite_type",
  "visit_style",
  "motivation",
  "barriers",
  "interest_scale",
  "preferred_time",
  "programs",
  "discovery",
  "anything_else",
]);

function validateUserInfo(userInfo: Record<string, string | number>) {
  const entries = Object.entries(userInfo);
  if (entries.length > ALLOWED_USER_INFO_KEYS.size) {
    throw new Error("Too many userInfo entries");
  }
  for (const [key, value] of entries) {
    if (!ALLOWED_USER_INFO_KEYS.has(key)) {
      throw new Error(`Unsupported userInfo key: ${key}`);
    }
    if (typeof value === "string" && value.length > 280) {
      throw new Error(`Value for ${key} is too long`);
    }
    if (typeof value === "number" && (value < 0 || value > 10)) {
      throw new Error(`Value for ${key} is out of range`);
    }
  }
}

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
      v.union(v.string(), v.number()), // answer (choice/text or scale)
    ),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    validateUserInfo(args.userInfo);

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
