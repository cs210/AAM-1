"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { Building2Icon, LogOutIcon, UserIcon } from "lucide-react"

import { api } from "@packages/backend/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function SidebarUserDetails() {
  const user = useQuery(api.auth.getCurrentUser)
  const router = useRouter()
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const pendingRequest = useQuery(api.organizationRequests.getMyRequest)

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
        </div>
      </div>
      <div className="rounded-lg border bg-muted/30 p-2">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Workspace
        </p>
        <div className="mt-1 inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm">
          <Building2Icon className="size-4" />
          <span className="truncate">
            {activeOrganization
              ? `${activeOrganization.name}${activeOrganization.id ? ` (${activeOrganization.id})` : ""}`
              : pendingRequest?.museumName ?? "No workspace"}
          </span>
        </div>
        {pendingRequest?.status === "pending" ? (
          <p className="text-muted-foreground mt-1 px-2 text-xs">
            Pending activation
          </p>
        ) : null}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={async () => {
          await authClient.signOut({
            fetchOptions: {
              onSuccess: () => router.push("/sign-in"),
            },
          })
        }}
      >
        <LogOutIcon className="size-4" />
        Log out
      </Button>
    </div>
  )
}
