"use client"

import * as React from "react"
import { useAction } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ORG_ROLES = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
] as const

type OrgRow = { _id: string; name: string; slug: string }

export function AdminInvitations() {
  const listOrgs = useAction(api.admin.listOrganizationsForAdmin)
  const [orgs, setOrgs] = React.useState<OrgRow[] | null | undefined>(undefined)
  const [email, setEmail] = React.useState("")
  const [organizationId, setOrganizationId] = React.useState("")
  const [role, setRole] = React.useState<"member" | "admin" | "owner">("member")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const loadOrgs = React.useCallback(() => {
    setOrgs(undefined)
    listOrgs().then(setOrgs).catch(() => setOrgs(null))
  }, [listOrgs])

  React.useEffect(() => {
    loadOrgs()
  }, [loadOrgs])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !organizationId) return
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    const res = await authClient.organization.inviteMember({
      email: email.trim(),
      organizationId,
      role,
    })
    setSubmitting(false)
    if (res.error) {
      setError(res.error.message ?? "Failed to send invitation")
    } else {
      setSuccess(`Invitation sent to ${email.trim()}`)
      setEmail("")
      loadOrgs()
    }
  }

  const orgList = orgs ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitations</CardTitle>
        <CardDescription>Invite users to an organization by email.</CardDescription>
      </CardHeader>
      <CardContent>
        {orgs === undefined ? (
          <p className="text-muted-foreground text-sm">Loading organizations…</p>
        ) : orgList.length === 0 ? (
          <p className="text-muted-foreground text-sm">No organizations yet. Approve an org request first.</p>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                {success}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-org">Organization</Label>
                <Select value={organizationId} onValueChange={(v) => setOrganizationId(v ?? "")} required>
                  <SelectTrigger id="invite-org">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgList.map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name} ({org._id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "member" | "admin" | "owner")}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send invitation"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
