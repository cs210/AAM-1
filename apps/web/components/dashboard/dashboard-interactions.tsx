"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { PlusIcon } from "lucide-react"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { api } from "@packages/backend/convex/_generated/api"
import { useDashboardMuseumId } from "@/components/dashboard/dashboard-museum-context"
import { AddExhibitionForm } from "@/components/dashboard/interactions/add-exhibition-form"
import { ExhibitionCard } from "@/components/dashboard/interactions/exhibition-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardInteractions() {
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
          <CardTitle>Interactions</CardTitle>
          <CardDescription>Select a museum context to manage exhibitions and attach interactions.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Interactions</CardTitle>
          <CardDescription>
            Manage exhibitions and halls, then attach interactions (quizzes, scavenger steps, badges, info/audio) to each hall.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showAddExhibition ? (
            <AddExhibitionForm
              museumId={museumId as Id<"museums">}
              sortOrder={exhibitions?.length ?? 0}
              onDone={() => setShowAddExhibition(false)}
            />
          ) : (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setShowAddExhibition(true)}
            >
              <PlusIcon className="size-4" />
              Add exhibition
            </Button>
          )}
          {exhibitions === undefined ? (
            <p className="text-muted-foreground text-sm">Loading exhibitions...</p>
          ) : exhibitions.length === 0 && !showAddExhibition ? (
            <p className="text-muted-foreground text-sm">
              No exhibitions yet. Add one to create halls and attach interactions.
            </p>
          ) : (
            <div className="space-y-3">
              {exhibitions.map((ex) => (
                <ExhibitionCard key={ex._id} exhibition={ex} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
