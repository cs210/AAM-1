"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const localeNames: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  es: "Español",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function onSelect(newLocale: Locale) {
    if (newLocale === locale) return;
    router.replace(pathname || "/", { locale: newLocale });
  }

  return (
    <div className="grid grid-cols-3 items-center gap-0.5 rounded-lg border border-border/60 bg-muted/40 p-0.5">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => onSelect(loc)}
          className={`w-full rounded-md px-2 py-1 text-center text-xs font-medium transition-colors ${
            locale === loc
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={localeNames[loc] ?? loc}
        >
          {localeNames[loc] ?? loc}
        </button>
      ))}
    </div>
  );
}
