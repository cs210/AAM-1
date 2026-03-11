"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useMutation } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function AddHallForm({
  exhibitionId,
  sortOrder,
  onDone,
}: {
  exhibitionId: Id<"exhibitions">
  sortOrder: number
  onDone: () => void
}) {
  const t = useTranslations("dashboard.interactions.addHallForm")
  const tCommon = useTranslations("common")
  const createHall = useMutation(api.exhibitions.createHall)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const n = name.trim()
    if (!n) {
      setError(t("nameRequired"))
      return
    }
    setSaving(true)
    try {
      await createHall({
        exhibitionId,
        name: n,
        description: description.trim() || undefined,
        sortOrder,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-sm">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hall-name">{t("name")}</Label>
            <Input
              id="hall-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hall-desc">{t("descriptionOptional")}</Label>
            <Textarea
              id="hall-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? t("creating") : t("create")}
            </Button>
            <Button type="button" variant="outline" onClick={onDone}>
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
