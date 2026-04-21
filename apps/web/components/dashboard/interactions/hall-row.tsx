"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
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

export function HallRow({
  hall,
  showInteractions = true,
}: {
  hall: HallData
  showInteractions?: boolean
}) {
  const t = useTranslations("dashboard.interactions.hallRow")
  const tTypes = useTranslations("dashboard.interactions.interactionTypes")
  const tCommon = useTranslations("common")
  const interactions = useQuery(
    api.exhibitions.listInteractionsByHall,
    showInteractions ? { hallId: hall._id } : "skip"
  )
  const createInteraction = useMutation(api.exhibitions.createExhibitInteraction)
  const removeInteraction = useMutation(api.exhibitions.removeExhibitInteraction)
  const removeHall = useMutation(api.exhibitions.removeHall)

  const [showTypePicker, setShowTypePicker] = React.useState(false)
  const [selectedType, setSelectedType] = React.useState<InteractionType | null>(null)
  const [deleteId, setDeleteId] = React.useState<Id<"exhibitInteractions"> | null>(null)
  const [removeHallOpen, setRemoveHallOpen] = React.useState(false)

  const handleSaveInteraction = async (title: string, config: Record<string, unknown>) => {
    if (!selectedType) return
    await createInteraction({
      hallId: hall._id,
      type: selectedType,
      title,
      config: config as any,
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
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setRemoveHallOpen(true)}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      {showInteractions ? (
        <>
          <div className="flex flex-wrap gap-2">
            {interactions === undefined ? (
              <span className="text-sm text-muted-foreground">{t("loading")}</span>
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
                      {tTypes(ia.type)}
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
              {t("attachInteraction")}
            </Button>
          )}

          {showTypePicker && !selectedType && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-sm">{t("chooseTypeTitle")}</CardTitle>
                <CardDescription>{t("chooseTypeDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {INTERACTION_TYPES.map(({ type, icon: Icon }) => (
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
                      <span className="text-xs">{tTypes(type)}</span>
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowTypePicker(false)}>
                  {tCommon("cancel")}
                </Button>
              </CardContent>
            </Card>
          )}

          {selectedType && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("newType", { type: tTypes(selectedType) })}
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
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("interactionsConfigureInTab")}</p>
      )}

      <AlertDialog open={removeHallOpen} onOpenChange={setRemoveHallOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeHallTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeHallDescription", { name: hall.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await removeHall({ id: hall._id })
                setRemoveHallOpen(false)
              }}
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeInteractionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeInteractionDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteId) return
                await removeInteraction({ id: deleteId })
                setDeleteId(null)
              }}
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
