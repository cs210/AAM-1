"use client"

import Link from "next/link"
import { ShieldIcon } from "lucide-react"

import { YamiLogo } from "@/components/yami-logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  adminDashboardTabs,
  dashboardTabs,
  type AllDashboardTabId,
} from "@/components/dashboard/constants"
import { SidebarUserDetails } from "@/components/dashboard/sidebar-user-details"

type DashboardSidebarProps = {
  activeTab: AllDashboardTabId
  isAdmin?: boolean
  isAdminMode?: boolean
}

export function DashboardSidebar({
  activeTab,
  isAdmin,
  isAdminMode,
}: DashboardSidebarProps) {
  return (
    <aside className="bg-card/85 fixed top-4 bottom-4 left-4 hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-2xl border p-4 shadow-xl shadow-black/5 backdrop-blur md:flex">
      <Link href="/" className="shrink-0 inline-flex">
        <YamiLogo />
      </Link>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mt-5">
          <p className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
            Navigation
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
                  {tab.label}
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
              Admin mode {isAdminMode ? "on" : "off"}
            </Button>
            {isAdminMode && (
              <nav className="mt-2 space-y-1">
                <p className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
                  Admin
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
                      {tab.label}
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
          Account
        </p>
        <SidebarUserDetails />
      </div>
    </aside>
  )
}
