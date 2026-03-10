import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ja", "es"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

export function isValidLocale(locale: string): locale is Locale {
  return routing.locales.includes(locale as Locale);
}
