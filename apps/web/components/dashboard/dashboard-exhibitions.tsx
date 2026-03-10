"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { PlusIcon } from "lucide-react"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { api } from "@packages/backend/convex/_generated/api"
import { useDashboardMuseumId } from "@/components/dashboard/dashboard-museum-context"
import { AddExhibitionForm } from "@/components/dashboard/interactions/add-exhibition-form"
import { ExhibitionCard } from "@/components/dashboard/interactions/exhibition-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardExhibitions() {
  const t = useTranslations("dashboard.exhibitions")
  const museumId = useDashboardMuseumId()
  const exhibitions = useQuery(
    api.exhibitions.listExhibitionsByMuseum,
    museumId ? { museumId: museumId as Id<"museums"> } : "skip"
  )
  const [showAddExhibition, setShowAddExhibition] = React.useState(false)

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
            <Button variant="outline" className="gap-1.5" onClick={() => setShowAddExhibition(true)}>
              <PlusIcon className="size-4" />
              {t("addExhibition")}
            </Button>
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
    </div>
  )
}
