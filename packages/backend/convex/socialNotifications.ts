import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const MENTION_TYPE = "mention_in_checkin" as const;
const MAX_MENTIONS_PER_CHECKIN = 20;

/** @"Full Name" or @token — token is matched to userId (exact) or profile name (exact index). */
const MENTION_RE = /@"([^"]+)"|@([A-Za-z0-9_.-]+)/g;

function collectMentionTokens(review: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of review.matchAll(MENTION_RE)) {
    const raw = (m[1] ?? m[2] ?? "").trim();
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
    if (out.length >= MAX_MENTIONS_PER_CHECKIN) break;
  }
  return out;
}

async function resolveMentionToUserId(
  ctx: MutationCtx,
  token: string
): Promise<string | null> {
  const t = token.trim();
  if (!t) return null;

  const byId = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", t))
    .first();
  if (byId) return byId.userId;

  const byName = await ctx.db
    .query("userProfiles")
    .withIndex("by_name", (q) => q.eq("name", t))
    .first();
  if (byName) return byName.userId;

  return null;
}

export const enqueueMentionsForCheckIn = internalMutation({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, args) => {
    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn) return;

    const existing = await ctx.db
      .query("socialNotifications")
      .withIndex("by_checkIn", (q) => q.eq("checkInId", args.checkInId))
      .collect();
    for (const row of existing) {
      if (row.type === MENTION_TYPE) {
        await ctx.db.delete(row._id);
      }
    }

    const review = checkIn.review?.trim();
    if (!review) return;

    if (checkIn.contentType !== "museum") return;

    const museumDoc = await ctx.db.get(checkIn.contentId);
    if (!museumDoc || !("name" in museumDoc)) return;
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

    const tokens = collectMentionTokens(review);
    const recipientIds = new Set<string>();

    for (const token of tokens) {
      const uid = await resolveMentionToUserId(ctx, token);
      if (!uid || uid === posterId) continue;
      recipientIds.add(uid);
    }

    const now = Date.now();
    for (const recipientUserId of recipientIds) {
      const prefs = await ctx.db
        .query("socialNotificationPrefs")
        .withIndex("by_userId", (q) => q.eq("userId", recipientUserId))
        .first();
      if (prefs?.mutedSocial) continue;

      const bodyPreview = `${firstName} mentioned you in a check-in at ${museumName}.`;

      await ctx.db.insert("socialNotifications", {
        recipientUserId,
        actorUserId: posterId,
        checkInId: args.checkInId,
        museumId,
        museumName,
        type: MENTION_TYPE,
        bodyPreview,
        createdAt: now,
      });
    }
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
