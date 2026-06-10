"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { useTranslations } from "next-intl"
import {
  Building2Icon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
  SaveIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  useDashboardMuseumContextActions,
  useDashboardMuseumId,
} from "@/components/dashboard/dashboard-museum-context"
import { api } from "@packages/backend/convex/_generated/api"
import type { Id } from "@packages/backend/convex/_generated/dataModel"

type SoftwareFairConfig = {
  _id: Id<"softwareFairFeatureConfigs"> | null
  key: string
  enabled: boolean
  announcementEnabled: boolean
  announcementTitle: string | null
  announcementBody: string | null
  announcementCtaLabel: string | null
  createdAt: number | null
  updatedAt: number | null
  updatedBy: string | null
}

type SoftwareFairBooth = {
  _id: Id<"softwareFairBooths">
  museumId: Id<"museums"> | null
  boothNumber: number
  projectName: string
  genres: string[]
  teamMembers: string[]
  description: string | null
  guideUrl: string | null
  sortOrder: number
  isActive: boolean
  featureKey: string
  createdAt: number
  updatedAt: number
  createdBy: string | null
  updatedBy: string | null
}

type ActiveFilter = "all" | "active" | "inactive"

const DEFAULT_ANNOUNCEMENT_TITLE = "Stanford Software Fair 2026"
const DEFAULT_ANNOUNCEMENT_BODY = "Explore booth recommendations and the CoDa B80 fair map in Museum&."
const DEFAULT_ANNOUNCEMENT_CTA = "Join"

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function formatDate(value: number | null | undefined, fallback: string) {
  return value ? new Date(value).toLocaleString() : fallback
}

function splitListInput(value: string) {
  const seen = new Set<string>()
  const items: string[] = []

  for (const item of value.split(/[\n,]/)) {
    const trimmed = item.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    items.push(trimmed)
  }

  return items
}

function joinListInput(values: string[]) {
  return values.join(", ")
}

export function AdminExperimentalFeatures() {
  const t = useTranslations("dashboard.adminExperimentalFeatures")
  const tCommon = useTranslations("common")
  const activeMuseumContextId = useDashboardMuseumId()
  const dashboardMuseumActions = useDashboardMuseumContextActions()
  const config = useQuery(api.softwareFair.getConfigForAdmin) as SoftwareFairConfig | undefined
  const booths = useQuery(api.softwareFair.listBoothsForAdmin) as SoftwareFairBooth[] | undefined
  const updateConfig = useMutation(api.softwareFair.updateConfigForAdmin)
  const upsertBooth = useMutation(api.softwareFair.upsertBoothForAdmin)
  const deleteBooth = useMutation(api.softwareFair.deleteBoothForAdmin)

  const [enabled, setEnabled] = React.useState(false)
  const [announcementEnabled, setAnnouncementEnabled] = React.useState(false)
  const [announcementTitle, setAnnouncementTitle] = React.useState(DEFAULT_ANNOUNCEMENT_TITLE)
  const [announcementBody, setAnnouncementBody] = React.useState(DEFAULT_ANNOUNCEMENT_BODY)
  const [announcementCtaLabel, setAnnouncementCtaLabel] = React.useState(DEFAULT_ANNOUNCEMENT_CTA)
  const [hasEditedConfig, setHasEditedConfig] = React.useState(false)
  const [configSaving, setConfigSaving] = React.useState(false)
  const [configMessage, setConfigMessage] = React.useState<string | null>(null)
  const [configError, setConfigError] = React.useState<string | null>(null)

  const [showBoothForm, setShowBoothForm] = React.useState(false)
  const [editingBoothId, setEditingBoothId] = React.useState<Id<"softwareFairBooths"> | null>(null)
  const [boothNumber, setBoothNumber] = React.useState("")
  const [projectName, setProjectName] = React.useState("")
  const [genresInput, setGenresInput] = React.useState("")
  const [teamMembersInput, setTeamMembersInput] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [guideUrl, setGuideUrl] = React.useState("")
  const [sortOrder, setSortOrder] = React.useState("")
  const [boothActive, setBoothActive] = React.useState(true)
  const [boothSearch, setBoothSearch] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>("all")
  const [boothMessage, setBoothMessage] = React.useState<string | null>(null)
  const [boothError, setBoothError] = React.useState<string | null>(null)
  const [pendingBoothAction, setPendingBoothAction] = React.useState<string | null>(null)
  const [pendingDeleteBooth, setPendingDeleteBooth] = React.useState<SoftwareFairBooth | null>(null)
  const formRef = React.useRef<HTMLFormElement | null>(null)

  React.useEffect(() => {
    if (config === undefined || hasEditedConfig) return
    setEnabled(config.enabled)
    setAnnouncementEnabled(config.announcementEnabled)
    setAnnouncementTitle(config.announcementTitle ?? DEFAULT_ANNOUNCEMENT_TITLE)
    setAnnouncementBody(config.announcementBody ?? DEFAULT_ANNOUNCEMENT_BODY)
    setAnnouncementCtaLabel(config.announcementCtaLabel ?? DEFAULT_ANNOUNCEMENT_CTA)
  }, [config, hasEditedConfig])

  const boothRows = React.useMemo(() => booths ?? [], [booths])
  const activeBoothCount = boothRows.filter((booth) => booth.isActive).length
  const filteredBooths = React.useMemo(() => {
    const normalizedSearch = boothSearch.trim().toLowerCase()

    return boothRows.filter((booth) => {
      if (activeFilter === "active" && !booth.isActive) return false
      if (activeFilter === "inactive" && booth.isActive) return false
      if (!normalizedSearch) return true

      const haystack = [
        booth.projectName,
        String(booth.boothNumber),
        booth.genres.join(" "),
        booth.teamMembers.join(" "),
        booth.description ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [activeFilter, boothRows, boothSearch])

  const resetBoothForm = React.useCallback(() => {
    setEditingBoothId(null)
    setBoothNumber("")
    setProjectName("")
    setGenresInput("")
    setTeamMembersInput("")
    setDescription("")
    setGuideUrl("")
    setSortOrder("")
    setBoothActive(true)
  }, [])

  const openCreateForm = () => {
    resetBoothForm()
    setShowBoothForm(true)
    setBoothError(null)
    setBoothMessage(null)
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  const closeBoothForm = () => {
    resetBoothForm()
    setShowBoothForm(false)
  }

  const handleConfigEdit = () => {
    setHasEditedConfig(true)
    setConfigMessage(null)
    setConfigError(null)
  }

  const handleRefreshConfig = () => {
    if (!config) return
    setEnabled(config.enabled)
    setAnnouncementEnabled(config.announcementEnabled)
    setAnnouncementTitle(config.announcementTitle ?? DEFAULT_ANNOUNCEMENT_TITLE)
    setAnnouncementBody(config.announcementBody ?? DEFAULT_ANNOUNCEMENT_BODY)
    setAnnouncementCtaLabel(config.announcementCtaLabel ?? DEFAULT_ANNOUNCEMENT_CTA)
    setHasEditedConfig(false)
    setConfigError(null)
    setConfigMessage(t("config.refreshed"))
  }

  const handleSaveConfig = async (event: React.FormEvent) => {
    event.preventDefault()
    setConfigSaving(true)
    setConfigError(null)
    setConfigMessage(null)

    try {
      await updateConfig({
        enabled,
        announcementEnabled,
        announcementTitle,
        announcementBody,
        announcementCtaLabel,
      })
      setHasEditedConfig(false)
      setConfigMessage(t("config.saved"))
    } catch (error) {
      setConfigError(errorMessage(error, t("config.saveFailed")))
    } finally {
      setConfigSaving(false)
    }
  }

  const startEditingBooth = (booth: SoftwareFairBooth) => {
    setEditingBoothId(booth._id)
    setBoothNumber(String(booth.boothNumber))
    setProjectName(booth.projectName)
    setGenresInput(joinListInput(booth.genres))
    setTeamMembersInput(joinListInput(booth.teamMembers))
    setDescription(booth.description ?? "")
    setGuideUrl(booth.guideUrl ?? "")
    setSortOrder(String(booth.sortOrder))
    setBoothActive(booth.isActive)
    setBoothError(null)
    setBoothMessage(null)
    setShowBoothForm(true)
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  const handleSaveBooth = async (event: React.FormEvent) => {
    event.preventDefault()
    setBoothError(null)
    setBoothMessage(null)

    const parsedBoothNumber = Number(boothNumber)
    const parsedSortOrder = sortOrder.trim() ? Number(sortOrder) : parsedBoothNumber
    if (!projectName.trim()) {
      setBoothError(t("assignments.errors.projectNameRequired"))
      return
    }
    if (!Number.isInteger(parsedBoothNumber) || parsedBoothNumber <= 0) {
      setBoothError(t("assignments.errors.invalidBoothNumber"))
      return
    }
    if (!Number.isFinite(parsedSortOrder)) {
      setBoothError(t("assignments.errors.invalidSortOrder"))
      return
    }

    setPendingBoothAction(editingBoothId ? `update:${editingBoothId}` : "create")
    try {
      await upsertBooth({
        ...(editingBoothId ? { boothId: editingBoothId } : {}),
        boothNumber: parsedBoothNumber,
        projectName,
        genres: splitListInput(genresInput),
        teamMembers: splitListInput(teamMembersInput),
        description,
        guideUrl,
        sortOrder: parsedSortOrder,
        isActive: boothActive,
      })
      setBoothMessage(editingBoothId ? t("assignments.updated") : t("assignments.created"))
      closeBoothForm()
    } catch (error) {
      setBoothError(errorMessage(error, t("assignments.errors.saveFailed")))
    } finally {
      setPendingBoothAction(null)
    }
  }

  const handleToggleBooth = async (booth: SoftwareFairBooth) => {
    setPendingBoothAction(`toggle:${booth._id}`)
    setBoothError(null)
    setBoothMessage(null)

    try {
      await upsertBooth({
        boothId: booth._id,
        boothNumber: booth.boothNumber,
        projectName: booth.projectName,
        genres: booth.genres,
        teamMembers: booth.teamMembers,
        description: booth.description ?? undefined,
        guideUrl: booth.guideUrl ?? undefined,
        sortOrder: booth.sortOrder,
        isActive: !booth.isActive,
      })
      setBoothMessage(booth.isActive ? t("assignments.deactivated") : t("assignments.activated"))
    } catch (error) {
      setBoothError(errorMessage(error, t("assignments.errors.saveFailed")))
    } finally {
      setPendingBoothAction(null)
    }
  }

  const handleDeleteBooth = async () => {
    if (!pendingDeleteBooth) return
    setPendingBoothAction(`delete:${pendingDeleteBooth._id}`)
    setBoothError(null)
    setBoothMessage(null)

    try {
      await deleteBooth({ boothId: pendingDeleteBooth._id })
      if (editingBoothId === pendingDeleteBooth._id) closeBoothForm()
      setPendingDeleteBooth(null)
      setBoothMessage(t("assignments.deleted"))
    } catch (error) {
      setBoothError(errorMessage(error, t("assignments.errors.deleteFailed")))
    } finally {
      setPendingBoothAction(null)
    }
  }

  const handleSetBoothContext = (booth: SoftwareFairBooth) => {
    if (!booth.museumId) return
    dashboardMuseumActions?.setMuseumContext(booth.museumId, {
      source: "softwareFair",
    })
    setBoothError(null)
    setBoothMessage(t("assignments.contextSet", { name: booth.projectName }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={config?.enabled ? "default" : "outline"}>
              {config?.enabled ? t("status.enabled") : t("status.disabled")}
            </Badge>
            <Badge variant={config?.announcementEnabled ? "secondary" : "outline"}>
              {config?.announcementEnabled ? t("status.announcing") : t("status.notAnnouncing")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            {configError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {configError}
              </div>
            ) : null}
            {configMessage ? (
              <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                {configMessage}
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              <label className="flex items-start gap-3 rounded-xl border bg-muted/25 p-4">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => {
                    handleConfigEdit()
                    setEnabled(event.target.checked)
                  }}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium">{t("config.enableFeature")}</span>
                  <span className="text-muted-foreground block text-sm">{t("config.enableFeatureHint")}</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border bg-muted/25 p-4">
                <input
                  type="checkbox"
                  checked={announcementEnabled}
                  onChange={(event) => {
                    handleConfigEdit()
                    setAnnouncementEnabled(event.target.checked)
                  }}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium">{t("config.enableAnnouncement")}</span>
                  <span className="text-muted-foreground block text-sm">{t("config.enableAnnouncementHint")}</span>
                </span>
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,0.7fr)]">
              <div className="grid gap-2">
                <Label htmlFor="software-fair-announcement-title">{t("config.announcementTitle")}</Label>
                <Input
                  id="software-fair-announcement-title"
                  value={announcementTitle}
                  onChange={(event) => {
                    handleConfigEdit()
                    setAnnouncementTitle(event.target.value)
                  }}
                  placeholder={DEFAULT_ANNOUNCEMENT_TITLE}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="software-fair-announcement-body">{t("config.announcementBody")}</Label>
                <Input
                  id="software-fair-announcement-body"
                  value={announcementBody}
                  onChange={(event) => {
                    handleConfigEdit()
                    setAnnouncementBody(event.target.value)
                  }}
                  placeholder={DEFAULT_ANNOUNCEMENT_BODY}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="software-fair-announcement-cta">{t("config.announcementCta")}</Label>
                <Input
                  id="software-fair-announcement-cta"
                  value={announcementCtaLabel}
                  onChange={(event) => {
                    handleConfigEdit()
                    setAnnouncementCtaLabel(event.target.value)
                  }}
                  placeholder={DEFAULT_ANNOUNCEMENT_CTA}
                />
              </div>
            </div>

            <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-3">
              <div>
                <p className="font-medium text-foreground">{t("config.featureKey")}</p>
                <p className="break-all font-mono">{config?.key ?? "software_fair_2026"}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{t("config.updatedAt")}</p>
                <p>{formatDate(config?.updatedAt, t("config.never"))}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{t("config.updatedBy")}</p>
                <p className="break-all">{config?.updatedBy ?? t("config.unknown")}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={configSaving || config === undefined}>
                {configSaving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
                {configSaving ? t("config.saving") : tCommon("save")}
              </Button>
              <Button type="button" variant="outline" onClick={handleRefreshConfig} disabled={config === undefined}>
                <RefreshCcwIcon className="size-4" />
                {t("config.refresh")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{t("assignments.title")}</CardTitle>
            <CardDescription>{t("assignments.description")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t("assignments.total", { count: boothRows.length })}</Badge>
            <Badge variant="secondary">{t("assignments.activeTotal", { count: activeBoothCount })}</Badge>
            <Button type="button" onClick={showBoothForm ? closeBoothForm : openCreateForm}>
              {showBoothForm ? <XIcon className="size-4" /> : <PlusIcon className="size-4" />}
              {showBoothForm ? t("assignments.closeForm") : t("assignments.addBooth")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {boothError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {boothError}
            </div>
          ) : null}
          {boothMessage ? (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              {boothMessage}
            </div>
          ) : null}

          {showBoothForm ? (
            <form ref={formRef} onSubmit={handleSaveBooth} className="space-y-4 rounded-xl border bg-muted/25 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {editingBoothId ? t("assignments.editBooth") : t("assignments.createBooth")}
                  </p>
                  <p className="text-muted-foreground text-sm">{t("assignments.formHint")}</p>
                </div>
                {editingBoothId ? (
                  <Button type="button" variant="outline" onClick={closeBoothForm}>
                    {t("assignments.cancelEdit")}
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 lg:grid-cols-[0.55fr_minmax(0,1.4fr)_0.55fr]">
                <div className="grid gap-2">
                  <Label htmlFor="software-fair-booth-number">{t("assignments.boothNumber")}</Label>
                  <Input
                    id="software-fair-booth-number"
                    type="number"
                    min={1}
                    step={1}
                    value={boothNumber}
                    onChange={(event) => {
                      setBoothNumber(event.target.value)
                      if (!sortOrder) setSortOrder(event.target.value)
                    }}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="software-fair-project-name">{t("assignments.projectName")}</Label>
                  <Input
                    id="software-fair-project-name"
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder={t("assignments.projectPlaceholder")}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="software-fair-sort-order">{t("assignments.sortOrder")}</Label>
                  <Input
                    id="software-fair-sort-order"
                    type="number"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                    placeholder={boothNumber || "1"}
                  />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="software-fair-genres">{t("assignments.genres")}</Label>
                  <Input
                    id="software-fair-genres"
                    value={genresInput}
                    onChange={(event) => setGenresInput(event.target.value)}
                    placeholder={t("assignments.genresPlaceholder")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="software-fair-team-members">{t("assignments.teamMembers")}</Label>
                  <Input
                    id="software-fair-team-members"
                    value={teamMembersInput}
                    onChange={(event) => setTeamMembersInput(event.target.value)}
                    placeholder={t("assignments.teamMembersPlaceholder")}
                  />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <div className="grid gap-2">
                  <Label htmlFor="software-fair-description">{t("assignments.boothDescription")}</Label>
                  <Textarea
                    id="software-fair-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t("assignments.descriptionPlaceholder")}
                  />
                </div>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="software-fair-guide-url">{t("assignments.guideUrl")}</Label>
                    <Input
                      id="software-fair-guide-url"
                      type="url"
                      value={guideUrl}
                      onChange={(event) => setGuideUrl(event.target.value)}
                      placeholder="https://cs210.github.io/SoftwareGuide-2026/"
                    />
                  </div>
                  <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={boothActive}
                      onChange={(event) => setBoothActive(event.target.checked)}
                      className="size-4 accent-primary"
                    />
                    {t("assignments.active")}
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={
                    pendingBoothAction === "create" ||
                    (editingBoothId !== null && pendingBoothAction === `update:${editingBoothId}`)
                  }
                >
                  {pendingBoothAction === "create" ||
                  (editingBoothId !== null && pendingBoothAction === `update:${editingBoothId}`) ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SaveIcon className="size-4" />
                  )}
                  {editingBoothId ? t("assignments.saveChanges") : t("assignments.saveAssignment")}
                </Button>
                <Button type="button" variant="outline" onClick={closeBoothForm}>
                  {tCommon("cancel")}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="grid gap-3 rounded-xl border bg-muted/25 p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="grid gap-2">
              <Label htmlFor="software-fair-booth-search">{t("assignments.search")}</Label>
              <div className="relative">
                <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  id="software-fair-booth-search"
                  value={boothSearch}
                  onChange={(event) => setBoothSearch(event.target.value)}
                  placeholder={t("assignments.searchPlaceholder")}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="software-fair-booth-filter">{t("assignments.filter")}</Label>
              <Select value={activeFilter} onValueChange={(value) => setActiveFilter((value ?? "all") as ActiveFilter)}>
                <SelectTrigger id="software-fair-booth-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("assignments.filterAll")}</SelectItem>
                  <SelectItem value="active">{t("assignments.filterActive")}</SelectItem>
                  <SelectItem value="inactive">{t("assignments.filterInactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {booths === undefined ? (
            <div className="rounded-lg border bg-muted/20 px-3 py-10 text-center text-sm text-muted-foreground">
              {t("assignments.loading")}
            </div>
          ) : filteredBooths.length === 0 ? (
            <div className="rounded-lg border bg-muted/20 px-3 py-10 text-center text-sm text-muted-foreground">
              {boothRows.length === 0 ? t("assignments.empty") : t("assignments.noMatches")}
            </div>
          ) : (
            <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
              {filteredBooths.map((booth) => {
                const togglePending = pendingBoothAction === `toggle:${booth._id}`
                const deletePending = pendingBoothAction === `delete:${booth._id}`

                return (
                  <article key={booth._id} className="rounded-xl border bg-background p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{t("assignments.boothLabel", { number: booth.boothNumber })}</Badge>
                          <Badge variant={booth.isActive ? "default" : "outline"}>
                            {booth.isActive ? t("assignments.statusActive") : t("assignments.statusInactive")}
                          </Badge>
                        </div>
                        <h3 className="mt-2 truncate text-base font-semibold">{booth.projectName}</h3>
                        {booth.description ? (
                          <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{booth.description}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {booth.genres.length > 0 ? (
                            booth.genres.map((genre) => (
                              <Badge key={genre} variant="outline">
                                {genre}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">{t("assignments.noGenres")}</Badge>
                          )}
                        </div>
                        <dl className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                          <div className="min-w-0">
                            <dt className="font-medium text-foreground">{t("assignments.teamMembers")}</dt>
                            <dd className="truncate">
                              {booth.teamMembers.length > 0
                                ? booth.teamMembers.join(", ")
                                : t("assignments.noTeamMembers")}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-foreground">{t("assignments.sortOrder")}</dt>
                            <dd>{booth.sortOrder}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-foreground">{t("assignments.updatedAt")}</dt>
                            <dd>{formatDate(booth.updatedAt, t("config.never"))}</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                        <Button type="button" variant="outline" onClick={() => startEditingBooth(booth)}>
                          <PencilIcon className="size-4" />
                          {t("assignments.edit")}
                        </Button>
                        <Button
                          type="button"
                          variant={activeMuseumContextId === booth.museumId ? "secondary" : "outline"}
                          onClick={() => handleSetBoothContext(booth)}
                          disabled={!booth.museumId || !dashboardMuseumActions}
                        >
                          <Building2Icon className="size-4" />
                          {activeMuseumContextId === booth.museumId
                            ? t("assignments.currentContext")
                            : t("assignments.setContext")}
                        </Button>
                        <Button
                          type="button"
                          variant={booth.isActive ? "outline" : "secondary"}
                          onClick={() => void handleToggleBooth(booth)}
                          disabled={togglePending || deletePending}
                        >
                          {togglePending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                          {booth.isActive ? t("assignments.deactivate") : t("assignments.activate")}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => setPendingDeleteBooth(booth)}
                          disabled={deletePending}
                        >
                          {deletePending ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
                          {t("assignments.delete")}
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDeleteBooth !== null}
        onOpenChange={(open) => {
          if (!open && !pendingBoothAction?.startsWith("delete:")) setPendingDeleteBooth(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("assignments.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteBooth
                ? t("assignments.deleteDescription", {
                    name: pendingDeleteBooth.projectName,
                    number: pendingDeleteBooth.boothNumber,
                  })
                : t("assignments.deleteDescriptionShort")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(pendingBoothAction?.startsWith("delete:"))}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(pendingBoothAction?.startsWith("delete:"))}
              onClick={() => void handleDeleteBooth()}
            >
              {pendingBoothAction?.startsWith("delete:") ? t("assignments.deleting") : t("assignments.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
