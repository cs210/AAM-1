import { components } from "./_generated/api";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";

const interactionTypeValidator = v.union(
  v.literal("quiz"),
  v.literal("scavenger_step"),
  v.literal("badge"),
  v.literal("info_audio")
);

async function requireAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

type OrganizationRow = { _id?: string; id?: string };

function getOrganizationId(organization: OrganizationRow) {
  return organization._id ?? organization.id ?? "";
}

async function listOrganizationIdsForUser(ctx: QueryCtx | MutationCtx, userId: string) {
  const organizations = (await ctx.runQuery(
    (components.betterAuth as any).getOrganization.listOrganizationsForUser,
    { userId }
  )) as OrganizationRow[];
  return organizations.map(getOrganizationId).filter(Boolean);
}

async function hasLinkedMuseumAccess(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  museumId: Id<"museums">
) {
  const link = await ctx.db
    .query("organizationMuseumLinks")
    .withIndex("by_museum", (q) => q.eq("museumId", museumId))
    .first();
  if (!link) return false;
  const orgIds = new Set(await listOrganizationIdsForUser(ctx, userId));
  return orgIds.has(link.betterAuthOrgId);
}

async function assertDashboardMuseumAccess(
  ctx: QueryCtx | MutationCtx,
  user: { _id: string; role?: string | null },
  museumId: Id<"museums">
) {
  if (user.role === "admin") return;
  const allowed = await hasLinkedMuseumAccess(ctx, user._id, museumId);
  if (!allowed) throw new Error("Museum access denied");
}

async function getMuseumIdFromExhibition(
  ctx: QueryCtx | MutationCtx,
  exhibitionId: Id<"exhibitions">
): Promise<Id<"museums">> {
  const exhibition = await ctx.db.get(exhibitionId);
  if (!exhibition) throw new Error("Exhibition not found");
  return exhibition.museumId;
}

async function getMuseumIdFromHall(
  ctx: QueryCtx | MutationCtx,
  hallId: Id<"halls">
): Promise<Id<"museums">> {
  const hall = await ctx.db.get(hallId);
  if (!hall) throw new Error("Hall not found");
  return getMuseumIdFromExhibition(ctx, hall.exhibitionId);
}

async function assertAccessForExhibition(
  ctx: QueryCtx | MutationCtx,
  user: { _id: string; role?: string | null },
  exhibitionId: Id<"exhibitions">
) {
  const museumId = await getMuseumIdFromExhibition(ctx, exhibitionId);
  await assertDashboardMuseumAccess(ctx, user, museumId);
}

async function assertAccessForHall(
  ctx: QueryCtx | MutationCtx,
  user: { _id: string; role?: string | null },
  hallId: Id<"halls">
) {
  const museumId = await getMuseumIdFromHall(ctx, hallId);
  await assertDashboardMuseumAccess(ctx, user, museumId);
}

// --- Exhibitions ---

export const listExhibitionsByMuseum = query({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertDashboardMuseumAccess(
      ctx,
      user as { _id: string; role?: string | null },
      args.museumId
    );
    return await ctx.db
      .query("exhibitions")
      .withIndex("by_museum_sortOrder", (q) => q.eq("museumId", args.museumId))
      .collect();
  },
});

export const listPublicExhibitionsByMuseum = query({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("exhibitions")
      .withIndex("by_museum_sortOrder", (q) => q.eq("museumId", args.museumId))
      .collect();
  },
});

export const getPublicExhibition = query({
  args: { id: v.id("exhibitions") },
  handler: async (ctx, args) => {
    const exhibition = await ctx.db.get(args.id);
    if (!exhibition) return null;

    const museum = await ctx.db.get(exhibition.museumId);
    return {
      ...exhibition,
      museum: museum
        ? {
            _id: museum._id,
            name: museum.name,
            category: museum.category,
            imageUrl: museum.imageUrl,
            location: museum.location,
          }
        : null,
    };
  },
});

export const getExhibition = query({
  args: { id: v.id("exhibitions") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForExhibition(
      ctx,
      user as { _id: string; role?: string | null },
      args.id
    );
    return await ctx.db.get(args.id);
  },
});

export const createExhibition = mutation({
  args: {
    museumId: v.id("museums"),
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertDashboardMuseumAccess(
      ctx,
      user as { _id: string; role?: string | null },
      args.museumId
    );
    return await ctx.db.insert("exhibitions", args);
  },
});

export const updateExhibition = mutation({
  args: {
    id: v.id("exhibitions"),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    startDate: v.optional(v.union(v.number(), v.null())),
    endDate: v.optional(v.union(v.number(), v.null())),
    imageUrl: v.optional(v.union(v.string(), v.null())),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForExhibition(
      ctx,
      user as { _id: string; role?: string | null },
      args.id
    );
    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) {
      patch.description = updates.description === null ? undefined : updates.description;
    }
    if (updates.startDate !== undefined) {
      patch.startDate = updates.startDate === null ? undefined : updates.startDate;
    }
    if (updates.endDate !== undefined) {
      patch.endDate = updates.endDate === null ? undefined : updates.endDate;
    }
    if (updates.imageUrl !== undefined) {
      patch.imageUrl = updates.imageUrl === null ? undefined : updates.imageUrl;
    }
    if (updates.sortOrder !== undefined) patch.sortOrder = updates.sortOrder;
    if (Object.keys(patch).length === 0) return id;
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const removeExhibition = mutation({
  args: { id: v.id("exhibitions") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForExhibition(
      ctx,
      user as { _id: string; role?: string | null },
      args.id
    );
    const halls = await ctx.db
      .query("halls")
      .withIndex("by_exhibition", (q) => q.eq("exhibitionId", args.id))
      .collect();
    for (const hall of halls) {
      const interactions = await ctx.db
        .query("exhibitInteractions")
        .withIndex("by_hall", (q) => q.eq("hallId", hall._id))
        .collect();
      for (const ia of interactions) await ctx.db.delete(ia._id);
      await ctx.db.delete(hall._id);
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// --- Halls ---

export const listHallsByExhibition = query({
  args: { exhibitionId: v.id("exhibitions") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForExhibition(
      ctx,
      user as { _id: string; role?: string | null },
      args.exhibitionId
    );
    return await ctx.db
      .query("halls")
      .withIndex("by_exhibition_sortOrder", (q) =>
        q.eq("exhibitionId", args.exhibitionId)
      )
      .collect();
  },
});

export const createHall = mutation({
  args: {
    exhibitionId: v.id("exhibitions"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForExhibition(
      ctx,
      user as { _id: string; role?: string | null },
      args.exhibitionId
    );
    return await ctx.db.insert("halls", args);
  },
});

export const updateHall = mutation({
  args: {
    id: v.id("halls"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForHall(
      ctx,
      user as { _id: string; role?: string | null },
      args.id
    );
    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.sortOrder !== undefined) patch.sortOrder = updates.sortOrder;
    if (Object.keys(patch).length === 0) return id;
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const removeHall = mutation({
  args: { id: v.id("halls") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForHall(
      ctx,
      user as { _id: string; role?: string | null },
      args.id
    );
    const interactions = await ctx.db
      .query("exhibitInteractions")
      .withIndex("by_hall", (q) => q.eq("hallId", args.id))
      .collect();
    for (const ia of interactions) await ctx.db.delete(ia._id);
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// --- Exhibit interactions ---

export const listInteractionsByHall = query({
  args: { hallId: v.id("halls") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForHall(
      ctx,
      user as { _id: string; role?: string | null },
      args.hallId
    );
    return await ctx.db
      .query("exhibitInteractions")
      .withIndex("by_hall_sortOrder", (q) => q.eq("hallId", args.hallId))
      .collect();
  },
});

export const createExhibitInteraction = mutation({
  args: {
    hallId: v.id("halls"),
    type: interactionTypeValidator,
    title: v.string(),
    config: v.any(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForHall(
      ctx,
      user as { _id: string; role?: string | null },
      args.hallId
    );
    return await ctx.db.insert("exhibitInteractions", args);
  },
});

export const updateExhibitInteraction = mutation({
  args: {
    id: v.id("exhibitInteractions"),
    type: v.optional(interactionTypeValidator),
    title: v.optional(v.string()),
    config: v.optional(v.any()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Interaction not found");
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForHall(
      ctx,
      user as { _id: string; role?: string | null },
      existing.hallId
    );
    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    if (updates.type !== undefined) patch.type = updates.type;
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.config !== undefined) patch.config = updates.config;
    if (updates.sortOrder !== undefined) patch.sortOrder = updates.sortOrder;
    if (Object.keys(patch).length === 0) return id;
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const removeExhibitInteraction = mutation({
  args: { id: v.id("exhibitInteractions") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Interaction not found");
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForHall(
      ctx,
      user as { _id: string; role?: string | null },
      existing.hallId
    );
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const reorderExhibitInteractions = mutation({
  args: {
    hallId: v.id("halls"),
    orderedIds: v.array(v.id("exhibitInteractions")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    await assertAccessForHall(
      ctx,
      user as { _id: string; role?: string | null },
      args.hallId
    );
    for (let i = 0; i < args.orderedIds.length; i++) {
      const interaction = await ctx.db.get(args.orderedIds[i]);
      if (!interaction) {
        throw new Error("Interaction not found");
      }
      if (interaction.hallId !== args.hallId) {
        throw new Error("Interaction does not belong to this hall");
      }
      await ctx.db.patch(args.orderedIds[i], { sortOrder: i });
    }
    return args.hallId;
  },
});
