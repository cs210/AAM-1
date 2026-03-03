import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Resolve an organization by id. Exposed so the main app can treat
 * betterAuthOrgId as a reference (resolve via this API instead of using a raw string).
 */
export const getOrganization = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id as Id<"organization">);
  },
});

/** List all organizations (for admin invite dropdown). */
export const listOrganizations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("organization").collect();
  },
});

/** List organizations the given user is a member of (for "your affiliations"). */
export const listOrganizationsForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    const orgs = [];
    for (const m of members) {
      const org = await ctx.db.get(m.organizationId as Id<"organization">);
      if (org) orgs.push(org);
    }
    return orgs;
  },
});

/** List members for a given organization with role metadata. */
export const listMembersByOrganization = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("member")
      .withIndex("organizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

/** Add a user to an organization (idempotent if already a member). */
export const addMemberToOrganization = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId as Id<"organization">);
    if (!organization) throw new Error("Organization not found");

    const user = await ctx.db.get(args.userId as Id<"user">);
    if (!user) throw new Error("User not found");

    const existingMember = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .first();

    if (existingMember) {
      if (args.role && existingMember.role !== args.role) {
        await ctx.db.patch(existingMember._id, { role: args.role });
      }
      return existingMember._id;
    }

    return await ctx.db.insert("member", {
      organizationId: args.organizationId,
      userId: args.userId,
      role: args.role ?? "member",
      createdAt: Date.now(),
    });
  },
});

/** Remove a user from an organization. */
export const removeMemberFromOrganization = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .first();
    if (!member) return;
    await ctx.db.delete(member._id);
  },
});
