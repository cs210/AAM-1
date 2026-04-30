import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const MENTION_TYPE = "mention_in_checkin" as const;

/**
 * Sync notifications for a check-in based on its current `friendUserIds` (people
 * the poster tagged via the "Who visited with you?" picker). Replaces existing
 * mention rows for the check-in so updates are idempotent. Safe to call from
 * both create and update flows.
 */
export async function notifyTaggedFriendsForCheckIn(
  ctx: MutationCtx,
  checkInId: Id<"checkIns">
): Promise<{ inserted: number; skippedSelf: number; skippedMuted: number }> {
  const checkIn = await ctx.db.get(checkInId);
  if (!checkIn) {
    return { inserted: 0, skippedSelf: 0, skippedMuted: 0 };
  }

  const existing = await ctx.db
    .query("socialNotifications")
    .withIndex("by_checkIn", (q) => q.eq("checkInId", checkInId))
    .collect();
  for (const row of existing) {
    if (row.type === MENTION_TYPE) {
      await ctx.db.delete(row._id);
    }
  }

  if (checkIn.contentType !== "museum") {
    return { inserted: 0, skippedSelf: 0, skippedMuted: 0 };
  }

  const museumDoc = await ctx.db.get(checkIn.contentId);
  if (!museumDoc || !("name" in museumDoc)) {
    return { inserted: 0, skippedSelf: 0, skippedMuted: 0 };
  }
  const museumName = museumDoc.name;
  const museumId = checkIn.contentId as Id<"museums">;

  const posterId = checkIn.userId;
  const actorProfile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", posterId))
    .first();
  const firstName =
    actorProfile?.name?.trim().split(/\s+/)[0] ||
    actorProfile?.email?.split("@")[0] ||
    "Someone";

  const recipientIds = new Set<string>();
  let skippedSelf = 0;
  for (const taggedUserId of checkIn.friendUserIds ?? []) {
    if (!taggedUserId) continue;
    if (taggedUserId === posterId) {
      skippedSelf += 1;
      continue;
    }
    recipientIds.add(taggedUserId);
  }

  let inserted = 0;
  let skippedMuted = 0;
  const now = Date.now();
  for (const recipientUserId of recipientIds) {
    const prefs = await ctx.db
      .query("socialNotificationPrefs")
      .withIndex("by_userId", (q) => q.eq("userId", recipientUserId))
      .first();
    if (prefs?.mutedSocial) {
      skippedMuted += 1;
      continue;
    }

    const bodyPreview = `${firstName} tagged you in a check-in at ${museumName}.`;

    await ctx.db.insert("socialNotifications", {
      recipientUserId,
      actorUserId: posterId,
      checkInId,
      museumId,
      museumName,
      type: MENTION_TYPE,
      bodyPreview,
      createdAt: now,
    });
    inserted += 1;
  }

  console.log(
    `[socialNotifications] checkIn=${checkInId} tags=${(checkIn.friendUserIds ?? []).length} inserted=${inserted} skippedSelf=${skippedSelf} skippedMuted=${skippedMuted}`
  );

  return { inserted, skippedSelf, skippedMuted };
}

export const enqueueMentionsForCheckIn = internalMutation({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, args) => {
    return await notifyTaggedFriendsForCheckIn(ctx, args.checkInId);
  },
});

export const listForCurrentUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const limit = Math.min(args.limit ?? 50, 100);
    return await ctx.db
      .query("socialNotifications")
      .withIndex("by_recipient_created", (q) => q.eq("recipientUserId", user._id))
      .order("desc")
      .take(limit);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return 0;

    const recent = await ctx.db
      .query("socialNotifications")
      .withIndex("by_recipient_created", (q) => q.eq("recipientUserId", user._id))
      .order("desc")
      .take(200);
    return recent.filter((n) => n.readAt == null).length;
  },
});

export const totalCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return 0;

    const recent = await ctx.db
      .query("socialNotifications")
      .withIndex("by_recipient_created", (q) => q.eq("recipientUserId", user._id))
      .order("desc")
      .take(200);
    return recent.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("socialNotifications") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const row = await ctx.db.get(args.notificationId);
    if (!row || row.recipientUserId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.notificationId, { readAt: Date.now() });
    return true;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("socialNotifications")
      .withIndex("by_recipient_created", (q) => q.eq("recipientUserId", user._id))
      .order("desc")
      .take(200);

    const now = Date.now();
    for (const n of unread) {
      if (n.readAt == null) {
        await ctx.db.patch(n._id, { readAt: now });
      }
    }
    return true;
  },
});

export const getPrefs = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return { mutedSocial: false };

    const prefs = await ctx.db
      .query("socialNotificationPrefs")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    return { mutedSocial: prefs?.mutedSocial ?? false };
  },
});

export const setMutedSocial = mutation({
  args: { muted: v.boolean() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("socialNotificationPrefs")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { mutedSocial: args.muted, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("socialNotificationPrefs", {
      userId: user._id,
      mutedSocial: args.muted,
      updatedAt: now,
    });
  },
});
