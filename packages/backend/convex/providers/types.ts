import type { Id } from "../_generated/dataModel";

export type ExternalEvent = {
  sourceId: string;
  title: string;
  startDate: number;
  endDate: number;
  description?: string;
  imageUrl?: string;
  registrationUrl?: string;
  sourceUrl?: string;
  category?: string;
  sourceUpdatedAt?: number;
};

export type MuseumSourceConfig = {
  _id: Id<"museumSources">;
  museumId: Id<"museums">;
  provider: string;
  enabled: boolean;
  providerConfig?: string;
  externalMuseumId?: string;
  syncCursor?: string;
  lastSyncedAt?: number;
  nextSyncAt?: number;
  syncIntervalMinutes?: number;
  lastError?: string;
};

export type ProviderFetchArgs = {
  source: MuseumSourceConfig;
  apiKey: string;
  now: number;
};

export type ProviderFetch = (args: ProviderFetchArgs) => Promise<ExternalEvent[]>;
