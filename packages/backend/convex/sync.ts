import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { providers } from "./providers";
import type { ExternalEvent, MuseumSourceConfig } from "./providers/types";

const DEFAULT_SYNC_INTERVAL_MINUTES = 6 * 60;

const getApiKey = (provider: string): string | null => {
  if (provider === "harvard") {
    return process.env.HARVARD_API_KEY ?? null;
  }

  return null;
};

type NormalizedExternalEvent = ExternalEvent & { sourceFetchedAt?: number };

const normalizeEvents = (events: ExternalEvent[], fetchedAt: number): NormalizedExternalEvent[] =>
  events
    .map((event) => ({
      ...event,
      sourceFetchedAt: fetchedAt,
      category: event.category ?? "exhibition",
    }))
    .filter((event) => event.sourceId && event.title && event.startDate && event.endDate);

export const syncAllSources = action({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sources = await ctx.runQuery(internal.museumSources.listEnabledSources, {});

    for (const source of sources as MuseumSourceConfig[]) {
      const due = !source.nextSyncAt || source.nextSyncAt <= now;
      if (!due) continue;

      const provider = providers[source.provider];
      if (!provider) {
        await ctx.runMutation(internal.sync.markSourceFailed, {
          sourceId: source._id,
          error: `Unknown provider: ${source.provider}`,
          syncedAt: now,
        });
        continue;
      }

      const apiKey = getApiKey(source.provider);
      if (!apiKey) {
        await ctx.runMutation(internal.sync.markSourceFailed, {
          sourceId: source._id,
          error: `Missing API key for provider: ${source.provider}`,
          syncedAt: now,
        });
        continue;
      }

      try {
        const rawEvents = await provider({ source, apiKey, now });
        const events = normalizeEvents(rawEvents, now);

        await ctx.runMutation(internal.sync.upsertExternalEvents, {
          museumId: source.museumId,
          provider: source.provider,
          events,
          fetchedAt: now,
        });

        const intervalMinutes = source.syncIntervalMinutes ?? DEFAULT_SYNC_INTERVAL_MINUTES;
        const nextSyncAt = now + intervalMinutes * 60 * 1000;

        await ctx.runMutation(internal.sync.markSourceSynced, {
          sourceId: source._id,
          syncedAt: now,
          nextSyncAt,
        });
      } catch (error) {
        await ctx.runMutation(internal.sync.markSourceFailed, {
          sourceId: source._id,
          error: error instanceof Error ? error.message : "Unknown sync error",
          syncedAt: now,
        });
      }
    }
  },
});

export const upsertExternalEvents = internalMutation({
  args: {
    museumId: v.id("museums"),
    provider: v.string(),
    fetchedAt: v.number(),
    events: v.array(
      v.object({
        sourceId: v.string(),
        title: v.string(),
        startDate: v.number(),
        endDate: v.number(),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        registrationUrl: v.optional(v.string()),
        sourceUrl: v.optional(v.string()),
        category: v.optional(v.string()),
        sourceUpdatedAt: v.optional(v.number()),
        sourceFetchedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const event of args.events) {
      const existing = await ctx.db
        .query("events")
        .withIndex("by_source", (q) =>
          q.eq("source", args.provider).eq("sourceId", event.sourceId)
        )
        .unique();

      const payload = {
        title: event.title,
        description: event.description,
        category: event.category ?? "exhibition",
        museumId: args.museumId,
        startDate: event.startDate,
        endDate: event.endDate,
        imageUrl: event.imageUrl,
        registrationUrl: event.registrationUrl,
        source: args.provider,
        sourceId: event.sourceId,
        sourceUrl: event.sourceUrl,
        sourceUpdatedAt: event.sourceUpdatedAt,
        sourceFetchedAt: event.sourceFetchedAt ?? args.fetchedAt,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("events", payload);
      }
    }
  },
});

export const markSourceSynced = internalMutation({
  args: {
    sourceId: v.id("museumSources"),
    syncedAt: v.number(),
    nextSyncAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, {
      lastSyncedAt: args.syncedAt,
      nextSyncAt: args.nextSyncAt,
      lastError: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const markSourceFailed = internalMutation({
  args: {
    sourceId: v.id("museumSources"),
    error: v.string(),
    syncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, {
      lastSyncedAt: args.syncedAt,
      lastError: args.error,
      updatedAt: Date.now(),
    });
  },
});
