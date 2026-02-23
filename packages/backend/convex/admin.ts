import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { api, components, internal } from "./_generated/api";
import { authComponent } from "./auth";
import {
  listAllRequestsHelper,
  updateRequestStatusHelper,
} from "./organizationRequests";

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
async function fetchComponentOrganizationsForUser(ctx: QueryCtx, userId: string) {
  return await ctx.runQuery(components.betterAuth.getOrganization.listOrganizationsForUser, {
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
    const users = await ctx.runQuery(components.betterAuth.getUser.getUsers, { ids: userIds }) as UserDisplay[];
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
    return await ctx.runQuery(components.betterAuth.getOrganization.listOrganizations, {});
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

/** Action: list pending invitations with org names (admin). */
export const listPendingInvitationsForAdmin = action({
  args: {},
  handler: async (ctx): Promise<PendingInvitation[]> => {
    await requireAdminAction(ctx);
    const invitations = (await ctx.runQuery(components.betterAuth.invitations.listInvitations, {
      status: "pending",
    })) as PendingInvitation[];
    const withOrgNames = await Promise.all(
      invitations.map(async (inv) => {
        const org = await ctx.runQuery(components.betterAuth.getOrganization.getOrganization, {
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
    await ctx.runMutation(components.betterAuth.invitations.deleteInvitation, {
      id: args.invitationId,
    });
  },
});
