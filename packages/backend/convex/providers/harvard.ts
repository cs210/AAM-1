import type { ExternalEvent, ProviderFetch } from "./types";

type HarvardProviderConfig = {
  resource?: string;
  params?: Record<string, string>;
};

const DEFAULT_RESOURCE = "exhibition";
const DEFAULT_SIZE = "100";

const parseProviderConfig = (raw?: string): HarvardProviderConfig => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as HarvardProviderConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const toTimestamp = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1_000_000_000_000) return Math.floor(value);
    if (value > 1_000_000_000) return Math.floor(value * 1000);
    if (value >= 1000 && value < 10000) return new Date(value, 0, 1).getTime();
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}$/.test(trimmed)) {
      return new Date(Number(trimmed), 0, 1).getTime();
    }
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const pickFirst = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
};

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};

const mapRecord = (record: Record<string, unknown>): ExternalEvent | null => {
  const sourceId = toStringValue(
    pickFirst(record, ["id", "exhibitionid", "exhibitionId", "exhibition_id"])
  );
  if (!sourceId) return null;

  const title =
    toStringValue(pickFirst(record, ["title", "name", "exhibitiontitle", "exhibition_title"])) ??
    "Untitled exhibition";

  const description = toStringValue(
    pickFirst(record, ["description", "shortdescription", "text", "labeltext", "overview"])
  );

  const imageUrl = toStringValue(
    pickFirst(record, ["primaryimageurl", "baseimageurl", "imageUrl", "imageurl"])
  );

  const sourceUrl = toStringValue(pickFirst(record, ["url", "website", "link", "uri"]));

  const startDate = toTimestamp(
    pickFirst(record, ["begindate", "beginDate", "startdate", "startDate", "datebegin"])
  );

  const endDate = toTimestamp(
    pickFirst(record, ["enddate", "endDate", "dateend"])
  );

  if (!startDate && !endDate) return null;

  const normalizedStart = startDate ?? endDate ?? Date.now();
  const normalizedEnd = Math.max(endDate ?? normalizedStart, normalizedStart);

  const sourceUpdatedAt = toTimestamp(
    pickFirst(record, ["lastupdate", "lastUpdate", "updatedat", "updatedAt", "modified"])
  ) ?? undefined;

  return {
    sourceId,
    title,
    description,
    imageUrl,
    sourceUrl,
    startDate: normalizedStart,
    endDate: normalizedEnd,
    category: "exhibition",
    sourceUpdatedAt,
  };
};

export const fetchHarvardExhibitions: ProviderFetch = async ({ source, apiKey, now }) => {
  const config = parseProviderConfig(source.providerConfig);
  const resource = config.resource ?? DEFAULT_RESOURCE;
  const params = config.params ?? {};

  const url = new URL(`https://api.harvardartmuseums.org/${resource}`);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("size", params.size ?? DEFAULT_SIZE);

  Object.entries(params).forEach(([key, value]) => {
    if (key === "size") return;
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Harvard API error: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as { records?: Record<string, unknown>[] };
  const records = Array.isArray(payload?.records) ? payload.records : [];
  const events = records.map(mapRecord).filter((event): event is ExternalEvent => Boolean(event));

  const maxAgeMs = 1000 * 60 * 60 * 24 * 14;
  const minEndDate = now - maxAgeMs;

  return events.filter((event) => event.endDate >= minEndDate);
};
