import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { dashboardPathToTabId, dashboardTabMessageKeys } from "@/components/dashboard/constants"
import { DashboardOrganizations } from "@/components/dashboard/dashboard-organizations"
import { MuseumDetailsForm } from "@/components/dashboard/museum-details-form"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function DashboardSectionPage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>
}) {
  const { locale, section } = await params

  if (section === "admin") {
    redirect(`/${locale}/dashboard/admin/org-requests`)
  }

  const tabId = dashboardPathToTabId[section]
  if (!tabId) {
    redirect(`/${locale}/dashboard/details`)
  }

  if (tabId === "museum-details") {
    return <MuseumDetailsForm />
  }
  if (tabId === "organizations") {
    return <DashboardOrganizations />
  }

  const t = await getTranslations("dashboard.shell")
  const tTabs = await getTranslations("dashboard.tabs")
  const label = tTabs(dashboardTabMessageKeys[tabId])
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("comingSoon")}</CardTitle>
        <CardDescription>
          {t("comingSoonDescription", { section: label })}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
