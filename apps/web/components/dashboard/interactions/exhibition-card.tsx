"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { useMutation, useQuery } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import { CalendarDaysIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon, Trash2Icon } from "lucide-react"
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

export function ExhibitionCard({
  exhibition,
  showInteractions = true,
}: {
  exhibition: ExhibitionRow
  showInteractions?: boolean
}) {
  const t = useTranslations("dashboard.interactions.exhibitionCard")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const [expanded, setExpanded] = React.useState(false)
  const [showAddHall, setShowAddHall] = React.useState(false)
  const [showDelete, setShowDelete] = React.useState(false)

  const halls = useQuery(
    api.exhibitions.listHallsByExhibition,
    expanded ? { exhibitionId: exhibition._id } : "skip"
  )
  const removeExhibition = useMutation(api.exhibitions.removeExhibition)

  const formatDateLocal = (ts: number) => formatDate(ts, locale)
  const dateRange =
    exhibition.startDate && exhibition.endDate
      ? `${formatDateLocal(exhibition.startDate)} – ${formatDateLocal(exhibition.endDate)}`
      : exhibition.startDate
        ? t("fromDate", { date: formatDateLocal(exhibition.startDate) })
        : null

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
            {exhibition.description && (
              <p className="text-sm text-muted-foreground">{exhibition.description}</p>
            )}

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

            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDelete(true)
                }}
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
