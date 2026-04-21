import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { authComponent } from "./auth";

/** Id of an organization in the Better Auth component. Resolve via resolveOrganization or component getOrganization. */
export type BetterAuthOrgId = string;

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject?: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) throw new Error("Not authenticated");
  return identity.subject;
}

/** Returns the current user's organization request if it has status "approved". Use for org-scoped APIs. */
export async function getActiveApprovedRequest(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) return null;
  const requests = await ctx.db
    .query("organizationRequests")
    .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
    .collect();
  const latest = requests.length > 0 ? requests[requests.length - 1] : null;
  return latest?.status === "approved" ? latest : null;
}

/** Throws if the current user does not have an approved org request. Use at the start of org-scoped mutations/queries. */
export async function requireActiveApprovedRequest(ctx: QueryCtx) {
  const request = await getActiveApprovedRequest(ctx);
  if (!request) throw new Error("Active approved organization required");
  return request;
}

export const submitRequest = mutation({
  args: {
    museumName: v.string(),
    city: v.string(),
    state: v.string(),
    website: v.optional(v.string()),
    staffRole: v.optional(v.string()),
    betterAuthOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    return await ctx.db.insert("organizationRequests", {
      userId,
      museumName: args.museumName,
      city: args.city,
      state: args.state,
      website: args.website,
      staffRole: args.staffRole,
      status: "pending",
      betterAuthOrgId: args.betterAuthOrgId,
      createdAt: Date.now(),
    });
  },
});

export const getMyRequest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return null;

    const requests = await ctx.db
      .query("organizationRequests")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    return requests.length > 0 ? requests[requests.length - 1] : null;
  },
});

/**
 * Resolve betterAuthOrgId through the Better Auth component. Use this instead of
 * treating betterAuthOrgId as a raw string — it returns the organization document
 * from the component or null if missing/invalid.
 */
export const resolveOrganization = query({
  args: { betterAuthOrgId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.betterAuthOrgId) return null;
    const userId = await requireUserId(ctx);
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) throw new Error("User not found");
    if (currentUser.role !== "admin") {
      const requests = await ctx.db
        .query("organizationRequests")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
      const isAuthorized = requests.some(
        (request) =>
          request.status === "approved" && request.betterAuthOrgId === args.betterAuthOrgId
      );
      if (!isAuthorized) throw new Error("Forbidden");
    }
    return await ctx.runQuery((components.betterAuth as any).getOrganization.getOrganization, {
      id: args.betterAuthOrgId,
    });
  },
});

/** Shared helper: list all org requests (use from admin or internal query). */
export async function listAllRequestsHelper(ctx: QueryCtx) {
  return await ctx.db.query("organizationRequests").collect();
}

/** Internal only: list all org requests. Not callable from client; use from admin actions or HTTP. */
export const listAllRequests = internalQuery({
  args: {},
  handler: async (ctx) => listAllRequestsHelper(ctx),
});

/** Shared helper: set request status (use from admin or internal mutation). */
export async function updateRequestStatusHelper(
  ctx: MutationCtx,
  requestId: Id<"organizationRequests">,
  status: "approved" | "rejected"
) {
  await ctx.db.patch("organizationRequests", requestId, {
    status,
    reviewedAt: Date.now(),
  });
}

/** Internal only: approve or reject a request. Not callable from client; use from admin actions or HTTP. */
export const updateRequestStatus = internalMutation({
  args: {
    requestId: v.id("organizationRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) =>
    updateRequestStatusHelper(ctx, args.requestId, args.status),
});
