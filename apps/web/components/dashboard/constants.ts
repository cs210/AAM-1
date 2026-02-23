import {
  Building2Icon,
  CalendarDaysIcon,
  ChartSplineIcon,
  TicketIcon,
} from "lucide-react"

export const dashboardTabs = [
  {
    id: "museum-details",
    label: "Museum Details",
    icon: Building2Icon,
  },
  {
    id: "exhibitions",
    label: "Exhibitions",
    icon: CalendarDaysIcon,
  },
  {
    id: "interactions",
    label: "Interactions",
    icon: TicketIcon,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: ChartSplineIcon,
  },
] as const

export type DashboardTabId = (typeof dashboardTabs)[number]["id"]
