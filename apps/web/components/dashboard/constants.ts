import {
  Building2Icon,
  CalendarDaysIcon,
  ChartSplineIcon,
  TicketIcon,
  ShieldCheckIcon,
  UsersIcon,
  MailIcon,
  LayersIcon,
} from "lucide-react"

export const dashboardTabs = [
  {
    id: "museum-details",
    label: "Museum Details",
    icon: Building2Icon,
  },
  {
    id: "organizations",
    label: "Organizations",
    icon: LayersIcon,
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

export const adminDashboardTabs = [
  { id: "org-requests", label: "Org requests", icon: ShieldCheckIcon },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "invitations", label: "Invitations", icon: MailIcon },
  { id: "admin-museums", label: "Museums", icon: Building2Icon },
] as const

export type DashboardTabId = (typeof dashboardTabs)[number]["id"]
export type AdminDashboardTabId = (typeof adminDashboardTabs)[number]["id"]
export type AllDashboardTabId = DashboardTabId | AdminDashboardTabId
