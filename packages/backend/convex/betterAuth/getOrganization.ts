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
      if (org) orgs.push({ ...org, memberRole: m.role });
    }
    return orgs;
  },
});

/** Resolve a user's membership in an organization. */
export const getMember = query({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .first();
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
    role: v.optional(v.union(v.literal("member"), v.literal("owner"))),
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

    if (args.role === "owner") {
      const members = await ctx.db
        .query("member")
        .withIndex("organizationId", (q) => q.eq("organizationId", args.organizationId))
        .collect();
      for (const member of members) {
        if (member.role === "owner" && member._id !== existingMember?._id) {
          await ctx.db.patch(member._id, { role: "member" });
        }
      }
    }

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

/** Set a member role. Promoting an owner demotes any existing owners first. */
export const setMemberRole = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("member"), v.literal("owner")),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .first();
    if (!member) throw new Error("Member not found");

    if (args.role === "owner") {
      const owners = await ctx.db
        .query("member")
        .withIndex("organizationId", (q) => q.eq("organizationId", args.organizationId))
        .collect();
      for (const owner of owners) {
        if (owner.role === "owner" && owner._id !== member._id) {
          await ctx.db.patch(owner._id, { role: "member" });
        }
      }
    }

    await ctx.db.patch(member._id, { role: args.role });
    return member._id;
  },
});

/** Transfer ownership from the current owner to another member. */
export const transferOwnership = mutation({
  args: {
    organizationId: v.string(),
    fromUserId: v.string(),
    toUserId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.fromUserId === args.toUserId) {
      throw new Error("Choose a different member");
    }

    const members = await ctx.db
      .query("member")
      .withIndex("organizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    const currentOwner = members.find((member) => member.userId === args.fromUserId);
    if (!currentOwner || currentOwner.role !== "owner") {
      throw new Error("Only the organization owner can transfer ownership");
    }

    const nextOwner = members.find((member) => member.userId === args.toUserId);
    if (!nextOwner) throw new Error("Target member not found");

    for (const member of members) {
      if (member._id === nextOwner._id) {
        await ctx.db.patch(member._id, { role: "owner" });
      } else if (member.role === "owner") {
        await ctx.db.patch(member._id, { role: "member" });
      }
    }

    return nextOwner._id;
  },
});

/** Delete an organization and its Better Auth membership/invitation rows. */
export const deleteOrganization = mutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId as Id<"organization">);
    if (!organization) return { deleted: false };

    const members = await ctx.db
      .query("member")
      .withIndex("organizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    const invitations = await ctx.db
      .query("invitation")
      .withIndex("organizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }

    await ctx.db.delete(organization._id);
    return { deleted: true };
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
