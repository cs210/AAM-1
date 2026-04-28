import { ConvexError, v } from "convex/values";
import { action, internalQuery, mutation, query } from "./_generated/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { authComponent } from "./auth";

const DEFAULT_RUNPOD_TIMEOUT_MS = 20_000;
const SEARCH_RUNPOD_TIMEOUT_MS = 90_000;
const MUSEUM_SLUG_PATTERN = /^[a-z0-9_-]+$/;
const MAX_ERROR_BODY_LENGTH = 4_000;

type RunpodMethod = "GET" | "POST";

type RunpodRequestArgs = {
  path: `/${string}`;
  method: RunpodMethod;
  body?: Record<string, unknown>;
  timeoutMs?: number;
};

type ValidatedSearchArgs = {
  museumSlug: string;
  imageUrl: string;
  topK: number;
};

type SearchResult = {
  artworkKey: string;
  objectId: string;
  title: string | null;
  artistDisplayName: string | null;
  primaryImage: string | null;
  primaryImageSmall: string | null;
  imageUrlUsed: string | null;
  sourceUrl: string | null;
  score: number;
};

type NormalizedSearchResponse = {
  museumSlug: string;
  indexVersion: string;
  embeddingModel: string;
  topK: number;
  results: SearchResult[];
};

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new ConvexError({ code: "NOT_AUTHENTICATED", message: "Not authenticated" });
  const role = (user as { role?: string | null }).role;
  if (role !== "admin") throw new ConvexError({ code: "ADMIN_REQUIRED", message: "Admin access required" });
  return user as { _id: string; role?: string | null };
}

async function requireAdminAction(ctx: ActionCtx) {
  const user = await ctx.runQuery(api.auth.getCurrentUser, {});
  if (!user) throw new ConvexError({ code: "NOT_AUTHENTICATED", message: "Not authenticated" });
  const role = (user as { role?: string | null }).role;
  if (role !== "admin") throw new ConvexError({ code: "ADMIN_REQUIRED", message: "Admin access required" });
  return user;
}

async function requireAuthenticatedAction(ctx: ActionCtx) {
  const user = await ctx.runQuery(api.auth.getCurrentUser, {});
  if (!user) throw new ConvexError({ code: "NOT_AUTHENTICATED", message: "Not authenticated" });
  return user;
}

async function getVisualSearchConfigRow(ctx: QueryCtx | MutationCtx) {
  return await ctx.db.query("visualSearchConfig").first();
}

function isProductionEnvironment() {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  const convexDeployment = process.env.CONVEX_DEPLOYMENT?.trim().toLowerCase() ?? "";
  return nodeEnv === "production" || convexDeployment.startsWith("prod:");
}

function normalizeEndpointUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ConvexError({
      code: "INVALID_ENDPOINT_URL",
      message: "Endpoint URL is required.",
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ConvexError({
      code: "INVALID_ENDPOINT_URL",
      message: "Endpoint URL must be a valid URL.",
    });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ConvexError({
      code: "INVALID_ENDPOINT_URL",
      message: "Endpoint URL must use http:// or https://.",
    });
  }

  if (isProductionEnvironment() && parsed.protocol !== "https:") {
    throw new ConvexError({
      code: "INVALID_ENDPOINT_URL",
      message: "Endpoint URL must use https:// in production.",
    });
  }

  if (parsed.search || parsed.hash) {
    throw new ConvexError({
      code: "INVALID_ENDPOINT_URL",
      message: "Endpoint URL must not include query parameters or a fragment.",
    });
  }

  return parsed.toString().replace(/\/+$/, "");
}

function validateMuseumSlug(value: string) {
  const museumSlug = value.trim();
  if (!museumSlug || !MUSEUM_SLUG_PATTERN.test(museumSlug)) {
    throw new ConvexError({
      code: "INVALID_MUSEUM_SLUG",
      message: "Museum slug must contain only lowercase letters, numbers, underscores, and hyphens.",
    });
  }
  return museumSlug;
}

function validateHttpUrl(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ConvexError({
      code: "INVALID_URL",
      message: `${label} is required.`,
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ConvexError({
      code: "INVALID_URL",
      message: `${label} must be a valid URL.`,
    });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ConvexError({
      code: "INVALID_URL",
      message: `${label} must use http:// or https://.`,
    });
  }

  return parsed.toString();
}

function validateTopK(value: number | undefined) {
  const topK = value ?? 5;
  if (!Number.isInteger(topK) || topK < 1 || topK > 50) {
    throw new ConvexError({
      code: "INVALID_TOP_K",
      message: "topK must be an integer between 1 and 50.",
    });
  }
  return topK;
}

function validateSearchArgs(args: { museumSlug: string; imageUrl: string; topK?: number }): ValidatedSearchArgs {
  return {
    museumSlug: validateMuseumSlug(args.museumSlug),
    imageUrl: validateHttpUrl(args.imageUrl, "Image URL"),
    topK: validateTopK(args.topK),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pickString(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function pickNumber(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = asNumber(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function stringifyResponseBody(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncateForError(value: string) {
  return value.length > MAX_ERROR_BODY_LENGTH
    ? `${value.slice(0, MAX_ERROR_BODY_LENGTH)}...`
    : value;
}

async function parseRunpodResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return { data: null, bodyText: "" };
  }

  try {
    return { data: JSON.parse(text) as unknown, bodyText: text };
  } catch {
    return { data: text, bodyText: text };
  }
}

async function callRunpodVisualSearch(
  ctx: ActionCtx,
  { path, method, body, timeoutMs = DEFAULT_RUNPOD_TIMEOUT_MS }: RunpodRequestArgs
) {
  const config = (await ctx.runQuery(
    internal.visualSearch.getRunpodVisualSearchConfig,
    {}
  )) as Pick<Doc<"visualSearchConfig">, "endpointUrl" | "updatedAt" | "updatedBy"> | null;

  if (!config?.endpointUrl) {
    throw new ConvexError({
      code: "VISUAL_SEARCH_ENDPOINT_MISSING",
      message: "Visual search endpoint URL is not configured.",
    });
  }

  const apiKey = process.env.RUNPOD_API_KEY?.trim();
  if (!apiKey) {
    throw new ConvexError({
      code: "RUNPOD_API_KEY_MISSING",
      message: "RUNPOD_API_KEY environment variable is not configured.",
    });
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(`${config.endpointUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller?.signal,
    });
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new ConvexError({
        code: "RUNPOD_TIMEOUT",
        message: `Runpod visual search request timed out after ${timeoutMs}ms.`,
        path,
      });
    }

    throw new ConvexError({
      code: "RUNPOD_FETCH_FAILED",
      message: error instanceof Error ? error.message : "Runpod visual search request failed.",
      path,
    });
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }

  const parsed = await parseRunpodResponse(response);

  if (!response.ok) {
    throw new ConvexError({
      code: "RUNPOD_HTTP_ERROR",
      message: `Runpod visual search request failed with status ${response.status}.`,
      status: response.status,
      body: truncateForError(parsed.bodyText || stringifyResponseBody(parsed.data)),
      path,
    });
  }

  return parsed.data ?? { ok: true, status: response.status };
}

function normalizeSearchResponse(value: unknown, fallback: ValidatedSearchArgs): NormalizedSearchResponse {
  const row = asRecord(value) ?? {};
  const rawResults = Array.isArray(row.results) ? row.results : [];
  const results = rawResults
    .map((entry): SearchResult | null => {
      const result = asRecord(entry);
      if (!result) return null;

      const score = pickNumber(result, "score") ?? 0;
      const rawObjectId = result.object_id ?? result.objectId;

      return {
        artworkKey: pickString(result, "artwork_key", "artworkKey") ?? "",
        objectId: rawObjectId === undefined || rawObjectId === null ? "" : String(rawObjectId),
        title: asOptionalString(result.title),
        artistDisplayName: pickString(result, "artist_display_name", "artistDisplayName"),
        primaryImage: pickString(result, "primary_image", "primaryImage"),
        primaryImageSmall: pickString(result, "primary_image_small", "primaryImageSmall"),
        imageUrlUsed: pickString(result, "image_url_used", "imageUrlUsed"),
        sourceUrl: pickString(result, "source_url", "sourceUrl"),
        score,
      };
    })
    .filter((result): result is SearchResult => result !== null);

  return {
    museumSlug: pickString(row, "museum_slug", "museumSlug") ?? fallback.museumSlug,
    indexVersion: pickString(row, "index_version", "indexVersion") ?? "",
    embeddingModel: pickString(row, "embedding_model", "embeddingModel") ?? "",
    topK: pickNumber(row, "top_k", "topK") ?? fallback.topK,
    results,
  };
}

export const getVisualSearchConfig = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const config = await getVisualSearchConfigRow(ctx);
    if (!config) return null;

    return {
      endpointUrl: config.endpointUrl,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy ?? null,
    };
  },
});

export const getRunpodVisualSearchConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await getVisualSearchConfigRow(ctx);
    if (!config) return null;

    return {
      endpointUrl: config.endpointUrl,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy ?? null,
    };
  },
});

export const setVisualSearchEndpoint = mutation({
  args: {
    endpointUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const endpointUrl = normalizeEndpointUrl(args.endpointUrl);
    const updatedAt = Date.now();
    const updatedBy = user._id;
    const existing = await getVisualSearchConfigRow(ctx);

    if (existing) {
      await ctx.db.patch(existing._id, {
        endpointUrl,
        updatedAt,
        updatedBy,
      });
    } else {
      await ctx.db.insert("visualSearchConfig", {
        endpointUrl,
        updatedAt,
        updatedBy,
      });
    }

    return {
      endpointUrl,
      updatedAt,
      updatedBy,
    };
  },
});

export const pingVisualSearch = action({
  args: {},
  handler: async (ctx) => {
    await requireAdminAction(ctx);
    return await callRunpodVisualSearch(ctx, {
      path: "/ping",
      method: "GET",
    });
  },
});

export const healthVisualSearch = action({
  args: {},
  handler: async (ctx) => {
    await requireAdminAction(ctx);
    return await callRunpodVisualSearch(ctx, {
      path: "/health",
      method: "GET",
    });
  },
});

export const listVisualSearchMuseums = action({
  args: {},
  handler: async (ctx) => {
    await requireAdminAction(ctx);
    return await callRunpodVisualSearch(ctx, {
      path: "/museums",
      method: "GET",
    });
  },
});

export const debugVisualSearchVolume = action({
  args: {},
  handler: async (ctx) => {
    await requireAdminAction(ctx);
    return await callRunpodVisualSearch(ctx, {
      path: "/debug/volume",
      method: "GET",
    });
  },
});

export const reloadVisualSearch = action({
  args: {},
  handler: async (ctx) => {
    await requireAdminAction(ctx);
    return await callRunpodVisualSearch(ctx, {
      path: "/reload",
      method: "POST",
    });
  },
});

export const testVisualSearchSearch = action({
  args: {
    museumSlug: v.string(),
    imageUrl: v.string(),
    topK: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NormalizedSearchResponse> => {
    await requireAdminAction(ctx);
    const input = validateSearchArgs(args);
    const response = await callRunpodVisualSearch(ctx, {
      path: "/search",
      method: "POST",
      timeoutMs: SEARCH_RUNPOD_TIMEOUT_MS,
      body: {
        museum_slug: input.museumSlug,
        image_url: input.imageUrl,
        top_k: input.topK,
      },
    });

    return normalizeSearchResponse(response, input);
  },
});

export const searchArtworkByImage = action({
  args: {
    museumSlug: v.string(),
    imageUrl: v.string(),
    topK: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NormalizedSearchResponse> => {
    await requireAuthenticatedAction(ctx);
    const input = validateSearchArgs(args);
    const response = await callRunpodVisualSearch(ctx, {
      path: "/search",
      method: "POST",
      timeoutMs: SEARCH_RUNPOD_TIMEOUT_MS,
      body: {
        museum_slug: input.museumSlug,
        image_url: input.imageUrl,
        top_k: input.topK,
      },
    });

    return normalizeSearchResponse(response, input);
  },
});
