"use client"

import { Link } from "@/i18n/navigation"
import { useQuery } from "convex/react"
import { Building2Icon, TriangleAlertIcon, UserIcon } from "lucide-react"

import { api } from "@packages/backend/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SidebarUserDetailsProps = {
  isAdmin?: boolean
  hideWorkspaceSection?: boolean
  showWorkspaceSwitcher?: boolean
  workspaceLoading?: boolean
  workspaceOptions?: { id: string; label: string; museumLabel?: string | null }[]
  activeWorkspaceId?: string | null
  onWorkspaceChange?: (workspaceId: string) => void
  workspaceWarning?: string | null
}

export function SidebarUserDetails({
  isAdmin,
  hideWorkspaceSection,
  showWorkspaceSwitcher,
  workspaceLoading,
  workspaceOptions = [],
  activeWorkspaceId,
  onWorkspaceChange,
  workspaceWarning,
}: SidebarUserDetailsProps) {
  const user = useQuery(api.auth.getCurrentUser)
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const pendingRequest = useQuery(api.organizationRequests.getMyRequest)
  const workspaceOptionById = new Map(workspaceOptions.map((option) => [option.id, option]))
  const activeWorkspaceOption = activeWorkspaceId ? workspaceOptionById.get(activeWorkspaceId) : undefined
  const selectedWorkspaceId =
    activeWorkspaceId && workspaceOptionById.has(activeWorkspaceId) ? activeWorkspaceId : null

  if (user === undefined) {
    return <div className="h-20 animate-pulse rounded-xl border bg-muted/50" />
  }

  if (user === null) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">Not signed in</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
          <Button size="sm" className="flex-1" render={<Link href="/sign-up" />}>
            Sign up
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="bg-primary/12 text-primary flex size-9 items-center justify-center rounded-lg border">
          <UserIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name ?? "Museum Team"}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          {isAdmin ? (
            <p className="mt-1 inline-flex rounded-md border border-amber-300/80 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-300">
              Admin
            </p>
          ) : null}
        </div>
      </div>
      {!hideWorkspaceSection ? (
        <div className="rounded-lg border bg-muted/30 p-2">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Workspace
          </p>
          {showWorkspaceSwitcher ? (
            <div className="mt-2 space-y-2">
              <Select
                value={selectedWorkspaceId}
                onValueChange={(value) => {
                  if (typeof value === "string" && value.length > 0) onWorkspaceChange?.(value)
                }}
                disabled={workspaceLoading || workspaceOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={workspaceLoading ? "Loading workspaces..." : "Select workspace"}>
                    {(value) => {
                      if (!value || typeof value !== "string") return workspaceLoading ? "Loading workspaces..." : "Select workspace"
                      return workspaceOptionById.get(value)?.label ?? "Select workspace"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {workspaceOptions.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground px-1 text-xs">
                Museum: {activeWorkspaceOption?.museumLabel ?? "Not assigned yet"}
              </p>
              {workspaceWarning ? (
                <p className="flex items-start gap-1.5 px-1 text-xs text-amber-700 dark:text-amber-400">
                  <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                  {workspaceWarning}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-1 inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm">
              <Building2Icon className="size-4" />
              <span className="truncate">
                {activeOrganization
                  ? activeOrganization.name
                  : pendingRequest?.museumName ?? "No workspace"}
              </span>
            </div>
          )}
          {!showWorkspaceSwitcher && pendingRequest?.status === "pending" ? (
            <p className="text-muted-foreground mt-1 px-2 text-xs">
              Pending activation
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
