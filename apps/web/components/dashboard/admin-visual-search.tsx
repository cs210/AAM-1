"use client"

import * as React from "react"
import { ConvexError } from "convex/values"
import { useAction, useMutation, useQuery } from "convex/react"
import { useTranslations } from "next-intl"
import { api } from "@packages/backend/convex/_generated/api"
import {
  ActivityIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  HardDriveIcon,
  HeartPulseIcon,
  ImageIcon,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
  RotateCcwIcon,
  SaveIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Id } from "@packages/backend/convex/_generated/dataModel"

type Config = {
  endpointUrl: string
  updatedAt: number
  updatedBy: string | null
} | null

type DebugKey = "ping" | "health" | "museums" | "volume" | "reload"

type RequestState = {
  loading: boolean
  result?: unknown
  error?: ErrorDetails | null
}

type ErrorDetails = {
  message: string
  status?: number
  code?: string
  path?: string
  body?: string
}

type SearchResult = {
  artworkKey: string
  objectId: string
  title: string | null
  artistDisplayName: string | null
  primaryImage: string | null
  primaryImageSmall: string | null
  imageUrlUsed: string | null
  sourceUrl: string | null
  score: number
}

type SearchResponse = {
  museumSlug: string
  indexVersion: string
  embeddingModel: string
  topK: number
  results: SearchResult[]
}

type MuseumOption = {
  _id: Id<"museums">
  name: string
  location?: {
    city?: string
    state?: string
  }
}

type AssignmentRow = {
  _id: Id<"visualSearchMuseumAssignments">
  museumId: Id<"museums">
  museumName: string
  museumSlug: string
  isActive: boolean
  createdAt: number
  updatedAt: number
  createdBy: string | null
  updatedBy: string | null
  hasMissingMuseum: boolean
}

type ActiveAssignment = {
  museumId: Id<"museums">
  museumName: string
  museumSlug: string
}

const MUSEUM_SLUG_PATTERN = /^[a-z0-9_-]+$/
const MANUAL_SEARCH_SLUG_VALUE = "__manual__"

function formatJson(value: unknown) {
  if (typeof value === "string") return value
  return JSON.stringify(value, null, 2)
}

function getStringField(value: Record<string, unknown>, key: string) {
  const field = value[key]
  return typeof field === "string" && field.length > 0 ? field : undefined
}

function getNumberField(value: Record<string, unknown>, key: string) {
  const field = value[key]
  return typeof field === "number" && Number.isFinite(field) ? field : undefined
}

function getErrorDetails(error: unknown, fallback: string): ErrorDetails {
  const data =
    error instanceof ConvexError && typeof error.data === "object" && error.data !== null
      ? (error.data as Record<string, unknown>)
      : null

  if (data) {
    return {
      message: getStringField(data, "message") ?? fallback,
      status: getNumberField(data, "status"),
      code: getStringField(data, "code"),
      path: getStringField(data, "path"),
      body: getStringField(data, "body"),
    }
  }

  return {
    message: error instanceof Error ? error.message : fallback,
  }
}

function normalizeMuseumSlug(value: string) {
  return value.trim().toLowerCase()
}

function isValidMuseumSlug(value: string) {
  return MUSEUM_SLUG_PATTERN.test(normalizeMuseumSlug(value))
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
      {formatJson(value)}
    </pre>
  )
}

function ErrorBlock({ error }: { error: ErrorDetails }) {
  const t = useTranslations("dashboard.adminVisualSearch")

  return (
    <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <p className="font-medium">{error.message}</p>
      <div className="flex flex-wrap gap-2 text-xs">
        {error.status !== undefined ? (
          <Badge variant="destructive">{t("errors.status", { status: error.status })}</Badge>
        ) : null}
        {error.code ? <Badge variant="outline">{t("errors.code", { code: error.code })}</Badge> : null}
        {error.path ? <Badge variant="outline">{t("errors.path", { path: error.path })}</Badge> : null}
      </div>
      {error.body ? (
        <pre className="max-h-60 overflow-auto rounded-md border border-destructive/30 bg-background/70 p-2 text-xs text-foreground">
          {error.body}
        </pre>
      ) : null}
    </div>
  )
}

function ResultJson({ state }: { state: RequestState | undefined }) {
  const hasResult = state !== undefined && "result" in state
  if (!hasResult && !state?.error) return null

  return (
    <div className="mt-3">
      {state.error ? <ErrorBlock error={state.error} /> : <JsonBlock value={state.result} />}
    </div>
  )
}

export function AdminVisualSearch() {
  const t = useTranslations("dashboard.adminVisualSearch")
  const config = useQuery(api.visualSearch.getVisualSearchConfig) as Config | undefined
  const museums = useQuery(api.museums.listMuseums) as MuseumOption[] | undefined
  const assignments = useQuery(api.visualSearch.listVisualSearchMuseumAssignments) as AssignmentRow[] | undefined
  const activeAssignments = useQuery(api.visualSearch.listVisualSearchActiveMuseums) as ActiveAssignment[] | undefined
  const setEndpoint = useMutation(api.visualSearch.setVisualSearchEndpoint)
  const createAssignment = useMutation(api.visualSearch.createVisualSearchMuseumAssignment)
  const updateAssignment = useMutation(api.visualSearch.updateVisualSearchMuseumAssignment)
  const deleteAssignment = useMutation(api.visualSearch.deleteVisualSearchMuseumAssignment)
  const pingVisualSearch = useAction(api.visualSearch.pingVisualSearch)
  const healthVisualSearch = useAction(api.visualSearch.healthVisualSearch)
  const listVisualSearchMuseums = useAction(api.visualSearch.listVisualSearchMuseums)
  const debugVisualSearchVolume = useAction(api.visualSearch.debugVisualSearchVolume)
  const reloadVisualSearch = useAction(api.visualSearch.reloadVisualSearch)
  const testVisualSearchSearch = useAction(api.visualSearch.testVisualSearchSearch)

  const [endpointUrl, setEndpointUrl] = React.useState("")
  const [hasEditedEndpoint, setHasEditedEndpoint] = React.useState(false)
  const [savingEndpoint, setSavingEndpoint] = React.useState(false)
  const [configMessage, setConfigMessage] = React.useState<string | null>(null)
  const [configError, setConfigError] = React.useState<ErrorDetails | null>(null)
  const [assignmentsExpanded, setAssignmentsExpanded] = React.useState(true)
  const [showAssignmentForm, setShowAssignmentForm] = React.useState(false)
  const [assignmentMuseumId, setAssignmentMuseumId] = React.useState("")
  const [assignmentSlug, setAssignmentSlug] = React.useState("")
  const [assignmentActive, setAssignmentActive] = React.useState(false)
  const [editingAssignmentId, setEditingAssignmentId] = React.useState<Id<"visualSearchMuseumAssignments"> | null>(null)
  const [editAssignmentSlug, setEditAssignmentSlug] = React.useState("")
  const [editAssignmentActive, setEditAssignmentActive] = React.useState(false)
  const [assignmentMessage, setAssignmentMessage] = React.useState<string | null>(null)
  const [assignmentError, setAssignmentError] = React.useState<ErrorDetails | null>(null)
  const [pendingAssignmentAction, setPendingAssignmentAction] = React.useState<string | null>(null)
  const [selectedActiveAssignment, setSelectedActiveAssignment] = React.useState(MANUAL_SEARCH_SLUG_VALUE)
  const [debugState, setDebugState] = React.useState<Partial<Record<DebugKey, RequestState>>>({})
  const [museumSlug, setMuseumSlug] = React.useState("met")
  const [imageUrl, setImageUrl] = React.useState("https://i.ebayimg.com/images/g/snwAAeSwQthpA~dm/s-l1200.jpg")
  const [topK, setTopK] = React.useState("5")
  const [searchState, setSearchState] = React.useState<RequestState>({ loading: false })

  React.useEffect(() => {
    if (config === undefined || hasEditedEndpoint) return
    setEndpointUrl(config?.endpointUrl ?? "")
  }, [config, hasEditedEndpoint])

  const assignmentRows = React.useMemo(() => assignments ?? [], [assignments])
  const assignedMuseumIds = React.useMemo(
    () => new Set(assignmentRows.map((assignment) => assignment.museumId)),
    [assignmentRows]
  )
  const availableMuseums = React.useMemo(
    () =>
      (museums ?? [])
        .filter((museum) => !assignedMuseumIds.has(museum._id))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [assignedMuseumIds, museums]
  )
  const activeAssignmentRows = React.useMemo(
    () => (activeAssignments ?? []).slice().sort((a, b) => a.museumName.localeCompare(b.museumName)),
    [activeAssignments]
  )

  const resetAssignmentForm = React.useCallback(() => {
    setAssignmentMuseumId("")
    setAssignmentSlug("")
    setAssignmentActive(false)
  }, [])

  const debugTools = React.useMemo(
    () => [
      {
        key: "ping" as const,
        label: t("debug.ping"),
        description: t("debug.pingDescription"),
        icon: ActivityIcon,
        action: pingVisualSearch,
      },
      {
        key: "health" as const,
        label: t("debug.health"),
        description: t("debug.healthDescription"),
        icon: HeartPulseIcon,
        action: healthVisualSearch,
      },
      {
        key: "museums" as const,
        label: t("debug.museums"),
        description: t("debug.museumsDescription"),
        icon: DatabaseIcon,
        action: listVisualSearchMuseums,
      },
      {
        key: "volume" as const,
        label: t("debug.volume"),
        description: t("debug.volumeDescription"),
        icon: HardDriveIcon,
        action: debugVisualSearchVolume,
      },
      {
        key: "reload" as const,
        label: t("debug.reload"),
        description: t("debug.reloadDescription"),
        icon: RotateCcwIcon,
        action: reloadVisualSearch,
      },
    ],
    [debugVisualSearchVolume, healthVisualSearch, listVisualSearchMuseums, pingVisualSearch, reloadVisualSearch, t]
  )

  const debugRequestRunning = Object.values(debugState).some((state) => state?.loading)

  const handleSaveEndpoint = async (event: React.FormEvent) => {
    event.preventDefault()
    setConfigMessage(null)
    setConfigError(null)
    setSavingEndpoint(true)

    try {
      const next = await setEndpoint({ endpointUrl })
      setEndpointUrl(next.endpointUrl)
      setHasEditedEndpoint(false)
      setConfigMessage(t("config.saved"))
    } catch (error) {
      setConfigError(getErrorDetails(error, t("config.saveFailed")))
    } finally {
      setSavingEndpoint(false)
    }
  }

  const handleRefreshConfig = () => {
    if (config === undefined) return
    setEndpointUrl(config?.endpointUrl ?? "")
    setHasEditedEndpoint(false)
    setConfigError(null)
    setConfigMessage(t("config.refreshed"))
  }

  const handleCreateAssignment = async (event: React.FormEvent) => {
    event.preventDefault()
    setAssignmentError(null)
    setAssignmentMessage(null)

    if (!assignmentMuseumId) {
      setAssignmentError({ message: t("assignments.errors.museumRequired") })
      return
    }

    const normalizedSlug = normalizeMuseumSlug(assignmentSlug)
    if (!isValidMuseumSlug(normalizedSlug)) {
      setAssignmentError({ message: t("assignments.errors.invalidSlug") })
      return
    }

    setPendingAssignmentAction("create")
    try {
      await createAssignment({
        museumId: assignmentMuseumId as Id<"museums">,
        museumSlug: normalizedSlug,
        isActive: assignmentActive,
      })
      resetAssignmentForm()
      setShowAssignmentForm(false)
      setAssignmentMessage(t("assignments.created"))
    } catch (error) {
      setAssignmentError(getErrorDetails(error, t("assignments.errors.createFailed")))
    } finally {
      setPendingAssignmentAction(null)
    }
  }

  const startEditingAssignment = (assignment: AssignmentRow) => {
    setEditingAssignmentId(assignment._id)
    setEditAssignmentSlug(assignment.museumSlug)
    setEditAssignmentActive(assignment.isActive)
    setAssignmentError(null)
    setAssignmentMessage(null)
  }

  const cancelEditingAssignment = () => {
    setEditingAssignmentId(null)
    setEditAssignmentSlug("")
    setEditAssignmentActive(false)
  }

  const handleUpdateAssignment = async (assignmentId: Id<"visualSearchMuseumAssignments">) => {
    setAssignmentError(null)
    setAssignmentMessage(null)

    const normalizedSlug = normalizeMuseumSlug(editAssignmentSlug)
    if (!isValidMuseumSlug(normalizedSlug)) {
      setAssignmentError({ message: t("assignments.errors.invalidSlug") })
      return
    }

    setPendingAssignmentAction(`update:${assignmentId}`)
    try {
      await updateAssignment({
        assignmentId,
        museumSlug: normalizedSlug,
        isActive: editAssignmentActive,
      })
      cancelEditingAssignment()
      setAssignmentMessage(t("assignments.updated"))
    } catch (error) {
      setAssignmentError(getErrorDetails(error, t("assignments.errors.updateFailed")))
    } finally {
      setPendingAssignmentAction(null)
    }
  }

  const handleToggleAssignment = async (assignment: AssignmentRow) => {
    setAssignmentError(null)
    setAssignmentMessage(null)
    setPendingAssignmentAction(`toggle:${assignment._id}`)

    try {
      await updateAssignment({
        assignmentId: assignment._id,
        isActive: !assignment.isActive,
      })
      setAssignmentMessage(assignment.isActive ? t("assignments.deactivated") : t("assignments.activated"))
    } catch (error) {
      setAssignmentError(getErrorDetails(error, t("assignments.errors.updateFailed")))
    } finally {
      setPendingAssignmentAction(null)
    }
  }

  const handleDeleteAssignment = async (assignmentId: Id<"visualSearchMuseumAssignments">) => {
    setAssignmentError(null)
    setAssignmentMessage(null)
    setPendingAssignmentAction(`delete:${assignmentId}`)

    try {
      await deleteAssignment({ assignmentId })
      if (editingAssignmentId === assignmentId) {
        cancelEditingAssignment()
      }
      setAssignmentMessage(t("assignments.deleted"))
    } catch (error) {
      setAssignmentError(getErrorDetails(error, t("assignments.errors.deleteFailed")))
    } finally {
      setPendingAssignmentAction(null)
    }
  }

  const runDebugTool = async (key: DebugKey, actionFn: () => Promise<unknown>) => {
    setDebugState((current) => ({
      ...current,
      [key]: { loading: true },
    }))

    try {
      const result = await actionFn()
      setDebugState((current) => ({
        ...current,
        [key]: { loading: false, result },
      }))
    } catch (error) {
      setDebugState((current) => ({
        ...current,
        [key]: {
          loading: false,
          error: getErrorDetails(error, t("errors.requestFailed")),
        },
      }))
    }
  }

  const handleTestSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    setSearchState({ loading: true })

    try {
      const parsedTopK = Number(topK)
      const result = (await testVisualSearchSearch({
        museumSlug,
        imageUrl,
        topK: Number.isFinite(parsedTopK) ? parsedTopK : undefined,
      })) as SearchResponse

      setSearchState({ loading: false, result })
    } catch (error) {
      setSearchState({
        loading: false,
        error: getErrorDetails(error, t("errors.requestFailed")),
      })
    }
  }

  const searchResult = searchState.result as SearchResponse | undefined
  const searchResults = searchResult?.results ?? []
  const hasSearchResults = searchResults.length > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("config.title")}</CardTitle>
          <CardDescription>{t("config.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configError ? <ErrorBlock error={configError} /> : null}
          {configMessage ? (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              {configMessage}
            </div>
          ) : null}

          <form onSubmit={handleSaveEndpoint} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="visual-search-endpoint">{t("config.endpointLabel")}</Label>
              <Input
                id="visual-search-endpoint"
                type="url"
                placeholder={t("config.endpointPlaceholder")}
                value={endpointUrl}
                onChange={(event) => {
                  setEndpointUrl(event.target.value)
                  setHasEditedEndpoint(true)
                }}
                required
              />
              <p className="text-muted-foreground text-xs">{t("config.secretHint")}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={savingEndpoint}>
                <SaveIcon className="size-4" />
                {savingEndpoint ? t("config.saving") : t("config.save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRefreshConfig}
                disabled={config === undefined}
              >
                <RefreshCcwIcon className="size-4" />
                {t("config.refresh")}
              </Button>
            </div>
          </form>

          <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-3">
            <div>
              <p className="font-medium text-foreground">{t("config.currentEndpoint")}</p>
              <p className="break-all">{config === undefined ? t("config.loading") : config?.endpointUrl ?? t("config.notConfigured")}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">{t("config.updatedAt")}</p>
              <p>{config?.updatedAt ? new Date(config.updatedAt).toLocaleString() : t("config.never")}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">{t("config.updatedBy")}</p>
              <p className="break-all">{config?.updatedBy ?? t("config.unknown")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{t("assignments.title")}</CardTitle>
            <CardDescription>{t("assignments.description")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setAssignmentsExpanded((value) => !value)}>
              {assignmentsExpanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
              {assignmentsExpanded ? t("assignments.collapse") : t("assignments.expand")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowAssignmentForm((value) => !value)
                setAssignmentError(null)
                setAssignmentMessage(null)
                if (showAssignmentForm) resetAssignmentForm()
              }}
              disabled={museums === undefined}
            >
              {showAssignmentForm ? <XIcon className="size-4" /> : <PlusIcon className="size-4" />}
              {showAssignmentForm ? t("assignments.cancelAssign") : t("assignments.assignMuseum")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignmentError ? <ErrorBlock error={assignmentError} /> : null}
          {assignmentMessage ? (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              {assignmentMessage}
            </div>
          ) : null}

          {showAssignmentForm ? (
            <form onSubmit={handleCreateAssignment} className="space-y-4 rounded-lg border bg-muted/20 p-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]">
                <div className="grid gap-2">
                  <Label htmlFor="visual-search-assignment-museum">{t("assignments.museum")}</Label>
                  <Select
                    value={assignmentMuseumId || null}
                    onValueChange={(value) => setAssignmentMuseumId(value ?? "")}
                  >
                    <SelectTrigger id="visual-search-assignment-museum" className="w-full">
                      <SelectValue placeholder={t("assignments.selectMuseum")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMuseums.length > 0 ? (
                        availableMuseums.map((museum) => (
                          <SelectItem key={museum._id} value={museum._id}>
                            {museum.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none__" disabled>
                          {t("assignments.noAssignableMuseums")}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="visual-search-assignment-slug">{t("assignments.museumSlug")}</Label>
                  <Input
                    id="visual-search-assignment-slug"
                    value={assignmentSlug}
                    placeholder={t("assignments.slugPlaceholder")}
                    onChange={(event) => setAssignmentSlug(event.target.value)}
                    aria-invalid={assignmentSlug.length > 0 && !isValidMuseumSlug(assignmentSlug)}
                    required
                  />
                  <p className="text-muted-foreground text-xs">{t("assignments.slugHint")}</p>
                </div>
                <label className="flex items-center gap-2 self-end rounded-lg border bg-background px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={assignmentActive}
                    onChange={(event) => setAssignmentActive(event.target.checked)}
                    className="size-4 accent-primary"
                  />
                  {t("assignments.active")}
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={pendingAssignmentAction === "create" || availableMuseums.length === 0}
                >
                  {pendingAssignmentAction === "create" ? t("assignments.saving") : t("assignments.saveAssignment")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAssignmentForm(false)
                    resetAssignmentForm()
                  }}
                >
                  {t("assignments.cancel")}
                </Button>
              </div>
            </form>
          ) : null}

          {assignmentsExpanded ? (
            assignments === undefined ? (
              <div className="rounded-lg border bg-muted/20 px-3 py-8 text-center text-sm text-muted-foreground">
                {t("assignments.loading")}
              </div>
            ) : assignmentRows.length === 0 ? (
              <div className="rounded-lg border bg-muted/20 px-3 py-8 text-center text-sm text-muted-foreground">
                {t("assignments.empty")}
              </div>
            ) : (
              <div className="space-y-3">
                {assignmentRows.map((assignment) => {
                  const isEditing = editingAssignmentId === assignment._id
                  const togglePending = pendingAssignmentAction === `toggle:${assignment._id}`
                  const updatePending = pendingAssignmentAction === `update:${assignment._id}`
                  const deletePending = pendingAssignmentAction === `delete:${assignment._id}`

                  return (
                    <article key={assignment._id} className="rounded-lg border bg-background p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-medium">{assignment.museumName}</h3>
                            <Badge variant={assignment.isActive ? "secondary" : "outline"}>
                              {assignment.isActive ? t("assignments.statusActive") : t("assignments.statusInactive")}
                            </Badge>
                            {assignment.hasMissingMuseum ? (
                              <Badge variant="destructive">{t("assignments.deletedMuseum")}</Badge>
                            ) : null}
                          </div>
                          {isEditing ? (
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                              <div className="grid gap-2">
                                <Label htmlFor={`visual-search-edit-slug-${assignment._id}`}>
                                  {t("assignments.museumSlug")}
                                </Label>
                                <Input
                                  id={`visual-search-edit-slug-${assignment._id}`}
                                  value={editAssignmentSlug}
                                  onChange={(event) => setEditAssignmentSlug(event.target.value)}
                                  aria-invalid={editAssignmentSlug.length > 0 && !isValidMuseumSlug(editAssignmentSlug)}
                                />
                              </div>
                              <label className="flex items-center gap-2 self-end rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={editAssignmentActive}
                                  onChange={(event) => setEditAssignmentActive(event.target.checked)}
                                  className="size-4 accent-primary"
                                />
                                {t("assignments.active")}
                              </label>
                            </div>
                          ) : (
                            <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                              <div className="min-w-0">
                                <dt className="font-medium text-foreground">{t("assignments.museumSlug")}</dt>
                                <dd className="truncate font-mono">{assignment.museumSlug}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-foreground">{t("assignments.updatedAt")}</dt>
                                <dd>{new Date(assignment.updatedAt).toLocaleString()}</dd>
                              </div>
                              <div className="min-w-0">
                                <dt className="font-medium text-foreground">{t("assignments.museumId")}</dt>
                                <dd className="truncate">{assignment.museumId}</dd>
                              </div>
                            </dl>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                onClick={() => handleUpdateAssignment(assignment._id)}
                                disabled={updatePending}
                              >
                                <SaveIcon className="size-4" />
                                {updatePending ? t("assignments.saving") : t("assignments.save")}
                              </Button>
                              <Button type="button" variant="outline" onClick={cancelEditingAssignment}>
                                {t("assignments.cancel")}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button type="button" variant="outline" onClick={() => startEditingAssignment(assignment)}>
                                <PencilIcon className="size-4" />
                                {t("assignments.edit")}
                              </Button>
                              <Button
                                type="button"
                                variant={assignment.isActive ? "outline" : "secondary"}
                                onClick={() => handleToggleAssignment(assignment)}
                                disabled={togglePending}
                              >
                                {togglePending
                                  ? t("assignments.saving")
                                  : assignment.isActive
                                    ? t("assignments.deactivate")
                                    : t("assignments.activate")}
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => handleDeleteAssignment(assignment._id)}
                                disabled={deletePending}
                              >
                                <Trash2Icon className="size-4" />
                                {deletePending ? t("assignments.removing") : t("assignments.remove")}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          ) : (
            <div className="rounded-lg border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
              {t("assignments.collapsedSummary", {
                total: assignmentRows.length,
                active: assignmentRows.filter((assignment) => assignment.isActive).length,
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("debug.title")}</CardTitle>
          <CardDescription>{t("debug.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-300">
            {t("debug.reloadWarning")}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {debugTools.map((tool) => {
              const Icon = tool.icon
              const state = debugState[tool.key]

              return (
                <div key={tool.key} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-medium">
                        <Icon className="size-4 text-muted-foreground" />
                        {tool.label}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                    <Button
                      type="button"
                      variant={tool.key === "reload" ? "destructive" : "outline"}
                      onClick={() => runDebugTool(tool.key, tool.action)}
                      disabled={debugRequestRunning}
                    >
                      {state?.loading ? t("debug.running") : tool.label}
                    </Button>
                  </div>
                  <ResultJson state={state} />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("search.title")}</CardTitle>
          <CardDescription>{t("search.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleTestSearch} className="space-y-4">
            <div className="grid gap-2 md:max-w-md">
              <Label htmlFor="visual-search-active-assignment">{t("search.activeAssignment")}</Label>
              <Select
                value={selectedActiveAssignment}
                onValueChange={(value) => {
                  const nextValue = value ?? MANUAL_SEARCH_SLUG_VALUE
                  setSelectedActiveAssignment(nextValue)
                  if (nextValue !== MANUAL_SEARCH_SLUG_VALUE) {
                    setMuseumSlug(nextValue)
                  }
                }}
              >
                <SelectTrigger id="visual-search-active-assignment" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MANUAL_SEARCH_SLUG_VALUE}>{t("search.manualSlug")}</SelectItem>
                  {activeAssignmentRows.map((assignment) => (
                    <SelectItem key={`${assignment.museumId}:${assignment.museumSlug}`} value={assignment.museumSlug}>
                      {assignment.museumName} ({assignment.museumSlug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_8rem]">
              <div className="grid gap-2">
                <Label htmlFor="visual-search-museum-slug">{t("search.museumSlug")}</Label>
                <Input
                  id="visual-search-museum-slug"
                  value={museumSlug}
                  onChange={(event) => {
                    setMuseumSlug(event.target.value)
                    setSelectedActiveAssignment(MANUAL_SEARCH_SLUG_VALUE)
                  }}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="visual-search-image-url">{t("search.imageUrl")}</Label>
                <Input
                  id="visual-search-image-url"
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="visual-search-top-k">{t("search.topK")}</Label>
                <Input
                  id="visual-search-top-k"
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={topK}
                  onChange={(event) => setTopK(event.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={searchState.loading}>
              <SearchIcon className="size-4" />
              {searchState.loading ? t("search.testing") : t("search.test")}
            </Button>
          </form>

          {searchState.error ? <ErrorBlock error={searchState.error} /> : null}

          {searchResult ? (
            <details open className="rounded-lg border bg-muted/20 p-3">
              <summary className="cursor-pointer text-sm font-medium">{t("search.rawResponse")}</summary>
              <div className="mt-3">
                <JsonBlock value={searchResult} />
              </div>
            </details>
          ) : null}

          {searchResult && hasSearchResults ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{t("search.resultCount", { count: searchResults.length })}</Badge>
                {searchResult.indexVersion ? <Badge variant="outline">{searchResult.indexVersion}</Badge> : null}
                {searchResult.embeddingModel ? <Badge variant="outline">{searchResult.embeddingModel}</Badge> : null}
              </div>
              <div className="grid gap-3">
                {searchResults.map((result, index) => {
                  const thumbnailUrl = result.primaryImageSmall ?? result.primaryImage ?? result.imageUrlUsed

                  return (
                    <article
                      key={`${result.artworkKey}-${result.objectId}-${index}`}
                      className="grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[6rem_minmax(0,1fr)]"
                    >
                      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted">
                        {thumbnailUrl ? (
                          <div
                            className="h-full w-full bg-cover bg-center"
                            role="img"
                            aria-label={result.title ?? t("search.thumbnailAlt")}
                            style={{ backgroundImage: `url(${thumbnailUrl})` }}
                          />
                        ) : (
                          <ImageIcon className="size-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-medium">{result.title ?? t("search.untitled")}</h3>
                            <p className="text-sm text-muted-foreground">
                              {result.artistDisplayName ?? t("search.unknownArtist")}
                            </p>
                          </div>
                          <Badge variant="secondary">{result.score.toFixed(3)}</Badge>
                        </div>
                        <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                          <div className="min-w-0">
                            <dt className="font-medium text-foreground">{t("search.objectId")}</dt>
                            <dd className="truncate">{result.objectId || t("search.notAvailable")}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="font-medium text-foreground">{t("search.artworkKey")}</dt>
                            <dd className="truncate">{result.artworkKey || t("search.notAvailable")}</dd>
                          </div>
                        </dl>
                        {result.sourceUrl ? (
                          <a
                            href={result.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              "inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                            )}
                          >
                            {t("search.sourceUrl")}
                            <ExternalLinkIcon className="size-3" />
                          </a>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          ) : searchResult ? (
            <div className="rounded-lg border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
              {t("search.noResults")}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
