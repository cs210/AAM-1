import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./permissions";

export const SOFTWARE_FAIR_FEATURE_KEY = "software_fair_2026";

type ConfigRow = Doc<"softwareFairFeatureConfigs">;
type BoothRow = Doc<"softwareFairBooths">;

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

function toPublicBooth(row: BoothRow) {
  return {
    _id: row._id,
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

function compareBooths(a: BoothRow, b: BoothRow) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.boothNumber !== b.boothNumber) return a.boothNumber - b.boothNumber;
  return a.projectName.localeCompare(b.projectName);
}

async function assertNoBoothNumberConflict(
  ctx: MutationCtx,
  args: {
    boothId?: Id<"softwareFairBooths">;
    boothNumber: number;
  }
) {
  const existingForBooth = await ctx.db
    .query("softwareFairBooths")
    .withIndex("by_feature_boothNumber", (q) =>
      q.eq("featureKey", SOFTWARE_FAIR_FEATURE_KEY).eq("boothNumber", args.boothNumber)
    )
    .first();
  if (existingForBooth && existingForBooth._id !== args.boothId) {
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

export const listActiveBooths = query({
  args: {},
  handler: async (ctx) => {
    const config = await getConfigRow(ctx);
    if (!config?.enabled) return [];

    const booths = await ctx.db
      .query("softwareFairBooths")
      .withIndex("by_feature_active_sortOrder", (q) =>
        q.eq("featureKey", SOFTWARE_FAIR_FEATURE_KEY).eq("isActive", true)
      )
      .collect();
    booths.sort(compareBooths);

    return booths.map(toPublicBooth);
  },
});

export const getBooth = query({
  args: {
    boothId: v.id("softwareFairBooths"),
  },
  handler: async (ctx, args) => {
    const config = await getConfigRow(ctx);
    if (!config?.enabled) return null;

    const booth = await ctx.db.get(args.boothId);
    if (!booth || booth.featureKey !== SOFTWARE_FAIR_FEATURE_KEY || !booth.isActive) return null;
    return toPublicBooth(booth);
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

export const listBoothsForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const booths = await ctx.db
      .query("softwareFairBooths")
      .withIndex("by_feature", (q) => q.eq("featureKey", SOFTWARE_FAIR_FEATURE_KEY))
      .collect();
    booths.sort(compareBooths);

    return booths.map((booth) => ({
      ...toPublicBooth(booth),
      featureKey: booth.featureKey,
      createdAt: booth.createdAt,
      updatedAt: booth.updatedAt,
      createdBy: booth.createdBy ?? null,
      updatedBy: booth.updatedBy ?? null,
    }));
  },
});

export const upsertBoothForAdmin = mutation({
  args: {
    boothId: v.optional(v.id("softwareFairBooths")),
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

    const projectName = args.projectName.trim();
    if (!projectName) throw new Error("Project name is required");
    assertPositiveInteger(args.boothNumber, "Booth number");
    assertFiniteNumber(args.sortOrder, "Sort order");
    await assertNoBoothNumberConflict(ctx, {
      boothId: args.boothId,
      boothNumber: args.boothNumber,
    });

    const existing = args.boothId ? await ctx.db.get(args.boothId) : null;
    if (args.boothId && (!existing || existing.featureKey !== SOFTWARE_FAIR_FEATURE_KEY)) {
      throw new Error("Software Fair booth not found");
    }

    const now = Date.now();
    const nextBooth = {
      featureKey: SOFTWARE_FAIR_FEATURE_KEY,
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
      await ctx.db.patch(existing._id, nextBooth);
      return existing._id;
    }

    return await ctx.db.insert("softwareFairBooths", {
      ...nextBooth,
      createdAt: now,
      createdBy: user._id,
    });
  },
});

export const deleteBoothForAdmin = mutation({
  args: {
    boothId: v.id("softwareFairBooths"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const booth = await ctx.db.get(args.boothId);
    if (!booth || booth.featureKey !== SOFTWARE_FAIR_FEATURE_KEY) return false;
    await ctx.db.delete(args.boothId);
    return true;
  },
});
