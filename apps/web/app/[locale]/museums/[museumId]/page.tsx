"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { api } from "@packages/backend/convex/_generated/api";
import { Syne, Newsreader } from "next/font/google";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const display = Syne({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const body = Newsreader({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-body" });

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(timestamp),
  );

const formatRange = (start: number, end: number, locale: string) => {
  const startLabel = formatDate(start, locale);
  const endLabel = formatDate(end, locale);
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
};

export default function MuseumDetailPage() {
  const t = useTranslations("museums");
  const locale = useLocale();
  const params = useParams<{ locale: string; museumId: string }>();
  const museumId = params?.museumId as Id<"museums"> | undefined;

  const museum = useQuery(api.museums.getMuseum, museumId ? { id: museumId } : "skip");
  const exhibits = useQuery(api.events.getEventsByMuseum, museumId ? { museumId } : "skip");

  const exhibitList = useMemo(() => (exhibits ?? []).slice().sort((a, b) => a.startDate - b.startDate), [exhibits]);

  return (
    <div
      className={`${display.variable} ${body.variable} min-h-[calc(100vh-5rem)] bg-[radial-gradient(45%_65%_at_0%_0%,rgba(56,189,248,0.2),transparent_70%),radial-gradient(50%_70%_at_100%_5%,rgba(251,191,36,0.2),transparent_70%),radial-gradient(70%_75%_at_50%_100%,rgba(45,212,191,0.2),transparent_70%)] px-4 pb-20 pt-12`}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" className="rounded-full" render={<Link href="/museums" />}>
            {t("backToMuseums")}
          </Button>
          {museum?.website ? (
            <Button className="rounded-full" render={<a href={museum.website} target="_blank" rel="noreferrer" />}>
              {t("visitMuseumSite")}
            </Button>
          ) : (
            <Button disabled className="rounded-full">
              {t("noWebsiteYet")}
            </Button>
          )}
        </div>

        {museum === undefined ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-background/70 p-8 text-sm text-muted-foreground">
            {t("loadingDetails")}
          </div>
        ) : museum === null ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-background/70 p-8 text-sm text-muted-foreground">
            {t("notFound")}
          </div>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-[32px] border border-border/60 bg-background/75 p-7 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.55)] backdrop-blur">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{
                  backgroundImage: museum.imageUrl
                    ? `url(${museum.imageUrl})`
                    : "linear-gradient(130deg, rgba(15,23,42,0.12), rgba(15,23,42,0.36))",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/65 to-background/95" />
              <div className="relative flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  <span>{museum.category}</span>
                  <span>/</span>
                  <span>
                    {museum.location.city}, {museum.location.state}
                  </span>
                </div>
                <h1 className={`${display.className} text-4xl leading-tight sm:text-5xl`}>{museum.name}</h1>
                <p className={`${body.className} max-w-3xl text-base text-muted-foreground`}>
                  {museum.description || museum.tagline || t("noDescriptionDetail")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                    {t("activeExhibitsCount", { count: exhibitList.length })}
                  </Badge>
                  {museum.phone && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                      {museum.phone}
                    </Badge>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-4 rounded-[28px] border border-border/60 bg-background/80 p-6">
              <div className="flex items-center justify-between">
                <h2 className={`${display.className} text-2xl`}>{t("museumDetails")}</h2>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {t("profile")}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 text-sm">
                  {museum.tagline && (
                    <p>
                      <span className="text-muted-foreground">{t("taglineLabel")}</span>
                      {museum.tagline}
                    </p>
                  )}
                  {museum.publicEmail && (
                    <p>
                      <span className="text-muted-foreground">{t("emailLabel")}</span>
                      {museum.publicEmail}
                    </p>
                  )}
                  {museum.phone && (
                    <p>
                      <span className="text-muted-foreground">{t("phoneLabel")}</span>
                      {museum.phone}
                    </p>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {(museum.location.address || museum.location.city || museum.location.state || museum.location.postalCode) && (
                    <p>
                      <span className="text-muted-foreground">{t("addressLabel")}</span>
                      {[museum.location.address, museum.location.city, museum.location.state, museum.location.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {museum.operatingHours && museum.operatingHours.length > 0 && (
                    <div>
                      <p className="text-muted-foreground">{t("operatingHours")}</p>
                      <ul className="mt-1 space-y-1">
                        {museum.operatingHours.map((entry) => (
                          <li key={entry.day}>
                            {entry.day}: {entry.isOpen ? `${entry.openTime} - ${entry.closeTime}` : t("closed")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {museum.accessibilityFeatures && museum.accessibilityFeatures.length > 0 && (
                    <p>
                      <span className="text-muted-foreground">{t("accessibilityLabel")}</span>
                      {museum.accessibilityFeatures.join(", ")}
                    </p>
                  )}
                  {museum.accessibilityNotes && (
                    <p>
                      <span className="text-muted-foreground">{t("accessibilityNotesLabel")}</span>
                      {museum.accessibilityNotes}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-4 rounded-[28px] border border-border/60 bg-background/80 p-6">
              <div className="flex items-center justify-between">
                <h2 className={`${display.className} text-2xl`}>{t("exhibits")}</h2>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {t("liveData")}
                </Badge>
              </div>
              {exhibits === undefined ? (
                <p className={`${body.className} text-sm text-muted-foreground`}>{t("loadingExhibits")}</p>
              ) : exhibitList.length === 0 ? (
                <p className={`${body.className} text-sm text-muted-foreground`}>
                  {t("noActiveExhibits")}
                </p>
              ) : (
                <div className="grid gap-3">
                  {exhibitList.map((event) => (
                    <article key={event._id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <h3 className="text-sm font-semibold">{event.title}</h3>
                          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                            {event.category}
                          </div>
                        </div>
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {formatRange(event.startDate, event.endDate, locale)}
                        </div>
                      </div>
                      {event.description && (
                        <p className={`${body.className} mt-3 text-sm text-muted-foreground`}>{event.description}</p>
                      )}
                      {event.registrationUrl && (
                        <div className="mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            render={<a href={event.registrationUrl} target="_blank" rel="noreferrer" />}
                          >
                            {t("eventDetails")}
                          </Button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
