"use client"

import * as React from "react"
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
      setError(e instanceof Error ? e.message : "Failed to load museums")
    }
  }, [listMuseums])

  React.useEffect(() => {
    loadMuseums()
  }, [loadMuseums])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const name = newMuseumName.trim()
    if (!name) {
      setError("Museum name is required.")
      return
    }

    setCreating(true)
    try {
      await createMuseum({ name })
      setNewMuseumName("")
      setShowCreateForm(false)
      setSuccess("Museum created.")
      await loadMuseums()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create museum")
    } finally {
      setCreating(false)
    }
  }

  const handleEditContext = (museum: MuseumRow) => {
    onEditMuseumContext?.(museum._id)
    setError(null)
    setSuccess(`Museum context switched to ${museum.name}.`)
  }

  const handleDelete = async (museum: MuseumRow) => {
    setDeletingId(museum._id)
    setError(null)
    setSuccess(null)
    try {
      await deleteMuseum({ museumId: museum._id })
      setSuccess("Museum deleted.")
      await loadMuseums()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete museum")
    } finally {
      setDeletingId(null)
      setPendingDeleteMuseum(null)
    }
  }

  const museumList = museums ?? []
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
          <div className="text-muted-foreground text-center text-sm">Loading museums…</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Museums</CardTitle>
          <CardDescription>Admin-only create, delete, and museum-context selection.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadMuseums} disabled={museums === undefined}>
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm((v) => !v)}>
            {showCreateForm ? "Cancel" : "Add museum"}
          </Button>
        </div>
        </CardHeader>
        <CardContent className="space-y-4">
        {showCreateForm && (
          <form onSubmit={handleCreate} className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <p className="font-medium">Create museum</p>
            <div className="grid gap-1">
              <Label htmlFor="create-museum-name">Museum name</Label>
              <Input
                id="create-museum-name"
                value={newMuseumName}
                onChange={(e) => setNewMuseumName(e.target.value)}
                placeholder="New museum name"
                required
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Additional details can be edited later in the Museum Details tab.
            </p>
            <div className="flex gap-2">
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create museum"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
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
              <Label htmlFor="museum-search">Search</Label>
              <Input
                id="museum-search"
                placeholder="Name, id, city, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-category-filter">Category</Label>
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? "all")}>
                <SelectTrigger id="museum-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-state-filter">State</Label>
              <Select value={stateFilter} onValueChange={(value) => setStateFilter(value ?? "all")}>
                <SelectTrigger id="museum-state-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {stateOptions.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="museum-city-filter">City</Label>
              <Select value={cityFilter} onValueChange={(value) => setCityFilter(value ?? "all")}>
                <SelectTrigger id="museum-city-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
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
              Showing {filteredMuseums.length} of {museumList.length} museums
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
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {museumList.length === 0 ? (
          <p className="text-muted-foreground text-sm">No museums in database yet.</p>
        ) : filteredMuseums.length === 0 ? (
          <p className="text-muted-foreground text-sm">No museums match current search and filters.</p>
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
                      {museum.location.city ?? "Unknown city"}, {museum.location.state ?? "Unknown state"}
                      {museum.location.address ? ` · ${museum.location.address}` : ""}
                    </p>
                    {museum.description ? (
                      <p className="text-muted-foreground text-sm">{museum.description}</p>
                    ) : (
                      <p className="text-muted-foreground text-sm">No description</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{museum.category}</Badge>
                      {activeMuseumContextId === museum._id && <Badge variant="default">Current context</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-start gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      render={<a href={`/museums/${encodeURIComponent(museum._id)}`} target="_blank" rel="noreferrer" />}
                    >
                      View page
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditContext(museum)}
                      disabled={deletingId === museum._id}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setPendingDeleteMuseum(museum)}
                      disabled={deletingId === museum._id}
                    >
                      {deletingId === museum._id ? "Deleting…" : "Delete"}
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
            <AlertDialogTitle>Delete museum?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteMuseum
                ? `This will permanently delete "${pendingDeleteMuseum.name}" and related records. This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!pendingDeleteMuseum || Boolean(deletingId)}
              onClick={() => {
                if (!pendingDeleteMuseum) return
                handleDelete(pendingDeleteMuseum)
              }}
            >
              {deletingId ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
