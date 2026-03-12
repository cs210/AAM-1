"use node";

import Firecrawl from "@mendable/firecrawl-js";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";

const firecrawlImageLimit = 5;
const firecrawlFallbackAdditionalImageLimit = 2;
const googlePhotoLimit = 3;
const firecrawlRequestRetryCount = 3;
const googleRequestRetryCount = 2;
const defaultGooglePlacesApiUrl = "https://places.googleapis.com";
const googlePlacesFieldMask = [
  "places.name",
  "places.displayName",
  "places.types",
  "places.primaryTypeDisplayName",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.websiteUri",
  "places.photos",
  "places.editorialSummary",
  "places.regularOpeningHours",
  "places.accessibilityOptions",
].join(",");
const prefillKeysForFallback = [
  "tagline",
  "description",
  "category",
  "publicEmail",
  "website",
  "phone",
  "timezone",
  "address",
  "city",
  "state",
  "country",
  "postalCode",
  "latitude",
  "longitude",
  "accessibilityNotes",
] as const;
const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const googleDayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

type OperatingHour = {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

type MuseumDetailsForPrefill = {
  name: string;
  category: string;
  location: {
    city?: string;
    state?: string;
    country?: string;
  };
};

type PrefillActionResult = {
  sourceUrl: string;
  searchQuery: string;
  imageUrls: string[];
  placesFound: boolean;
  usedFirecrawlFallback: boolean;
  needsWebsiteForFallback: boolean;
  missingFields: string[];
  prefill: {
    name: string;
    tagline: string;
    description: string;
    category: string;
    publicEmail: string;
    website: string;
    phone: string;
    timezone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude: string;
    longitude: string;
    imageUrl: string;
    accessibilityNotes: string;
  };
  operatingHours?: OperatingHour[];
  accessibilityFeatures?: string[];
};

type PrefillFormData = PrefillActionResult["prefill"];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function hasText(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
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

function dedupeHttpUrls(values: unknown[], limit: number): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = asHttpUrl(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
    if (urls.length >= limit) break;
  }
  return urls;
}

function normalizeTime(value: unknown): string | undefined {
  const text = asTrimmedString(value);
  if (!text) return undefined;

  const twentyFourHour = text.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHour) {
    const hour = twentyFourHour[1]!.padStart(2, "0");
    return `${hour}:${twentyFourHour[2]}`;
  }

  const meridiem = text.match(/^(\d{1,2})(?::([0-5]\d))?\s*(am|pm)$/i);
  if (!meridiem) return undefined;

  let hour = Number(meridiem[1]);
  const minute = meridiem[2] ?? "00";
  const period = meridiem[3]!.toLowerCase();

  if (hour === 12) {
    hour = period === "am" ? 0 : 12;
  } else if (period === "pm") {
    hour += 12;
  }
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

function normalizeDay(value: unknown): string | undefined {
  const text = asTrimmedString(value);
  if (!text) return undefined;
  const normalized = text.toLowerCase();
  const exact = dayOrder.find((day) => day.toLowerCase() === normalized);
  if (exact) return exact;
  if (normalized.startsWith("mon")) return "Monday";
  if (normalized.startsWith("tue")) return "Tuesday";
  if (normalized.startsWith("wed")) return "Wednesday";
  if (normalized.startsWith("thu")) return "Thursday";
  if (normalized.startsWith("fri")) return "Friday";
  if (normalized.startsWith("sat")) return "Saturday";
  if (normalized.startsWith("sun")) return "Sunday";
  return undefined;
}

function normalizeTimeFromHourMinute(hour: unknown, minute: unknown, fallback: string): string {
  const parsedHour = asNumber(hour);
  const parsedMinute = asNumber(minute);
  if (parsedHour === undefined || parsedMinute === undefined) return fallback;
  const boundedHour = Math.max(0, Math.min(23, Math.floor(parsedHour)));
  const boundedMinute = Math.max(0, Math.min(59, Math.floor(parsedMinute)));
  return `${boundedHour.toString().padStart(2, "0")}:${boundedMinute.toString().padStart(2, "0")}`;
}

function normalizeOperatingHours(value: unknown): OperatingHour[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed = value
    .map((entry) => {
      const row = asRecord(entry);
      if (!row) return null;
      const day = normalizeDay(row.day);
      if (!day) return null;
      return {
        day,
        isOpen: typeof row.isOpen === "boolean" ? row.isOpen : true,
        openTime: normalizeTime(row.openTime) ?? "10:00",
        closeTime: normalizeTime(row.closeTime) ?? "18:00",
      };
    })
    .filter((entry): entry is OperatingHour => Boolean(entry));
  return parsed.length > 0 ? parsed : undefined;
}

function normalizeGoogleOperatingHours(value: unknown): OperatingHour[] | undefined {
  const root = asRecord(value);
  const periods = Array.isArray(root?.periods) ? root.periods : [];
  if (periods.length === 0) return undefined;

  const byDay = new Map<string, OperatingHour>();
  for (const day of dayOrder) {
    byDay.set(day, {
      day,
      isOpen: false,
      openTime: "10:00",
      closeTime: "18:00",
    });
  }

  for (const period of periods) {
    const row = asRecord(period);
    const open = asRecord(row?.open);
    if (!open) continue;

    const dayNumber = asNumber(open.day);
    if (dayNumber === undefined) continue;

    const googleDay = googleDayOrder[Math.floor(dayNumber)];
    if (!googleDay) continue;
    const normalized = normalizeDay(googleDay);
    if (!normalized) continue;

    const close = asRecord(row?.close);
    byDay.set(normalized, {
      day: normalized,
      isOpen: true,
      openTime: normalizeTimeFromHourMinute(open.hour, open.minute, "10:00"),
      closeTime: normalizeTimeFromHourMinute(close?.hour, close?.minute, "18:00"),
    });
  }

  return dayOrder.map((day) => byDay.get(day) ?? { day, isOpen: false, openTime: "10:00", closeTime: "18:00" });
}

function mapAccessibilityFeature(value: string): string | null {
  if (value.includes("wheelchair")) return "wheelchair";
  if (value.includes("elevator")) return "elevators";
  if (value.includes("restroom")) return "accessible-restrooms";
  if (value.includes("assistive") || value.includes("listening")) return "assistive-listening";
  if (value.includes("braille") || value.includes("tactile")) return "braille-signage";
  if (value.includes("sensory")) return "sensory-hours";
  return null;
}

function normalizeAccessibilityFeatures(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const mapped = value
    .map((entry) => asTrimmedString(entry)?.toLowerCase())
    .filter((entry): entry is string => Boolean(entry))
    .map(mapAccessibilityFeature)
    .filter((entry): entry is string => Boolean(entry));
  return mapped.length > 0 ? Array.from(new Set(mapped)) : undefined;
}

function normalizeGoogleAccessibilityFeatures(value: unknown): string[] | undefined {
  const root = asRecord(value);
  if (!root) return undefined;

  const features = new Set<string>();
  if (
    root.wheelchairAccessibleEntrance === true ||
    root.wheelchairAccessibleParking === true ||
    root.wheelchairAccessibleSeating === true
  ) {
    features.add("wheelchair");
  }
  if (root.wheelchairAccessibleRestroom === true) {
    features.add("accessible-restrooms");
  }
  return features.size > 0 ? Array.from(features) : undefined;
}

function getAddressComponent(
  componentsValue: unknown,
  type: string,
  preferShortText = false
): string | undefined {
  if (!Array.isArray(componentsValue)) return undefined;
  for (const componentValue of componentsValue) {
    const component = asRecord(componentValue);
    if (!component) continue;
    const types = Array.isArray(component.types) ? component.types : [];
    if (!types.includes(type)) continue;
    return (
      (preferShortText ? asTrimmedString(component.shortText) : undefined) ??
      asTrimmedString(component.longText) ??
      asTrimmedString(component.shortText)
    );
  }
  return undefined;
}

function inferCategoryFromGooglePlace(typesValue: unknown, primaryTypeDisplayName: unknown): string | undefined {
  const typeTokens = Array.isArray(typesValue)
    ? typesValue.map((value) => asTrimmedString(value)?.toLowerCase()).filter((value): value is string => Boolean(value))
    : [];

  const primaryTypeText =
    asTrimmedString(asRecord(primaryTypeDisplayName)?.text)?.toLowerCase() ??
    asTrimmedString(primaryTypeDisplayName)?.toLowerCase() ??
    "";
  const source = [...typeTokens, primaryTypeText].join(" ");

  if (source.includes("contemporary")) return "contemporary";
  if (source.includes("natural_history_museum") || source.includes("natural history")) return "natural-history";
  if (source.includes("history_museum") || source.includes("history")) return "history";
  if (source.includes("science_museum") || source.includes("science")) return "science";
  if (source.includes("children_museum") || source.includes("children")) return "children";
  if (source.includes("photography")) return "photography";
  if (source.includes("design")) return "design";
  if (source.includes("cultural") || source.includes("heritage")) return "culture";
  if (source.includes("art_museum") || source.includes("art_gallery") || source.includes("art")) return "art";
  if (source.includes("museum")) return "specialty";
  return undefined;
}

function createBasePrefill(museumName: string, details: MuseumDetailsForPrefill): PrefillFormData {
  return {
    name: museumName,
    tagline: "",
    description: "",
    category: details.category ?? "",
    publicEmail: "",
    website: "",
    phone: "",
    timezone: "",
    address: "",
    city: details.location.city ?? "",
    state: details.location.state ?? "",
    country: details.location.country ?? "",
    postalCode: "",
    latitude: "",
    longitude: "",
    imageUrl: "",
    accessibilityNotes: "",
  };
}

function getMissingPrefillFields(prefill: PrefillFormData): string[] {
  return prefillKeysForFallback.filter((key) => !hasText(prefill[key])).map((key) => key.toString());
}

function mergeMissingPrefillField(
  currentValue: string,
  candidateValue: unknown,
  normalizer: (value: unknown) => string | undefined = asTrimmedString
): string {
  if (hasText(currentValue)) return currentValue;
  return normalizer(candidateValue) ?? "";
}

function buildGoogleSearchQuery(museumName: string, details: MuseumDetailsForPrefill, args: { city?: string; state?: string; country?: string }): string {
  return [
    museumName,
    args.city?.trim() || details.location.city || "",
    args.state?.trim() || details.location.state || "",
    args.country?.trim() || details.location.country || "",
    "museum",
  ]
    .filter(Boolean)
    .join(" ");
}

async function fetchJsonResponse(
  url: string,
  init: RequestInit,
  requestLabel: string
): Promise<Record<string, unknown>> {
  const response = await fetch(url, init);
  const raw = await response.text();
  if (!response.ok) {
    const detail = raw.slice(0, 300);
    throw new Error(`${requestLabel} failed (${response.status}): ${detail}`);
  }

  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return asRecord(parsed) ?? {};
  } catch {
    throw new Error(`${requestLabel} returned a non-JSON response.`);
  }
}

async function fetchGooglePlacesTopResult(
  searchQuery: string,
  apiKey: string,
  apiBaseUrl: string
): Promise<Record<string, unknown> | null> {
  const url = `${apiBaseUrl.replace(/\/$/, "")}/v1/places:searchText`;
  const payload = {
    textQuery: searchQuery,
    maxResultCount: 5,
    languageCode: "en",
  };

  const root = await withRetries(
    () =>
      fetchJsonResponse(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": googlePlacesFieldMask,
          },
          body: JSON.stringify(payload),
        },
        "Google Places Text Search"
      ),
    googleRequestRetryCount
  );

  const places = Array.isArray(root.places) ? root.places : [];
  return asRecord(places[0]) ?? null;
}

async function fetchGooglePlacePhotoUris(
  place: Record<string, unknown>,
  apiKey: string,
  apiBaseUrl: string
): Promise<string[]> {
  const photos = Array.isArray(place.photos) ? place.photos : [];
  const photoNames = photos
    .map((entry) => asTrimmedString(asRecord(entry)?.name))
    .filter((name): name is string => Boolean(name))
    .slice(0, googlePhotoLimit);

  if (photoNames.length === 0) return [];

  const urls: string[] = [];
  for (const photoName of photoNames) {
    const encodedPhotoPath = photoName
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const mediaUrl = new URL(`${apiBaseUrl.replace(/\/$/, "")}/v1/${encodedPhotoPath}/media`);
    mediaUrl.searchParams.set("maxWidthPx", "2400");
    mediaUrl.searchParams.set("skipHttpRedirect", "true");

    const root = await withRetries(
      () =>
        fetchJsonResponse(
          mediaUrl.toString(),
          {
            method: "GET",
            headers: {
              "X-Goog-Api-Key": apiKey,
            },
          },
          "Google Places Photo media"
        ),
      googleRequestRetryCount
    );

    const photoUri = asHttpUrl(root.photoUri);
    if (photoUri) {
      urls.push(photoUri);
    }
  }

  return dedupeHttpUrls(urls, googlePhotoLimit);
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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

async function runFirecrawlScrape(
  firecrawl: Firecrawl,
  sourceUrl: string
): Promise<{
  sourceUrl: string;
  extracted: Record<string, unknown>;
  imageUrls: string[];
  operatingHours?: OperatingHour[];
  accessibilityFeatures?: string[];
}> {
  const extractionSchema: Record<string, unknown> = {
    type: "object",
    properties: {
      name: { type: "string" },
      tagline: { type: "string" },
      description: { type: "string" },
      category: { type: "string" },
      website: { type: "string" },
      phone: { type: "string" },
      publicEmail: { type: "string" },
      address: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      country: { type: "string" },
      postalCode: { type: "string" },
      latitude: { type: "number" },
      longitude: { type: "number" },
      timezone: { type: "string" },
      accessibilityNotes: { type: "string" },
      accessibilityFeatures: { type: "array", items: { type: "string" } },
      operatingHours: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: { type: "string" },
            isOpen: { type: "boolean" },
            openTime: { type: "string" },
            closeTime: { type: "string" },
          },
        },
      },
    },
  };

  const scraped = await withRetries(
    () =>
      firecrawl.scrape(sourceUrl, {
        formats: [
          "images",
          "summary",
          {
            type: "json",
            schema: extractionSchema,
            prompt:
              "Extract structured museum profile details for dashboard editing. Prefer explicit facts and leave unknown fields blank.",
          },
        ],
        onlyMainContent: true,
      }),
    firecrawlRequestRetryCount
  );

  const extracted: Record<string, unknown> = asRecord(scraped.json) ?? {};
  const metadata = asRecord(scraped.metadata);
  const images = Array.isArray(scraped.images) ? scraped.images : [];
  const imageUrls = dedupeHttpUrls([...images, metadata?.ogImage, scraped.screenshot], firecrawlImageLimit);
  const resolvedSourceUrl = asHttpUrl(metadata?.sourceURL) ?? asHttpUrl(metadata?.sourceUrl) ?? sourceUrl;

  return {
    sourceUrl: resolvedSourceUrl,
    extracted,
    imageUrls,
    operatingHours: normalizeOperatingHours(extracted.operatingHours),
    accessibilityFeatures: normalizeAccessibilityFeatures(extracted.accessibilityFeatures),
  };
}

export const prefillMuseumDetailsWithFirecrawl = action({
  args: {
    museumId: v.id("museums"),
    museumName: v.string(),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    websiteOverride: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PrefillActionResult> => {
    try {
      const details = (await ctx.runQuery(api.museums.getMuseumDetailsForDashboard, {
        id: args.museumId,
      })) as MuseumDetailsForPrefill | null;
      if (!details) {
        throw new Error("Museum not found");
      }

      const museumName: string = args.museumName.trim() || details.name;
      if (!museumName) {
        throw new Error("Museum name is required to run prefill");
      }

      const websiteOverrideRaw = args.websiteOverride?.trim();
      const websiteOverride = hasText(websiteOverrideRaw) ? asHttpUrl(websiteOverrideRaw) : undefined;
      if (hasText(websiteOverrideRaw) && !websiteOverride) {
        throw new Error("Website override must be a valid http(s) URL.");
      }

      const googlePlacesApiKey =
        process.env.GOOGLE_PLACES_API_KEY?.trim() ?? process.env.GOOGLE_MAPS_API_KEY?.trim();
      if (!googlePlacesApiKey) {
        throw new Error("Missing GOOGLE_PLACES_API_KEY (or GOOGLE_MAPS_API_KEY) environment variable");
      }

      const googlePlacesApiUrl = process.env.GOOGLE_PLACES_API_URL?.trim() || defaultGooglePlacesApiUrl;
      const searchQuery = buildGoogleSearchQuery(museumName, details, args);
      const topPlace = await fetchGooglePlacesTopResult(searchQuery, googlePlacesApiKey, googlePlacesApiUrl);
      const placesFound = Boolean(topPlace);

      const prefillFromPlaces = createBasePrefill(museumName, details);
      const googleOperatingHours = normalizeGoogleOperatingHours(topPlace?.regularOpeningHours);
      const googleAccessibilityFeatures = normalizeGoogleAccessibilityFeatures(topPlace?.accessibilityOptions);

      if (topPlace) {
        const displayName = asTrimmedString(asRecord(topPlace.displayName)?.text);
        const websiteFromPlace = asHttpUrl(topPlace.websiteUri);
        const latitude = asNumber(asRecord(topPlace.location)?.latitude);
        const longitude = asNumber(asRecord(topPlace.location)?.longitude);
        const categoryFromPlace = inferCategoryFromGooglePlace(topPlace.types, topPlace.primaryTypeDisplayName);
        const cityFromPlace =
          getAddressComponent(topPlace.addressComponents, "locality") ??
          getAddressComponent(topPlace.addressComponents, "postal_town") ??
          getAddressComponent(topPlace.addressComponents, "administrative_area_level_2");

        prefillFromPlaces.name = displayName ?? museumName;
        prefillFromPlaces.description = asTrimmedString(asRecord(topPlace.editorialSummary)?.text) ?? "";
        prefillFromPlaces.category = categoryFromPlace ?? details.category ?? "";
        prefillFromPlaces.website = websiteOverride ?? websiteFromPlace ?? "";
        prefillFromPlaces.phone =
          asTrimmedString(topPlace.nationalPhoneNumber) ??
          asTrimmedString(topPlace.internationalPhoneNumber) ??
          "";
        prefillFromPlaces.address = asTrimmedString(topPlace.formattedAddress) ?? "";
        prefillFromPlaces.city = cityFromPlace ?? args.city?.trim() ?? details.location.city ?? "";
        prefillFromPlaces.state =
          getAddressComponent(topPlace.addressComponents, "administrative_area_level_1", true) ??
          args.state?.trim() ??
          details.location.state ??
          "";
        prefillFromPlaces.country =
          getAddressComponent(topPlace.addressComponents, "country") ??
          args.country?.trim() ??
          details.location.country ??
          "";
        prefillFromPlaces.postalCode = getAddressComponent(topPlace.addressComponents, "postal_code") ?? "";
        prefillFromPlaces.latitude = latitude !== undefined ? latitude.toString() : "";
        prefillFromPlaces.longitude = longitude !== undefined ? longitude.toString() : "";
      } else if (websiteOverride) {
        prefillFromPlaces.website = websiteOverride;
      }

      const googleImageUrls = topPlace
        ? await fetchGooglePlacePhotoUris(topPlace, googlePlacesApiKey, googlePlacesApiUrl)
        : [];
      const websiteForFallback = websiteOverride ?? asHttpUrl(prefillFromPlaces.website);
      const missingBeforeFallback = getMissingPrefillFields(prefillFromPlaces);
      const shouldRunFirecrawlFallback = Boolean(websiteForFallback && missingBeforeFallback.length > 0);

      let sourceUrl = websiteForFallback ?? "";
      let prefill = { ...prefillFromPlaces };
      let imageUrls = dedupeHttpUrls(googleImageUrls, firecrawlImageLimit);
      let usedFirecrawlFallback = false;
      let operatingHours = googleOperatingHours;
      let accessibilityFeatures = googleAccessibilityFeatures;

      if (shouldRunFirecrawlFallback && websiteForFallback) {
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY?.trim();
        if (!firecrawlApiKey) {
          throw new Error("Missing FIRECRAWL_API_KEY environment variable");
        }

        const firecrawl = new Firecrawl({
          apiKey: firecrawlApiKey,
          apiUrl: process.env.FIRECRAWL_API_URL?.trim() || undefined,
        });
        const scraped = await runFirecrawlScrape(firecrawl, websiteForFallback);
        sourceUrl = scraped.sourceUrl;
        usedFirecrawlFallback = true;

        const latitudeFromScrape = asNumber(scraped.extracted.latitude);
        const longitudeFromScrape = asNumber(scraped.extracted.longitude);
        prefill = {
          name: mergeMissingPrefillField(prefill.name, scraped.extracted.name),
          tagline: mergeMissingPrefillField(prefill.tagline, scraped.extracted.tagline),
          description: mergeMissingPrefillField(prefill.description, scraped.extracted.description),
          category: mergeMissingPrefillField(prefill.category, scraped.extracted.category),
          publicEmail: mergeMissingPrefillField(prefill.publicEmail, scraped.extracted.publicEmail),
          website:
            prefill.website ||
            asHttpUrl(scraped.extracted.website) ||
            websiteForFallback ||
            "",
          phone: mergeMissingPrefillField(prefill.phone, scraped.extracted.phone),
          timezone: mergeMissingPrefillField(prefill.timezone, scraped.extracted.timezone),
          address: mergeMissingPrefillField(prefill.address, scraped.extracted.address),
          city: mergeMissingPrefillField(prefill.city, scraped.extracted.city),
          state: mergeMissingPrefillField(prefill.state, scraped.extracted.state),
          country: mergeMissingPrefillField(prefill.country, scraped.extracted.country),
          postalCode: mergeMissingPrefillField(prefill.postalCode, scraped.extracted.postalCode),
          latitude:
            hasText(prefill.latitude) ? prefill.latitude : latitudeFromScrape !== undefined ? latitudeFromScrape.toString() : "",
          longitude:
            hasText(prefill.longitude) ? prefill.longitude : longitudeFromScrape !== undefined ? longitudeFromScrape.toString() : "",
          imageUrl: "",
          accessibilityNotes: mergeMissingPrefillField(prefill.accessibilityNotes, scraped.extracted.accessibilityNotes),
        };

        if (!operatingHours || operatingHours.length === 0) {
          operatingHours = scraped.operatingHours;
        }
        if (!accessibilityFeatures || accessibilityFeatures.length === 0) {
          accessibilityFeatures = scraped.accessibilityFeatures;
        }
        const fallbackImageUrls = dedupeHttpUrls(scraped.imageUrls, firecrawlFallbackAdditionalImageLimit);
        imageUrls = dedupeHttpUrls([...googleImageUrls, ...fallbackImageUrls], firecrawlImageLimit);
      }

      prefill.imageUrl = prefill.imageUrl || imageUrls[0] || "";
      const missingFields = getMissingPrefillFields(prefill);
      const needsWebsiteForFallback = !websiteForFallback && missingFields.length > 0;

      return {
        sourceUrl,
        searchQuery,
        imageUrls,
        placesFound,
        usedFirecrawlFallback,
        needsWebsiteForFallback,
        missingFields,
        prefill,
        operatingHours,
        accessibilityFeatures,
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
