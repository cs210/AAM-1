"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { ExternalLinkIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDashboardMuseumId } from "@/components/dashboard/dashboard-museum-context"
import { MuseumImageManager } from "@/components/dashboard/museum-image-manager"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type MuseumDetailsFormProps = {
  /** When omitted, the form uses the active museum from dashboard context. */
  museumId?: string | null
}

type OperatingHour = {
  day: string
  isOpen: boolean
  openTime: string
  closeTime: string
}

const dayMessageKeys = {
  Monday: "monday",
  Tuesday: "tuesday",
  Wednesday: "wednesday",
  Thursday: "thursday",
  Friday: "friday",
  Saturday: "saturday",
  Sunday: "sunday",
} as const

type DayName = keyof typeof dayMessageKeys

function isDayName(day: string): day is DayName {
  return day in dayMessageKeys
}

type FormState = {
  name: string
  tagline: string
  description: string
  category: string
  publicEmail: string
  website: string
  phone: string
  timezone: string
  primaryLanguage: string
  address: string
  city: string
  state: string
  postalCode: string
  latitude: string
  longitude: string
  imageUrl: string
  accessibilityNotes: string
}

type MuseumSnapshot = {
  name: string
  description?: string
  tagline?: string
  publicEmail?: string
  timezone?: string
  primaryLanguage?: string
  category: string
  location: {
    address?: string
    city?: string
    state?: string
    postalCode?: string
  }
  imageUrl?: string
  website?: string
  phone?: string
  operatingHours?: OperatingHour[]
  accessibilityFeatures?: string[]
  accessibilityNotes?: string
  point?: { latitude: number; longitude: number }
}

type MuseumDetailsRow = {
  _id: Id<"museums">
  name: string
  description?: string
  tagline?: string
  publicEmail?: string
  timezone?: string
  primaryLanguage?: string
  category: string
  location: { address?: string; city?: string; state?: string; postalCode?: string }
  imageUrl?: string
  website?: string
  phone?: string
  operatingHours?: OperatingHour[]
  accessibilityFeatures?: string[]
  accessibilityNotes?: string
  point: { latitude: number; longitude: number } | null
  canEditName?: boolean
  snapshot: MuseumSnapshot
}

const timezoneItems = [
  { key: "pacific", value: "America/Los_Angeles" },
  { key: "mountain", value: "America/Denver" },
  { key: "central", value: "America/Chicago" },
  { key: "eastern", value: "America/New_York" },
] as const

const languageItems = [
  { key: "english", value: "en" },
  { key: "spanish", value: "es" },
  { key: "french", value: "fr" },
  { key: "german", value: "de" },
] as const

const accessibilityOptions = [
  { id: "wheelchair" },
  { id: "elevators" },
  { id: "accessible-restrooms" },
  { id: "assistive-listening" },
  { id: "braille-signage" },
  { id: "sensory-hours" },
] as const

const defaultOperatingHours: OperatingHour[] = [
  { day: "Monday", isOpen: false, openTime: "10:00", closeTime: "18:00" },
  { day: "Tuesday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
  { day: "Wednesday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
  { day: "Thursday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
  { day: "Friday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
  { day: "Saturday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
  { day: "Sunday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
]

const EMPTY_FORM: FormState = {
  name: "",
  tagline: "",
  description: "",
  category: "",
  publicEmail: "",
  website: "",
  phone: "",
  timezone: "",
  primaryLanguage: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  imageUrl: "",
  accessibilityNotes: "",
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function cloneDefaultOperatingHours() {
  return defaultOperatingHours.map((entry) => ({ ...entry }))
}

function toFormState(row: MuseumDetailsRow): FormState {
  return {
    name: row.name,
    tagline: row.tagline ?? "",
    description: row.description ?? "",
    category: row.category,
    publicEmail: row.publicEmail ?? "",
    website: row.website ?? "",
    phone: row.phone ?? "",
    timezone: row.timezone ?? "",
    primaryLanguage: row.primaryLanguage ?? "",
    address: row.location.address ?? "",
    city: row.location.city ?? "",
    state: row.location.state ?? "",
    postalCode: row.location.postalCode ?? "",
    latitude: row.point?.latitude?.toString() ?? "",
    longitude: row.point?.longitude?.toString() ?? "",
    imageUrl: row.imageUrl ?? "",
    accessibilityNotes: row.accessibilityNotes ?? "",
  }
}

export function MuseumDetailsForm({ museumId: museumIdProp }: MuseumDetailsFormProps) {
  const t = useTranslations("dashboard.museumDetails")
  const tDay = useTranslations("dashboard.museumDetails.days")
  const tCommon = useTranslations("common")
  const museumIdFromContext = useDashboardMuseumId()
  const museumId = museumIdProp ?? museumIdFromContext

  const details = useQuery(
    api.museums.getMuseumDetailsForDashboard,
    museumId ? { id: museumId as Id<"museums"> } : "skip"
  ) as MuseumDetailsRow | null | undefined
  const updateMuseum = useMutation(api.museums.updateMuseumDetailsForDashboard)

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [operatingHours, setOperatingHours] = React.useState<OperatingHour[]>(cloneDefaultOperatingHours)
  const [selectedAccessibility, setSelectedAccessibility] = React.useState<string[]>([])
  const [expectedSnapshot, setExpectedSnapshot] = React.useState<MuseumSnapshot | null>(null)
  const [loadedMuseumId, setLoadedMuseumId] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    setError(null)
    setSuccess(null)
  }, [museumId])

  React.useEffect(() => {
    if (!museumId || !details) return
    if (loadedMuseumId === museumId && expectedSnapshot) return

    setForm(toFormState(details))
    setOperatingHours(details.operatingHours?.length ? details.operatingHours.map((entry) => ({ ...entry })) : cloneDefaultOperatingHours())
    setSelectedAccessibility(details.accessibilityFeatures ?? [])
    setExpectedSnapshot(details.snapshot)
    setLoadedMuseumId(museumId)
  }, [museumId, details, loadedMuseumId, expectedSnapshot])

  const updateOperatingHour = (
    day: string,
    key: "isOpen" | "openTime" | "closeTime",
    value: boolean | string
  ) => {
    setOperatingHours((prev) =>
      prev.map((entry) => (entry.day === day ? { ...entry, [key]: value } : entry))
    )
  }

  const toggleAccessibilityOption = (optionId: string) => {
    setSelectedAccessibility((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    )
  }

  const handlePrimaryImageChange = React.useCallback((nextImageUrl: string | null) => {
    setForm((prev) => ({ ...prev, imageUrl: nextImageUrl ?? "" }))
    setExpectedSnapshot((prev) => (prev ? { ...prev, imageUrl: nextImageUrl ?? undefined } : prev))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!museumId || !expectedSnapshot) return

    setError(null)
    setSuccess(null)

    const name = form.name.trim()
    const category = form.category.trim()
    const city = form.city.trim()
    const state = form.state.trim()
    const latitude = Number(form.latitude.trim())
    const longitude = Number(form.longitude.trim())

    if (!name) {
      setError(t("errors.nameRequired"))
      return
    }
    if (!category) {
      setError(t("errors.categoryRequired"))
      return
    }
    if (!city || !state) {
      setError(t("errors.cityStateRequired"))
      return
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setError(t("errors.latitudeRange"))
      return
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError(t("errors.longitudeRange"))
      return
    }

    setSaving(true)
    try {
      await updateMuseum({
        museumId: museumId as Id<"museums">,
        expected: expectedSnapshot,
        next: {
          point: { latitude, longitude },
          name,
          description: optionalText(form.description),
          tagline: optionalText(form.tagline),
          publicEmail: optionalText(form.publicEmail),
          timezone: optionalText(form.timezone),
          primaryLanguage: optionalText(form.primaryLanguage),
          category,
          location: {
            address: optionalText(form.address),
            city,
            state,
            postalCode: optionalText(form.postalCode),
          },
          imageUrl: optionalText(form.imageUrl),
          website: optionalText(form.website),
          phone: optionalText(form.phone),
          operatingHours,
          accessibilityFeatures: selectedAccessibility,
          accessibilityNotes: optionalText(form.accessibilityNotes),
        },
      })
      setExpectedSnapshot({
        name,
        description: optionalText(form.description),
        tagline: optionalText(form.tagline),
        publicEmail: optionalText(form.publicEmail),
        timezone: optionalText(form.timezone),
        primaryLanguage: optionalText(form.primaryLanguage),
        category,
        location: {
          address: optionalText(form.address),
          city,
          state,
          postalCode: optionalText(form.postalCode),
        },
        imageUrl: optionalText(form.imageUrl),
        website: optionalText(form.website),
        phone: optionalText(form.phone),
        operatingHours,
        accessibilityFeatures: selectedAccessibility,
        accessibilityNotes: optionalText(form.accessibilityNotes),
        point: { latitude, longitude },
      })
      setSuccess(t("saveSuccess"))
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("errors.saveFailed")
      )
    } finally {
      setSaving(false)
    }
  }

  if (!museumId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("emptyStateTitle")}</CardTitle>
          <CardDescription>{t("emptyStateDescription")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (details === undefined) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-muted-foreground text-center text-sm">{t("loading")}</div>
        </CardContent>
      </Card>
    )
  }

  if (details === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("emptyStateTitle")}</CardTitle>
          <CardDescription>{t("invalidDescription")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="default"
          size="default"
          className="shrink-0 rounded-xl"
          render={<a href={`/museums/${encodeURIComponent(museumId)}`} target="_blank" rel="noreferrer" />}
        >
          <ExternalLinkIcon className="size-4" />
          {t("viewPage")}
        </Button>
      </CardHeader>
      <CardContent>
        <form id="museum-details-form" onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="museum-details-name">{t("fields.name")}</Label>
              <Input
                id="museum-details-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={!details.canEditName}
                required
              />
              {/* {!details.canEditName && (
                <p className="text-muted-foreground text-xs">Only admins can edit museum name.</p>
              )} */}
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-details-tagline">{t("fields.tagline")}</Label>
              <Input
                id="museum-details-tagline"
                value={form.tagline}
                onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-1">
            <Label htmlFor="museum-details-description">{t("fields.description")}</Label>
            <Textarea
              id="museum-details-description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="museum-details-phone">{t("fields.phone")}</Label>
              <Input
                id="museum-details-phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-details-email">{t("fields.email")}</Label>
              <Input
                id="museum-details-email"
                type="email"
                value={form.publicEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, publicEmail: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-1">
            <Label htmlFor="museum-details-website">{t("fields.website")}</Label>
            <Input
              id="museum-details-website"
              value={form.website}
              onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="museum-details-timezone">{t("fields.timezone")}</Label>
              <Select value={form.timezone} onValueChange={(value) => setForm((prev) => ({ ...prev, timezone: value ?? "" }))}>
                <SelectTrigger id="museum-details-timezone" className="w-full">
                  <SelectValue placeholder={t("placeholders.selectTimezone")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {timezoneItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {t(`timezones.${item.key}`)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-details-language">{t("fields.primaryLanguage")}</Label>
              <Select value={form.primaryLanguage} onValueChange={(value) => setForm((prev) => ({ ...prev, primaryLanguage: value ?? "" }))}>
                <SelectTrigger id="museum-details-language" className="w-full">
                  <SelectValue placeholder={t("placeholders.selectLanguage")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {languageItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {t(`languages.${item.key}`)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1">
            <Label htmlFor="museum-details-category">{t("fields.category")}</Label>
            <Input
              id="museum-details-category"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              placeholder={t("placeholders.category")}
              required
            />
          </div>

          <div className="grid gap-1">
            <Label htmlFor="museum-details-address">{t("fields.address")}</Label>
            <Input
              id="museum-details-address"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="grid gap-1 md:col-span-2">
              <Label htmlFor="museum-details-city">{t("fields.city")}</Label>
              <Input
                id="museum-details-city"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-details-state">{t("fields.state")}</Label>
              <Input
                id="museum-details-state"
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-details-postal">{t("fields.postalCode")}</Label>
              <Input
                id="museum-details-postal"
                value={form.postalCode}
                onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="museum-details-latitude">{t("fields.latitude")}</Label>
              <Input
                id="museum-details-latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-details-longitude">{t("fields.longitude")}</Label>
              <Input
                id="museum-details-longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))}
                required
              />
            </div>
          </div>

          <MuseumImageManager museumId={museumId} onPrimaryImageChange={handlePrimaryImageChange} />

          <div>
            <Label>{t("fields.operatingHours")}</Label>
            <div className="mt-1 rounded-xl border">
              <div className="grid grid-cols-[minmax(120px,1fr)_110px_1fr_1fr] gap-2 border-b px-3 py-2 text-xs font-medium tracking-wide uppercase">
                <span>{t("hours.day")}</span>
                <span>{t("hours.open")}</span>
                <span>{t("hours.from")}</span>
                <span>{t("hours.to")}</span>
              </div>
              <div className="divide-y">
                {operatingHours.map((entry) => {
                  const dayLabel = isDayName(entry.day) ? tDay(dayMessageKeys[entry.day]) : entry.day
                  const dayId = entry.day.toLowerCase()
                  return (
                    <div
                      key={entry.day}
                      className="grid grid-cols-[minmax(120px,1fr)_110px_1fr_1fr] gap-2 px-3 py-2"
                    >
                      <div className="flex items-center text-sm font-medium">{dayLabel}</div>
                      <div className="flex items-center">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            id={`hours-open-${dayId}`}
                            type="checkbox"
                            className="accent-primary size-4"
                            checked={entry.isOpen}
                            onChange={(event) =>
                              updateOperatingHour(entry.day, "isOpen", event.target.checked)
                            }
                          />
                          {t("hours.open")}
                        </label>
                      </div>
                      <Input
                        id={`hours-from-${dayId}`}
                        type="time"
                        disabled={!entry.isOpen}
                        value={entry.openTime}
                        onChange={(event) =>
                          updateOperatingHour(entry.day, "openTime", event.target.value)
                        }
                      />
                      <Input
                        id={`hours-to-${dayId}`}
                        type="time"
                        disabled={!entry.isOpen}
                        value={entry.closeTime}
                        onChange={(event) =>
                          updateOperatingHour(entry.day, "closeTime", event.target.value)
                        }
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div>
            <Label>{t("fields.accessibilityFeatures")}</Label>
            <div className="mt-1 rounded-xl border p-4">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {accessibilityOptions.map((option) => (
                  <label
                    key={option.id}
                    htmlFor={`accessibility-${option.id}`}
                    className="hover:bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <input
                      id={`accessibility-${option.id}`}
                      type="checkbox"
                      className="accent-primary size-4"
                      checked={selectedAccessibility.includes(option.id)}
                      onChange={() => toggleAccessibilityOption(option.id)}
                    />
                    {t(`accessibilityOptions.${option.id}`)}
                  </label>
                ))}
              </div>
              <div className="mt-4 grid gap-1">
                <Label htmlFor="museum-details-accessibility-notes">{t("fields.accessibilityNotes")}</Label>
                <Textarea
                  id="museum-details-accessibility-notes"
                  rows={3}
                  value={form.accessibilityNotes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, accessibilityNotes: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="justify-end">
        <Button type="submit" form="museum-details-form" disabled={saving}>
          {saving ? tCommon("saving") : t("save")}
        </Button>
      </CardFooter>
    </Card>
  )
}
