"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function AddExhibitionForm({
  museumId,
  sortOrder,
  onDone,
}: {
  museumId: Id<"museums">
  sortOrder: number
  onDone: () => void
}) {
  const createExhibition = useMutation(api.exhibitions.createExhibition)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [imageUrl, setImageUrl] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const n = name.trim()
    if (!n) {
      setError("Name is required.")
      return
    }
    setSaving(true)
    try {
      await createExhibition({
        museumId,
        name: n,
        description: description.trim() || undefined,
        startDate: startDate ? new Date(startDate).getTime() : undefined,
        endDate: endDate ? new Date(endDate).getTime() : undefined,
        imageUrl: imageUrl.trim() || undefined,
        sortOrder,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create exhibition.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-sm">New exhibition</CardTitle>
        <CardDescription>Add an exhibition to attach halls and interactions to.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ex-name">Name</Label>
            <Input
              id="ex-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Modern Art 2025"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-desc">Description (optional)</Label>
            <Textarea
              id="ex-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ex-start">Start date (optional)</Label>
              <Input
                id="ex-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-end">End date (optional)</Label>
              <Input
                id="ex-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-image">Image URL (optional)</Label>
            <Input
              id="ex-image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create exhibition"}
            </Button>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
