"use client"

import * as React from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { ExternalLinkIcon, Loader2Icon, SparklesIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  address: string
  city: string
  state: string
  country: string
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
    country?: string
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
  location: { address?: string; city?: string; state?: string; country?: string; postalCode?: string }
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

type FirecrawlPrefillResult = {
  sourceUrl: string
  searchQuery: string
  imageUrls: string[]
  placesFound: boolean
  usedFirecrawlFallback: boolean
  needsWebsiteForFallback: boolean
  missingFields: string[]
  prefill: FormState
  operatingHours?: OperatingHour[]
  accessibilityFeatures?: string[]
}

type MuseumImageRow = {
  _id: Id<"museumImages">
  imageUrl: string
}

const timezoneItems = [
  { value: "America/Los_Angeles", label: "America/Los_Angeles (Pacific)" },
  { value: "America/Denver", label: "America/Denver (Mountain)" },
  { value: "America/Chicago", label: "America/Chicago (Central)" },
  { value: "America/New_York", label: "America/New_York (Eastern)" },
  { value: "America/Toronto", label: "America/Toronto" },
  { value: "America/Mexico_City", label: "America/Mexico_City" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "Europe/Madrid", label: "Europe/Madrid" },
  { value: "Europe/Rome", label: "Europe/Rome" },
  { value: "Europe/Athens", label: "Europe/Athens" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul" },
  { value: "Africa/Cairo", label: "Africa/Cairo" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg" },
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "Asia/Seoul", label: "Asia/Seoul" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland" },
] as const

const museumCategoryOptions = [
  { value: "art", labelKey: "art" },
  { value: "contemporary", labelKey: "contemporaryArt" },
  { value: "history", labelKey: "history" },
  { value: "science", labelKey: "science" },
  { value: "natural-history", labelKey: "naturalHistory" },
  { value: "children", labelKey: "children" },
  { value: "design", labelKey: "design" },
  { value: "photography", labelKey: "photography" },
  { value: "culture", labelKey: "culturalHeritage" },
  { value: "specialty", labelKey: "specialty" },
] as const

const museumCategoryValueSet = new Set(museumCategoryOptions.map((option) => option.value))

function isMuseumCategoryValue(value: string): value is (typeof museumCategoryOptions)[number]["value"] {
  return museumCategoryValueSet.has(value as (typeof museumCategoryOptions)[number]["value"])
}

const accessibilityOptions = [
  { id: "wheelchair" },
  { id: "elevators" },
  { id: "accessible-restrooms" },
  { id: "assistive-listening" },
  { id: "braille-signage" },
  { id: "sensory-hours" },
] as const

const accessibilityOptionIds = new Set(accessibilityOptions.map((option) => option.id))

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
  address: "",
  city: "",
  state: "",
  country: "",
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

function splitCategories(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(isMuseumCategoryValue)
}

function joinCategories(values: string[]) {
  return values.join(", ")
}

function mapAiCategoryToOptions(aiCategory: string) {
  const normalized = aiCategory.toLowerCase()
  return museumCategoryOptions
    .filter((option) => normalized.includes(option.value.replaceAll("-", " ")))
    .map((option) => option.value)
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
    address: row.location.address ?? "",
    city: row.location.city ?? "",
    state: row.location.state ?? "",
    country: row.location.country ?? "",
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
  const addMuseumImage = useMutation(api.museums.addMuseumImageForDashboard)
  const prefillMuseumDetails = useAction(api.museumsAutoFill.prefillMuseumDetailsWithFirecrawl)
  const galleryImages = useQuery(
    api.museums.listMuseumImagesForDashboard,
    museumId ? { museumId: museumId as Id<"museums"> } : "skip"
  ) as MuseumImageRow[] | undefined

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
  const [operatingHours, setOperatingHours] = React.useState<OperatingHour[]>(cloneDefaultOperatingHours)
  const [selectedAccessibility, setSelectedAccessibility] = React.useState<string[]>([])
  const [expectedSnapshot, setExpectedSnapshot] = React.useState<MuseumSnapshot | null>(null)
  const [loadedMuseumId, setLoadedMuseumId] = React.useState<string | null>(null)
  const [firecrawlConfirmOpen, setFirecrawlConfirmOpen] = React.useState(false)
  const [websitePromptOpen, setWebsitePromptOpen] = React.useState(false)
  const [websiteOverrideInput, setWebsiteOverrideInput] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [prefilling, setPrefilling] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    setError(null)
    setSuccess(null)
    setFirecrawlConfirmOpen(false)
    setWebsitePromptOpen(false)
    setWebsiteOverrideInput("")
  }, [museumId])

  React.useEffect(() => {
    if (!museumId || !details) return
    if (loadedMuseumId === museumId && expectedSnapshot) return

    setForm(toFormState(details))
    setSelectedCategories(splitCategories(details.category))
    setOperatingHours(details.operatingHours?.length ? details.operatingHours.map((entry) => ({ ...entry })) : cloneDefaultOperatingHours())
    setSelectedAccessibility(details.accessibilityFeatures ?? [])
    setExpectedSnapshot(details.snapshot)
    setLoadedMuseumId(museumId)
  }, [museumId, details, loadedMuseumId, expectedSnapshot])

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(category)
        ? prev.filter((value) => value !== category)
        : [...prev, category]
      setForm((current) => ({ ...current, category: joinCategories(next) }))
      return next
    })
  }

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

  const handleFirecrawlPrefill = async (websiteOverride?: string) => {
    if (!museumId) return

    const museumName = form.name.trim()
    if (!museumName) {
      setError(t("errors.nameRequired"))
      return
    }

    setPrefilling(true)
    setFirecrawlConfirmOpen(false)
    setWebsitePromptOpen(false)
    setError(null)
    setSuccess(null)
    try {
      const websiteOverrideArg = optionalText(websiteOverride ?? form.website)
      const result = (await prefillMuseumDetails({
        museumId: museumId as Id<"museums">,
        museumName,
        city: optionalText(form.city),
        state: optionalText(form.state),
        country: optionalText(form.country),
        ...(websiteOverrideArg ? { websiteOverride: websiteOverrideArg } : {}),
      })) as FirecrawlPrefillResult

      setForm({ ...EMPTY_FORM, ...result.prefill })
      const aiCategories =
        splitCategories(result.prefill.category).length > 0
          ? splitCategories(result.prefill.category)
          : mapAiCategoryToOptions(result.prefill.category)
      setSelectedCategories(aiCategories)
      setForm((current) => ({ ...current, category: joinCategories(aiCategories) }))
      setOperatingHours(
        result.operatingHours?.length
          ? result.operatingHours.map((entry) => ({ ...entry }))
          : cloneDefaultOperatingHours()
      )
      setSelectedAccessibility(
        (result.accessibilityFeatures ?? []).filter(
          (feature): feature is (typeof accessibilityOptions)[number]["id"] =>
            accessibilityOptionIds.has(feature as (typeof accessibilityOptions)[number]["id"])
        )
      )
      const hadNoGalleryImages = (galleryImages ?? []).length === 0
      const existingImageUrls = new Set((galleryImages ?? []).map((image) => image.imageUrl))
      let importedCount = 0
      for (const imageUrl of (result.imageUrls ?? []).slice(0, 5)) {
        if (existingImageUrls.has(imageUrl)) continue
        await addMuseumImage({
          museumId: museumId as Id<"museums">,
          imageUrl,
        })
        existingImageUrls.add(imageUrl)
        importedCount += 1
      }
      // When the first gallery image is imported, backend promotes it to museum.imageUrl.
      // Keep expected snapshot aligned to avoid optimistic concurrency conflicts on save.
      if (hadNoGalleryImages && importedCount > 0) {
        setExpectedSnapshot((prev) =>
          prev
            ? {
                ...prev,
                imageUrl: optionalText((result.imageUrls ?? [])[0] ?? ""),
              }
            : prev
        )
      }
      setSuccess(
        result.needsWebsiteForFallback
          ? importedCount > 0
            ? `${t("ai.prefillNeedsWebsite")} ${t("ai.imagesImported", { count: importedCount })}`
            : t("ai.prefillNeedsWebsite")
          : importedCount > 0
            ? `${t("ai.prefillSuccess")} ${t("ai.imagesImported", { count: importedCount })}`
            : t("ai.prefillSuccess")
      )
      if (result.needsWebsiteForFallback) {
        setWebsitePromptOpen(true)
        setWebsiteOverrideInput("")
      } else {
        setWebsitePromptOpen(false)
        setWebsiteOverrideInput("")
      }
    } catch (prefillError) {
      setError(
        prefillError instanceof Error
          ? prefillError.message
          : t("errors.prefillFailed")
      )
    } finally {
      setPrefilling(false)
    }
  }

  const handleWebsitePromptSubmit = async () => {
    const website = optionalText(websiteOverrideInput)
    if (!website) {
      setWebsitePromptOpen(false)
      setSuccess(t("ai.prefillWebsiteSkipped"))
      return
    }
    await handleFirecrawlPrefill(website)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!museumId || !expectedSnapshot) return

    setError(null)
    setSuccess(null)

    const name = form.name.trim()
    const category = joinCategories(selectedCategories).trim()
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
          primaryLanguage: expectedSnapshot.primaryLanguage,
          category,
          location: {
            address: optionalText(form.address),
            city,
            state,
            country: optionalText(form.country),
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
        primaryLanguage: expectedSnapshot.primaryLanguage,
        category,
        location: {
          address: optionalText(form.address),
          city,
          state,
          country: optionalText(form.country),
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
        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-[14px] bg-[linear-gradient(120deg,#f97316,#eab308,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899)] p-[1.5px]">
            <Button
              type="button"
              variant="secondary"
              size="default"
              className="rounded-[12.5px] border-0 bg-background hover:bg-background/90"
              onClick={() => setFirecrawlConfirmOpen(true)}
              disabled={prefilling || saving}
            >
              <SparklesIcon className="size-4" />
              {t("ai.prefill")}
              {prefilling && <Loader2Icon className="size-4 animate-spin" />}
            </Button>
          </div>
          <Button
            type="button"
            variant="default"
            size="default"
            className="rounded-xl"
            render={<a href={`/museums/${encodeURIComponent(museumId)}`} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon className="size-4" />
            {t("viewPage")}
          </Button>
        </div>
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

          <div className="grid grid-cols-1 gap-4">
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
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1">
            <Label>{t("fields.category")}</Label>
            <div className="flex flex-wrap gap-2 rounded-xl border p-3">
              {museumCategoryOptions.map((category) => {
                const selected = selectedCategories.includes(category.value)
                return (
                  <Button
                    key={category.value}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    onClick={() => toggleCategory(category.value)}
                    className="rounded-full"
                  >
                    {t(`categoryOptions.${category.labelKey}`)}
                  </Button>
                )
              })}
            </div>
            <p className="text-muted-foreground text-xs">{t("placeholders.category")}</p>
          </div>

          <div className="grid gap-1">
            <Label htmlFor="museum-details-address">{t("fields.address")}</Label>
            <Input
              id="museum-details-address"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
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
              <Label htmlFor="museum-details-country">{t("fields.country")}</Label>
              <Input
                id="museum-details-country"
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
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
        <Button type="submit" form="museum-details-form" disabled={saving || prefilling}>
          {saving ? tCommon("saving") : t("save")}
        </Button>
      </CardFooter>
      <AlertDialog open={firecrawlConfirmOpen} onOpenChange={(open) => !prefilling && setFirecrawlConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ai.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("ai.confirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={prefilling}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={prefilling} onClick={() => void handleFirecrawlPrefill()}>
              {prefilling ? t("ai.prefilling") : t("ai.confirmCta")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={websitePromptOpen} onOpenChange={(open) => !prefilling && setWebsitePromptOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ai.websitePromptTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("ai.websitePromptDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-1">
            <Label htmlFor="museum-ai-website-override">{t("fields.website")}</Label>
            <Input
              id="museum-ai-website-override"
              placeholder={t("ai.websitePromptPlaceholder")}
              value={websiteOverrideInput}
              onChange={(event) => setWebsiteOverrideInput(event.target.value)}
              disabled={prefilling}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={prefilling}
              onClick={() => {
                setWebsitePromptOpen(false)
                setWebsiteOverrideInput("")
                setSuccess(t("ai.prefillWebsiteSkipped"))
              }}
            >
              {t("ai.websitePromptSkip")}
            </AlertDialogCancel>
            <AlertDialogAction disabled={prefilling} onClick={() => void handleWebsitePromptSubmit()}>
              {prefilling ? t("ai.prefilling") : t("ai.websitePromptCta")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
