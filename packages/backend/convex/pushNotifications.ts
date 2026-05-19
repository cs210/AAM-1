import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent } from "./auth";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const ANDROID_CHANNEL_ID = "social-mentions";

export const listTokensForUsers = internalQuery({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const out: { token: string }[] = [];
    const seen = new Set<string>();
    for (const userId of args.userIds) {
      const rows = await ctx.db
        .query("expoPushTokens")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
      for (const row of rows) {
        if (seen.has(row.token)) continue;
        seen.add(row.token);
        out.push({ token: row.token });
      }
    }
    return out;
  },
});

export const removeTokenByValue = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("expoPushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (row) await ctx.db.delete(row._id);
  },
});

/** Called from the mobile app after sign-in so mentions can reach this device while the app is closed. */
export const registerExpoPushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const trimmed = args.token.trim();
    if (!trimmed.startsWith("ExponentPushToken[")) {
      throw new Error("Invalid Expo push token");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("expoPushTokens")
      .withIndex("by_token", (q) => q.eq("token", trimmed))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { userId: user._id, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("expoPushTokens", {
      userId: user._id,
      token: trimmed,
      updatedAt: now,
    });
  },
});

/** Removes a device token (e.g. after sign-out). No auth — possession of the token is sufficient. */
export const removeExpoPushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const trimmed = args.token.trim();
    const row = await ctx.db
      .query("expoPushTokens")
      .withIndex("by_token", (q) => q.eq("token", trimmed))
      .first();
    if (row) await ctx.db.delete(row._id);
    return true;
  },
});

type ExpoPushTicket =
  | { status: "ok"; id?: string }
  | { status: "error"; message?: string; details?: { error?: string } };

function normalizeTickets(data: unknown): ExpoPushTicket[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as ExpoPushTicket[];
  return [data as ExpoPushTicket];
}

/**
 * Sends mention pushes via Expo Push API. Requires EXPO_ACCESS_TOKEN in Convex env for reliable delivery.
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */
export const sendMentionExpoPushes = internalAction({
  args: {
    recipientUserIds: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    data: v.object({
      kind: v.literal("mention_in_checkin"),
      museumId: v.string(),
      checkInId: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.runQuery(internal.pushNotifications.listTokensForUsers, {
      userIds: args.recipientUserIds,
    });
    if (rows.length === 0) {
      return { sent: 0, skipped: "no_tokens" as const };
    }

    const messages = rows.map((row) => ({
      to: row.token,
      title: args.title,
      body: args.body,
      sound: "default" as const,
      priority: "high" as const,
      channelId: ANDROID_CHANNEL_ID,
      data: {
        kind: args.data.kind,
        museumId: args.data.museumId,
        checkInId: args.data.checkInId,
      },
    }));

    const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip",
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    let sent = 0;
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(chunk),
      });

      const raw = (await res.json()) as { data?: unknown; errors?: unknown };
      if (!res.ok) {
        console.error("[pushNotifications] Expo push HTTP error", res.status, raw);
        continue;
      }

      const tickets = normalizeTickets(raw.data);
      for (let j = 0; j < tickets.length; j += 1) {
        const ticket = tickets[j];
        const token = chunk[j]?.to;
        if (ticket?.status === "ok") {
          sent += 1;
        } else if (token && ticket?.status === "error") {
          const err = ticket.details?.error;
          console.warn("[pushNotifications] ticket error", err, ticket.message);
          if (err === "DeviceNotRegistered") {
            await ctx.runMutation(internal.pushNotifications.removeTokenByValue, { token });
          }
        }
      }
    }

    return { sent };
  },
});
