"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Status = { type: "idle" | "working" | "success" | "error"; message?: string };

const defaultMuseum = {
  name: "",
  description: "",
  category: "art",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  latitude: "42.3549",
  longitude: "-71.0493",
  imageUrl: "",
  website: "",
  phone: "",
};

const defaultEvent = {
  title: "",
  description: "",
  category: "exhibition",
  museumId: null as string | null,
  city: "",
  state: "",
  zipCode: "",
  latitude: "",
  longitude: "",
  startDate: "",
  endDate: "",
  imageUrl: "",
  registrationUrl: "",
};

export default function DebugSeedPage() {
  const t = useTranslations("debug");
  const museums = useQuery(api.museums.listMuseums);
  const addMuseum = useMutation(api.museums.addMuseum);
  const addEvent = useMutation(api.events.addEvent);

  const [museumForm, setMuseumForm] = useState(defaultMuseum);
  const [eventForm, setEventForm] = useState(defaultEvent);
  const [museumStatus, setMuseumStatus] = useState<Status>({ type: "idle" });
  const [eventStatus, setEventStatus] = useState<Status>({ type: "idle" });

  const museumList = useMemo(() => museums ?? [], [museums]);
  const selectedMuseum = useMemo(
    () => museumList.find((museum) => museum._id === eventForm.museumId) ?? null,
    [museumList, eventForm.museumId]
  );

  const resetMuseum = () => {
    setMuseumForm(defaultMuseum);
    setMuseumStatus({ type: "idle" });
  };

  const resetEvent = () => {
    setEventForm(defaultEvent);
    setEventStatus({ type: "idle" });
  };

  const submitMuseum = async () => {
    setMuseumStatus({ type: "working", message: t("saving") });
    if (!museumForm.name.trim()) {
      setMuseumStatus({ type: "error", message: t("museumRequired") });
      return;
    }
    if (!museumForm.city.trim() || !museumForm.state.trim() || !museumForm.zipCode.trim()) {
      setMuseumStatus({ type: "error", message: t("cityStateZipRequired") });
      return;
    }

    const latitude = Number(museumForm.latitude);
    const longitude = Number(museumForm.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setMuseumStatus({ type: "error", message: t("latLngValid") });
      return;
    }

    try {
      await addMuseum({
        point: { latitude, longitude },
        name: museumForm.name.trim(),
        description: museumForm.description.trim() || undefined,
        category: museumForm.category.trim(),
        location: {
          address: museumForm.address.trim() || undefined,
          city: museumForm.city.trim(),
          state: museumForm.state.trim(),
        },
        imageUrl: museumForm.imageUrl.trim() || undefined,
        website: museumForm.website.trim() || undefined,
        phone: museumForm.phone.trim() || undefined,
      });
      setMuseumStatus({ type: "success", message: t("museumSaved") });
      setMuseumForm({ ...defaultMuseum, city: museumForm.city, state: museumForm.state, zipCode: museumForm.zipCode });
    } catch (error) {
      setMuseumStatus({ type: "error", message: error instanceof Error ? error.message : t("saveMuseumFailed") });
    }
  };

  const submitEvent = async () => {
    setEventStatus({ type: "working", message: t("saving") });
    if (!eventForm.title.trim()) {
      setEventStatus({ type: "error", message: t("eventTitleRequired") });
      return;
    }

    const startDate = Date.parse(eventForm.startDate);
    const endDate = Date.parse(eventForm.endDate);
    if (Number.isNaN(startDate) || Number.isNaN(endDate)) {
      setEventStatus({ type: "error", message: t("startEndRequired") });
      return;
    }
    if (endDate < startDate) {
      setEventStatus({ type: "error", message: t("endAfterStart") });
      return;
    }

    const hasMuseum = Boolean(eventForm.museumId);
    if (!hasMuseum) {
      if (!eventForm.city.trim() || !eventForm.state.trim() || !eventForm.zipCode.trim()) {
        setEventStatus({ type: "error", message: t("locationRequiredNoMuseum") });
        return;
      }
    }

    let latitude: number | undefined;
    let longitude: number | undefined;
    if (!hasMuseum) {
      if (!eventForm.latitude.trim() || !eventForm.longitude.trim()) {
        setEventStatus({ type: "error", message: t("latLngRequiredNoMuseum") });
        return;
      }
      latitude = Number(eventForm.latitude);
      longitude = Number(eventForm.longitude);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        setEventStatus({ type: "error", message: t("latLngValid") });
        return;
      }
    }

    try {
      await addEvent({
        point: { latitude: latitude ?? 0, longitude: longitude ?? 0 },
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
        category: eventForm.category.trim(),
        museumId: hasMuseum ? (eventForm.museumId as typeof museumList[number]["_id"]) : undefined,
        location: hasMuseum
          ? undefined
          : {
              city: eventForm.city.trim(),
              state: eventForm.state.trim(),
            },
        startDate,
        endDate,
        imageUrl: eventForm.imageUrl.trim() || undefined,
        registrationUrl: eventForm.registrationUrl.trim() || undefined,
      });
      setEventStatus({ type: "success", message: t("eventSaved") });
      setEventForm({ ...defaultEvent, museumId: eventForm.museumId });
    } catch (error) {
      setEventStatus({ type: "error", message: error instanceof Error ? error.message : t("saveEventFailed") });
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(60%_55%_at_12%_8%,rgba(251,191,36,0.22),transparent_60%),radial-gradient(55%_55%_at_88%_6%,rgba(59,130,246,0.2),transparent_60%),radial-gradient(60%_80%_at_50%_100%,rgba(16,185,129,0.18),transparent_60%)] px-4 pb-20 pt-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="w-fit rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("badge")}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("intro")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card className="border border-border/60 bg-background/80 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
              <CardHeader>
                <CardTitle>{t("museumIntake")}</CardTitle>
                <CardDescription>{t("museumIntakeDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="museum-name">{t("museumName")}</Label>
                  <Input
                    id="museum-name"
                    value={museumForm.name}
                    onChange={(event) => setMuseumForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Harbor City Art Museum"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="museum-description">{t("description")}</Label>
                  <Textarea
                    id="museum-description"
                    value={museumForm.description}
                    onChange={(event) => setMuseumForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Modern and contemporary art near the waterfront."
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="museum-category">{t("category")}</Label>
                  <Input
                    id="museum-category"
                    value={museumForm.category}
                    onChange={(event) => setMuseumForm((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="art, history, science"
                  />
                </div>
                <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/50 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    {t("location")}
                  </span>
                  <div className="grid gap-2">
                    <Label htmlFor="museum-address">{t("address")}</Label>
                    <Input
                      id="museum-address"
                      value={museumForm.address}
                      onChange={(event) => setMuseumForm((prev) => ({ ...prev, address: event.target.value }))}
                      placeholder="100 Seaport Ave"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="museum-city">{t("city")}</Label>
                      <Input
                        id="museum-city"
                        value={museumForm.city}
                        onChange={(event) => setMuseumForm((prev) => ({ ...prev, city: event.target.value }))}
                        placeholder="Boston"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="museum-state">{t("state")}</Label>
                      <Input
                        id="museum-state"
                        value={museumForm.state}
                        onChange={(event) => setMuseumForm((prev) => ({ ...prev, state: event.target.value }))}
                        placeholder="MA"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="museum-zip">{t("zip")}</Label>
                      <Input
                        id="museum-zip"
                        value={museumForm.zipCode}
                        onChange={(event) => setMuseumForm((prev) => ({ ...prev, zipCode: event.target.value }))}
                        placeholder="02110"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="museum-lat">{t("latitude")}</Label>
                      <Input
                        id="museum-lat"
                        value={museumForm.latitude}
                        onChange={(event) => setMuseumForm((prev) => ({ ...prev, latitude: event.target.value }))}
                        placeholder="42.3549"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="museum-lng">{t("longitude")}</Label>
                      <Input
                        id="museum-lng"
                        value={museumForm.longitude}
                        onChange={(event) => setMuseumForm((prev) => ({ ...prev, longitude: event.target.value }))}
                        placeholder="-71.0493"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="museum-image">{t("imageUrl")}</Label>
                    <Input
                      id="museum-image"
                      value={museumForm.imageUrl}
                      onChange={(event) => setMuseumForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="museum-website">{t("website")}</Label>
                    <Input
                      id="museum-website"
                      value={museumForm.website}
                      onChange={(event) => setMuseumForm((prev) => ({ ...prev, website: event.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="museum-phone">{t("phone")}</Label>
                    <Input
                      id="museum-phone"
                      value={museumForm.phone}
                      onChange={(event) => setMuseumForm((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="617-555-0101"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3">
                <Button onClick={submitMuseum} disabled={museumStatus.type === "working"}>
                  {museumStatus.type === "working" ? t("saving") : t("saveMuseum")}
                </Button>
                <Button variant="ghost" onClick={resetMuseum}>
                  {t("resetForm")}
                </Button>
                {museumStatus.message && (
                  <span
                    className={`text-xs font-medium ${museumStatus.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {museumStatus.message}
                  </span>
                )}
              </CardFooter>
            </Card>

            <Card className="border border-border/60 bg-background/80 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
              <CardHeader>
                <CardTitle>{t("eventIntake")}</CardTitle>
                <CardDescription>{t("eventIntakeDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="event-title">{t("eventTitle")}</Label>
                  <Input
                    id="event-title"
                    value={eventForm.title}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="After Hours: Neon Futures"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="event-description">{t("description")}</Label>
                  <Textarea
                    id="event-description"
                    value={eventForm.description}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Late-night exhibit with artist talks."
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="event-category">{t("category")}</Label>
                  <Input
                    id="event-category"
                    value={eventForm.category}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="workshop, exhibition, performance, family"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("museumOptional")}</Label>
                  <Select
                    value={eventForm.museumId ?? ""}
                    onValueChange={(value) => setEventForm((prev) => ({ ...prev, museumId: value || null }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("selectMuseum")}>
                        {selectedMuseum?.name ?? t("selectMuseum")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("noMuseum")}</SelectItem>
                      {museumList.map((museum) => (
                        <SelectItem key={museum._id} value={museum._id}>
                          {museum.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("noMuseumLocationHint")}
                  </p>
                </div>
                <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/50 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    {t("eventLocation")}
                  </span>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="event-city">{t("city")}</Label>
                      <Input
                        id="event-city"
                        value={eventForm.city}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, city: event.target.value }))}
                        placeholder="Denver"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="event-state">{t("state")}</Label>
                      <Input
                        id="event-state"
                        value={eventForm.state}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, state: event.target.value }))}
                        placeholder="CO"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="event-zip">{t("zip")}</Label>
                      <Input
                        id="event-zip"
                        value={eventForm.zipCode}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, zipCode: event.target.value }))}
                        placeholder="80202"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="event-lat">{t("latitude")}</Label>
                      <Input
                        id="event-lat"
                        value={eventForm.latitude}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, latitude: event.target.value }))}
                        placeholder="39.7525"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="event-lng">{t("longitude")}</Label>
                      <Input
                        id="event-lng"
                        value={eventForm.longitude}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, longitude: event.target.value }))}
                        placeholder="-104.9995"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="event-start">{t("startDate")}</Label>
                    <Input
                      id="event-start"
                      type="datetime-local"
                      value={eventForm.startDate}
                      onChange={(event) => setEventForm((prev) => ({ ...prev, startDate: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="event-end">{t("endDate")}</Label>
                    <Input
                      id="event-end"
                      type="datetime-local"
                      value={eventForm.endDate}
                      onChange={(event) => setEventForm((prev) => ({ ...prev, endDate: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="event-image">{t("imageUrl")}</Label>
                    <Input
                      id="event-image"
                      value={eventForm.imageUrl}
                      onChange={(event) => setEventForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="event-register">{t("registrationUrl")}</Label>
                    <Input
                      id="event-register"
                      value={eventForm.registrationUrl}
                      onChange={(event) => setEventForm((prev) => ({ ...prev, registrationUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3">
                <Button onClick={submitEvent} disabled={eventStatus.type === "working"}>
                  {eventStatus.type === "working" ? "Saving..." : "Save event"}
                </Button>
                <Button variant="ghost" onClick={resetEvent}>
                  {t("resetForm")}
                </Button>
                {eventStatus.message && (
                  <span
                    className={`text-xs font-medium ${eventStatus.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {eventStatus.message}
                  </span>
                )}
              </CardFooter>
            </Card>
          </div>

          <Card className="h-fit border border-border/60 bg-background/80 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
            <CardHeader>
              <CardTitle>{t("currentMuseums")}</CardTitle>
              <CardDescription>{t("currentMuseumsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {museums === undefined && (
                <div className="h-20 animate-pulse rounded-lg bg-muted" />
              )}
              {museumList.length === 0 && museums !== undefined && (
                <p className="text-sm text-muted-foreground">{t("noMuseumsAddFirst")}</p>
              )}
              {museumList.map((museum) => (
                <div key={museum._id} className="rounded-lg border border-border/60 bg-muted/40 p-3">
                  <div className="text-sm font-semibold">{museum.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {museum.location.city}, {museum.location.state} · {museum.category}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
