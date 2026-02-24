"use client"

import * as React from "react"

import { dashboardTabs, type DashboardTabId } from "@/components/dashboard/constants"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { MuseumDetailsForm } from "@/components/dashboard/museum-details-form"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardShell() {
  const [activeTab, setActiveTab] = React.useState<DashboardTabId>("museum-details")
  const activeTabInfo = dashboardTabs.find((tab) => tab.id === activeTab)

  return (
    <div className="bg-background min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_12%,hsl(var(--primary)/0.14),transparent_30%),radial-gradient(circle_at_88%_4%,hsl(var(--primary)/0.08),transparent_26%)]" />
      <div className="flex min-h-screen w-full">
        <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 space-y-4 p-4 md:ml-76 md:p-6">
          <section className="rounded-2xl border bg-card p-2 md:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {dashboardTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id

                return (
                  <Button
                    key={tab.id}
                    type="button"
                    variant={isActive ? "secondary" : "ghost"}
                    className="shrink-0 gap-2 rounded-xl"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </Button>
                )
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border bg-linear-to-br from-primary/14 via-primary/6 to-background p-6">
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{activeTabInfo?.label}</h1>
            <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">
              Keep your museum profile current so visitors always see accurate details in the mobile
              app.
            </p>
          </section>

          {activeTab === "museum-details" ? (
            <MuseumDetailsForm />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>
                  The {activeTabInfo?.label} section will be part of the next iteration.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
