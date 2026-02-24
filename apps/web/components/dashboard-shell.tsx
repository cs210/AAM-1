"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"

import {
  adminDashboardTabs,
  dashboardTabs,
  type AllDashboardTabId,
} from "@/components/dashboard/constants"
import { AdminInvitations } from "./dashboard/admin-invitations"
import { AdminOrgRequests } from "./dashboard/admin-org-requests"
import { AdminUsers } from "./dashboard/admin-users"
import { DashboardOrganizations } from "./dashboard/dashboard-organizations"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { MuseumDetailsForm } from "@/components/dashboard/museum-details-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"
import { Building2Icon } from "lucide-react"
import { Input } from "@/components/ui/input"

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48)
}

export function DashboardShell() {
  const consumerAppUrl = process.env.NEXT_PUBLIC_CONSUMER_APP_URL ?? "yami://"
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<AllDashboardTabId>("museum-details")
  const [isAdminMode, setIsAdminMode] = React.useState(false)
  const [museumName, setMuseumName] = React.useState("")
  const [city, setCity] = React.useState("")
  const [state, setState] = React.useState("")
  const [website, setWebsite] = React.useState("")
  const [staffRole, setStaffRole] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const user = useQuery(api.auth.getCurrentUser)
  const isAdmin = (user as { role?: string } | null)?.role === "admin"
  const activeTabInfo =
    dashboardTabs.find((tab) => tab.id === activeTab) ??
    adminDashboardTabs.find((tab) => tab.id === activeTab)
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const pendingRequest = useQuery(api.organizationRequests.getMyRequest)
  const submitRequest = useMutation(api.organizationRequests.submitRequest)

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const name = museumName.trim()
    const locationCity = city.trim()
    const locationState = state.trim()
    const orgSlug = slugify(name)

    if (!name || !locationCity || !locationState || !orgSlug) {
      setError("Please complete all required museum details.")
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error: orgError } = await authClient.organization.create({
        name,
        slug: orgSlug,
        metadata: {
          activationStatus: "pending",
          city: locationCity,
          state: locationState,
          website: website.trim() || null,
          staffRole: staffRole.trim() || null,
        },
      })

      if (orgError) {
        setError(orgError.message ?? "Unable to create workspace.")
        return
      }

      await submitRequest({
        museumName: name,
        city: locationCity,
        state: locationState,
        website: website.trim() || undefined,
        staffRole: staffRole.trim() || undefined,
        betterAuthOrgId: data?.id ?? undefined,
      })

      if (data?.id) {
        await authClient.organization.setActive({ organizationId: data.id })
      }

      setMuseumName("")
      setCity("")
      setState("")
      setWebsite("")
      setStaffRole("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const signOutToLanding = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/")
        },
      },
    })
  }

  if (user === undefined) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-6">
        <div className="h-40 w-full max-w-xl animate-pulse rounded-2xl border bg-muted/40" />
      </div>
    )
  }

  if (user === null) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              You need an account and workspace to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button variant="ghost" render={<Link href="/" />}>
              Back to landing
            </Button>
            <Button variant="outline" render={<Link href="/sign-in" />}>
              Sign in
            </Button>
            <Button render={<Link href="/sign-up" />}>Sign up</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!pendingRequest || pendingRequest.status === "rejected") {
    return (
      <div className="bg-background min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_12%,hsl(var(--primary)/0.14),transparent_30%),radial-gradient(circle_at_88%_4%,hsl(var(--primary)/0.08),transparent_26%)]" />
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 md:px-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Museum staff access only</CardTitle>
              <CardDescription>
                This dashboard is only for museum staff. You must be invited to a museum workspace
                or request access below. If you are not museum staff, open the visitor app instead.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              ) : null}

              <form id="museum-access-request-form" className="space-y-4" onSubmit={createWorkspace}>
                <Input
                  id="museum-name"
                  placeholder="Museum name"
                  value={museumName}
                  onChange={(e) => setMuseumName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    id="museum-city"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <Input
                    id="museum-state"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <Input
                  id="museum-website"
                  placeholder="Museum website (optional)"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={isSubmitting}
                />
                <Input
                  id="staff-role"
                  placeholder="Your role (optional)"
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
                  disabled={isSubmitting}
                />
              </form>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button className="w-full" type="submit" form="museum-access-request-form" disabled={isSubmitting}>
                {isSubmitting ? "Submitting request..." : "Request museum access"}
              </Button>
              <div className="flex w-full items-center justify-center gap-1 text-sm">
                <span className="text-muted-foreground">Not museum staff?</span>
                <Button variant="link" className="h-auto p-0" render={<a href={consumerAppUrl} target="_blank" rel="noreferrer" />}>
                  Open visitor app
                </Button>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Button variant="link" className="text-muted-foreground h-auto p-0" render={<Link href="/" />}>
                  Back to landing
                </Button>
                <span className="text-muted-foreground/40">·</span>
                <Button variant="link" className="text-muted-foreground h-auto p-0" onClick={signOutToLanding}>
                  Log out
                </Button>
              </div>
            </CardFooter>
          </Card>
        </main>
      </div>
    )
  }

  if (pendingRequest.status === "pending") {
    const requestName = pendingRequest.museumName
    return (
      <div className="bg-background min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_12%,hsl(var(--primary)/0.14),transparent_30%),radial-gradient(circle_at_88%_4%,hsl(var(--primary)/0.08),transparent_26%)]" />
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 md:px-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Workspace pending activation</CardTitle>
              <CardDescription>
                Your request for <span className="font-medium">{requestName}</span> has
                been submitted. This dashboard is only for museum staff and remains locked until
                your workspace is activated or you are invited to an active museum workspace. If
                you are not museum staff, use the visitor app instead.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex-col gap-3">
              <Button className="w-full" variant="outline" render={<a href={consumerAppUrl} target="_blank" rel="noreferrer" />}>
                Open visitor app while you wait
              </Button>
              <div className="flex items-center gap-3 text-sm">
                <Button variant="link" className="text-muted-foreground h-auto p-0" render={<Link href="/" />}>
                  Back to landing
                </Button>
                <span className="text-muted-foreground/40">·</span>
                <Button variant="link" className="text-muted-foreground h-auto p-0" onClick={signOutToLanding}>
                  Log out
                </Button>
              </div>
            </CardFooter>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_12%,hsl(var(--primary)/0.14),transparent_30%),radial-gradient(circle_at_88%_4%,hsl(var(--primary)/0.08),transparent_26%)]" />
      <div className="flex min-h-screen w-full">
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isAdmin={isAdmin}
          isAdminMode={isAdminMode}
          onAdminModeToggle={() => setIsAdminMode((prev) => !prev)}
        />

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
              {isAdmin &&
                isAdminMode &&
                adminDashboardTabs.map((tab) => {
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
            <div className="text-muted-foreground inline-flex items-center gap-2 rounded-lg border bg-background/70 px-2.5 py-1 text-xs">
              <Building2Icon className="size-3.5" />
              Workspace:{" "}
              {activeOrganization
                ? `${activeOrganization.name}${activeOrganization.id ? ` (${activeOrganization.id})` : ""}`
                : pendingRequest?.museumName ?? "Personal Workspace"}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{activeTabInfo?.label}</h1>
            <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">
              Keep your museum profile current so visitors always see accurate details in the mobile
              app.
            </p>
          </section>

          {activeTab === "museum-details" ? (
            <MuseumDetailsForm />
          ) : activeTab === "organizations" ? (
            <DashboardOrganizations />
          ) : activeTab === "org-requests" ? (
            <AdminOrgRequests />
          ) : activeTab === "users" ? (
            <AdminUsers />
          ) : activeTab === "invitations" ? (
            <AdminInvitations />
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
