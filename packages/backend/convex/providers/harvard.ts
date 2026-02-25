import type { ExternalEvent, ProviderFetch } from "./types";

type HarvardProviderConfig = {
  resource?: string;
  params?: Record<string, string>;
};

const DEFAULT_RESOURCE = "exhibition";
const DEFAULT_SIZE = "100";
const DEFAULT_VENUE = "HAM";

const parseProviderConfig = (raw?: string): HarvardProviderConfig => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as HarvardProviderConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

type HarvardVenue = {
  ishamvenue?: number;
  begindate?: string;
  enddate?: string;
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

const pickVenue = (record: Record<string, unknown>): HarvardVenue | null => {
  const venues = record["venues"];
  if (!Array.isArray(venues)) return null;

  const hamVenue = venues.find((venue) => {
    if (!venue || typeof venue !== "object") return false;
    return Number((venue as Record<string, unknown>).ishamvenue) === 1;
  });

  const candidate = hamVenue ?? venues[0];
  if (!candidate || typeof candidate !== "object") return null;
  return candidate as HarvardVenue;
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
    pickFirst(record, ["shortdescription", "description", "text", "labeltext", "overview"])
  );

  const poster = record["poster"];
  const images = record["images"];
  const posterUrl =
    poster && typeof poster === "object" ? toStringValue((poster as Record<string, unknown>).imageurl) : undefined;
  const imagesUrl =
    Array.isArray(images) && images[0] && typeof images[0] === "object"
      ? toStringValue((images[0] as Record<string, unknown>).baseimageurl)
      : undefined;

  const imageUrl = toStringValue(
    pickFirst(record, ["primaryimageurl", "baseimageurl", "imageUrl", "imageurl"])
  ) ?? posterUrl ?? imagesUrl;

  const sourceUrl = toStringValue(pickFirst(record, ["url", "website", "link", "uri"]));

  const venue = pickVenue(record);
  const startDate = toTimestamp(
    venue?.begindate ??
      pickFirst(record, ["begindate", "beginDate", "startdate", "startDate", "datebegin"])
  );

  const endDate = toTimestamp(
    venue?.enddate ??
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
  const todayLabel = new Date(now).toISOString().slice(0, 10);

  const url = new URL(`https://api.harvardartmuseums.org/${resource}`);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("size", params.size ?? DEFAULT_SIZE);
  if (!params.venue) {
    url.searchParams.set("venue", DEFAULT_VENUE);
  }
  if (!params.after) {
    url.searchParams.set("after", `enddate:${todayLabel}`);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (key === "size") return;
    if (key === "venue" && !value) return;
    if (key === "after" && !value) return;
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
  return events.filter((event) => event.endDate >= now || event.startDate >= now);
};
