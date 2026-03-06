"use client"

import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { Building2Icon, LogOutIcon, ShieldIcon, TriangleAlertIcon } from "lucide-react"

import { YamiLogo } from "@/components/yami-logo"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils"
import {
  adminDashboardTabs,
  dashboardTabs,
  workspaceDashboardTabs,
  type AllDashboardTabId,
} from "@/components/dashboard/constants"
import { SidebarUserDetails } from "@/components/dashboard/sidebar-user-details"
import { authClient } from "@/lib/auth-client"

type MuseumContextOption = { id: string; label: string }

type DashboardSidebarProps = {
  activeTab: AllDashboardTabId
  isAdmin?: boolean
  isAdminMode?: boolean
  onAdminModeToggle?: () => void
  museumContextLabel?: string
  museumContextWarning?: string | null
  museumContextLoading?: boolean
  showMuseumContextSelector?: boolean
  museumContextOptions?: MuseumContextOption[]
  activeMuseumContextId?: string | null
  onMuseumContextChange?: (museumId: string) => void
  showWorkspaceSwitcher?: boolean
  workspaceLoading?: boolean
  workspaceOptions?: { id: string; label: string; museumLabel?: string }[]
  activeWorkspaceId?: string | null
  onWorkspaceChange?: (workspaceId: string) => void
  workspaceWarning?: string | null
}

export function DashboardSidebar({
  activeTab,
  isAdmin,
  isAdminMode,
  onAdminModeToggle,
  museumContextLabel = "",
  museumContextWarning = null,
  museumContextLoading = false,
  showMuseumContextSelector = false,
  museumContextOptions = [],
  activeMuseumContextId = null,
  onMuseumContextChange,
  showWorkspaceSwitcher = false,
  workspaceLoading = false,
  workspaceOptions = [],
  activeWorkspaceId = null,
  onWorkspaceChange,
  workspaceWarning = null,
}: DashboardSidebarProps) {
  const t = useTranslations("dashboard.sidebar")
  const tTabs = useTranslations("dashboard.tabs")
  const router = useRouter()
  const tabLabelKey: Record<string, string> = {
    "museum-details": "museumDetails",
    "org-requests": "orgRequests",
  }
  const getTabLabel = (id: string) => tTabs(tabLabelKey[id] ?? id)
  const museumOptionById = new Map(museumContextOptions.map((option) => [option.id, option]))
  const comboboxItems = museumContextOptions.map((option) => option.label)
  const activeMuseumOptionLabel = activeMuseumContextId
    ? museumOptionById.get(activeMuseumContextId)?.label ?? ""
    : ""
  const labelToMuseumId = new Map(museumContextOptions.map((option) => [option.label, option.id]))

  return (
    <aside className="bg-card/85 fixed top-4 bottom-4 left-4 hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-2xl border p-4 shadow-xl shadow-black/5 backdrop-blur md:flex">
      <Link href="/" className="shrink-0 inline-flex">
        <YamiLogo />
      </Link>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mt-5 space-y-3">
          <div className="rounded-xl border bg-background/70 p-3">
            <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
              <Building2Icon className="size-3.5" />
              {t("museumContext")}
            </div>
            {showMuseumContextSelector ? (
              <Combobox
                items={comboboxItems}
                value={activeMuseumOptionLabel || null}
                onValueChange={(value) => {
                  const museumId = value ? labelToMuseumId.get(value) : undefined
                  if (museumId) onMuseumContextChange?.(museumId)
                }}
              >
                <ComboboxInput
                  placeholder={museumContextLoading ? t("loadingMuseums") : t("searchSelectMuseum")}
                  disabled={museumContextLoading || museumContextOptions.length === 0}
                  showClear={false}
                />
                <ComboboxContent>
                  <ComboboxEmpty>{t("noMuseumsFound")}</ComboboxEmpty>
                  <ComboboxList>
                    {(item) => (
                      <ComboboxItem key={item} value={item}>
                        {item}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            ) : (
              <p className="line-clamp-2 text-sm font-medium">{museumContextLabel}</p>
            )}
            {museumContextWarning && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                {museumContextWarning}
              </p>
            )}
          </div>

          <p className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
            {t("navigation")}
          </p>
          <nav className="mt-2 space-y-1">
            {dashboardTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "h-10 w-full justify-start gap-2 rounded-xl px-3",
                    isActive && "ring-border shadow-xs ring-1"
                  )}
                  render={<Link href={`/dashboard/${tab.path}`} />}
                >
                  <Icon className="size-4" />
                  {getTabLabel(tab.id)}
                </Button>
              )
            })}
          </nav>
        </div>

        {isAdmin && (
          <div className="mt-4">
            <Button
              variant={isAdminMode ? "secondary" : "outline"}
              className="h-10 w-full justify-start gap-2 rounded-xl px-3"
              render={
                <Link
                  href={isAdminMode ? "/dashboard/details" : "/dashboard/admin/org-requests"}
                />
              }
            >
              <ShieldIcon className="size-4" />
              {t("adminMode")} {isAdminMode ? t("adminModeOn") : t("adminModeOff")}
            </Button>
            {isAdminMode && (
              <nav className="mt-2 space-y-1">
                <p className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
                  {t("admin")}
                </p>
                {adminDashboardTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id

                  return (
                    <Button
                      key={tab.id}
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "h-10 w-full justify-start gap-2 rounded-xl px-3",
                        isActive && "ring-border shadow-xs ring-1"
                      )}
                      render={<Link href={`/dashboard/admin/${tab.path}`} />}
                    >
                      <Icon className="size-4" />
                      {getTabLabel(tab.id)}
                    </Button>
                  )
                })}
              </nav>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 rounded-xl border bg-background/80 p-3">
        <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          {t("account")}
        </p>
        <SidebarUserDetails
          isAdmin={Boolean(isAdmin)}
          hideWorkspaceSection={Boolean(isAdmin)}
          showWorkspaceSwitcher={!isAdmin && showWorkspaceSwitcher}
          workspaceLoading={workspaceLoading}
          workspaceOptions={workspaceOptions}
          activeWorkspaceId={activeWorkspaceId}
          onWorkspaceChange={onWorkspaceChange}
          workspaceWarning={workspaceWarning}
        />
        {!isAdmin && (
          <nav className="mt-3 space-y-1">
            {workspaceDashboardTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "h-10 w-full justify-start gap-2 rounded-xl px-3",
                    isActive && "ring-border shadow-xs ring-1"
                  )}
                  render={<Link href={`/dashboard/${tab.path}`} />}
                >
                  <Icon className="size-4" />
                  {getTabLabel(tab.id)}
                </Button>
              )
            })}
          </nav>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full justify-start gap-2"
          onClick={async () => {
            await authClient.signOut({
              fetchOptions: {
                onSuccess: () => router.push("/sign-in"),
              },
            })
          }}
        >
          <LogOutIcon className="size-4" />
          {t("logOut")}
        </Button>
      </div>
    </aside>
  )
}
