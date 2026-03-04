import { redirect } from "next/navigation"
import { AdminInvitations } from "@/components/dashboard/admin-invitations"
import { AdminOrgRequests } from "@/components/dashboard/admin-org-requests"
import { AdminUsers } from "@/components/dashboard/admin-users"
import { dashboardPathToTabId } from "@/components/dashboard/constants"
import { DashboardExhibitions } from "@/components/dashboard/dashboard-exhibitions"
import { DashboardInteractions } from "@/components/dashboard/dashboard-interactions"
import { DashboardOrganizations } from "@/components/dashboard/dashboard-organizations"
import { MuseumDetailsForm } from "@/components/dashboard/museum-details-form"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const sectionLabels: Record<string, string> = {
  exhibitions: "Exhibitions",
  interactions: "Interactions",
  analytics: "Analytics",
}

export default async function DashboardSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params

  if (section === "admin") {
    redirect("/dashboard/admin/org-requests")
  }

  const tabId = dashboardPathToTabId[section]
  if (!tabId) {
    redirect("/dashboard/details")
  }

  if (tabId === "museum-details") {
    return <MuseumDetailsForm />
  }
  if (tabId === "organizations") {
    return <DashboardOrganizations />
  }
  if (tabId === "exhibitions") {
    return <DashboardExhibitions />
  }
  if (tabId === "interactions") {
    return <DashboardInteractions />
  }

  const label = sectionLabels[section] ?? section
  return (
    <Card>
      <CardHeader>
        <CardTitle>Coming Soon</CardTitle>
        <CardDescription>
          The {label} section will be part of the next iteration.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
