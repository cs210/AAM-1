"use client"

import * as React from "react"
import { useAction, useMutation } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

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

type MuseumFormState = {
  name: string
  description: string
  category: string
  address: string
  city: string
  state: string
  imageUrl: string
  website: string
  phone: string
  latitude: string
  longitude: string
}

type MuseumPayload = {
  point: { latitude: number; longitude: number }
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
}

const EMPTY_FORM: MuseumFormState = {
  name: "",
  description: "",
  category: "art",
  address: "",
  city: "",
  state: "",
  imageUrl: "",
  website: "",
  phone: "",
  latitude: "",
  longitude: "",
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function toFormState(museum: MuseumRow): MuseumFormState {
  return {
    name: museum.name ?? "",
    description: museum.description ?? "",
    category: museum.category ?? "",
    address: museum.location.address ?? "",
    city: museum.location.city ?? "",
    state: museum.location.state ?? "",
    imageUrl: museum.imageUrl ?? "",
    website: museum.website ?? "",
    phone: museum.phone ?? "",
    latitude: museum.point?.latitude?.toString() ?? "",
    longitude: museum.point?.longitude?.toString() ?? "",
  }
}

function parseMuseumForm(form: MuseumFormState): { payload?: MuseumPayload; error?: string } {
  const name = form.name.trim()
  const category = form.category.trim()
  const city = form.city.trim()
  const state = form.state.trim()
  const latitude = Number(form.latitude.trim())
  const longitude = Number(form.longitude.trim())

  if (!name) return { error: "Museum name is required." }
  if (!category) return { error: "Category is required." }
  if (!city || !state) return { error: "City and state are required." }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { error: "Latitude must be a number between -90 and 90." }
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { error: "Longitude must be a number between -180 and 180." }
  }

  return {
    payload: {
      point: { latitude, longitude },
      name,
      description: optionalText(form.description),
      category,
      location: {
        address: optionalText(form.address),
        city,
        state,
      },
      imageUrl: optionalText(form.imageUrl),
      website: optionalText(form.website),
      phone: optionalText(form.phone),
    },
  }
}

function MuseumFormFields({
  form,
  onChange,
  idPrefix,
}: {
  form: MuseumFormState
  onChange: (next: MuseumFormState) => void
  idPrefix: string
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-name`}>Name</Label>
          <Input
            id={`${idPrefix}-name`}
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-category`}>Category</Label>
          <Input
            id={`${idPrefix}-category`}
            value={form.category}
            onChange={(e) => onChange({ ...form, category: e.target.value })}
            placeholder="art, history, science"
            required
          />
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-address`}>Address</Label>
          <Input
            id={`${idPrefix}-address`}
            value={form.address}
            onChange={(e) => onChange({ ...form, address: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-city`}>City</Label>
          <Input
            id={`${idPrefix}-city`}
            value={form.city}
            onChange={(e) => onChange({ ...form, city: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-state`}>State</Label>
          <Input
            id={`${idPrefix}-state`}
            value={form.state}
            onChange={(e) => onChange({ ...form, state: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-latitude`}>Latitude</Label>
          <Input
            id={`${idPrefix}-latitude`}
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => onChange({ ...form, latitude: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-longitude`}>Longitude</Label>
          <Input
            id={`${idPrefix}-longitude`}
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => onChange({ ...form, longitude: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-image-url`}>Image URL</Label>
          <Input
            id={`${idPrefix}-image-url`}
            value={form.imageUrl}
            onChange={(e) => onChange({ ...form, imageUrl: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-website`}>Website</Label>
          <Input
            id={`${idPrefix}-website`}
            value={form.website}
            onChange={(e) => onChange({ ...form, website: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
          <Input
            id={`${idPrefix}-phone`}
            value={form.phone}
            onChange={(e) => onChange({ ...form, phone: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}

export function AdminMuseums() {
  const listMuseums = useAction(api.admin.listMuseumsForAdmin)
  const createMuseum = useMutation(api.admin.createMuseumForAdmin)
  const updateMuseum = useMutation(api.admin.updateMuseumForAdmin)
  const deleteMuseum = useMutation(api.admin.deleteMuseumForAdmin)

  const [museums, setMuseums] = React.useState<MuseumRow[] | null | undefined>(undefined)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = React.useState(false)
  const [createForm, setCreateForm] = React.useState<MuseumFormState>({
    ...EMPTY_FORM,
    latitude: "42.3601",
    longitude: "-71.0589",
  })
  const [editForm, setEditForm] = React.useState<MuseumFormState>(EMPTY_FORM)
  const [creating, setCreating] = React.useState(false)
  const [savingId, setSavingId] = React.useState<Id<"museums"> | null>(null)
  const [deletingId, setDeletingId] = React.useState<Id<"museums"> | null>(null)
  const [editingId, setEditingId] = React.useState<Id<"museums"> | null>(null)
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

    const parsed = parseMuseumForm(createForm)
    if (!parsed.payload) {
      setError(parsed.error ?? "Invalid museum input")
      return
    }

    setCreating(true)
    try {
      await createMuseum(parsed.payload)
      setCreateForm({ ...EMPTY_FORM, latitude: createForm.latitude, longitude: createForm.longitude })
      setShowCreateForm(false)
      setSuccess("Museum created.")
      await loadMuseums()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create museum")
    } finally {
      setCreating(false)
    }
  }

  const handleStartEdit = (museum: MuseumRow) => {
    setEditingId(museum._id)
    setEditForm(toFormState(museum))
    setError(null)
    setSuccess(null)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setError(null)
    setSuccess(null)

    const parsed = parseMuseumForm(editForm)
    if (!parsed.payload) {
      setError(parsed.error ?? "Invalid museum input")
      return
    }

    setSavingId(editingId)
    try {
      await updateMuseum({
        museumId: editingId,
        ...parsed.payload,
      })
      setEditingId(null)
      setSuccess("Museum updated.")
      await loadMuseums()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update museum")
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (museum: MuseumRow) => {
    if (!window.confirm(`Permanently delete "${museum.name}" and related records?`)) return

    setDeletingId(museum._id)
    setError(null)
    setSuccess(null)
    try {
      await deleteMuseum({ museumId: museum._id })
      if (editingId === museum._id) {
        setEditingId(null)
      }
      setSuccess("Museum deleted.")
      await loadMuseums()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete museum")
    } finally {
      setDeletingId(null)
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Museums</CardTitle>
          <CardDescription>Admin-only create, edit, and delete access for all museums.</CardDescription>
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
            <MuseumFormFields form={createForm} onChange={setCreateForm} idPrefix="create-museum" />
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
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
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
                      {museum.point ? (
                        <Badge variant="outline">
                          {museum.point.latitude.toFixed(4)}, {museum.point.longitude.toFixed(4)}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">No coordinates</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
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
                      onClick={() => handleStartEdit(museum)}
                      disabled={deletingId === museum._id || savingId === museum._id}
                    >
                      Edit description
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(museum)}
                      disabled={deletingId === museum._id}
                    >
                      {deletingId === museum._id ? "Deleting…" : "Delete"}
                    </Button>
                  </div>
                </div>

                {editingId === museum._id && (
                  <form onSubmit={handleUpdate} className="space-y-4 rounded-xl border bg-background/70 p-4">
                    <p className="font-medium">Edit museum</p>
                    <MuseumFormFields form={editForm} onChange={setEditForm} idPrefix={`edit-${museum._id}`} />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={savingId === museum._id}>
                        {savingId === museum._id ? "Saving…" : "Save changes"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
