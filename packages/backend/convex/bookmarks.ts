import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Bookmark a museum
export const bookmarkMuseum = mutation({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Check if already bookmarked
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_museum", (q) =>
        q.eq("userId", user._id).eq("museumId", args.museumId)
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("bookmarks", {
      userId: user._id,
      museumId: args.museumId,
      bookmarkedAt: Date.now(),
    });
  },
});

// Remove a bookmark
export const removeBookmark = mutation({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_museum", (q) =>
        q.eq("userId", user._id).eq("museumId", args.museumId)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

// Toggle bookmark (add if not exists, remove if exists)
export const toggleBookmark = mutation({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_museum", (q) =>
        q.eq("userId", user._id).eq("museumId", args.museumId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    } else {
      await ctx.db.insert("bookmarks", {
        userId: user._id,
        museumId: args.museumId,
        bookmarkedAt: Date.now(),
      });
      return { bookmarked: true };
    }
  },
});

// Check if current user has bookmarked a museum
export const isBookmarked = query({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return false;

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_museum", (q) =>
        q.eq("userId", user._id).eq("museumId", args.museumId)
      )
      .first();
    return !!existing;
  },
});

// Get all bookmarks for current user
export const getBookmarks = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Fetch museum details for each bookmark
    const museumsWithBookmarks = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const museum = await ctx.db.get(bookmark.museumId);
        return { ...bookmark, museum };
      })
    );

    return museumsWithBookmarks;
  },
});
