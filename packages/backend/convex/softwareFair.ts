import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./permissions";

export const SOFTWARE_FAIR_FEATURE_KEY = "software_fair_2026";

type ConfigRow = Doc<"softwareFairFeatureConfigs">;
type BoothAssignmentRow = Doc<"softwareFairBoothAssignments">;

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeStringArray(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function normalizeGuideUrl(value: string | undefined) {
  const trimmed = optionalTrimmed(value);
  if (!trimmed) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Guide URL must start with http:// or https://");
  }
  return trimmed;
}

function assertPositiveInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

function assertFiniteNumber(value: number, fieldName: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be finite`);
  }
}

async function getConfigRow(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("softwareFairFeatureConfigs")
    .withIndex("by_key", (q) => q.eq("key", SOFTWARE_FAIR_FEATURE_KEY))
    .first();
}

function toPublicConfig(row: ConfigRow | null) {
  return {
    key: SOFTWARE_FAIR_FEATURE_KEY,
    enabled: row?.enabled ?? false,
    announcementEnabled: row?.announcementEnabled ?? false,
    announcementTitle: row?.announcementTitle ?? null,
    announcementBody: row?.announcementBody ?? null,
    announcementCtaLabel: row?.announcementCtaLabel ?? null,
    updatedAt: row?.updatedAt ?? null,
  };
}

function toAdminConfig(row: ConfigRow | null) {
  return {
    _id: row?._id ?? null,
    ...toPublicConfig(row),
    createdAt: row?.createdAt ?? null,
    updatedBy: row?.updatedBy ?? null,
  };
}

function toPublicBooth(row: BoothAssignmentRow) {
  return {
    _id: row._id,
    museumId: row.museumId,
    boothNumber: row.boothNumber,
    projectName: row.projectName,
    genres: row.genres,
    teamMembers: row.teamMembers,
    description: row.description ?? null,
    guideUrl: row.guideUrl ?? null,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

function compareBooths(a: BoothAssignmentRow, b: BoothAssignmentRow) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.boothNumber !== b.boothNumber) return a.boothNumber - b.boothNumber;
  return a.projectName.localeCompare(b.projectName);
}

async function getMuseumStats(ctx: QueryCtx | MutationCtx, museumId: Id<"museums">) {
  const checkIns = await ctx.db
    .query("checkIns")
    .withIndex("by_content", (q) =>
      q.eq("contentType", "museum").eq("contentId", museumId)
    )
    .collect();

  const ratings = checkIns
    .map((checkIn) => checkIn.rating)
    .filter((rating): rating is number => typeof rating === "number");
  const ratingCount = ratings.length;
  const averageRating =
    ratingCount > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratingCount
      : null;

  return {
    averageRating,
    ratingCount,
  };
}

async function assertNoAssignmentConflicts(
  ctx: MutationCtx,
  args: {
    assignmentId?: Id<"softwareFairBoothAssignments">;
    museumId: Id<"museums">;
    boothNumber: number;
  }
) {
  const existingForMuseum = await ctx.db
    .query("softwareFairBoothAssignments")
    .withIndex("by_feature_museum", (q) =>
      q.eq("featureKey", SOFTWARE_FAIR_FEATURE_KEY).eq("museumId", args.museumId)
    )
    .first();
  if (existingForMuseum && existingForMuseum._id !== args.assignmentId) {
    throw new Error("This museum is already assigned to a Software Fair booth");
  }

  const existingForBooth = await ctx.db
    .query("softwareFairBoothAssignments")
    .withIndex("by_feature_boothNumber", (q) =>
      q.eq("featureKey", SOFTWARE_FAIR_FEATURE_KEY).eq("boothNumber", args.boothNumber)
    )
    .first();
  if (existingForBooth && existingForBooth._id !== args.assignmentId) {
    throw new Error("This Software Fair booth number is already assigned");
  }
}

export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const row = await getConfigRow(ctx);
    return toPublicConfig(row);
  },
});

export const listActiveBoothMuseums = query({
  args: {},
  handler: async (ctx) => {
    const config = await getConfigRow(ctx);
    if (!config?.enabled) return [];

    const assignments = await ctx.db
      .query("softwareFairBoothAssignments")
      .withIndex("by_feature_active_sortOrder", (q) =>
        q.eq("featureKey", SOFTWARE_FAIR_FEATURE_KEY).eq("isActive", true)
      )
      .collect();
    assignments.sort(compareBooths);

    const rows = await Promise.all(
      assignments.map(async (assignment) => {
        const museum = await ctx.db.get(assignment.museumId);
        if (!museum) return null;
        const stats = await getMuseumStats(ctx, assignment.museumId);
        return {
          ...museum,
          ...stats,
          softwareFairBooth: toPublicBooth(assignment),
        };
      })
    );

    return rows.filter((row): row is NonNullable<typeof row> => row !== null);
  },
});

export const getBoothForMuseum = query({
  args: {
    museumId: v.id("museums"),
  },
  handler: async (ctx, args) => {
    const config = await getConfigRow(ctx);
    if (!config?.enabled) return null;

    const assignment = await ctx.db
      .query("softwareFairBoothAssignments")
      .withIndex("by_feature_museum", (q) =>
        q.eq("featureKey", SOFTWARE_FAIR_FEATURE_KEY).eq("museumId", args.museumId)
      )
      .first();

    if (!assignment?.isActive) return null;
    return toPublicBooth(assignment);
  },
});

export const getConfigForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const row = await getConfigRow(ctx);
    return toAdminConfig(row);
  },
});

export const updateConfigForAdmin = mutation({
  args: {
    enabled: v.boolean(),
    announcementEnabled: v.boolean(),
    announcementTitle: v.optional(v.string()),
    announcementBody: v.optional(v.string()),
    announcementCtaLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const now = Date.now();
    const existing = await getConfigRow(ctx);
    const nextConfig = {
      key: SOFTWARE_FAIR_FEATURE_KEY,
      enabled: args.enabled,
      announcementEnabled: args.announcementEnabled,
      announcementTitle: optionalTrimmed(args.announcementTitle),
      announcementBody: optionalTrimmed(args.announcementBody),
      announcementCtaLabel: optionalTrimmed(args.announcementCtaLabel),
      updatedAt: now,
      updatedBy: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, nextConfig);
      return existing._id;
    }

    return await ctx.db.insert("softwareFairFeatureConfigs", {
      ...nextConfig,
      createdAt: now,
    });
  },
});

export const listBoothAssignmentsForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const assignments = await ctx.db
      .query("softwareFairBoothAssignments")
      .withIndex("by_feature", (q) => q.eq("featureKey", SOFTWARE_FAIR_FEATURE_KEY))
      .collect();
    assignments.sort(compareBooths);

    return await Promise.all(
      assignments.map(async (assignment) => {
        const museum = await ctx.db.get(assignment.museumId);
        return {
          ...toPublicBooth(assignment),
          featureKey: assignment.featureKey,
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
          createdBy: assignment.createdBy ?? null,
          updatedBy: assignment.updatedBy ?? null,
          museumName: museum?.name ?? null,
          museumLocation: museum?.location ?? null,
          hasMissingMuseum: museum === null,
        };
      })
    );
  },
});

export const upsertBoothAssignmentForAdmin = mutation({
  args: {
    assignmentId: v.optional(v.id("softwareFairBoothAssignments")),
    museumId: v.id("museums"),
    boothNumber: v.number(),
    projectName: v.string(),
    genres: v.array(v.string()),
    teamMembers: v.array(v.string()),
    description: v.optional(v.string()),
    guideUrl: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const museum = await ctx.db.get(args.museumId);
    if (!museum) throw new Error("Museum not found");

    const projectName = args.projectName.trim();
    if (!projectName) throw new Error("Project name is required");
    assertPositiveInteger(args.boothNumber, "Booth number");
    assertFiniteNumber(args.sortOrder, "Sort order");
    await assertNoAssignmentConflicts(ctx, {
      assignmentId: args.assignmentId,
      museumId: args.museumId,
      boothNumber: args.boothNumber,
    });

    const existing = args.assignmentId ? await ctx.db.get(args.assignmentId) : null;
    if (args.assignmentId && (!existing || existing.featureKey !== SOFTWARE_FAIR_FEATURE_KEY)) {
      throw new Error("Software Fair booth assignment not found");
    }

    const now = Date.now();
    const nextAssignment = {
      featureKey: SOFTWARE_FAIR_FEATURE_KEY,
      museumId: args.museumId,
      boothNumber: args.boothNumber,
      projectName,
      genres: normalizeStringArray(args.genres),
      teamMembers: normalizeStringArray(args.teamMembers),
      description: optionalTrimmed(args.description),
      guideUrl: normalizeGuideUrl(args.guideUrl),
      sortOrder: args.sortOrder,
      isActive: args.isActive,
      updatedAt: now,
      updatedBy: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, nextAssignment);
      return existing._id;
    }

    return await ctx.db.insert("softwareFairBoothAssignments", {
      ...nextAssignment,
      createdAt: now,
      createdBy: user._id,
    });
  },
});

export const deleteBoothAssignmentForAdmin = mutation({
  args: {
    assignmentId: v.id("softwareFairBoothAssignments"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.featureKey !== SOFTWARE_FAIR_FEATURE_KEY) return false;
    await ctx.db.delete(args.assignmentId);
    return true;
  },
});
