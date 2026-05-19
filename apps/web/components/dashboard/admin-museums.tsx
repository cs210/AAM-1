"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useAction, useMutation } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { Loader2Icon, SquareIcon, UploadIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type MuseumRow = {
  _id: Id<"museums">
  name: string
  description?: string
  category: string
  location: {
    address?: string
    city?: string
    state?: string
  }
  imageUrl?: string
  website?: string
  phone?: string
  point: { latitude: number; longitude: number } | null
}

type AdminMuseumsProps = {
  activeMuseumContextId?: string | null
  onEditMuseumContext?: (museumId: string) => void
}

type CsvMuseumImportRow = {
  rowNumber: number
  museumName: string
  city?: string
  state?: string
  country?: string
  exhibitionPageUrl?: string
}

type CsvImportResultRow = CsvMuseumImportRow & {
  status: "pending" | "running" | "completed" | "failed" | "stopped"
  message?: string
  museumId?: string
  wasCreated?: boolean
  detailsStatus?: string
  exhibitionsStatus?: string
  imagesImportedCount?: number
  exhibitionsCreatedCount?: number
  exhibitionsParsedCount?: number
}

type CsvImportActionResult = {
  museumId: string
  wasCreated: boolean
  museum: {
    status: "updated" | "skipped" | "failed"
    message?: string
    imagesImportedCount: number
  }
  exhibitions: {
    status: "imported" | "skipped" | "failed"
    message?: string
    createdCount: number
    skippedCount: number
    parsedCount: number
  }
}

function parseCsvRecords(input: string) {
  const records: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      row.push(field)
      field = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1
      row.push(field)
      if (row.some((value) => value.trim().length > 0)) records.push(row)
      row = []
      field = ""
      continue
    }

    field += char
  }

  row.push(field)
  if (row.some((value) => value.trim().length > 0)) records.push(row)
  return records
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_")
}

function firstCsvValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]?.trim()
    if (value) return value
  }
  return undefined
}

function parseMuseumImportCsv(input: string): CsvMuseumImportRow[] {
  const records = parseCsvRecords(input)
  const [headerRecord, ...dataRecords] = records
  if (!headerRecord) throw new Error("CSV is empty.")

  const headers = headerRecord.map(normalizeCsvHeader)
  const rows: CsvMuseumImportRow[] = []
  dataRecords.forEach((record, index) => {
    const row = Object.fromEntries(headers.map((header, columnIndex) => [header, record[columnIndex] ?? ""]))
    const museumName = firstCsvValue(row, ["museum_name", "name", "museum"])
    if (!museumName) return
    rows.push({
      rowNumber: index + 2,
      museumName,
      city: firstCsvValue(row, ["city"]),
      state: firstCsvValue(row, ["state", "province", "region"]),
      country: firstCsvValue(row, ["country"]),
      exhibitionPageUrl: firstCsvValue(row, [
        "exhibition_page_url",
        "exhibitions_page_url",
        "exhibition_url",
        "exhibitions_url",
        "url",
      ]),
    })
  })

  if (rows.length === 0) throw new Error("No rows with a museum_name column were found.")
  return rows
}

type CsvImportStoreState = {
  csvFileName: string | null
  csvRows: CsvMuseumImportRow[]
  csvImportResults: CsvImportResultRow[]
  csvImportRunning: boolean
  csvStopRequested: boolean
  csvCurrentIndex: number | null
  lastUpdatedAt: number | null
}

const csvImportStorageKey = "museum-admin-csv-import-state"
const emptyCsvImportStoreState: CsvImportStoreState = {
  csvFileName: null,
  csvRows: [],
  csvImportResults: [],
  csvImportRunning: false,
  csvStopRequested: false,
  csvCurrentIndex: null,
  lastUpdatedAt: null,
}

let csvImportStoreState: CsvImportStoreState = emptyCsvImportStoreState
let csvImportStoreHydrated = false
const csvImportStoreListeners = new Set<() => void>()

function readStoredCsvImportState() {
  if (typeof window === "undefined") return null
  try {
    const stored = window.localStorage.getItem(csvImportStorageKey)
    if (!stored) return null
    const parsed = JSON.parse(stored) as Partial<CsvImportStoreState>
    return {
      ...emptyCsvImportStoreState,
      ...parsed,
      csvFileName: parsed.csvFileName ?? null,
      csvRows: Array.isArray(parsed.csvRows) ? parsed.csvRows : [],
      csvImportResults: Array.isArray(parsed.csvImportResults) ? parsed.csvImportResults : [],
      csvImportRunning: Boolean(parsed.csvImportRunning),
      csvStopRequested: Boolean(parsed.csvStopRequested),
      csvCurrentIndex: typeof parsed.csvCurrentIndex === "number" ? parsed.csvCurrentIndex : null,
      lastUpdatedAt: typeof parsed.lastUpdatedAt === "number" ? parsed.lastUpdatedAt : null,
    }
  } catch {
    return null
  }
}

function hydrateCsvImportStore() {
  if (csvImportStoreHydrated) return
  csvImportStoreHydrated = true
  csvImportStoreState = readStoredCsvImportState() ?? emptyCsvImportStoreState
}

function persistCsvImportStore() {
  if (typeof window === "undefined") return
  window.localStorage.setItem(csvImportStorageKey, JSON.stringify(csvImportStoreState))
}

function emitCsvImportStore() {
  persistCsvImportStore()
  csvImportStoreListeners.forEach((listener) => listener())
}

function getCsvImportStoreSnapshot() {
  hydrateCsvImportStore()
  return csvImportStoreState
}

function setCsvImportStoreState(
  updater: CsvImportStoreState | ((current: CsvImportStoreState) => CsvImportStoreState)
) {
  hydrateCsvImportStore()
  csvImportStoreState = {
    ...(typeof updater === "function" ? updater(csvImportStoreState) : updater),
    lastUpdatedAt: Date.now(),
  }
  emitCsvImportStore()
}

function subscribeCsvImportStore(listener: () => void) {
  hydrateCsvImportStore()
  csvImportStoreListeners.add(listener)
  return () => {
    csvImportStoreListeners.delete(listener)
  }
}

function updateCsvImportResult(index: number, updater: (row: CsvImportResultRow) => CsvImportResultRow) {
  setCsvImportStoreState((current) => ({
    ...current,
    csvImportResults: current.csvImportResults.map((row, rowIndex) => (rowIndex === index ? updater(row) : row)),
  }))
}

export function AdminMuseums({ activeMuseumContextId, onEditMuseumContext }: AdminMuseumsProps) {
  const t = useTranslations("dashboard.adminMuseums")
  const tCommon = useTranslations("common")
  const listMuseums = useAction(api.admin.listMuseumsForAdmin)
  const importMuseumCsvRow = useAction(api.admin.importMuseumCsvRowForAdmin)
  const createMuseum = useMutation(api.admin.createMuseumForAdmin)
  const deleteMuseum = useMutation(api.admin.deleteMuseumForAdmin)

  const [museums, setMuseums] = React.useState<MuseumRow[] | null | undefined>(undefined)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = React.useState(false)
  const [newMuseumName, setNewMuseumName] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<Id<"museums"> | null>(null)
  const [pendingDeleteMuseum, setPendingDeleteMuseum] = React.useState<MuseumRow | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [stateFilter, setStateFilter] = React.useState("all")
  const [cityFilter, setCityFilter] = React.useState("all")
  const [csvImportState, setCsvImportState] = React.useState<CsvImportStoreState>(() => getCsvImportStoreSnapshot())
  const {
    csvFileName,
    csvRows,
    csvImportResults,
    csvImportRunning,
    csvStopRequested,
    csvCurrentIndex,
  } = csvImportState

  const loadMuseums = React.useCallback(async () => {
    setMuseums(undefined)
    setError(null)
    try {
      const rows = await listMuseums()
      setMuseums((rows as MuseumRow[]) ?? [])
    } catch (e) {
      setMuseums(null)
      setError(e instanceof Error ? e.message : t("loadFailed"))
    }
  }, [listMuseums, t])

  React.useEffect(() => {
    loadMuseums()
  }, [loadMuseums])

  React.useEffect(() => {
    return subscribeCsvImportStore(() => setCsvImportState(getCsvImportStoreSnapshot()))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const name = newMuseumName.trim()
    if (!name) {
      setError(t("museumRequired"))
      return
    }

    setCreating(true)
    try {
      await createMuseum({ name })
      setNewMuseumName("")
      setShowCreateForm(false)
      setSuccess(t("museumCreated"))
      await loadMuseums()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("createFailed"))
    } finally {
      setCreating(false)
    }
  }

  const handleEditContext = (museum: MuseumRow) => {
    onEditMuseumContext?.(museum._id)
    setError(null)
    setSuccess(t("contextSwitched", { name: museum.name }))
  }

  const handleDelete = async (museum: MuseumRow) => {
    setDeletingId(museum._id)
    setError(null)
    setSuccess(null)
    try {
      await deleteMuseum({ museumId: museum._id })
      setSuccess(t("museumDeleted"))
      await loadMuseums()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("deleteFailed"))
    } finally {
      setDeletingId(null)
      setPendingDeleteMuseum(null)
    }
  }

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)
    setSuccess(null)
    setCsvImportStoreState((current) => ({
      ...current,
      csvImportResults: [],
      csvCurrentIndex: null,
    }))
    if (!file) {
      setCsvImportStoreState({
        ...emptyCsvImportStoreState,
      })
      return
    }

    try {
      const text = await file.text()
      const rows = parseMuseumImportCsv(text)
      setCsvImportStoreState({
        ...emptyCsvImportStoreState,
        csvFileName: file.name,
        csvRows: rows,
      })
      setSuccess(t("csv.parsed", { count: rows.length }))
    } catch (csvError) {
      setCsvImportStoreState({
        ...emptyCsvImportStoreState,
      })
      setError(csvError instanceof Error ? csvError.message : t("csv.parseFailed"))
    } finally {
      event.target.value = ""
    }
  }

  const handleStartCsvImport = async () => {
    const rows = getCsvImportStoreSnapshot().csvRows
    if (rows.length === 0 || getCsvImportStoreSnapshot().csvImportRunning) return

    setError(null)
    setSuccess(null)
    setCsvImportStoreState((current) => ({
      ...current,
      csvImportRunning: true,
      csvStopRequested: false,
      csvCurrentIndex: null,
      csvImportResults: rows.map((row) => ({ ...row, status: "pending" })),
    }))

    for (let index = 0; index < rows.length; index += 1) {
      if (getCsvImportStoreSnapshot().csvStopRequested) {
        setCsvImportStoreState((current) => ({
          ...current,
          csvImportResults: current.csvImportResults.map((row, rowIndex) =>
            rowIndex >= index ? { ...row, status: "stopped" } : row
          ),
        }))
        break
      }

      const row = rows[index]!
      setCsvImportStoreState((current) => ({ ...current, csvCurrentIndex: index }))
      updateCsvImportResult(index, (result) => ({ ...result, status: "running" }))

      try {
        const result = (await importMuseumCsvRow({
          museumName: row.museumName,
          ...(row.city ? { city: row.city } : {}),
          ...(row.state ? { state: row.state } : {}),
          ...(row.country ? { country: row.country } : {}),
          ...(row.exhibitionPageUrl ? { exhibitionPageUrl: row.exhibitionPageUrl } : {}),
        })) as CsvImportActionResult

        const rowMessage =
          result.museum.message && result.museum.status === "skipped"
            ? result.museum.message
            : result.museum.status === "failed"
            ? result.museum.message
            : result.exhibitions.status === "failed"
              ? result.exhibitions.message
              : undefined

        updateCsvImportResult(index, (current) => ({
          ...current,
          status: result.museum.status === "failed" || result.exhibitions.status === "failed" ? "failed" : "completed",
          message: rowMessage,
          museumId: result.museumId,
          wasCreated: result.wasCreated,
          detailsStatus: result.museum.status,
          exhibitionsStatus: result.exhibitions.status,
          imagesImportedCount: result.museum.imagesImportedCount,
          exhibitionsCreatedCount: result.exhibitions.createdCount,
          exhibitionsParsedCount: result.exhibitions.parsedCount,
        }))
      } catch (importError) {
        updateCsvImportResult(index, (current) => ({
          ...current,
          status: "failed",
          message: importError instanceof Error ? importError.message : t("csv.importFailed"),
        }))
      }
    }

    setCsvImportStoreState((current) => ({
      ...current,
      csvImportRunning: false,
      csvCurrentIndex: null,
      csvStopRequested: false,
    }))
    await loadMuseums()
  }

  const handleStopCsvImport = () => {
    setCsvImportStoreState((current) => ({
      ...current,
      csvStopRequested: true,
    }))
  }

  const museumList = React.useMemo(() => museums ?? [], [museums])
  const categoryOptions = React.useMemo(
    () => Array.from(new Set(museumList.map((museum) => museum.category.trim()).filter(Boolean))).sort(),
    [museumList]
  )
  const stateOptions = React.useMemo(
    () => Array.from(new Set(museumList.map((museum) => (museum.location.state ?? "").trim()).filter(Boolean))).sort(),
    [museumList]
  )
  const cityOptions = React.useMemo(
    () => Array.from(new Set(museumList.map((museum) => (museum.location.city ?? "").trim()).filter(Boolean))).sort(),
    [museumList]
  )
  const filteredMuseums = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return museumList.filter((museum) => {
      if (categoryFilter !== "all" && museum.category !== categoryFilter) return false
      if (stateFilter !== "all" && (museum.location.state ?? "").trim() !== stateFilter) return false
      if (cityFilter !== "all" && (museum.location.city ?? "").trim() !== cityFilter) return false
      if (!query) return true

      const searchableText = [
        museum.name,
        museum._id,
        museum.description ?? "",
        museum.category,
        museum.location.address ?? "",
        museum.location.city ?? "",
        museum.location.state ?? "",
        museum.website ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return searchableText.includes(query)
    })
  }, [museumList, categoryFilter, stateFilter, cityFilter, searchQuery])
  const hasActiveFilters =
    searchQuery.trim().length > 0 || categoryFilter !== "all" || stateFilter !== "all" || cityFilter !== "all"
  const csvCompletedCount = csvImportResults.filter((row) => row.status === "completed" || row.status === "failed").length
  const csvProgressTotal = csvImportResults.length || csvRows.length
  const csvProgressPercent = csvProgressTotal > 0 ? Math.round((csvCompletedCount / csvProgressTotal) * 100) : 0

  if (museums === undefined) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-muted-foreground text-center text-sm">{t("loadingMuseums")}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadMuseums} disabled={museums === undefined}>
            {t("refresh")}
          </Button>
          <Button onClick={() => setShowCreateForm((v) => !v)}>
            {showCreateForm ? tCommon("cancel") : t("addMuseum")}
          </Button>
        </div>
        </CardHeader>
        <CardContent className="space-y-4">
        {showCreateForm && (
          <form onSubmit={handleCreate} className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <p className="font-medium">{t("createMuseumLabel")}</p>
            <div className="grid gap-1">
              <Label htmlFor="create-museum-name">{t("museumName")}</Label>
              <Input
                id="create-museum-name"
                value={newMuseumName}
                onChange={(e) => setNewMuseumName(e.target.value)}
                placeholder={t("museumNamePlaceholder")}
                required
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {t("editLaterHint")}
            </p>
            <div className="flex gap-2">
              <Button type="submit" disabled={creating}>
                {creating ? t("creating") : t("createMuseum")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                {tCommon("cancel")}
              </Button>
            </div>
          </form>
        )}

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

        <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className="font-medium">{t("csv.title")}</p>
              <p className="text-muted-foreground text-sm">{t("csv.description")}</p>
              {csvFileName && (
                <p className="text-muted-foreground text-xs">
                  {t("csv.selectedFile", { fileName: csvFileName, count: csvRows.length })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={csvImportRunning}
                render={<label htmlFor="museum-csv-upload" />}
              >
                <UploadIcon className="size-4" />
                {t("csv.chooseFile")}
              </Button>
              <input
                id="museum-csv-upload"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={handleCsvFileChange}
                disabled={csvImportRunning}
              />
              {csvImportRunning ? (
                <Button type="button" variant="destructive" onClick={handleStopCsvImport} disabled={csvStopRequested}>
                  <SquareIcon className="size-4" />
                  {csvStopRequested ? t("csv.stopping") : t("csv.stop")}
                </Button>
              ) : (
                <Button type="button" onClick={() => void handleStartCsvImport()} disabled={csvRows.length === 0}>
                  {t("csv.start")}
                </Button>
              )}
            </div>
          </div>

          {(csvImportRunning || csvImportResults.length > 0) && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {csvImportRunning && csvCurrentIndex !== null
                      ? t("csv.runningRow", {
                          current: csvCurrentIndex + 1,
                          total: csvProgressTotal,
                          name: csvRows[csvCurrentIndex]?.museumName ?? "",
                        })
                      : t("csv.progress", { completed: csvCompletedCount, total: csvProgressTotal })}
                  </span>
                  <span className="font-medium">{t("csv.percent", { percent: csvProgressPercent })}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${csvProgressPercent}%` }} />
                </div>
              </div>

              <div className="max-h-72 space-y-2 overflow-auto pr-1">
                {csvImportResults.map((row) => (
                  <div key={`${row.rowNumber}-${row.museumName}`} className="rounded-lg border bg-background px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {t("csv.rowLabel", { rowNumber: row.rowNumber })} · {row.museumName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {[row.city, row.state, row.country].filter(Boolean).join(", ") || t("csv.locationUnknown")}
                        </p>
                      </div>
                      <Badge
                        variant={row.status === "failed" ? "destructive" : row.status === "completed" ? "default" : "secondary"}
                      >
                        {row.status === "running" && <Loader2Icon className="mr-1 size-3 animate-spin" />}
                        {t(`csv.status.${row.status}`)}
                      </Badge>
                    </div>
                    {(row.status === "completed" || row.status === "failed") && (
                      <p className="text-muted-foreground mt-2 text-xs">
                        {row.message ??
                          t("csv.resultSummary", {
                            museumAction: row.wasCreated ? t("csv.created") : t("csv.reused"),
                            detailsStatus: row.detailsStatus ?? "-",
                            images: row.imagesImportedCount ?? 0,
                            exhibitions: row.exhibitionsCreatedCount ?? 0,
                            parsed: row.exhibitionsParsedCount ?? 0,
                          })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1">
              <Label htmlFor="museum-search">{t("search")}</Label>
              <Input
                id="museum-search"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-category-filter">{t("category")}</Label>
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? "all")}>
                <SelectTrigger id="museum-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCategories")}</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-state-filter">{t("state")}</Label>
              <Select value={stateFilter} onValueChange={(value) => setStateFilter(value ?? "all")}>
                <SelectTrigger id="museum-state-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStates")}</SelectItem>
                  {stateOptions.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-city-filter">{t("city")}</Label>
              <Select value={cityFilter} onValueChange={(value) => setCityFilter(value ?? "all")}>
                <SelectTrigger id="museum-city-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCities")}</SelectItem>
                  {cityOptions.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm">
              {t("showing", { count: filteredMuseums.length, total: museumList.length })}
            </p>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setCategoryFilter("all")
                  setStateFilter("all")
                  setCityFilter("all")
                }}
              >
                {t("clearFilters")}
              </Button>
            )}
          </div>
        </div>

        {museumList.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noMuseumsInDb")}</p>
        ) : filteredMuseums.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noMuseumsMatch")}</p>
        ) : (
          <div className="space-y-3">
            {filteredMuseums.map((museum) => (
              <div key={museum._id} className="space-y-3 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium">
                      {museum.name} ({museum._id})
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {museum.location.city ?? t("unknownCity")}, {museum.location.state ?? t("unknownState")}
                      {museum.location.address ? ` · ${museum.location.address}` : ""}
                    </p>
                    {museum.description ? (
                      <p className="text-muted-foreground text-sm">{museum.description}</p>
                    ) : (
                      <p className="text-muted-foreground text-sm">{t("noDescription")}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{museum.category}</Badge>
                      {activeMuseumContextId === museum._id && <Badge variant="default">{t("currentContext")}</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-start gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      render={<a href={`/museums/${encodeURIComponent(museum._id)}`} target="_blank" rel="noreferrer" />}
                    >
                      {t("viewPage")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditContext(museum)}
                      disabled={deletingId === museum._id}
                    >
                      {t("edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setPendingDeleteMuseum(museum)}
                      disabled={deletingId === museum._id}
                    >
                      {deletingId === museum._id ? t("deleting") : t("delete")}
                    </Button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDeleteMuseum !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) setPendingDeleteMuseum(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteMuseumTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteMuseum
                ? t("deleteMuseumDescription", { name: pendingDeleteMuseum.name })
                : t("deleteMuseumDescriptionShort")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!pendingDeleteMuseum || Boolean(deletingId)}
              onClick={() => {
                if (!pendingDeleteMuseum) return
                handleDelete(pendingDeleteMuseum)
              }}
            >
              {deletingId ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
