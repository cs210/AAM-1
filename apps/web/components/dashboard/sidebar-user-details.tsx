"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { LogOutIcon, UserIcon } from "lucide-react"

import { api } from "@packages/backend/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function SidebarUserDetails() {
  const user = useQuery(api.auth.getCurrentUser)
  const router = useRouter()

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
