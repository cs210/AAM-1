import type { ElementType } from "react"
import { AwardIcon, HeadphonesIcon, HelpCircleIcon, MapIcon } from "lucide-react"
import type { Doc } from "@packages/backend/convex/_generated/dataModel"

export type InteractionType = "quiz" | "scavenger_step" | "badge" | "info_audio"

export type ExhibitionRow = Doc<"exhibitions">
export type HallData = Doc<"halls">
export type ExhibitInteractionRow = Doc<"exhibitInteractions">

export const INTERACTION_TYPES: {
  type: InteractionType
  label: string
  icon: ElementType
}[] = [
  { type: "quiz", label: "Quiz", icon: HelpCircleIcon },
  { type: "scavenger_step", label: "Scavenger step", icon: MapIcon },
  { type: "badge", label: "Badge", icon: AwardIcon },
  { type: "info_audio", label: "Info / Audio", icon: HeadphonesIcon },
]

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function getDefaultConfig(type: InteractionType): Record<string, unknown> {
  switch (type) {
    case "quiz":
      return { question: "", options: [], correctIndex: 0 }
    case "scavenger_step":
      return { clue: "", answer: "" }
    case "badge":
      return { badgeName: "", criteria: "" }
    case "info_audio":
      return { script: "", audioUrl: "" }
    default:
      return {}
  }
}
