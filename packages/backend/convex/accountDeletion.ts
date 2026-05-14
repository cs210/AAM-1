import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

type CleanupResult = {
  deleted: number;
  patched: number;
};

async function deleteRowsByUser<T extends { _id: Id<any> }>(
  ctx: MutationCtx,
  rows: T[],
) {
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteBetterAuthRowsByField(
  ctx: MutationCtx,
  model: "member" | "invitation",
  field: "userId" | "inviterId",
  value: string,
) {
  let deleted = 0;
  let cursor: string | null = null;

  do {
    const result: {
      count?: number;
      continueCursor?: string | null;
      isDone?: boolean;
    } = await ctx.runMutation(
      (components.betterAuth as any).adapter.deleteMany,
      {
        input: {
          model,
          where: [{ field, value }],
        },
        paginationOpts: { cursor, numItems: 200 },
      },
    );
    deleted += result?.count ?? 0;
    cursor = result?.continueCursor ?? null;
    if (result?.isDone !== false) break;
  } while (cursor !== null);

  return deleted;
}

export const cleanupDeletedUserData = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<CleanupResult> => {
    const { userId } = args;
    let deleted = 0;
    let patched = 0;

    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const checkIn of checkIns) {
      const notifications = await ctx.db
        .query("socialNotifications")
        .withIndex("by_checkIn", (q) => q.eq("checkInId", checkIn._id))
        .collect();
      deleted += await deleteRowsByUser(ctx, notifications);

      for (const storageId of checkIn.imageIds ?? []) {
        try {
          await ctx.storage.delete(storageId);
        } catch {
          // Storage rows may already be gone if an earlier cleanup partially ran.
        }
      }

      await ctx.db.delete(checkIn._id);
      deleted += 1;
    }

    const remainingCheckIns = await ctx.db.query("checkIns").collect();
    for (const checkIn of remainingCheckIns) {
      const friendUserIds = checkIn.friendUserIds ?? [];
      if (!friendUserIds.includes(userId)) continue;
      await ctx.db.patch(checkIn._id, {
        friendUserIds: friendUserIds.filter(
          (friendUserId) => friendUserId !== userId,
        ),
      });
      patched += 1;
    }

    deleted += await deleteRowsByUser(
      ctx,
      await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect(),
    );
    deleted += await deleteRowsByUser(
      ctx,
      await ctx.db
        .query("userFollows")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    );
    deleted += await deleteRowsByUser(
      ctx,
      await ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    );
    deleted += await deleteRowsByUser(
      ctx,
      await ctx.db
        .query("userUserFollows")
        .withIndex("by_follower", (q) => q.eq("followerId", userId))
        .collect(),
    );
    deleted += await deleteRowsByUser(
      ctx,
      await ctx.db
        .query("userUserFollows")
        .withIndex("by_following", (q) => q.eq("followingId", userId))
        .collect(),
    );
    deleted += await deleteRowsByUser(
      ctx,
      await ctx.db
        .query("socialNotifications")
        .withIndex("by_recipient_created", (q) =>
          q.eq("recipientUserId", userId),
        )
        .collect(),
    );

    const actorNotifications = (
      await ctx.db.query("socialNotifications").collect()
    ).filter((notification) => notification.actorUserId === userId);
    deleted += await deleteRowsByUser(ctx, actorNotifications);

    deleted += await deleteRowsByUser(
      ctx,
      await ctx.db
        .query("socialNotificationPrefs")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect(),
    );
    deleted += await deleteRowsByUser(
      ctx,
      await ctx.db
        .query("userInterests")
        .withIndex("by_accountId", (q) => q.eq("accountId", userId))
        .collect(),
    );
    deleted += await deleteRowsByUser(
      ctx,
      await ctx.db
        .query("organizationRequests")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect(),
    );

    deleted += await deleteBetterAuthRowsByField(
      ctx,
      "member",
      "userId",
      userId,
    );
    deleted += await deleteBetterAuthRowsByField(
      ctx,
      "invitation",
      "inviterId",
      userId,
    );

    return { deleted, patched };
  },
});
