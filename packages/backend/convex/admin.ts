import { GeospatialIndex } from "@convex-dev/geospatial";
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { api, components, internal } from "./_generated/api";
import { authComponent } from "./auth";
import { updateRequestStatusHelper } from "./organizationRequests";

const geospatial = new GeospatialIndex(components.geospatial);

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");
  const role = (user as { role?: string | null }).role;
  if (role !== "admin") throw new Error("Admin access required");
  return user;
}

async function requireAdminAction(ctx: ActionCtx) {
  const user = await ctx.runQuery(api.auth.getCurrentUser, {});
  if (!user) throw new Error("Not authenticated");
  const role = (user as { role?: string | null }).role;
  if (role !== "admin") throw new Error("Admin access required");
  return user;
}

// Component calls from queries (sparingly; components require runQuery).
// Cast: getOrganization may be provided by component extension; package types omit it.
async function fetchComponentOrganizationsForUser(ctx: QueryCtx, userId: string) {
  return await ctx.runQuery((components.betterAuth as any).getOrganization.listOrganizationsForUser, {
    userId,
  });
}

type OrgRequestRow = Doc<"organizationRequests">;
type UserDisplay = { id: string; name: string; email: string };

/** Action: list org requests with resolved user display (avoids query-calling-query warning). */
export const listOrgRequestsForAdmin = action({
  args: {},
  handler: async (ctx): Promise<(OrgRequestRow & { userDisplay: string; orgDisplay: string })[]> => {
    await requireAdminAction(ctx);
    const requests = await ctx.runQuery(internal.organizationRequests.listAllRequests, {}) as OrgRequestRow[];
    const userIds: string[] = [...new Set(requests.map((r: OrgRequestRow) => r.userId))];
    const users = await ctx.runQuery((components.betterAuth as any).getUser.getUsers, { ids: userIds }) as UserDisplay[];
    const userMap = new Map(users.map((u: UserDisplay) => [u.id, u]));
    return requests.map((req: OrgRequestRow) => {
      const u = userMap.get(req.userId);
      const userDisplay = u ? `${u.name || u.email || "Unknown"} (${req.userId})` : req.userId;
      const orgDisplay = req.betterAuthOrgId
        ? `${req.museumName} (${req.betterAuthOrgId})`
        : req.museumName;
      return { ...req, userDisplay, orgDisplay };
    });
  },
});

export const setOrgRequestStatusForAdmin = mutation({
  args: {
    requestId: v.id("organizationRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await updateRequestStatusHelper(ctx, args.requestId, args.status);
  },
});

/** Action: list all organizations (avoids query-calling-component warning). */
export const listOrganizationsForAdmin = action({
  args: {},
  handler: async (ctx) => {
    await requireAdminAction(ctx);
    return await ctx.runQuery((components.betterAuth as any).getOrganization.listOrganizations, {});
  },
});

/** List organizations the current user is a member of (affiliations). No admin required. */
export const listMyOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return [];
    return await fetchComponentOrganizationsForUser(ctx, identity.subject);
  },
});

type PendingInvitation = {
  _id: string;
  organizationId: string;
  email: string;
  role?: string | null;
  status: string;
  expiresAt: number;
  createdAt: number;
  inviterId: string;
  organizationName?: string;
};

type MuseumAdminRow = Doc<"museums"> & {
  point: { latitude: number; longitude: number } | null;
};

const museumPointValidator = v.object({
  latitude: v.number(),
  longitude: v.number(),
});

const museumLocationValidator = v.object({
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  state: v.optional(v.string()),
});

/** Action: list pending invitations with org names (admin). */
export const listPendingInvitationsForAdmin = action({
  args: {},
  handler: async (ctx): Promise<PendingInvitation[]> => {
    await requireAdminAction(ctx);
    const invitations = (await ctx.runQuery((components.betterAuth as any).invitations.listInvitations, {
      status: "pending",
    })) as PendingInvitation[];
    const withOrgNames = await Promise.all(
      invitations.map(async (inv) => {
        const org = await ctx.runQuery((components.betterAuth as any).getOrganization.getOrganization, {
          id: inv.organizationId,
        });
        return { ...inv, organizationName: org?.name };
      })
    );
    return withOrgNames;
  },
});

/** Action: cancel a pending invitation (admin). */
export const cancelInvitationForAdmin = action({
  args: { invitationId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx);
    await ctx.runMutation((components.betterAuth as any).invitations.deleteInvitation, {
      id: args.invitationId,
    });
  },
});

/** Action: list all museums with geospatial coordinates (admin). */
export const listMuseumsForAdmin = action({
  args: {},
  handler: async (ctx): Promise<MuseumAdminRow[]> => {
    await requireAdminAction(ctx);
    const museums = await ctx.runQuery(api.museums.listMuseums, {});
    const rowsWithPoints = await Promise.all(
      museums.map(async (museum) => {
        const geospatialDoc = await ctx.runQuery(components.geospatial.document.get, {
          key: museum._id,
        });
        return {
          ...museum,
          point: geospatialDoc?.coordinates ?? null,
        };
      })
    );
    return rowsWithPoints.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Mutation: create a museum (admin). */
export const createMuseumForAdmin = mutation({
  args: {
    point: museumPointValidator,
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    location: museumLocationValidator,
    imageUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { point, ...museum }) => {
    await requireAdmin(ctx);
    const museumId = await ctx.db.insert("museums", museum);
    await geospatial.insert(ctx, museumId, point, { category: museum.category });
    return museumId;
  },
});

/** Mutation: update a museum and refresh geospatial coordinates (admin). */
export const updateMuseumForAdmin = mutation({
  args: {
    museumId: v.id("museums"),
    point: museumPointValidator,
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    location: museumLocationValidator,
    imageUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { museumId, point, ...museum }) => {
    await requireAdmin(ctx);
    const existingMuseum = await ctx.db.get(museumId);
    if (!existingMuseum) throw new Error("Museum not found");

    await ctx.db.patch(museumId, museum);
    await geospatial.insert(ctx, museumId, point, { category: museum.category });
    return museumId;
  },
});

/** Mutation: delete a museum and related geospatial/dependent records (admin). */
export const deleteMuseumForAdmin = mutation({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existingMuseum = await ctx.db.get(args.museumId);
    if (!existingMuseum) throw new Error("Museum not found");

    const museumIdString = args.museumId as string;

    const museumRatings = await ctx.db
      .query("userRatings")
      .withIndex("by_content", (q) =>
        q.eq("contentType", "museum").eq("contentId", museumIdString)
      )
      .collect();
    for (const rating of museumRatings) {
      await ctx.db.delete(rating._id);
    }

    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
      .collect();
    for (const follow of follows) {
      await ctx.db.delete(follow._id);
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
      .collect();
    for (const event of events) {
      const eventIdString = event._id as string;

      const eventRatings = await ctx.db
        .query("userRatings")
        .withIndex("by_content", (q) =>
          q.eq("contentType", "event").eq("contentId", eventIdString)
        )
        .collect();
      for (const rating of eventRatings) {
        await ctx.db.delete(rating._id);
      }

      await geospatial.remove(ctx, event._id);
      await ctx.db.delete(event._id);
    }

    await geospatial.remove(ctx, args.museumId);
    await ctx.db.delete(args.museumId);
  },
});
