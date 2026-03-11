"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useAction, useMutation } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
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

export function AdminMuseums({ activeMuseumContextId, onEditMuseumContext }: AdminMuseumsProps) {
  const t = useTranslations("dashboard.adminMuseums")
  const tCommon = useTranslations("common")
  const listMuseums = useAction(api.admin.listMuseumsForAdmin)
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
