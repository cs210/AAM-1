"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { useMutation, useQuery } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { AddHallForm } from "@/components/dashboard/interactions/add-hall-form"
import { HallRow } from "@/components/dashboard/interactions/hall-row"
import { formatDate, type ExhibitionRow } from "@/components/dashboard/interactions/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { sanitizeExternalUrl } from "@/lib/security"

function toDateInputValue(timestamp?: number) {
  if (!timestamp) return ""
  const date = new Date(timestamp)
  const tzOffsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 10)
}

function parseDateInput(value: string) {
  if (!value) return undefined
  const parsed = new Date(`${value}T00:00:00`).getTime()
  return Number.isFinite(parsed) ? parsed : undefined
}

export function ExhibitionCard({
  exhibition,
  showInteractions = true,
}: {
  exhibition: ExhibitionRow
  showInteractions?: boolean
}) {
  const t = useTranslations("dashboard.interactions.exhibitionCard")
  const tForm = useTranslations("dashboard.interactions.addExhibitionForm")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const [expanded, setExpanded] = React.useState(false)
  const [showAddHall, setShowAddHall] = React.useState(false)
  const [showDelete, setShowDelete] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [name, setName] = React.useState(exhibition.name)
  const [description, setDescription] = React.useState(exhibition.description ?? "")
  const [startDate, setStartDate] = React.useState(toDateInputValue(exhibition.startDate))
  const [endDate, setEndDate] = React.useState(toDateInputValue(exhibition.endDate))
  const [imageUrl, setImageUrl] = React.useState(exhibition.imageUrl ?? "")
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const halls = useQuery(
    api.exhibitions.listHallsByExhibition,
    expanded ? { exhibitionId: exhibition._id } : "skip"
  )
  const removeExhibition = useMutation(api.exhibitions.removeExhibition)
  const updateExhibition = useMutation(api.exhibitions.updateExhibition)

  React.useEffect(() => {
    if (editing) return
    setName(exhibition.name)
    setDescription(exhibition.description ?? "")
    setStartDate(toDateInputValue(exhibition.startDate))
    setEndDate(toDateInputValue(exhibition.endDate))
    setImageUrl(exhibition.imageUrl ?? "")
  }, [editing, exhibition])

  const formatDateLocal = (ts: number) => formatDate(ts, locale)
  const dateRange =
    exhibition.startDate && exhibition.endDate
      ? `${formatDateLocal(exhibition.startDate)} – ${formatDateLocal(exhibition.endDate)}`
      : exhibition.startDate
        ? t("fromDate", { date: formatDateLocal(exhibition.startDate) })
        : null

  const startDateLabel = exhibition.startDate ? formatDateLocal(exhibition.startDate) : t("notSet")
  const endDateLabel = exhibition.endDate ? formatDateLocal(exhibition.endDate) : t("notSet")
  const safeImageUrl = sanitizeExternalUrl(exhibition.imageUrl)

  const onStartEditing = () => {
    setSaveError(null)
    setEditing(true)
  }

  const onCancelEditing = () => {
    setSaveError(null)
    setEditing(false)
    setName(exhibition.name)
    setDescription(exhibition.description ?? "")
    setStartDate(toDateInputValue(exhibition.startDate))
    setEndDate(toDateInputValue(exhibition.endDate))
    setImageUrl(exhibition.imageUrl ?? "")
  }

  const onSaveEditing = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setSaveError(tForm("nameRequired"))
      return
    }

    const startTimestamp = parseDateInput(startDate)
    const endTimestamp = parseDateInput(endDate)
    if (
      startTimestamp !== undefined &&
      endTimestamp !== undefined &&
      endTimestamp < startTimestamp
    ) {
      setSaveError(t("invalidDateRange"))
      return
    }

    setSaveError(null)
    setSaving(true)
    try {
      await updateExhibition({
        id: exhibition._id,
        name: trimmedName,
        description: description.trim() || null,
        startDate: startTimestamp ?? null,
        endDate: endTimestamp ?? null,
        imageUrl: imageUrl.trim() || null,
      })
      setEditing(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t("updateFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="transition-all hover:border-primary/30">
        <CardHeader
          className="flex cursor-pointer select-none flex-row items-center gap-2"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setExpanded((prev) => !prev)
            }
          }}
        >
          <div className="flex items-center gap-1 text-muted-foreground">
            {expanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDaysIcon className="size-4 shrink-0 text-muted-foreground" />
              {exhibition.name}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {dateRange && <span>{dateRange}</span>}
              {expanded && halls !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {t("hallsCount", { count: halls.length })}
                </Badge>
              )}
            </CardDescription>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-4 pt-0">
            {editing ? (
              <div className="space-y-4 rounded-lg border border-dashed border-border/70 p-4">
                <div className="space-y-2">
                  <Label htmlFor={`exhibition-name-${exhibition._id}`}>{tForm("name")}</Label>
                  <Input
                    id={`exhibition-name-${exhibition._id}`}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={tForm("namePlaceholder")}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`exhibition-description-${exhibition._id}`}>{tForm("descriptionOptional")}</Label>
                  <Textarea
                    id={`exhibition-description-${exhibition._id}`}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={tForm("descriptionPlaceholder")}
                    rows={3}
                    disabled={saving}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`exhibition-startDate-${exhibition._id}`}>{tForm("startDateOptional")}</Label>
                    <Input
                      id={`exhibition-startDate-${exhibition._id}`}
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`exhibition-endDate-${exhibition._id}`}>{tForm("endDateOptional")}</Label>
                    <Input
                      id={`exhibition-endDate-${exhibition._id}`}
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`exhibition-imageUrl-${exhibition._id}`}>{tForm("imageUrlOptional")}</Label>
                  <Input
                    id={`exhibition-imageUrl-${exhibition._id}`}
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder={tForm("imageUrlPlaceholder")}
                    disabled={saving}
                  />
                </div>
                {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => void onSaveEditing()} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                        {t("savingChanges")}
                      </>
                    ) : (
                      t("saveChanges")
                    )}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={onCancelEditing} disabled={saving}>
                    {tCommon("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-4 text-sm">
                  <p>
                    <span className="text-muted-foreground">{tForm("name")}: </span>
                    {exhibition.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{tForm("descriptionOptional")}: </span>
                    {exhibition.description?.trim() || t("notSet")}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{tForm("startDateOptional")}: </span>
                    {startDateLabel}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{tForm("endDateOptional")}: </span>
                    {endDateLabel}
                  </p>
                  <p className="break-all">
                    <span className="text-muted-foreground">{tForm("imageUrlOptional")}: </span>
                    {safeImageUrl ? (
                      <a
                        href={safeImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {safeImageUrl}
                      </a>
                    ) : (
                      t("notSet")
                    )}
                  </p>
                  {safeImageUrl && (
                    <div className="overflow-hidden rounded-md border border-border/70 bg-background">
                      <img
                        src={safeImageUrl}
                        alt={t("imageAlt", { name: exhibition.name })}
                        className="h-48 w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                {showAddHall ? (
                  <AddHallForm
                    exhibitionId={exhibition._id}
                    sortOrder={halls?.length ?? 0}
                    onDone={() => setShowAddHall(false)}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAddHall(true)
                    }}
                  >
                    <PlusIcon className="size-4" />
                    {t("addHall")}
                  </Button>
                )}

                {halls?.map((hall) => (
                  <HallRow key={hall._id} hall={hall} showInteractions={showInteractions} />
                ))}
              </>
            )}

            <div className="flex justify-end">
              {!editing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartEditing()
                  }}
                >
                  <PencilIcon className="mr-1 size-3.5" />
                  {t("edit")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  if (editing) return
                  setShowDelete(true)
                }}
                disabled={editing}
              >
                <Trash2Icon className="mr-1 size-3.5" />
                {t("removeExhibition")}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeExhibitionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeExhibitionDescription", { name: exhibition.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await removeExhibition({ id: exhibition._id })
                setShowDelete(false)
              }}
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
