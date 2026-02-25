"use client"

import Link from "next/link"

import { YamiLogo } from "@/components/yami-logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { dashboardTabs, type DashboardTabId } from "@/components/dashboard/constants"
import { SidebarUserDetails } from "@/components/dashboard/sidebar-user-details"

type DashboardSidebarProps = {
  activeTab: DashboardTabId
  onTabChange: (tab: DashboardTabId) => void
}

export function DashboardSidebar({ activeTab, onTabChange }: DashboardSidebarProps) {
  return (
    <aside className="bg-card/85 fixed top-4 bottom-4 left-4 hidden w-72 flex-col rounded-2xl border p-4 shadow-xl shadow-black/5 backdrop-blur md:flex">
      <Link href="/" className="inline-flex">
        <YamiLogo />
      </Link>

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
                type="button"
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "h-10 w-full justify-start gap-2 rounded-xl px-3",
                  isActive && "ring-border shadow-xs ring-1"
                )}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className="size-4" />
                {tab.label}
              </Button>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto rounded-xl border bg-background/80 p-3">
        <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          Account
        </p>
        <SidebarUserDetails />
      </div>
    </aside>
  )
}
