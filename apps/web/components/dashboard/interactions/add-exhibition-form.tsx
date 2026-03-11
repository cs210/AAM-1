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

export function AddExhibitionForm({
  museumId,
  sortOrder,
  onDone,
}: {
  museumId: Id<"museums">
  sortOrder: number
  onDone: () => void
}) {
  const t = useTranslations("dashboard.interactions.addExhibitionForm")
  const tCommon = useTranslations("common")
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
      setError(t("nameRequired"))
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
            <Label htmlFor="ex-name">{t("name")}</Label>
            <Input
              id="ex-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-desc">{t("descriptionOptional")}</Label>
            <Textarea
              id="ex-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ex-start">{t("startDateOptional")}</Label>
              <Input
                id="ex-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-end">{t("endDateOptional")}</Label>
              <Input
                id="ex-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-image">{t("imageUrlOptional")}</Label>
            <Input
              id="ex-image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={t("imageUrlPlaceholder")}
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
