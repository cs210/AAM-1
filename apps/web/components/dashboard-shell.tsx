"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"

import {
  adminDashboardTabs,
  dashboardTabs,
  workspaceDashboardTabs,
  type AllDashboardTabId,
} from "@/components/dashboard/constants"
import { AdminInvitations } from "./dashboard/admin-invitations"
import { AdminMuseums } from "./dashboard/admin-museums"
import { AdminOrgRequests } from "./dashboard/admin-org-requests"
import { AdminUsers } from "./dashboard/admin-users"
import { DashboardAnalytics } from "./dashboard/dashboard-analytics"
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
import { Input } from "@/components/ui/input"

const ACTIVE_MUSEUM_CONTEXT_STORAGE_KEY = "dashboard:activeMuseumContextId"

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48)
}

type WorkspaceRow = {
  _id: string
  name?: string
  linkedMuseumId?: string | null
  linkedMuseumName?: string | null
  hasInvalidMuseumContext?: boolean
}

type MuseumContextRow = {
  _id: string
  name: string
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
  const [museumContextWarning, setMuseumContextWarning] = React.useState<string | null>(null)
  const [isMuseumContextHydrated, setIsMuseumContextHydrated] = React.useState(false)
  const [adminMuseumContextId, setAdminMuseumContextId] = React.useState<string | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const user = useQuery(api.auth.getCurrentUser)
  const museums = useQuery(api.museums.listMuseums) as MuseumContextRow[] | undefined
  const myWorkspaces = useQuery(api.admin.listMyOrganizations) as WorkspaceRow[] | undefined
  const isAdmin = (user as { role?: string } | null)?.role === "admin"
  const activeTabInfo =
    dashboardTabs.find((tab) => tab.id === activeTab) ??
    workspaceDashboardTabs.find((tab) => tab.id === activeTab) ??
    adminDashboardTabs.find((tab) => tab.id === activeTab)
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const pendingRequest = useQuery(api.organizationRequests.getMyRequest)
  const submitRequest = useMutation(api.organizationRequests.submitRequest)
  const workspaceOptions = React.useMemo(
    () =>
      (myWorkspaces ?? [])
        .slice()
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [myWorkspaces]
  )
  const activeWorkspace = React.useMemo(
    () => workspaceOptions.find((workspace) => workspace._id === activeWorkspaceId) ?? null,
    [workspaceOptions, activeWorkspaceId]
  )
  const activeMuseumContextId = isAdmin
    ? adminMuseumContextId
    : activeWorkspace?.linkedMuseumId ?? null
  const museumContextOptions = React.useMemo(
    () =>
      (museums ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((museum) => ({
          id: museum._id,
          label: museum.name,
        })),
    [museums]
  )
  const activeMuseumContext = React.useMemo(
    () => (museums ?? []).find((museum) => museum._id === activeMuseumContextId) ?? null,
    [museums, activeMuseumContextId]
  )
  const nonAdminMuseumLabel = activeWorkspace?.hasInvalidMuseumContext
    ? "Invalid museum context"
    : activeWorkspace?.linkedMuseumName ?? "Museum not assigned yet"
  const museumContextLabel = isAdmin
    ? museums === undefined
      ? "Loading museums..."
      : activeMuseumContext?.name ?? (museums.length > 0 ? "Select a museum" : "No museums available")
    : nonAdminMuseumLabel
  const workspaceWarning = !isAdmin && activeWorkspace?.hasInvalidMuseumContext
    ? "Assigned museum is invalid (likely deleted). Ask an admin to reassign this workspace."
    : null

  React.useEffect(() => {
    if (isAdmin || myWorkspaces === undefined) return
    if (myWorkspaces.length === 0) {
      if (activeWorkspaceId !== null) setActiveWorkspaceId(null)
      return
    }

    const workspaceIds = new Set(myWorkspaces.map((workspace) => workspace._id))
    const activeOrgId = activeOrganization?.id ?? null

    if (activeOrgId && workspaceIds.has(activeOrgId)) {
      if (activeWorkspaceId !== activeOrgId) setActiveWorkspaceId(activeOrgId)
      return
    }
    if (activeWorkspaceId && workspaceIds.has(activeWorkspaceId)) return
    setActiveWorkspaceId(myWorkspaces[0]!._id)
  }, [isAdmin, myWorkspaces, activeOrganization?.id, activeWorkspaceId])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const storedMuseumId = window.localStorage.getItem(ACTIVE_MUSEUM_CONTEXT_STORAGE_KEY)
    setAdminMuseumContextId(storedMuseumId)
    setIsMuseumContextHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!isAdmin || !isMuseumContextHydrated || museums === undefined) return

    if (museums.length === 0) {
      if (adminMuseumContextId) {
        setAdminMuseumContextId(null)
        setMuseumContextWarning("Museum context is invalid because no museums are available.")
      }
      return
    }

    if (adminMuseumContextId && museums.some((museum) => museum._id === adminMuseumContextId)) {
      return
    }

    if (adminMuseumContextId) {
      setMuseumContextWarning(
        "Museum context is invalid (likely deleted). Switched to the first available museum."
      )
    }
    setAdminMuseumContextId(museums[0]._id)
  }, [isAdmin, isMuseumContextHydrated, museums, adminMuseumContextId])

  React.useEffect(() => {
    if (!isAdmin || !isMuseumContextHydrated || typeof window === "undefined") return
    if (adminMuseumContextId) {
      window.localStorage.setItem(ACTIVE_MUSEUM_CONTEXT_STORAGE_KEY, adminMuseumContextId)
    } else {
      window.localStorage.removeItem(ACTIVE_MUSEUM_CONTEXT_STORAGE_KEY)
    }
  }, [isAdmin, isMuseumContextHydrated, adminMuseumContextId])

  const handleSetMuseumContext = React.useCallback((museumId: string) => {
    setAdminMuseumContextId(museumId)
    setMuseumContextWarning(null)
  }, [])

  const handleEditMuseumContext = React.useCallback((museumId: string) => {
    setAdminMuseumContextId(museumId)
    setMuseumContextWarning(null)
    setIsAdminMode(false)
    setActiveTab("museum-details")
  }, [])

  const handleWorkspaceChange = React.useCallback(
    (workspaceId: string) => {
      setActiveWorkspaceId(workspaceId)
      if (activeOrganization?.id === workspaceId) return
      void authClient.organization.setActive({ organizationId: workspaceId })
    },
    [activeOrganization?.id]
  )

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

  if (!isAdmin && myWorkspaces === undefined) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-6">
        <div className="h-40 w-full max-w-xl animate-pulse rounded-2xl border bg-muted/40" />
      </div>
    )
  }

  if (!isAdmin && (myWorkspaces?.length ?? 0) === 0) {
    return (
      <div className="bg-background min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_12%,hsl(var(--primary)/0.14),transparent_30%),radial-gradient(circle_at_88%_4%,hsl(var(--primary)/0.08),transparent_26%)]" />
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 md:px-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Museum staff access only</CardTitle>
              <CardDescription>
                You need to be in at least one organization workspace to use this dashboard.
                Request access below or wait for an invite. If you are not museum staff, use the
                visitor app instead.
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
              {pendingRequest?.status === "pending" ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                  Your most recent workspace request is pending approval.
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

  if (!isAdmin && pendingRequest?.status === "pending" && (myWorkspaces?.length ?? 0) === 0) {
    const requestName = pendingRequest.museumName
    return (
      <div className="bg-background min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_12%,hsl(var(--primary)/0.14),transparent_30%),radial-gradient(circle_at_88%_4%,hsl(var(--primary)/0.08),transparent_26%)]" />
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 md:px-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Workspace pending activation</CardTitle>
              <CardDescription>
                Your request for <span className="font-medium">{requestName}</span> has been
                submitted. You can access the dashboard after an admin approves this organization.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex-col gap-3">
              <Button
                className="w-full"
                variant="outline"
                render={<a href={consumerAppUrl} target="_blank" rel="noreferrer" />}
              >
                Open visitor app while you wait
              </Button>
              <div className="flex items-center gap-3 text-sm">
                <Button
                  variant="link"
                  className="text-muted-foreground h-auto p-0"
                  render={<Link href="/" />}
                >
                  Back to landing
                </Button>
                <span className="text-muted-foreground/40">·</span>
                <Button
                  variant="link"
                  className="text-muted-foreground h-auto p-0"
                  onClick={signOutToLanding}
                >
                  Log out
                </Button>
              </div>
            </CardFooter>
          </Card>
        </main>
      </div>
    )
  }

  const workspaceSelectorOptions = workspaceOptions.map((workspace) => ({
    id: workspace._id,
    label: workspace.name ?? "Unnamed organization",
    museumLabel: workspace.hasInvalidMuseumContext
      ? "Invalid museum context"
      : workspace.linkedMuseumName ?? "Museum not assigned yet",
  }))
  const isMuseumContextTab = dashboardTabs.some((tab) => tab.id === activeTab)
  const showWorkspaceNotConfiguredState = !isAdmin && isMuseumContextTab && !activeMuseumContextId

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
          museumContextLabel={museumContextLabel}
          museumContextWarning={isAdmin ? museumContextWarning : null}
          museumContextLoading={isAdmin && museums === undefined}
          showMuseumContextSelector={isAdmin}
          museumContextOptions={isAdmin ? museumContextOptions : []}
          activeMuseumContextId={isAdmin ? activeMuseumContextId : null}
          onMuseumContextChange={handleSetMuseumContext}
          showWorkspaceSwitcher={!isAdmin}
          workspaceLoading={!isAdmin && myWorkspaces === undefined}
          workspaceOptions={!isAdmin ? workspaceSelectorOptions : []}
          activeWorkspaceId={!isAdmin ? activeWorkspaceId : null}
          onWorkspaceChange={handleWorkspaceChange}
          workspaceWarning={workspaceWarning}
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
              {!isAdmin &&
                workspaceDashboardTabs.map((tab) => {
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
            {/* <div className="text-muted-foreground inline-flex items-center gap-2 rounded-lg border bg-background/70 px-2.5 py-1 text-xs">
              <Building2Icon className="size-3.5" />
              Museum Context:{" "}
              {isAdmin
                ? activeMuseumContext?.name ?? museumContextLabel
                : activeWorkspace?.hasInvalidMuseumContext
                  ? "Invalid museum context"
                  : activeWorkspace?.linkedMuseumName ?? "Museum not assigned yet"}
            </div> */}
            {/* {!isAdmin ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Workspace: {activeWorkspace?.name ?? "No workspace selected"}
              </p>
            ) : null} */}
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{activeTabInfo?.label}</h1>
            <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">
              Keep your museum profile current so visitors always see accurate details in the mobile
              app.
            </p>
          </section>

          {showWorkspaceNotConfiguredState ? (
            <Card>
              <CardHeader>
                <CardTitle>Workspace setup incomplete</CardTitle>
                <CardDescription>
                  This workspace is not linked to a museum yet. Ask an admin to assign a museum in
                  the admin Organizations section.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : activeTab === "museum-details" ? (
            <MuseumDetailsForm museumId={activeMuseumContextId} />
          ) : activeTab === "organizations" ? (
            <DashboardOrganizations />
          ) : activeTab === "analytics" ? (
            <DashboardAnalytics />
          ) : activeTab === "org-requests" ? (
            <AdminOrgRequests />
          ) : activeTab === "users" ? (
            <AdminUsers />
          ) : activeTab === "invitations" ? (
            <AdminInvitations />
          ) : activeTab === "admin-museums" ? (
            <AdminMuseums
              activeMuseumContextId={activeMuseumContextId}
              onEditMuseumContext={handleEditMuseumContext}
            />
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
