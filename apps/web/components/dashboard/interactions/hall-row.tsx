"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { HelpCircleIcon, MapPinIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { InteractionConfigForm } from "@/components/dashboard/interactions/interaction-config-form"
import {
  getDefaultConfig,
  INTERACTION_TYPES,
  type HallData,
  type InteractionType,
} from "@/components/dashboard/interactions/types"

export function HallRow({ hall }: { hall: HallData }) {
  const interactions = useQuery(api.exhibitions.listInteractionsByHall, { hallId: hall._id })
  const createInteraction = useMutation(api.exhibitions.createExhibitInteraction)
  const removeInteraction = useMutation(api.exhibitions.removeExhibitInteraction)

  const [showTypePicker, setShowTypePicker] = React.useState(false)
  const [selectedType, setSelectedType] = React.useState<InteractionType | null>(null)
  const [deleteId, setDeleteId] = React.useState<Id<"exhibitInteractions"> | null>(null)

  const handleSaveInteraction = async (title: string, config: Record<string, unknown>) => {
    if (!selectedType) return
    await createInteraction({
      hallId: hall._id,
      type: selectedType,
      title,
      config,
      sortOrder: interactions?.length ?? 0,
    })
    setSelectedType(null)
    setShowTypePicker(false)
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <MapPinIcon className="size-4 text-muted-foreground" />
        <span className="font-medium">{hall.name}</span>
        {hall.description && <span className="text-sm text-muted-foreground">- {hall.description}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {interactions === undefined ? (
          <span className="text-sm text-muted-foreground">Loading...</span>
        ) : (
          interactions.map((ia) => {
            const meta = INTERACTION_TYPES.find((m) => m.type === ia.type)
            const Icon = meta?.icon ?? HelpCircleIcon
            return (
              <div
                key={ia._id}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
              >
                <Icon className="size-3.5 text-muted-foreground" />
                <span>{ia.title}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {meta?.label ?? ia.type}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteId(ia._id)}
                >
                  <Trash2Icon className="size-3" />
                </Button>
              </div>
            )
          })
        )}
      </div>

      {!showTypePicker && !selectedType && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowTypePicker(true)}
        >
          <PlusIcon className="size-4" />
          Attach interaction
        </Button>
      )}

      {showTypePicker && !selectedType && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Choose interaction type</CardTitle>
            <CardDescription>Pick one to add to this hall.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {INTERACTION_TYPES.map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  variant="outline"
                  className="h-auto whitespace-normal py-3 text-center leading-tight flex flex-col gap-1.5"
                  onClick={() => {
                    setSelectedType(type)
                    setShowTypePicker(false)
                  }}
                >
                  <Icon className="size-5 text-muted-foreground" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowTypePicker(false)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedType && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-sm">
              New {INTERACTION_TYPES.find((m) => m.type === selectedType)?.label ?? selectedType}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InteractionConfigForm
              type={selectedType}
              initialTitle=""
              initialConfig={getDefaultConfig(selectedType)}
              onSave={handleSaveInteraction}
              onCancel={() => setSelectedType(null)}
            />
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove interaction</AlertDialogTitle>
            <AlertDialogDescription>
              This interaction will be removed from this hall. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteId) return
                await removeInteraction({ id: deleteId })
                setDeleteId(null)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
