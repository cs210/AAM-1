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
    path: "details",
    label: "Museum Details",
    icon: Building2Icon,
  },
  {
    id: "organizations",
    path: "organizations",
    label: "Organizations",
    icon: LayersIcon,
  },
  {
    id: "exhibitions",
    path: "exhibitions",
    label: "Exhibitions",
    icon: CalendarDaysIcon,
  },
  {
    id: "interactions",
    path: "interactions",
    label: "Interactions",
    icon: TicketIcon,
  },
  {
    id: "analytics",
    path: "analytics",
    label: "Analytics",
    icon: ChartSplineIcon,
  },
] as const

/** Path segment -> dashboard tab id for URL routing */
export const dashboardPathToTabId: Record<string, DashboardTabId> = Object.fromEntries(
  dashboardTabs.map((t) => [t.path, t.id])
) as Record<string, DashboardTabId>

export const adminDashboardTabs = [
  { id: "org-requests", path: "org-requests", label: "Org requests", icon: ShieldCheckIcon },
  { id: "users", path: "users", label: "Users", icon: UsersIcon },
  { id: "invitations", path: "invitations", label: "Invitations", icon: MailIcon },
] as const

/** Admin path segment -> admin tab id for URL routing (/dashboard/admin/...) */
export const adminPathToTabId: Record<string, AdminDashboardTabId> = Object.fromEntries(
  adminDashboardTabs.map((t) => [t.path, t.id])
) as Record<string, AdminDashboardTabId>

export type DashboardTabId = (typeof dashboardTabs)[number]["id"]
export type AdminDashboardTabId = (typeof adminDashboardTabs)[number]["id"]
export type AllDashboardTabId = DashboardTabId | AdminDashboardTabId
