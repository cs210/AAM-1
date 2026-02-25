"use client";

import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
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

const defaultSource = {
  museumId: null as string | null,
  provider: "harvard",
  enabled: true,
  providerConfig: JSON.stringify({ resource: "exhibition", params: { size: "100" } }, null, 2),
  externalMuseumId: "",
  syncIntervalMinutes: "360",
};

export default function DebugSeedPage() {
  const museums = useQuery(api.museums.listMuseums);
  const addMuseum = useMutation(api.museums.addMuseum);
  const addEvent = useMutation(api.events.addEvent);
  const upsertMuseumSource = useMutation(api.museumSources.upsertMuseumSource);
  const syncAllSources = useAction(api.sync.syncAllSources);

  const [museumForm, setMuseumForm] = useState(defaultMuseum);
  const [eventForm, setEventForm] = useState(defaultEvent);
  const [sourceForm, setSourceForm] = useState(defaultSource);
  const [museumStatus, setMuseumStatus] = useState<Status>({ type: "idle" });
  const [eventStatus, setEventStatus] = useState<Status>({ type: "idle" });
  const [sourceStatus, setSourceStatus] = useState<Status>({ type: "idle" });

  const museumList = useMemo(() => museums ?? [], [museums]);
  const selectedMuseum = useMemo(
    () => museumList.find((museum) => museum._id === eventForm.museumId) ?? null,
    [museumList, eventForm.museumId]
  );
  const selectedSourceMuseum = useMemo(
    () => museumList.find((museum) => museum._id === sourceForm.museumId) ?? null,
    [museumList, sourceForm.museumId]
  );

  const resetMuseum = () => {
    setMuseumForm(defaultMuseum);
    setMuseumStatus({ type: "idle" });
  };

  const resetEvent = () => {
    setEventForm(defaultEvent);
    setEventStatus({ type: "idle" });
  };

  const resetSource = () => {
    setSourceForm(defaultSource);
    setSourceStatus({ type: "idle" });
  };

  const submitMuseum = async () => {
    setMuseumStatus({ type: "working", message: "Saving museum..." });
    if (!museumForm.name.trim()) {
      setMuseumStatus({ type: "error", message: "Museum name is required." });
      return;
    }
    if (!museumForm.city.trim() || !museumForm.state.trim() || !museumForm.zipCode.trim()) {
      setMuseumStatus({ type: "error", message: "City, state, and zip code are required." });
      return;
    }

    const latitude = Number(museumForm.latitude);
    const longitude = Number(museumForm.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setMuseumStatus({ type: "error", message: "Latitude and longitude must be valid numbers." });
      return;
    }

    try {
      await addMuseum({
        name: museumForm.name.trim(),
        description: museumForm.description.trim() || undefined,
        category: museumForm.category.trim(),
        location: {
          address: museumForm.address.trim() || undefined,
          city: museumForm.city.trim(),
          state: museumForm.state.trim(),
          zipCode: museumForm.zipCode.trim(),
          latitude,
          longitude,
        },
        imageUrl: museumForm.imageUrl.trim() || undefined,
        website: museumForm.website.trim() || undefined,
        phone: museumForm.phone.trim() || undefined,
      });
      setMuseumStatus({ type: "success", message: "Museum saved. Add another or switch to events." });
      setMuseumForm({ ...defaultMuseum, city: museumForm.city, state: museumForm.state, zipCode: museumForm.zipCode });
    } catch (error) {
      setMuseumStatus({ type: "error", message: error instanceof Error ? error.message : "Failed to save museum." });
    }
  };

  const submitEvent = async () => {
    setEventStatus({ type: "working", message: "Saving event..." });
    if (!eventForm.title.trim()) {
      setEventStatus({ type: "error", message: "Event title is required." });
      return;
    }

    const startDate = Date.parse(eventForm.startDate);
    const endDate = Date.parse(eventForm.endDate);
    if (Number.isNaN(startDate) || Number.isNaN(endDate)) {
      setEventStatus({ type: "error", message: "Start and end dates are required." });
      return;
    }
    if (endDate < startDate) {
      setEventStatus({ type: "error", message: "End date must be after start date." });
      return;
    }

    const hasMuseum = Boolean(eventForm.museumId);
    if (!hasMuseum) {
      if (!eventForm.city.trim() || !eventForm.state.trim() || !eventForm.zipCode.trim()) {
        setEventStatus({ type: "error", message: "Location is required when no museum is selected." });
        return;
      }
    }

    let latitude: number | undefined;
    let longitude: number | undefined;
    if (!hasMuseum) {
      if (!eventForm.latitude.trim() || !eventForm.longitude.trim()) {
        setEventStatus({ type: "error", message: "Latitude and longitude are required when no museum is selected." });
        return;
      }
      latitude = Number(eventForm.latitude);
      longitude = Number(eventForm.longitude);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        setEventStatus({ type: "error", message: "Latitude and longitude must be valid numbers." });
        return;
      }
    }

    try {
      await addEvent({
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
        category: eventForm.category.trim(),
        museumId: hasMuseum ? (eventForm.museumId as typeof museumList[number]["_id"]) : undefined,
        location: hasMuseum
          ? undefined
          : {
              city: eventForm.city.trim(),
              state: eventForm.state.trim(),
              zipCode: eventForm.zipCode.trim(),
              latitude: latitude ?? 0,
              longitude: longitude ?? 0,
            },
        startDate,
        endDate,
        imageUrl: eventForm.imageUrl.trim() || undefined,
        registrationUrl: eventForm.registrationUrl.trim() || undefined,
      });
      setEventStatus({ type: "success", message: "Event saved. Add another." });
      setEventForm({ ...defaultEvent, museumId: eventForm.museumId });
    } catch (error) {
      setEventStatus({ type: "error", message: error instanceof Error ? error.message : "Failed to save event." });
    }
  };

  const submitSource = async () => {
    setSourceStatus({ type: "working", message: "Saving source..." });
    if (!sourceForm.museumId) {
      setSourceStatus({ type: "error", message: "Select a museum for this source." });
      return;
    }

    const intervalValue = sourceForm.syncIntervalMinutes.trim();
    const syncIntervalMinutes = intervalValue ? Number(intervalValue) : undefined;
    if (intervalValue && Number.isNaN(syncIntervalMinutes)) {
      setSourceStatus({ type: "error", message: "Sync interval must be a number." });
      return;
    }

    const providerConfig = sourceForm.providerConfig.trim();
    if (providerConfig) {
      try {
        JSON.parse(providerConfig);
      } catch (error) {
        setSourceStatus({ type: "error", message: "Provider config must be valid JSON." });
        return;
      }
    }

    try {
      await upsertMuseumSource({
        museumId: sourceForm.museumId as typeof museumList[number]["_id"],
        provider: sourceForm.provider,
        enabled: sourceForm.enabled,
        providerConfig: providerConfig || undefined,
        externalMuseumId: sourceForm.externalMuseumId.trim() || undefined,
        syncIntervalMinutes,
      });
      setSourceStatus({ type: "success", message: "Source saved. You can sync now." });
    } catch (error) {
      setSourceStatus({ type: "error", message: error instanceof Error ? error.message : "Failed to save source." });
    }
  };

  const runSync = async () => {
    setSourceStatus({ type: "working", message: "Running sync..." });
    try {
      await syncAllSources({});
      setSourceStatus({ type: "success", message: "Sync complete. Refresh museums page to see new events." });
    } catch (error) {
      setSourceStatus({ type: "error", message: error instanceof Error ? error.message : "Sync failed." });
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(60%_55%_at_12%_8%,rgba(251,191,36,0.22),transparent_60%),radial-gradient(55%_55%_at_88%_6%,rgba(59,130,246,0.2),transparent_60%),radial-gradient(60%_80%_at_50%_100%,rgba(16,185,129,0.18),transparent_60%)] px-4 pb-20 pt-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="w-fit rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Debug Console
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Manual Data Entry for Museums & Events
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Use this page to insert dummy content while shaping the product. These entries go straight to Convex,
            so treat it as a staging-only tool.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card className="border border-border/60 bg-background/80 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
              <CardHeader>
                <CardTitle>Museum Intake</CardTitle>
                <CardDescription>Add a museum entry with location + metadata.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="museum-name">Museum name</Label>
                  <Input
                    id="museum-name"
                    value={museumForm.name}
                    onChange={(event) => setMuseumForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Harbor City Art Museum"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="museum-description">Description</Label>
                  <Textarea
                    id="museum-description"
                    value={museumForm.description}
                    onChange={(event) => setMuseumForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Modern and contemporary art near the waterfront."
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="museum-category">Category</Label>
                  <Input
                    id="museum-category"
                    value={museumForm.category}
                    onChange={(event) => setMuseumForm((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="art, history, science"
                  />
                </div>
                <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/50 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    Location
                  </span>
                  <div className="grid gap-2">
                    <Label htmlFor="museum-address">Address</Label>
                    <Input
                      id="museum-address"
                      value={museumForm.address}
                      onChange={(event) => setMuseumForm((prev) => ({ ...prev, address: event.target.value }))}
                      placeholder="100 Seaport Ave"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="museum-city">City</Label>
                      <Input
                        id="museum-city"
                        value={museumForm.city}
                        onChange={(event) => setMuseumForm((prev) => ({ ...prev, city: event.target.value }))}
                        placeholder="Boston"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="museum-state">State</Label>
                      <Input
                        id="museum-state"
                        value={museumForm.state}
                        onChange={(event) => setMuseumForm((prev) => ({ ...prev, state: event.target.value }))}
                        placeholder="MA"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="museum-zip">Zip</Label>
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
                      <Label htmlFor="museum-lat">Latitude</Label>
                      <Input
                        id="museum-lat"
                        value={museumForm.latitude}
                        onChange={(event) => setMuseumForm((prev) => ({ ...prev, latitude: event.target.value }))}
                        placeholder="42.3549"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="museum-lng">Longitude</Label>
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
                    <Label htmlFor="museum-image">Image URL</Label>
                    <Input
                      id="museum-image"
                      value={museumForm.imageUrl}
                      onChange={(event) => setMuseumForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="museum-website">Website</Label>
                    <Input
                      id="museum-website"
                      value={museumForm.website}
                      onChange={(event) => setMuseumForm((prev) => ({ ...prev, website: event.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="museum-phone">Phone</Label>
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
                  {museumStatus.type === "working" ? "Saving..." : "Save museum"}
                </Button>
                <Button variant="ghost" onClick={resetMuseum}>
                  Reset form
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
                <CardTitle>Event Intake</CardTitle>
                <CardDescription>Attach to a museum or create a standalone event.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="event-title">Event title</Label>
                  <Input
                    id="event-title"
                    value={eventForm.title}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="After Hours: Neon Futures"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    value={eventForm.description}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Late-night exhibit with artist talks."
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="event-category">Category</Label>
                  <Input
                    id="event-category"
                    value={eventForm.category}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="workshop, exhibition, performance, family"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Museum (optional)</Label>
                  <Select
                    value={eventForm.museumId ?? ""}
                    onValueChange={(value) => setEventForm((prev) => ({ ...prev, museumId: value || null }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a museum">
                        {selectedMuseum?.name ?? "Select a museum"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No museum</SelectItem>
                      {museumList.map((museum) => (
                        <SelectItem key={museum._id} value={museum._id}>
                          {museum.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    If no museum is selected, you must provide a location below.
                  </p>
                </div>
                <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/50 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    Event Location (when no museum)
                  </span>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="event-city">City</Label>
                      <Input
                        id="event-city"
                        value={eventForm.city}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, city: event.target.value }))}
                        placeholder="Denver"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="event-state">State</Label>
                      <Input
                        id="event-state"
                        value={eventForm.state}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, state: event.target.value }))}
                        placeholder="CO"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="event-zip">Zip</Label>
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
                      <Label htmlFor="event-lat">Latitude</Label>
                      <Input
                        id="event-lat"
                        value={eventForm.latitude}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, latitude: event.target.value }))}
                        placeholder="39.7525"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="event-lng">Longitude</Label>
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
                    <Label htmlFor="event-start">Start date</Label>
                    <Input
                      id="event-start"
                      type="datetime-local"
                      value={eventForm.startDate}
                      onChange={(event) => setEventForm((prev) => ({ ...prev, startDate: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="event-end">End date</Label>
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
                    <Label htmlFor="event-image">Image URL</Label>
                    <Input
                      id="event-image"
                      value={eventForm.imageUrl}
                      onChange={(event) => setEventForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="event-register">Registration URL</Label>
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
                  Reset form
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

            <Card className="border border-border/60 bg-background/80 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
              <CardHeader>
                <CardTitle>External Source Sync</CardTitle>
                <CardDescription>Configure auto-fetching for a museum (Harvard example).</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Museum</Label>
                  <Select
                    value={sourceForm.museumId ?? ""}
                    onValueChange={(value) => setSourceForm((prev) => ({ ...prev, museumId: value || null }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a museum">
                        {selectedSourceMuseum?.name ?? "Select a museum"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {museumList.map((museum) => (
                        <SelectItem key={museum._id} value={museum._id}>
                          {museum.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Provider</Label>
                    <Select
                      value={sourceForm.provider}
                      onValueChange={(value) => setSourceForm((prev) => ({ ...prev, provider: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select provider">
                          {sourceForm.provider === "harvard" ? "Harvard Art Museums" : sourceForm.provider}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="harvard">Harvard Art Museums</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Enabled</Label>
                    <Select
                      value={sourceForm.enabled ? "enabled" : "disabled"}
                      onValueChange={(value) => setSourceForm((prev) => ({ ...prev, enabled: value === "enabled" }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="source-sync-interval">Sync interval (minutes)</Label>
                    <Input
                      id="source-sync-interval"
                      type="number"
                      min="15"
                      value={sourceForm.syncIntervalMinutes}
                      onChange={(event) =>
                        setSourceForm((prev) => ({ ...prev, syncIntervalMinutes: event.target.value }))
                      }
                      placeholder="360"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="source-external-id">External museum ID (optional)</Label>
                    <Input
                      id="source-external-id"
                      value={sourceForm.externalMuseumId}
                      onChange={(event) =>
                        setSourceForm((prev) => ({ ...prev, externalMuseumId: event.target.value }))
                      }
                      placeholder="Harvard museum id"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="source-provider-config">Provider config (JSON)</Label>
                  <Textarea
                    id="source-provider-config"
                    value={sourceForm.providerConfig}
                    onChange={(event) => setSourceForm((prev) => ({ ...prev, providerConfig: event.target.value }))}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Harvard provider expects `HARVARD_API_KEY` in Convex env. Example config uses the exhibitions
                    endpoint.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3">
                <Button onClick={submitSource} disabled={sourceStatus.type === "working"}>
                  {sourceStatus.type === "working" ? "Saving..." : "Save source"}
                </Button>
                <Button variant="secondary" onClick={runSync} disabled={sourceStatus.type === "working"}>
                  Run sync now
                </Button>
                <Button variant="ghost" onClick={resetSource}>
                  Reset
                </Button>
                {sourceStatus.message && (
                  <span
                    className={`text-xs font-medium ${sourceStatus.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {sourceStatus.message}
                  </span>
                )}
              </CardFooter>
            </Card>
          </div>

          <Card className="h-fit border border-border/60 bg-background/80 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
            <CardHeader>
              <CardTitle>Current Museums</CardTitle>
              <CardDescription>Quick snapshot to confirm inserts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {museums === undefined && (
                <div className="h-20 animate-pulse rounded-lg bg-muted" />
              )}
              {museumList.length === 0 && museums !== undefined && (
                <p className="text-sm text-muted-foreground">No museums yet. Add the first one.</p>
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
