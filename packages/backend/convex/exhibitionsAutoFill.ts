"use node";

import Firecrawl from "@mendable/firecrawl-js";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";

const firecrawlRequestRetryCount = 3;
const maxExhibitionsToCreate = 12;

type AutoFillExhibitionsResult = {
  sourceUrl: string;
  createdCount: number;
  skippedCount: number;
  parsedCount: number;
};

type NormalizedExhibition = {
  name: string;
  description?: string;
  startDate?: number;
  endDate?: number;
  imageUrl?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asHttpUrl(value: unknown): string | undefined {
  const text = asTrimmedString(value);
  if (!text) return undefined;
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function parseDateToTimestamp(value: unknown): number | undefined {
  const text = asTrimmedString(value);
  if (!text) return undefined;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function withRetries<T>(operation: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(400 * attempt);
      }
    }
  }
  throw lastError;
}

function normalizeExhibitions(value: unknown): NormalizedExhibition[] {
  if (!Array.isArray(value)) return [];
  const rows: NormalizedExhibition[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    const row = asRecord(entry);
    if (!row) continue;

    const name = asTrimmedString(row.name);
    if (!name) continue;
    const nameKey = name.toLowerCase();
    if (seen.has(nameKey)) continue;
    seen.add(nameKey);

    rows.push({
      name,
      description: asTrimmedString(row.description),
      startDate: parseDateToTimestamp(row.startDate),
      endDate: parseDateToTimestamp(row.endDate),
      imageUrl: asHttpUrl(row.imageUrl),
    });

    if (rows.length >= maxExhibitionsToCreate) break;
  }

  return rows;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export const prefillExhibitionsWithFirecrawl = action({
  args: {
    museumId: v.id("museums"),
    exhibitionsPageUrl: v.string(),
  },
  handler: async (ctx, args): Promise<AutoFillExhibitionsResult> => {
    try {
      const sourceUrl = asHttpUrl(args.exhibitionsPageUrl);
      if (!sourceUrl) {
        throw new Error("A valid exhibitions page URL is required.");
      }

      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY?.trim();
      if (!firecrawlApiKey) {
        throw new Error("Missing FIRECRAWL_API_KEY environment variable");
      }

      // Reuse existing exhibitions query to enforce dashboard access for this museum.
      const existingExhibitions = (await ctx.runQuery(api.exhibitions.listExhibitionsByMuseum, {
        museumId: args.museumId,
      })) as Array<{ name: string; sortOrder: number }>;

      const firecrawl = new Firecrawl({
        apiKey: firecrawlApiKey,
        apiUrl: process.env.FIRECRAWL_API_URL?.trim() || undefined,
      });

      const extractionSchema: Record<string, unknown> = {
        type: "object",
        properties: {
          exhibitions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                startDate: { type: "string" },
                endDate: { type: "string" },
                imageUrl: { type: "string" },
              },
            },
          },
        },
      };

      const scraped = await withRetries(
        () =>
          firecrawl.scrape(sourceUrl, {
            formats: [
              {
                type: "json",
                schema: extractionSchema,
                prompt:
                  "Extract the museum exhibition list from this page. For each exhibition include name, description, startDate, endDate, imageUrl. Use YYYY-MM-DD when possible for dates and only include clear/public exhibitions.",
              },
            ],
            onlyMainContent: true,
          }),
        firecrawlRequestRetryCount
      );

      const extracted = asRecord(scraped.json) ?? {};
      const normalized = normalizeExhibitions(extracted.exhibitions);
      const existingNames = new Set(existingExhibitions.map((ex) => ex.name.trim().toLowerCase()));

      let nextSortOrder =
        existingExhibitions.length > 0
          ? existingExhibitions[existingExhibitions.length - 1]!.sortOrder + 1
          : 0;

      let createdCount = 0;
      let skippedCount = 0;
      for (const exhibition of normalized) {
        if (existingNames.has(exhibition.name.toLowerCase())) {
          skippedCount += 1;
          continue;
        }

        await ctx.runMutation(api.exhibitions.createExhibition, {
          museumId: args.museumId,
          name: exhibition.name,
          description: exhibition.description,
          startDate: exhibition.startDate,
          endDate: exhibition.endDate,
          imageUrl: exhibition.imageUrl,
          sortOrder: nextSortOrder,
        });

        existingNames.add(exhibition.name.toLowerCase());
        nextSortOrder += 1;
        createdCount += 1;
      }

      return {
        sourceUrl,
        createdCount,
        skippedCount,
        parsedCount: normalized.length,
      };
    } catch (error) {
      const message = toErrorMessage(error);
      if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
        throw new Error(
          "Unable to reach Firecrawl API from Convex runtime. Check FIRECRAWL_API_KEY and optional FIRECRAWL_API_URL."
        );
      }
      throw error;
    }
  },
});

