"use client"

import * as React from "react"
import { useAction, useMutation } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Doc, Id } from "@packages/backend/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type OrgRequestAdminRow = Doc<"organizationRequests"> & {
  userDisplay?: string
  orgDisplay?: string
}

type OrganizationAdminRow = {
  _id: string
  id?: string
  name?: string
  slug?: string
  linkedMuseumId?: string | null
  linkedMuseumName?: string | null
  hasInvalidMuseumContext?: boolean
}

type MuseumAdminOption = {
  _id: Id<"museums">
  name: string
}

type OrgMemberRow = {
  _id: string
  organizationId: string
  userId: string
  role: string
  createdAt: number
  userName?: string
  userEmail?: string
}

type UserSearchRow = {
  id: string
  name?: string
  email: string
}

export function AdminOrgRequests() {
  const listOrgRequests = useAction(api.admin.listOrgRequestsForAdmin)
  const listOrganizations = useAction(api.admin.listOrganizationsForAdmin)
  const listMuseums = useAction(api.admin.listMuseumsForAdmin)
  const listOrganizationMembers = useAction(api.admin.listOrganizationMembersForAdmin)
  const searchUsersByEmail = useAction(api.admin.searchUsersByEmailForAdmin)
  const setStatus = useMutation(api.admin.setOrgRequestStatusForAdmin)
  const setOrganizationMuseumLink = useMutation(api.admin.setOrganizationMuseumLinkForAdmin)
  const addUserToOrganizationByEmail = useMutation(api.admin.addUserToOrganizationByEmailForAdmin)
  const removeUserFromOrganization = useMutation(api.admin.removeUserFromOrganizationForAdmin)

  const [requests, setRequests] = React.useState<OrgRequestAdminRow[] | null | undefined>(undefined)
  const [organizations, setOrganizations] = React.useState<OrganizationAdminRow[] | null | undefined>(undefined)
  const [museums, setMuseums] = React.useState<MuseumAdminOption[] | null | undefined>(undefined)
  const [error, setError] = React.useState<string | null>(null)
  const [busyKey, setBusyKey] = React.useState<string | null>(null)
  const [requestMuseumDrafts, setRequestMuseumDrafts] = React.useState<Record<string, string>>({})
  const [organizationMuseumDrafts, setOrganizationMuseumDrafts] = React.useState<Record<string, string>>({})
  const [isRequestSectionOpen, setIsRequestSectionOpen] = React.useState(false)

  const [selectedOrganizationId, setSelectedOrganizationId] = React.useState<string | null>(null)
  const [isMemberDialogOpen, setIsMemberDialogOpen] = React.useState(false)
  const [members, setMembers] = React.useState<OrgMemberRow[] | null | undefined>(undefined)
  const [memberSearchQuery, setMemberSearchQuery] = React.useState("")
  const [memberSearchResults, setMemberSearchResults] = React.useState<UserSearchRow[]>([])
  const [memberError, setMemberError] = React.useState<string | null>(null)
  const [memberSuccess, setMemberSuccess] = React.useState<string | null>(null)
  const [isMemberSearchLoading, setIsMemberSearchLoading] = React.useState(false)
  const [memberBusyKey, setMemberBusyKey] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    setRequests(undefined)
    setOrganizations(undefined)
    setMuseums(undefined)
    try {
      const [nextRequests, nextOrganizations, nextMuseums] = await Promise.all([
        listOrgRequests(),
        listOrganizations(),
        listMuseums(),
      ])
      setRequests((nextRequests as OrgRequestAdminRow[]) ?? [])
      setOrganizations((nextOrganizations as OrganizationAdminRow[]) ?? [])
      setMuseums(
        ((nextMuseums as MuseumAdminOption[]) ?? []).map((museum) => ({
          _id: museum._id,
          name: museum.name,
        }))
      )
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load organizations"
      setError(message)
      setRequests(null)
      setOrganizations(null)
      setMuseums(null)
    }
  }, [listMuseums, listOrgRequests, listOrganizations])

  React.useEffect(() => {
    void load()
  }, [load])

  const selectedOrganization = React.useMemo(
    () => organizations?.find((organization) => organization._id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId]
  )

  const assignedMuseumIds = React.useMemo(() => {
    if (!organizations) return new Set<string>()
    return new Set(
      organizations
        .map((organization) => organization.linkedMuseumId ?? null)
        .filter((museumId): museumId is string => Boolean(museumId))
    )
  }, [organizations])

  const getAvailableMuseums = React.useCallback(
    (linkedMuseumId?: string | null) => {
      if (!museums) return []
      return museums.filter((museum) => !assignedMuseumIds.has(museum._id) || museum._id === linkedMuseumId)
    },
    [assignedMuseumIds, museums]
  )

  const loadMembers = React.useCallback(
    async (organizationId: string) => {
      setMembers(undefined)
      try {
        const rows = (await listOrganizationMembers({ organizationId })) as OrgMemberRow[]
        setMembers(rows)
      } catch (membersError) {
        setMembers(null)
        setMemberError(membersError instanceof Error ? membersError.message : "Failed to load members")
      }
    },
    [listOrganizationMembers]
  )

  const handleOpenMemberDialog = React.useCallback(
    async (organization: OrganizationAdminRow) => {
      setSelectedOrganizationId(organization._id)
      setIsMemberDialogOpen(true)
      setMemberSearchQuery("")
      setMemberSearchResults([])
      setMemberError(null)
      setMemberSuccess(null)
      await loadMembers(organization._id)
    },
    [loadMembers]
  )

  const handleSearchUsers = React.useCallback(async () => {
    const query = memberSearchQuery.trim()
    if (query.length < 2 || !selectedOrganization) {
      setMemberSearchResults([])
      return
    }
    setIsMemberSearchLoading(true)
    setMemberError(null)
    try {
      const results = (await searchUsersByEmail({
        emailQuery: query,
        limit: 10,
      })) as UserSearchRow[]
      const existingMemberIds = new Set((members ?? []).map((member) => member.userId))
      setMemberSearchResults(results.filter((result) => !existingMemberIds.has(result.id)))
    } catch (searchError) {
      setMemberError(searchError instanceof Error ? searchError.message : "Failed to search users")
    } finally {
      setIsMemberSearchLoading(false)
    }
  }, [memberSearchQuery, members, searchUsersByEmail, selectedOrganization])

  const handleAddUserToOrganization = React.useCallback(
    async (email: string) => {
      if (!selectedOrganization) return
      const normalizedEmail = email.trim()
      if (!normalizedEmail) return
      setMemberBusyKey(`add:${normalizedEmail.toLowerCase()}`)
      setMemberError(null)
      setMemberSuccess(null)
      try {
        await addUserToOrganizationByEmail({
          organizationId: selectedOrganization._id,
          email: normalizedEmail,
          role: "member",
        })
        setMemberSuccess(`Added ${normalizedEmail} to ${selectedOrganization.name ?? "organization"}.`)
        await loadMembers(selectedOrganization._id)
        await handleSearchUsers()
      } catch (addError) {
        setMemberError(addError instanceof Error ? addError.message : "Failed to add user")
      } finally {
        setMemberBusyKey(null)
      }
    },
    [addUserToOrganizationByEmail, handleSearchUsers, loadMembers, selectedOrganization]
  )

  const handleRemoveUserFromOrganization = React.useCallback(
    async (member: OrgMemberRow) => {
      if (!selectedOrganization) return
      setMemberBusyKey(`remove:${member.userId}`)
      setMemberError(null)
      setMemberSuccess(null)
      try {
        await removeUserFromOrganization({
          organizationId: selectedOrganization._id,
          userId: member.userId,
        })
        setMemberSuccess(`Removed ${member.userEmail ?? member.userId} from organization.`)
        await loadMembers(selectedOrganization._id)
        await handleSearchUsers()
      } catch (removeError) {
        setMemberError(removeError instanceof Error ? removeError.message : "Failed to remove user")
      } finally {
        setMemberBusyKey(null)
      }
    },
    [handleSearchUsers, loadMembers, removeUserFromOrganization, selectedOrganization]
  )

  const handleRequestStatus = async (request: OrgRequestAdminRow, status: "approved" | "rejected") => {
    setBusyKey(`request:${request._id}`)
    setError(null)
    try {
      await setStatus({ requestId: request._id, status })
      if (status === "approved" && request.betterAuthOrgId) {
        const draftMuseumId = requestMuseumDrafts[request._id]
        if (draftMuseumId && draftMuseumId !== "none") {
          await setOrganizationMuseumLink({
            betterAuthOrgId: request.betterAuthOrgId,
            museumId: draftMuseumId as Id<"museums">,
          })
        }
      }
      await load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update request")
    } finally {
      setBusyKey(null)
    }
  }

  const handleOrganizationAssignment = async (organization: OrganizationAdminRow) => {
    const draftValue = organizationMuseumDrafts[organization._id]
    const selectedMuseumId = draftValue ?? organization.linkedMuseumId ?? "none"
    setBusyKey(`org:${organization._id}`)
    setError(null)
    try {
      await setOrganizationMuseumLink({
        betterAuthOrgId: organization._id,
        museumId: selectedMuseumId === "none" ? undefined : (selectedMuseumId as Id<"museums">),
      })
      await load()
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "Failed to update organization museum link"
      )
    } finally {
      setBusyKey(null)
    }
  }

  const pendingRequestsCount = React.useMemo(
    () => (requests ?? []).filter((request) => request.status === "pending").length,
    [requests]
  )

  if (requests === undefined || organizations === undefined || museums === undefined) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-muted-foreground text-center text-sm">Loading organizations…</div>
        </CardContent>
      </Card>
    )
  }

  if (requests === null || organizations === null || museums === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Unable to load organization admin data.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Organization requests</CardTitle>
            <CardDescription>Pending/approved/rejected requests from users.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsRequestSectionOpen((open) => !open)}
          >
            {isRequestSectionOpen
              ? "Hide requests"
              : `Show requests (${pendingRequestsCount} pending)`}
          </Button>
        </CardHeader>
        {isRequestSectionOpen ? (
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {requests.length === 0 ? (
              <p className="text-muted-foreground text-sm">No organization requests.</p>
            ) : (
              <ul className="space-y-3">
                {requests.map((request) => {
                  const isBusy = busyKey === `request:${request._id}`
                  const requestAvailableMuseums = getAvailableMuseums(undefined)
                  const requestMuseumNameById = new Map(
                    requestAvailableMuseums.map((museum) => [museum._id as string, museum.name])
                  )
                  const requestAvailableMuseumIds = new Set(
                    requestAvailableMuseums.map((museum) => museum._id as string)
                  )
                  const draftValueRaw = requestMuseumDrafts[request._id] ?? "none"
                  const draftValue =
                    draftValueRaw !== "none" && !requestAvailableMuseumIds.has(draftValueRaw)
                      ? "none"
                      : draftValueRaw

                  return (
                    <li key={request._id} className="rounded-xl border bg-muted/30 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium">{request.orgDisplay ?? request.museumName}</p>
                          <p className="text-muted-foreground text-sm">
                            {request.city}, {request.state}
                            {request.website ? ` · ${request.website}` : ""}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            User: {request.userDisplay ?? request.userId}
                            {request.staffRole ? ` · ${request.staffRole}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant={
                            request.status === "approved"
                              ? "default"
                              : request.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>

                      {request.status === "pending" ? (
                        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
                          <Select
                            value={draftValue}
                            onValueChange={(value) => {
                              const nextValue = value ?? "none"
                              setRequestMuseumDrafts((prev) => ({ ...prev, [request._id]: nextValue }))
                            }}
                          >
                            <SelectTrigger className="w-full md:w-72">
                              <SelectValue placeholder="Assign museum now (optional)">
                                {(value) => {
                                  if (!value || value === "none") return "Assign later"
                                  if (typeof value !== "string") return "Assign museum now (optional)"
                                  return (
                                    requestMuseumNameById.get(value) ?? "Assign museum now (optional)"
                                  )
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Assign later</SelectItem>
                              {requestAvailableMuseums.map((museum) => (
                                <SelectItem key={museum._id} value={museum._id}>
                                  {museum.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => void handleRequestStatus(request, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => void handleRequestStatus(request, "rejected")}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Manage museum linkage and membership for each organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {organizations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No organizations found.</p>
          ) : (
            organizations.map((organization) => {
              const availableMuseums = getAvailableMuseums(organization.linkedMuseumId)
              const museumNameById = new Map(
                availableMuseums.map((museum) => [museum._id as string, museum.name])
              )
              const availableMuseumIds = new Set(
                availableMuseums.map((museum) => museum._id as string)
              )
              const draftValueRaw =
                organizationMuseumDrafts[organization._id] ?? organization.linkedMuseumId ?? "none"
              const draftValue =
                draftValueRaw !== "none" && !availableMuseumIds.has(draftValueRaw)
                  ? "none"
                  : draftValueRaw
              const isBusy = busyKey === `org:${organization._id}`

              return (
                <div key={organization._id} className="rounded-xl border bg-muted/30 p-4">
                  <div className="space-y-1">
                    <p className="font-medium">{organization.name ?? "Unnamed organization"}</p>
                    <p className="text-muted-foreground text-sm">
                      Current museum:{" "}
                      {organization.hasInvalidMuseumContext
                        ? "Invalid museum context"
                        : organization.linkedMuseumName ?? "Unassigned"}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
                    <Select
                      value={draftValue}
                      onValueChange={(value) => {
                        const nextValue = value ?? "none"
                        setOrganizationMuseumDrafts((prev) => ({ ...prev, [organization._id]: nextValue }))
                      }}
                    >
                      <SelectTrigger className="w-full md:w-80">
                        <SelectValue placeholder="Select museum">
                          {(value) => {
                            if (!value || value === "none") return "Unassigned"
                            if (typeof value !== "string") return "Select museum"
                            return museumNameById.get(value) ?? "Select museum"
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {availableMuseums.map((museum) => (
                          <SelectItem key={museum._id} value={museum._id}>
                            {museum.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => void handleOrganizationAssignment(organization)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleOpenMemberDialog(organization)}
                    >
                      Manage members
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={isMemberDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsMemberDialogOpen(false)
            setSelectedOrganizationId(null)
            setMembers(undefined)
            setMemberSearchQuery("")
            setMemberSearchResults([])
            setMemberError(null)
            setMemberSuccess(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedOrganization?.name ?? "Organization"}</AlertDialogTitle>
            <AlertDialogDescription>
              View members, search by email, add users, and remove users from this organization.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            {memberError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {memberError}
              </div>
            ) : null}
            {memberSuccess ? (
              <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                {memberSuccess}
              </div>
            ) : null}

            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-sm font-medium">Add user by email</p>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Search email (min 2 chars)"
                  value={memberSearchQuery}
                  onChange={(event) => setMemberSearchQuery(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isMemberSearchLoading}
                  onClick={() => void handleSearchUsers()}
                >
                  {isMemberSearchLoading ? "Searching..." : "Search"}
                </Button>
              </div>
              {memberSearchResults.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {memberSearchResults.map((user) => {
                    const addKey = `add:${user.email.toLowerCase()}`
                    return (
                      <li
                        key={user.id}
                        className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm"
                      >
                        <span className="truncate">
                          {user.name ? `${user.name} · ` : ""}
                          {user.email}
                        </span>
                        <Button
                          size="sm"
                          disabled={memberBusyKey === addKey}
                          onClick={() => void handleAddUserToOrganization(user.email)}
                        >
                          {memberBusyKey === addKey ? "Adding..." : "Add"}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              ) : memberSearchQuery.trim().length >= 2 && !isMemberSearchLoading ? (
                <p className="text-muted-foreground mt-2 text-xs">No matching users.</p>
              ) : null}
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-sm font-medium">Members</p>
              {members === undefined ? (
                <p className="text-muted-foreground mt-2 text-sm">Loading members...</p>
              ) : members === null ? (
                <p className="text-muted-foreground mt-2 text-sm">Unable to load members.</p>
              ) : members.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">No members yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {members.map((member) => {
                    const removeKey = `remove:${member.userId}`
                    return (
                      <li
                        key={member._id}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            {member.userName ? `${member.userName} · ` : ""}
                            {member.userEmail || member.userId}
                          </p>
                          <p className="text-muted-foreground text-xs">{member.role}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={memberBusyKey === removeKey}
                          onClick={() => void handleRemoveUserFromOrganization(member)}
                        >
                          {memberBusyKey === removeKey ? "Removing..." : "Remove"}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
