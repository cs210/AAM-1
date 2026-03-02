"use client"

import * as React from "react"
import { useAction } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

type User = {
  id: string
  name: string | null
  email: string
  role?: string | null
  banned?: boolean | null
  image?: string | null
  createdAt?: number
}

type PendingInvitation = {
  _id: string
  organizationId: string
  email: string
  role?: string | null
  status: string
  organizationName?: string
  createdAt: number
  expiresAt: number
}

type UserOrganization = {
  id: string
  name: string
}

export function AdminUsers() {
  const listPendingInvitations = useAction(api.admin.listPendingInvitationsForAdmin)
  const listUserOrganizations = useAction(api.admin.listUserOrganizationsForAdmin)
  const cancelInvitation = useAction(api.admin.cancelInvitationForAdmin)
  const [users, setUsers] = React.useState<{ users: User[]; total: number } | null>(null)
  const [userOrganizationsByUserId, setUserOrganizationsByUserId] = React.useState<
    Record<string, UserOrganization[]>
  >({})
  const [pendingInvites, setPendingInvites] = React.useState<PendingInvitation[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = React.useState(false)
  const [createEmail, setCreateEmail] = React.useState("")
  const [createPassword, setCreatePassword] = React.useState("")
  const [createName, setCreateName] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [cancellingId, setCancellingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const loadUsers = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await authClient.admin.listUsers({
      query: { limit: 100, offset: 0 },
    })
    if (res.error) {
      setError(res.error.message ?? "Failed to load users")
      setUsers(null)
      setUserOrganizationsByUserId({})
    } else {
      const data = res.data as { users?: User[]; total?: number }
      const nextUsers = data.users ?? []
      setUsers({
        users: nextUsers,
        total: data.total ?? 0,
      })
      try {
        const organizationsByUserId = await listUserOrganizations({
          userIds: nextUsers.map((user) => user.id),
        })
        setUserOrganizationsByUserId((organizationsByUserId ?? {}) as Record<string, UserOrganization[]>)
      } catch {
        setUserOrganizationsByUserId({})
      }
    }
    setLoading(false)
  }, [listUserOrganizations])

  const loadPendingInvites = React.useCallback(async () => {
    try {
      const list = await listPendingInvitations()
      setPendingInvites(list ?? [])
    } catch {
      setPendingInvites([])
    }
  }, [listPendingInvitations])

  React.useEffect(() => {
    loadUsers()
  }, [loadUsers])

  React.useEffect(() => {
    loadPendingInvites()
  }, [loadPendingInvites])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createEmail.trim() || !createPassword.trim()) return
    setCreating(true)
    const res = await authClient.admin.createUser({
      email: createEmail.trim(),
      password: createPassword.trim(),
      name: createName.trim() || "",
      role: "user",
    })
    setCreating(false)
    if (res.error) {
      setError(res.error.message ?? "Failed to create user")
    } else {
      setShowCreateForm(false)
      setCreateEmail("")
      setCreatePassword("")
      setCreateName("")
      loadUsers()
    }
  }

  const handleSetRole = async (userId: string, role: "user" | "admin") => {
    const res = await authClient.admin.setRole({ userId, role })
    if (res.error) setError(res.error.message ?? "Failed to set role")
    else loadUsers()
  }

  const handleBan = async (userId: string) => {
    const res = await authClient.admin.banUser({ userId })
    if (res.error) setError(res.error.message ?? "Failed to ban")
    else loadUsers()
  }

  const handleUnban = async (userId: string) => {
    const res = await authClient.admin.unbanUser({ userId })
    if (res.error) setError(res.error.message ?? "Failed to unban")
    else loadUsers()
  }

  const handleCancelInvitation = async (invitationId: string) => {
    setCancellingId(invitationId)
    setError(null)
    try {
      await cancelInvitation({ invitationId })
      loadPendingInvites()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel invitation")
    } finally {
      setCancellingId(null)
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Permanently delete user ${email}? This cannot be undone.`)) return
    setDeletingId(userId)
    setError(null)
    const res = await authClient.admin.removeUser({ userId })
    setDeletingId(null)
    if (res.error) setError(res.error.message ?? "Failed to delete user")
    else loadUsers()
  }

  if (loading && !users) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-muted-foreground text-center text-sm">Loading users…</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage users, roles, and bans.</CardDescription>
        </div>
        <Button onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? "Cancel" : "Create user"}
        </Button>
      </CardHeader>
      <CardContent>
        {showCreateForm && (
          <form onSubmit={handleCreateUser} className="mb-6 rounded-xl border bg-muted/30 p-4">
            <p className="mb-3 font-medium">Create user</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1">
                <Label htmlFor="admin-create-email">Email</Label>
                <Input
                  id="admin-create-email"
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="admin-create-password">Password</Label>
                <Input
                  id="admin-create-password"
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="admin-create-name">Name (optional)</Label>
                <Input
                  id="admin-create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {pendingInvites !== null && pendingInvites.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium">Pending invitations</h3>
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <div
                  key={inv._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-muted-foreground text-sm">
                      {inv.organizationName ?? inv.organizationId} · {inv.role ?? "member"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cancellingId === inv._id}
                    onClick={() => handleCancelInvitation(inv._id)}
                  >
                    {cancellingId === inv._id ? "Cancelling…" : "Cancel invite"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {users && users.users.length === 0 && (!pendingInvites || pendingInvites.length === 0) ? (
          <p className="text-muted-foreground text-sm">No users yet.</p>
        ) : (
          <div className="space-y-3">
            {users?.users.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{u.name || u.email} ({u.id})</p>
                  <p className="text-muted-foreground text-sm">{u.email}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Organizations:{" "}
                    {(userOrganizationsByUserId[u.id] ?? []).length > 0
                      ? (userOrganizationsByUserId[u.id] ?? []).map((organization) => organization.name).join(", ")
                      : "None"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary">{u.role ?? "user"}</Badge>
                    {u.banned && <Badge variant="destructive">Banned</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetRole(u.id, u.role === "admin" ? "user" : "admin")}
                  >
                    Set {u.role === "admin" ? "user" : "admin"}
                  </Button>
                  {u.banned ? (
                    <Button size="sm" variant="outline" onClick={() => handleUnban(u.id)}>
                      Unban
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleBan(u.id)}>
                      Ban
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteUser(u.id, u.email)}
                    disabled={deletingId === u.id}
                  >
                    {deletingId === u.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
