"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Syne, Newsreader } from "next/font/google";
import { api } from "@packages/backend/convex/_generated/api";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const display = Syne({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const body = Newsreader({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-body" });

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(timestamp));

const formatRange = (start: number, end: number) => {
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
};

export default function MuseumsPage() {
  const museums = useQuery(api.museums.listMuseums);
  const ongoingEvents = useQuery(api.events.listOngoingEvents);

  const eventsByMuseum = useMemo(() => {
  const map = new Map<string, NonNullable<typeof ongoingEvents>>();
  (ongoingEvents ?? []).forEach((event) => {
    if (!event.museumId) return;
    const key = event.museumId;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(event);
  });
  map.forEach((events) => events.sort((a, b) => a.startDate - b.startDate));
  return map;
}, [ongoingEvents]);

  const museumList = useMemo(() => museums ?? [], [museums]);

  return (
    <div
      className={`${display.variable} ${body.variable} min-h-[calc(100vh-5rem)] bg-[radial-gradient(40%_60%_at_10%_10%,rgba(251,191,36,0.25),transparent_70%),radial-gradient(45%_65%_at_90%_0%,rgba(14,165,233,0.2),transparent_70%),radial-gradient(55%_60%_at_50%_100%,rgba(236,72,153,0.18),transparent_70%)] px-4 pb-20 pt-12`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-muted-foreground">
            <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 font-semibold">
              Museum Index
            </span>
            <span className="font-semibold">Live database</span>
          </div>
          <div className="flex flex-col gap-4">
            <h1 className={`${display.className} text-4xl leading-tight sm:text-5xl`}>
              A field guide to the museums in our system.
            </h1>
            <p className={`${body.className} max-w-2xl text-base text-muted-foreground`}>
              Click any museum card to reveal its capsule summary and the ongoing events happening right now. This
              view updates live from Convex, so it doubles as a lightweight operational dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
              {museumList.length} museums
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              {(ongoingEvents ?? []).length} ongoing events
            </Badge>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {museums === undefined && (
            <div className="col-span-full grid gap-4 rounded-3xl border border-dashed border-border/70 bg-background/70 p-8 text-sm text-muted-foreground">
              Fetching museums from Convex...
            </div>
          )}
          {museums !== undefined && museumList.length === 0 && (
            <div className="col-span-full grid gap-4 rounded-3xl border border-dashed border-border/70 bg-background/70 p-8 text-sm text-muted-foreground">
              No museums yet. Seed a few in the debug console first.
            </div>
          )}
          {museumList.map((museum) => {
            const events = eventsByMuseum.get(museum._id) ?? [];
            return (
              <AlertDialog key={museum._id}>
                <AlertDialogTrigger
                  render={
                    <button
                      type="button"
                      className="group relative flex h-full min-h-[320px] flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-background/70 p-5 text-left shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:border-foreground/40"
                    />
                  }
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-70 transition duration-300 group-hover:scale-[1.03]"
                    style={{
                      backgroundImage: museum.imageUrl
                        ? `url(${museum.imageUrl})`
                        : "linear-gradient(135deg, rgba(15,23,42,0.12), rgba(15,23,42,0.35))",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/90" />
                  <div className="relative flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      <span>{museum.category}</span>
                      <span>/</span>
                      <span>
                        {museum.location.city}, {museum.location.state}
                      </span>
                    </div>
                    <h2 className={`${display.className} text-2xl leading-tight`}>{museum.name}</h2>
                    <p className={`${body.className} line-clamp-3 text-sm text-muted-foreground`}>
                      {museum.description || "No description yet. Click to add a narrative for this space."}
                    </p>
                  </div>
                  <div className="relative flex items-center justify-between text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1">
                      {events.length} ongoing
                    </span>
                    <span className="uppercase tracking-[0.2em]">Tap for details</span>
                  </div>
                </AlertDialogTrigger>
                <AlertDialogContent
                  className="max-h-[85vh] max-w-2xl overflow-hidden rounded-[32px] border border-border/60 bg-background/95 p-0 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.55)]"
                >
                  <AlertDialogHeader className="gap-5 p-6 text-left">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted-foreground">
                        <span>{museum.category}</span>
                        <span>/</span>
                        <span>
                          {museum.location.city}, {museum.location.state}
                        </span>
                      </div>
                      <h3 className={`${display.className} text-3xl`}>{museum.name}</h3>
                      <p className={`${body.className} text-base text-muted-foreground`}>
                        {museum.description || "Add a description to spotlight what makes this museum unique."}
                      </p>
                    </div>
                  </AlertDialogHeader>

                  <div className="grid gap-4 border-y border-border/60 bg-muted/40 px-6 py-5">
                    <div className="flex items-center justify-between">
                      <h4 className={`${display.className} text-lg`}>Ongoing events</h4>
                      <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                        {events.length} active
                      </Badge>
                    </div>
                    {events.length === 0 ? (
                      <p className={`${body.className} text-sm text-muted-foreground`}>
                        No active events right now. Add one in the debug console or check back later.
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {events.slice(0, 5).map((event) => (
                          <div key={event._id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-col gap-1">
                                <div className="text-sm font-semibold">{event.title}</div>
                                {event.description && (
                                  <div className="text-xs text-muted-foreground line-clamp-2">
                                    {event.description}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                                {formatRange(event.startDate, event.endDate)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <AlertDialogFooter className="sticky bottom-0 z-10 border-none bg-background/95 px-6 py-3 backdrop-blur">
                    {museum.website ? (
                      <Button
                        className="rounded-full"
                        render={
                          <a href={museum.website} target="_blank" rel="noreferrer" />
                        }
                      >
                        Visit museum site
                      </Button>
                    ) : (
                      <Button disabled className="rounded-full">
                        No website yet
                      </Button>
                    )}
                    <AlertDialogCancel variant="ghost" className="rounded-full">
                      Close
                    </AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            );
          })}
        </section>
      </div>
    </div>
  );
}
