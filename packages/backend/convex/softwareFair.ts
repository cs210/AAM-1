import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./permissions";

export const SOFTWARE_FAIR_FEATURE_KEY = "software_fair_2026";

type ConfigRow = Doc<"softwareFairFeatureConfigs">;
type BoothRow = Doc<"softwareFairBooths">;
type MuseumRow = Doc<"museums">;

type MuseumPoint = { latitude: number; longitude: number } | null;

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
    museumId: row.museumId ?? null,
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

async function getMuseumPoint(ctx: QueryCtx | MutationCtx, museumId: string): Promise<MuseumPoint> {
  const geospatialDoc = await ctx.runQuery(components.geospatial.document.get, {
    key: museumId,
  });
  return geospatialDoc?.coordinates ?? null;
}

async function resolvePointForDistance(
  ctx: QueryCtx | MutationCtx,
  museum: MuseumRow
): Promise<MuseumPoint> {
  const fromIndex = await getMuseumPoint(ctx, museum._id);
  if (fromIndex) return fromIndex;
  if (
    typeof museum.latitude === "number" &&
    typeof museum.longitude === "number" &&
    Number.isFinite(museum.latitude) &&
    Number.isFinite(museum.longitude)
  ) {
    return { latitude: museum.latitude, longitude: museum.longitude };
  }
  return null;
}

function haversineDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const earthRadiusMeters = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function getMuseumStats(ctx: QueryCtx | MutationCtx, museumId: Id<"museums">) {
  const checkIns = await ctx.db
    .query("checkIns")
    .withIndex("by_content", (q) =>
      q.eq("contentType", "museum").eq("contentId", museumId)
    )
    .collect();

  const ratedCheckIns = checkIns.filter((checkIn) => checkIn.rating !== undefined);
  const ratingCount = ratedCheckIns.length;
  const averageRating =
    ratingCount > 0
      ? ratedCheckIns.reduce((sum, checkIn) => sum + (checkIn.rating ?? 0), 0) / ratingCount
      : null;

  return { averageRating, ratingCount };
}

function boothMuseumFields(args: {
  projectName: string;
  genres: string[];
  description?: string;
  guideUrl?: string;
}) {
  return {
    name: args.projectName,
    description: args.description,
    tagline: args.genres.length > 0 ? args.genres.join(", ") : undefined,
    location: {
      address: "CoDa B80",
      city: "Stanford",
      state: "CA",
      country: "United States",
    },
    category: args.genres[0] ?? "software",
    website: args.guideUrl,
    isSoftwareFairOnly: true,
  };
}

async function ensureBoothMuseum(
  ctx: MutationCtx,
  args: {
    existingMuseumId?: Id<"museums">;
    projectName: string;
    genres: string[];
    description?: string;
    guideUrl?: string;
  }
) {
  if (args.existingMuseumId) {
    const existingMuseum = await ctx.db.get(args.existingMuseumId);
    if (!existingMuseum) throw new Error("Linked museum not found");
    return args.existingMuseumId;
  }

  return await ctx.db.insert("museums", boothMuseumFields(args));
}

async function syncAutoBoothMuseum(
  ctx: MutationCtx,
  museumId: Id<"museums">,
  args: {
    projectName: string;
    genres: string[];
    description?: string;
    guideUrl?: string;
  }
) {
  const museum = await ctx.db.get(museumId);
  if (!museum?.isSoftwareFairOnly) return;
  await ctx.db.patch(museumId, boothMuseumFields(args));
}

function toPublicBoothMuseum(
  booth: BoothRow,
  museum: MuseumRow,
  stats: { averageRating: number | null; ratingCount: number },
  distanceMeters?: number
) {
  return {
    ...museum,
    ...stats,
    distanceMeters,
    softwareFairBooth: toPublicBooth(booth),
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

export const listActiveBoothMuseums = query({
  args: {
    viewer: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const config = await getConfigRow(ctx);
    if (!config?.enabled) return [];

    const booths = await ctx.db
      .query("softwareFairBooths")
      .withIndex("by_feature_active_sortOrder", (q) =>
        q.eq("featureKey", SOFTWARE_FAIR_FEATURE_KEY).eq("isActive", true)
      )
      .collect();
    booths.sort(compareBooths);

    const rows = await Promise.all(
      booths.map(async (booth) => {
        if (!booth.museumId) return null;
        const museum = await ctx.db.get(booth.museumId);
        if (!museum) return null;
        const stats = await getMuseumStats(ctx, museum._id);
        const point = args.viewer ? await resolvePointForDistance(ctx, museum) : null;
        const distanceMeters =
          args.viewer && point ? haversineDistanceMeters(args.viewer, point) : undefined;
        return toPublicBoothMuseum(booth, museum, stats, distanceMeters);
      })
    );

    const activeRows = rows.filter((row): row is NonNullable<typeof row> => row !== null);

    if (args.viewer) {
      activeRows.sort((a, b) => {
        const da = a.distanceMeters;
        const db = b.distanceMeters;
        if (da === undefined && db === undefined) return 0;
        if (da === undefined) return 1;
        if (db === undefined) return -1;
        return da - db;
      });
    }

    return activeRows;
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

export const getBoothByMuseum = query({
  args: {
    museumId: v.id("museums"),
  },
  handler: async (ctx, args) => {
    const config = await getConfigRow(ctx);
    if (!config?.enabled) return null;

    const booths = await ctx.db
      .query("softwareFairBooths")
      .withIndex("by_feature", (q) => q.eq("featureKey", SOFTWARE_FAIR_FEATURE_KEY))
      .collect();
    const booth = booths.find(
      (row) => row.isActive && row.museumId === args.museumId
    );
    return booth ? toPublicBooth(booth) : null;
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
    museumId: v.optional(v.id("museums")),
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
    const genres = normalizeStringArray(args.genres);
    const teamMembers = normalizeStringArray(args.teamMembers);
    const description = optionalTrimmed(args.description);
    const guideUrl = normalizeGuideUrl(args.guideUrl);
    const museumId = await ensureBoothMuseum(ctx, {
      existingMuseumId: args.museumId ?? existing?.museumId,
      projectName,
      genres,
      description,
      guideUrl,
    });
    await syncAutoBoothMuseum(ctx, museumId, {
      projectName,
      genres,
      description,
      guideUrl,
    });

    const nextBooth = {
      featureKey: SOFTWARE_FAIR_FEATURE_KEY,
      museumId,
      boothNumber: args.boothNumber,
      projectName,
      genres,
      teamMembers,
      description,
      guideUrl,
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

export const backfillBoothMuseumsForAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const booths = await ctx.db
      .query("softwareFairBooths")
      .withIndex("by_feature", (q) => q.eq("featureKey", SOFTWARE_FAIR_FEATURE_KEY))
      .collect();

    let created = 0;
    let synced = 0;
    const now = Date.now();

    for (const booth of booths) {
      const description = booth.description ?? undefined;
      const guideUrl = booth.guideUrl ?? undefined;
      const museumId = await ensureBoothMuseum(ctx, {
        existingMuseumId: booth.museumId,
        projectName: booth.projectName,
        genres: booth.genres,
        description,
        guideUrl,
      });

      if (!booth.museumId) {
        await ctx.db.patch(booth._id, {
          museumId,
          updatedAt: now,
          updatedBy: user._id,
        });
        created += 1;
      }

      await syncAutoBoothMuseum(ctx, museumId, {
        projectName: booth.projectName,
        genres: booth.genres,
        description,
        guideUrl,
      });
      synced += 1;
    }

    return { total: booths.length, created, synced };
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
