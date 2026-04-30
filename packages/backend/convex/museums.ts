import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin, requireAuthenticatedUser } from "./permissions";

const geospatial = new GeospatialIndex(components.geospatial);

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

type MuseumPoint = { latitude: number; longitude: number } | null;

async function getMuseumPoint(ctx: QueryCtx | MutationCtx, museumId: string): Promise<MuseumPoint> {
  const geospatialDoc = await ctx.runQuery(components.geospatial.document.get, {
    key: museumId,
  });
  return geospatialDoc?.coordinates ?? null;
}

/** Prefer geospatial index; fall back to optional `latitude` / `longitude` on the museum row (dashboard + seeds). */
async function resolvePointForDistance(
  ctx: QueryCtx | MutationCtx,
  museumId: Id<"museums">,
  storedLat?: number,
  storedLon?: number
): Promise<MuseumPoint> {
  const fromIndex = await getMuseumPoint(ctx, museumId);
  if (fromIndex) return fromIndex;
  if (
    typeof storedLat === "number" &&
    typeof storedLon === "number" &&
    Number.isFinite(storedLat) &&
    Number.isFinite(storedLon)
  ) {
    return { latitude: storedLat, longitude: storedLon };
  }
  return null;
}

/** Great-circle distance in meters (WGS84 approximation). */
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

async function listMuseumImagesBySort(ctx: QueryCtx | MutationCtx, museumId: Id<"museums">) {
  return await ctx.db
    .query("museumImages")
    .withIndex("by_museum_sortOrder", (q) => q.eq("museumId", museumId))
    .collect();
}

const museumLocationValidator = v.object({
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  state: v.optional(v.string()),
  country: v.optional(v.string()),
  postalCode: v.optional(v.string()),
});

const operatingHourValidator = v.object({
  day: v.string(),
  isOpen: v.boolean(),
  openTime: v.string(),
  closeTime: v.string(),
});

const museumSnapshotValidator = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  tagline: v.optional(v.string()),
  publicEmail: v.optional(v.string()),
  timezone: v.optional(v.string()),
  primaryLanguage: v.optional(v.string()),
  category: v.string(),
  location: museumLocationValidator,
  imageUrl: v.optional(v.string()),
  website: v.optional(v.string()),
  phone: v.optional(v.string()),
  operatingHours: v.optional(v.array(operatingHourValidator)),
  accessibilityFeatures: v.optional(v.array(v.string())),
  accessibilityNotes: v.optional(v.string()),
  point: v.optional(v.object({ latitude: v.number(), longitude: v.number() })),
});

function valuesEqual(left: string | undefined, right: string | undefined) {
  return (left ?? undefined) === (right ?? undefined);
}

function pointsEqual(left: { latitude: number; longitude: number } | null, right?: { latitude: number; longitude: number }) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.latitude === right.latitude && left.longitude === right.longitude;
}

function operatingHoursEqual(
  left?: { day: string; isOpen: boolean; openTime: string; closeTime: string }[],
  right?: { day: string; isOpen: boolean; openTime: string; closeTime: string }[]
) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  if (left.length !== right.length) return false;
  return left.every((entry, index) => {
    const compare = right[index];
    return (
      entry.day === compare.day &&
      entry.isOpen === compare.isOpen &&
      entry.openTime === compare.openTime &&
      entry.closeTime === compare.closeTime
    );
  });
}

function stringArrayEqual(left?: string[], right?: string[]) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function museumMatchesSnapshot(
  museum: {
    name: string;
    description?: string;
    tagline?: string;
    publicEmail?: string;
    timezone?: string;
    primaryLanguage?: string;
    category: string;
    location: { address?: string; city?: string; state?: string; country?: string; postalCode?: string };
    imageUrl?: string;
    website?: string;
    phone?: string;
    operatingHours?: { day: string; isOpen: boolean; openTime: string; closeTime: string }[];
    accessibilityFeatures?: string[];
    accessibilityNotes?: string;
  },
  point: MuseumPoint,
  snapshot: {
    name: string;
    description?: string;
    tagline?: string;
    publicEmail?: string;
    timezone?: string;
    primaryLanguage?: string;
    category: string;
    location: { address?: string; city?: string; state?: string; country?: string; postalCode?: string };
    imageUrl?: string;
    website?: string;
    phone?: string;
    operatingHours?: { day: string; isOpen: boolean; openTime: string; closeTime: string }[];
    accessibilityFeatures?: string[];
    accessibilityNotes?: string;
    point?: { latitude: number; longitude: number };
  }
) {
  return (
    museum.name === snapshot.name &&
    valuesEqual(museum.description, snapshot.description) &&
    valuesEqual(museum.tagline, snapshot.tagline) &&
    valuesEqual(museum.publicEmail, snapshot.publicEmail) &&
    valuesEqual(museum.timezone, snapshot.timezone) &&
    valuesEqual(museum.primaryLanguage, snapshot.primaryLanguage) &&
    museum.category === snapshot.category &&
    valuesEqual(museum.location.address, snapshot.location.address) &&
    valuesEqual(museum.location.city, snapshot.location.city) &&
    valuesEqual(museum.location.state, snapshot.location.state) &&
    valuesEqual(museum.location.country, snapshot.location.country) &&
    valuesEqual(museum.location.postalCode, snapshot.location.postalCode) &&
    valuesEqual(museum.imageUrl, snapshot.imageUrl) &&
    valuesEqual(museum.website, snapshot.website) &&
    valuesEqual(museum.phone, snapshot.phone) &&
    operatingHoursEqual(museum.operatingHours, snapshot.operatingHours) &&
    stringArrayEqual(museum.accessibilityFeatures, snapshot.accessibilityFeatures) &&
    valuesEqual(museum.accessibilityNotes, snapshot.accessibilityNotes) &&
    pointsEqual(point, snapshot.point)
  );
}

// Add a museum (admin only).
export const addMuseum = mutation({
  args: {
    point: v.object({ latitude: v.number(), longitude: v.number() }),
    name: v.string(),
    description: v.optional(v.string()),
    tagline: v.optional(v.string()),
    publicEmail: v.optional(v.string()),
    timezone: v.optional(v.string()),
    primaryLanguage: v.optional(v.string()),
    category: v.string(),
    location: v.object({
      address: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      country: v.optional(v.string()),
      postalCode: v.optional(v.string()),
    }),
    imageUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    operatingHours: v.optional(v.array(operatingHourValidator)),
    accessibilityFeatures: v.optional(v.array(v.string())),
    accessibilityNotes: v.optional(v.string()),
  },
  handler: async (ctx, { point, ...args }) => {
    await requireAdmin(ctx);
    const id = await ctx.db.insert("museums", {
      ...args,
      latitude: point.latitude,
      longitude: point.longitude,
    });
    await geospatial.insert(ctx, id, point, { category: args.category });
    return id;
  },
});

// List all museums
export const listMuseums = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("museums").collect();
  },
});

// List all museums with computed stats (average rating, rating count).
// Optional `viewer` adds straight-line distance and sorts nearest-first.
export const listMuseumsWithStats = query({
  args: {
    viewer: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const museums = await ctx.db.query("museums").collect();

    // Get stats for each museum
    const museumsWithStats = await Promise.all(
      museums.map(async (museum) => {
        const checkIns = await ctx.db
          .query("checkIns")
          .withIndex("by_content", (q) =>
            q.eq("contentType", "museum").eq("contentId", museum._id)
          )
          .collect();

        const ratingCount = checkIns.filter(ci => ci.rating !== undefined).length;
        const averageRating =
          ratingCount > 0
            ? checkIns
                .filter(ci => ci.rating !== undefined)
                .reduce((sum, r) => sum + (r.rating || 0), 0) / ratingCount
            : null;

        return {
          ...museum,
          averageRating,
          ratingCount,
        };
      })
    );

    if (!args.viewer) {
      return museumsWithStats;
    }

    const viewer = args.viewer;
    const withDistance = await Promise.all(
      museumsWithStats.map(async (row) => {
        const point = await resolvePointForDistance(ctx, row._id, row.latitude, row.longitude);
        if (!point) {
          return { ...row, distanceMeters: undefined as number | undefined };
        }
        const distanceMeters = haversineDistanceMeters(viewer, point);
        return { ...row, distanceMeters };
      })
    );

    withDistance.sort((a, b) => {
      const da = a.distanceMeters;
      const db = b.distanceMeters;
      if (da === undefined && db === undefined) return 0;
      if (da === undefined) return 1;
      if (db === undefined) return -1;
      return da - db;
    });

    return withDistance;
  },
});

// Get museum by ID
export const getMuseum = query({
  args: { id: v.id("museums") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getMuseumDetailsForDashboard = query({
  args: { id: v.id("museums") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const role = (user as { role?: string | null }).role;
    const museum = await ctx.db.get(args.id);
    if (!museum) return null;
    await assertDashboardMuseumAccess(ctx, user as { _id: string; role?: string | null }, args.id);

    const point = await resolvePointForDistance(ctx, museum._id, museum.latitude, museum.longitude);
    return {
      ...museum,
      point,
      canEditName: role === "admin",
      snapshot: {
        name: museum.name,
        description: museum.description,
        tagline: museum.tagline,
        publicEmail: museum.publicEmail,
        timezone: museum.timezone,
        primaryLanguage: museum.primaryLanguage,
        category: museum.category,
        location: museum.location,
        imageUrl: museum.imageUrl,
        website: museum.website,
        phone: museum.phone,
        operatingHours: museum.operatingHours,
        accessibilityFeatures: museum.accessibilityFeatures,
        accessibilityNotes: museum.accessibilityNotes,
        point: point ?? undefined,
      },
    };
  },
});

export const updateMuseumDetailsForDashboard = mutation({
  args: {
    museumId: v.id("museums"),
    expected: museumSnapshotValidator,
    next: v.object({
      point: v.object({ latitude: v.number(), longitude: v.number() }),
      name: v.string(),
      description: v.optional(v.string()),
      tagline: v.optional(v.string()),
      publicEmail: v.optional(v.string()),
      timezone: v.optional(v.string()),
      primaryLanguage: v.optional(v.string()),
      category: v.string(),
      location: museumLocationValidator,
      imageUrl: v.optional(v.string()),
      website: v.optional(v.string()),
      phone: v.optional(v.string()),
      operatingHours: v.optional(v.array(operatingHourValidator)),
      accessibilityFeatures: v.optional(v.array(v.string())),
      accessibilityNotes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const role = (user as { role?: string | null }).role;
    const museum = await ctx.db.get(args.museumId);
    if (!museum) throw new Error("Museum not found");
    await assertDashboardMuseumAccess(
      ctx,
      user as { _id: string; role?: string | null },
      args.museumId
    );

    const currentPoint = await resolvePointForDistance(
      ctx,
      args.museumId,
      museum.latitude,
      museum.longitude
    );
    if (!museumMatchesSnapshot(museum, currentPoint, args.expected)) {
      throw new Error("Museum data changed since you opened this form. Refresh and review latest values.")
    }
    // if (role !== "admin" && args.next.name !== museum.name) {
    //   throw new Error("Only admins can edit museum name.")
    // }

    await ctx.db.patch(args.museumId, {
      name: args.next.name,
      description: args.next.description,
      tagline: args.next.tagline,
      publicEmail: args.next.publicEmail,
      timezone: args.next.timezone,
      primaryLanguage: args.next.primaryLanguage,
      category: args.next.category,
      location: args.next.location,
      imageUrl: args.next.imageUrl,
      website: args.next.website,
      phone: args.next.phone,
      operatingHours: args.next.operatingHours,
      accessibilityFeatures: args.next.accessibilityFeatures,
      accessibilityNotes: args.next.accessibilityNotes,
      latitude: args.next.point.latitude,
      longitude: args.next.point.longitude,
    });
    await geospatial.insert(ctx, args.museumId, args.next.point, { category: args.next.category });
  },
});

export const generateMuseumImageUploadUrl = mutation({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const museum = await ctx.db.get(args.museumId);
    if (!museum) throw new Error("Museum not found");
    await assertDashboardMuseumAccess(
      ctx,
      user as { _id: string; role?: string | null },
      args.museumId
    );
    return await ctx.storage.generateUploadUrl();
  },
});

export const listMuseumImagesForDashboard = query({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const museum = await ctx.db.get(args.museumId);
    if (!museum) return [];
    await assertDashboardMuseumAccess(
      ctx,
      user as { _id: string; role?: string | null },
      args.museumId
    );

    return await listMuseumImagesBySort(ctx, args.museumId);
  },
});

export const addMuseumImageForDashboard = mutation({
  args: {
    museumId: v.id("museums"),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    alt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const museum = await ctx.db.get(args.museumId);
    if (!museum) throw new Error("Museum not found");
    await assertDashboardMuseumAccess(
      ctx,
      user as { _id: string; role?: string | null },
      args.museumId
    );

    if (!args.imageUrl && !args.storageId) {
      throw new Error("Provide either an image URL or an uploaded storageId");
    }

    let resolvedImageUrl = args.imageUrl?.trim() ?? "";
    if (args.storageId) {
      const uploadedFile = await ctx.db.system.get("_storage", args.storageId);
      if (!uploadedFile) throw new Error("Uploaded image file not found");
      const uploadedImageUrl = await ctx.storage.getUrl(args.storageId);
      if (!uploadedImageUrl) throw new Error("Uploaded image URL not available");
      resolvedImageUrl = uploadedImageUrl;
    }
    if (!resolvedImageUrl) {
      throw new Error("Image URL is required");
    }

    const now = Date.now();
    const existingImages = await listMuseumImagesBySort(ctx, args.museumId);
    const nextSortOrder = existingImages.length > 0 ? existingImages[existingImages.length - 1]!.sortOrder + 1 : 0;
    const hasPrimary = existingImages.some((image) => image.isPrimary);
    const isPrimary = !hasPrimary;

    const imageId = await ctx.db.insert("museumImages", {
      museumId: args.museumId,
      imageUrl: resolvedImageUrl,
      storageId: args.storageId,
      alt: args.alt?.trim() ? args.alt.trim() : undefined,
      sortOrder: nextSortOrder,
      isPrimary,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    if (isPrimary) {
      await ctx.db.patch(args.museumId, { imageUrl: resolvedImageUrl });
    }

    return {
      imageId,
      imageUrl: resolvedImageUrl,
      isPrimary,
    };
  },
});

export const setPrimaryMuseumImageForDashboard = mutation({
  args: {
    museumId: v.id("museums"),
    imageId: v.id("museumImages"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const museum = await ctx.db.get(args.museumId);
    if (!museum) throw new Error("Museum not found");
    await assertDashboardMuseumAccess(
      ctx,
      user as { _id: string; role?: string | null },
      args.museumId
    );

    const targetImage = await ctx.db.get(args.imageId);
    if (!targetImage || targetImage.museumId !== args.museumId) {
      throw new Error("Image not found for this museum");
    }

    const now = Date.now();
    const images = await ctx.db
      .query("museumImages")
      .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
      .collect();

    for (const image of images) {
      const shouldBePrimary = image._id === args.imageId;
      if (image.isPrimary !== shouldBePrimary) {
        await ctx.db.patch(image._id, { isPrimary: shouldBePrimary, updatedAt: now });
      }
    }

    await ctx.db.patch(args.museumId, { imageUrl: targetImage.imageUrl });
    return { imageUrl: targetImage.imageUrl };
  },
});

export const deleteMuseumImageForDashboard = mutation({
  args: {
    museumId: v.id("museums"),
    imageId: v.id("museumImages"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const museum = await ctx.db.get(args.museumId);
    if (!museum) throw new Error("Museum not found");
    await assertDashboardMuseumAccess(
      ctx,
      user as { _id: string; role?: string | null },
      args.museumId
    );

    const image = await ctx.db.get(args.imageId);
    if (!image || image.museumId !== args.museumId) {
      throw new Error("Image not found for this museum");
    }

    if (image.storageId) {
      try {
        await ctx.storage.delete(image.storageId);
      } catch {
        // Continue deleting metadata row even if underlying storage object is already gone.
      }
    }
    await ctx.db.delete(args.imageId);

    if (!image.isPrimary) {
      return { nextPrimaryImageUrl: museum.imageUrl ?? null };
    }

    const remaining = await listMuseumImagesBySort(ctx, args.museumId);
    if (remaining.length === 0) {
      await ctx.db.patch(args.museumId, { imageUrl: undefined });
      return { nextPrimaryImageUrl: null };
    }

    const fallbackPrimary = remaining.find((entry) => entry.isPrimary) ?? remaining[0]!;
    const now = Date.now();
    for (const entry of remaining) {
      const shouldBePrimary = entry._id === fallbackPrimary._id;
      if (entry.isPrimary !== shouldBePrimary) {
        await ctx.db.patch(entry._id, { isPrimary: shouldBePrimary, updatedAt: now });
      }
    }
    await ctx.db.patch(args.museumId, { imageUrl: fallbackPrimary.imageUrl });
    return { nextPrimaryImageUrl: fallbackPrimary.imageUrl };
  },
});

export const reorderMuseumImagesForDashboard = mutation({
  args: {
    museumId: v.id("museums"),
    orderedImageIds: v.array(v.id("museumImages")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const museum = await ctx.db.get(args.museumId);
    if (!museum) throw new Error("Museum not found");
    await assertDashboardMuseumAccess(
      ctx,
      user as { _id: string; role?: string | null },
      args.museumId
    );

    const currentImages = await listMuseumImagesBySort(ctx, args.museumId);
    if (currentImages.length !== args.orderedImageIds.length) {
      throw new Error("Image order payload does not match current gallery");
    }

    const currentIds = new Set(currentImages.map((image) => image._id));
    for (const imageId of args.orderedImageIds) {
      if (!currentIds.has(imageId)) {
        throw new Error("Image order payload contains invalid image");
      }
    }

    const now = Date.now();
    for (const [index, imageId] of args.orderedImageIds.entries()) {
      const current = currentImages.find((image) => image._id === imageId);
      if (!current || current.sortOrder !== index) {
        await ctx.db.patch(imageId, { sortOrder: index, updatedAt: now });
      }
    }
  },
});
