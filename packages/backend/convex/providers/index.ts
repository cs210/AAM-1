import type { ProviderFetch } from "./types";
import { fetchHarvardExhibitions } from "./harvard";

export const providers: Record<string, ProviderFetch> = {
  harvard: fetchHarvardExhibitions,
};
