"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useAction, useQuery } from "convex/react"
import { Loader2Icon, PlusIcon, SparklesIcon } from "lucide-react"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { api } from "@packages/backend/convex/_generated/api"
import { useDashboardMuseumId } from "@/components/dashboard/dashboard-museum-context"
import { AddExhibitionForm } from "@/components/dashboard/interactions/add-exhibition-form"
import { ExhibitionCard } from "@/components/dashboard/interactions/exhibition-card"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ExhibitionAutoFillResult = {
  sourceUrl: string
  createdCount: number
  skippedCount: number
  parsedCount: number
}

export function DashboardExhibitions() {
  const t = useTranslations("dashboard.exhibitions")
  const tCommon = useTranslations("common")
  const museumId = useDashboardMuseumId()
  const exhibitions = useQuery(
    api.exhibitions.listExhibitionsByMuseum,
    museumId ? { museumId: museumId as Id<"museums"> } : "skip"
  )
  const prefillExhibitions = useAction(api.exhibitionsAutoFill.prefillExhibitionsWithFirecrawl)
  const [showAddExhibition, setShowAddExhibition] = React.useState(false)
  const [autoFillDialogOpen, setAutoFillDialogOpen] = React.useState(false)
  const [exhibitionsPageUrl, setExhibitionsPageUrl] = React.useState("")
  const [autoFilling, setAutoFilling] = React.useState(false)
  const [autoFillMessage, setAutoFillMessage] = React.useState<string | null>(null)
  const [autoFillError, setAutoFillError] = React.useState<string | null>(null)

  const handleAutoFill = async () => {
    if (!museumId) return
    const pageUrl = exhibitionsPageUrl.trim()
    if (!pageUrl) {
      setAutoFillError(t("autoFill.urlRequired"))
      return
    }

    setAutoFillError(null)
    setAutoFillMessage(null)
    setAutoFilling(true)
    try {
      const result = (await prefillExhibitions({
        museumId: museumId as Id<"museums">,
        exhibitionsPageUrl: pageUrl,
      })) as ExhibitionAutoFillResult

      if (result.createdCount <= 0) {
        setAutoFillError(result.parsedCount > 0 ? t("autoFill.noNewResults") : t("autoFill.noResults"))
        return
      }

      setAutoFillMessage(t("autoFill.success", { count: result.createdCount }))
      setAutoFillDialogOpen(false)
      setExhibitionsPageUrl("")
    } catch (error) {
      setAutoFillError(error instanceof Error ? error.message : t("autoFill.failed"))
    } finally {
      setAutoFilling(false)
    }
  }

  if (!museumId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("selectMuseumDescription")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showAddExhibition ? (
            <AddExhibitionForm
              museumId={museumId as Id<"museums">}
              sortOrder={exhibitions?.length ?? 0}
              onDone={() => setShowAddExhibition(false)}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setAutoFillError(null)
                  setAutoFillMessage(null)
                  setShowAddExhibition(true)
                }}
              >
                <PlusIcon className="size-4" />
                {t("addExhibition")}
              </Button>
              <div className="rounded-[14px] bg-[linear-gradient(120deg,#f97316,#eab308,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899)] p-[1.5px]">
                <Button
                  variant="secondary"
                  className="gap-1.5 rounded-[12.5px] border-0 bg-background/95 hover:bg-background dark:bg-background dark:hover:bg-background/90"
                  onClick={() => {
                    setAutoFillError(null)
                    setAutoFillMessage(null)
                    setAutoFillDialogOpen(true)
                  }}
                  disabled={autoFilling}
                >
                  <SparklesIcon className="size-4" />
                  {t("autoFill.button")}
                  {autoFilling && <Loader2Icon className="size-4 animate-spin" />}
                </Button>
              </div>
            </div>
          )}
          {autoFillError && (
            <p className="text-sm text-destructive">{autoFillError}</p>
          )}
          {autoFillMessage && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{autoFillMessage}</p>
          )}
          {exhibitions === undefined ? (
            <p className="text-muted-foreground text-sm">{t("loadingExhibitions")}</p>
          ) : exhibitions.length === 0 && !showAddExhibition ? (
            <p className="text-muted-foreground text-sm">{t("noExhibitions")}</p>
          ) : (
            <div className="space-y-3">
              {exhibitions.map((ex) => (
                <ExhibitionCard key={ex._id} exhibition={ex} showInteractions={false} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={autoFillDialogOpen} onOpenChange={(open) => !autoFilling && setAutoFillDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("autoFill.dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("autoFill.dialogDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-1">
            <Label htmlFor="exhibitions-autofill-url">{t("autoFill.urlLabel")}</Label>
            <Input
              id="exhibitions-autofill-url"
              value={exhibitionsPageUrl}
              onChange={(event) => setExhibitionsPageUrl(event.target.value)}
              placeholder={t("autoFill.urlPlaceholder")}
              disabled={autoFilling}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={autoFilling}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={autoFilling} onClick={() => void handleAutoFill()}>
              {autoFilling ? t("autoFill.running") : t("autoFill.run")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
