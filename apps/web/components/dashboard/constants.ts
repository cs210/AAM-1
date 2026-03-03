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

export const workspaceDashboardTabs = [
  {
    id: "organizations",
    label: "Organizations",
    icon: LayersIcon,
  },
] as const

export const adminDashboardTabs = [
  { id: "org-requests", label: "Organizations", icon: ShieldCheckIcon },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "invitations", label: "Invitations", icon: MailIcon },
  { id: "admin-museums", label: "Museums", icon: Building2Icon },
] as const

export type MuseumDashboardTabId = (typeof dashboardTabs)[number]["id"]
export type WorkspaceDashboardTabId = (typeof workspaceDashboardTabs)[number]["id"]
export type DashboardTabId = MuseumDashboardTabId | WorkspaceDashboardTabId
export type AdminDashboardTabId = (typeof adminDashboardTabs)[number]["id"]
export type AllDashboardTabId = DashboardTabId | AdminDashboardTabId
