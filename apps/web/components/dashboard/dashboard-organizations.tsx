"use client"

import * as React from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import { useTranslations } from "next-intl"
import { api } from "@packages/backend/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
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

type OrgRow = {
  _id: string
  name?: string
  slug?: string
  memberRole?: string | null
  linkedMuseumId?: string | null
  linkedMuseumName?: string | null
  hasInvalidMuseumContext?: boolean
}

type OrgMemberRow = {
  _id: string
  organizationId: string
  userId: string
  role: "member" | "admin" | "owner"
  createdAt: number
  userName?: string
  userEmail?: string
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

export function DashboardOrganizations() {
  const t = useTranslations("dashboard.organizations")
  const tShell = useTranslations("dashboard.shell")
  const tCommon = useTranslations("common")
  const user = useQuery(api.auth.getCurrentUser)
  const isAdmin = (user as { role?: string } | null)?.role === "admin"
  const userId = (user as { _id?: string } | null | undefined)?._id ?? null
  const myOrgs = useQuery(api.admin.listMyOrganizations) as OrgRow[] | undefined
  const listOrganizationMembersForOwner = useAction(api.admin.listOrganizationMembersForOwner)
  const searchUsersByEmailForOwner = useAction(api.admin.searchUsersByEmailForOwner)
  const submitRequest = useMutation(api.organizationRequests.submitRequest)
  const addUserToOrganizationByEmailForOwner = useMutation(api.admin.addUserToOrganizationByEmailForOwner)
  const removeUserFromOrganizationForOwner = useMutation(api.admin.removeUserFromOrganizationForOwner)
  const transferOrganizationOwnership = useMutation(api.admin.transferOrganizationOwnership)

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [museumName, setMuseumName] = React.useState("")
  const [city, setCity] = React.useState("")
  const [state, setState] = React.useState("")
  const [website, setWebsite] = React.useState("")
  const [staffRole, setStaffRole] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [memberOrganization, setMemberOrganization] = React.useState<OrgRow | null>(null)
  const [memberManagementMembers, setMemberManagementMembers] = React.useState<
    OrgMemberRow[] | null | undefined
  >(undefined)
  const [memberSearchQuery, setMemberSearchQuery] = React.useState("")
  const [memberSearchResults, setMemberSearchResults] = React.useState<
    { id: string; name?: string; email: string }[]
  >([])
  const [memberError, setMemberError] = React.useState<string | null>(null)
  const [memberSuccess, setMemberSuccess] = React.useState<string | null>(null)
  const [isMemberSearchLoading, setIsMemberSearchLoading] = React.useState(false)
  const [memberBusyKey, setMemberBusyKey] = React.useState<string | null>(null)
  const [transferOrganization, setTransferOrganization] = React.useState<OrgRow | null>(null)
  const [transferMembers, setTransferMembers] = React.useState<OrgMemberRow[] | null | undefined>(undefined)
  const [transferUserId, setTransferUserId] = React.useState("")
  const [transferError, setTransferError] = React.useState<string | null>(null)
  const [isTransferring, setIsTransferring] = React.useState(false)

  const transferCandidates = React.useMemo(
    () => (transferMembers ?? []).filter((member) => member.userId !== userId),
    [transferMembers, userId]
  )
  const transferMemberLabelById = React.useMemo(() => {
    return new Map(
      transferCandidates.map((member) => [
        member.userId,
        member.userName
          ? `${member.userName} · ${member.userEmail || member.userId}`
          : member.userEmail || member.userId,
      ])
    )
  }, [transferCandidates])

  const handleCreateOrganization = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const name = museumName.trim()
    const locationCity = city.trim()
    const locationState = state.trim()
    const orgSlug = slugify(name)
    if (!name || !locationCity || !locationState || !orgSlug) {
      setError(tShell("completeRequiredMuseumDetails"))
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
        setError(orgError.message ?? tShell("unableToCreateWorkspace"))
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

      setSuccess(t("createSuccess", { name }))
      setMuseumName("")
      setCity("")
      setState("")
      setWebsite("")
      setStaffRole("")
      setIsCreateOpen(false)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : tShell("somethingWentWrong"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadOwnerMembers = React.useCallback(
    async (organizationId: string) => {
      const members = (await listOrganizationMembersForOwner({
        organizationId,
      })) as OrgMemberRow[]
      return members
    },
    [listOrganizationMembersForOwner]
  )

  const handleOpenMemberDialog = React.useCallback(
    async (organization: OrgRow) => {
      setMemberOrganization(organization)
      setMemberManagementMembers(undefined)
      setMemberSearchQuery("")
      setMemberSearchResults([])
      setMemberError(null)
      setMemberSuccess(null)
      try {
        setMemberManagementMembers(await loadOwnerMembers(organization._id))
      } catch (membersError) {
        setMemberManagementMembers(null)
        setMemberError(membersError instanceof Error ? membersError.message : t("errors.loadMembers"))
      }
    },
    [loadOwnerMembers, t]
  )

  const handleSearchUsers = React.useCallback(async () => {
    const query = memberSearchQuery.trim()
    if (!memberOrganization || query.length < 2) {
      setMemberSearchResults([])
      return
    }

    setIsMemberSearchLoading(true)
    setMemberError(null)
    try {
      const results = (await searchUsersByEmailForOwner({
        organizationId: memberOrganization._id,
        emailQuery: query,
        limit: 10,
      })) as { id: string; name?: string; email: string }[]
      const existingMemberIds = new Set((memberManagementMembers ?? []).map((member) => member.userId))
      setMemberSearchResults(results.filter((result) => !existingMemberIds.has(result.id)))
    } catch (searchError) {
      setMemberError(searchError instanceof Error ? searchError.message : t("errors.searchUsers"))
    } finally {
      setIsMemberSearchLoading(false)
    }
  }, [memberManagementMembers, memberOrganization, memberSearchQuery, searchUsersByEmailForOwner, t])

  const handleAddMember = React.useCallback(
    async (email: string) => {
      if (!memberOrganization) return
      const normalizedEmail = email.trim()
      if (!normalizedEmail) return

      setMemberBusyKey(`add:${normalizedEmail.toLowerCase()}`)
      setMemberError(null)
      setMemberSuccess(null)
      try {
        await addUserToOrganizationByEmailForOwner({
          organizationId: memberOrganization._id,
          email: normalizedEmail,
        })
        setMemberSuccess(t("memberAdded", { email: normalizedEmail }))
        setMemberManagementMembers(await loadOwnerMembers(memberOrganization._id))
        setMemberSearchResults((results) =>
          results.filter((result) => result.email.toLowerCase() !== normalizedEmail.toLowerCase())
        )
      } catch (addError) {
        setMemberError(addError instanceof Error ? addError.message : t("errors.addUser"))
      } finally {
        setMemberBusyKey(null)
      }
    },
    [addUserToOrganizationByEmailForOwner, loadOwnerMembers, memberOrganization, t]
  )

  const handleRemoveMember = React.useCallback(
    async (member: OrgMemberRow) => {
      if (!memberOrganization) return

      setMemberBusyKey(`remove:${member.userId}`)
      setMemberError(null)
      setMemberSuccess(null)
      try {
        await removeUserFromOrganizationForOwner({
          organizationId: memberOrganization._id,
          userId: member.userId,
        })
        setMemberSuccess(t("memberRemoved", { email: member.userEmail || member.userId }))
        setMemberManagementMembers(await loadOwnerMembers(memberOrganization._id))
      } catch (removeError) {
        setMemberError(removeError instanceof Error ? removeError.message : t("errors.removeUser"))
      } finally {
        setMemberBusyKey(null)
      }
    },
    [loadOwnerMembers, memberOrganization, removeUserFromOrganizationForOwner, t]
  )

  const handleOpenTransferDialog = React.useCallback(
    async (organization: OrgRow) => {
      setTransferOrganization(organization)
      setTransferMembers(undefined)
      setTransferUserId("")
      setTransferError(null)
      try {
        const members = await loadOwnerMembers(organization._id)
        setTransferMembers(members)
        const firstCandidate = members.find((member) => member.userId !== userId)
        setTransferUserId(firstCandidate?.userId ?? "")
      } catch (membersError) {
        setTransferMembers(null)
        setTransferError(membersError instanceof Error ? membersError.message : t("errors.loadMembers"))
      }
    },
    [loadOwnerMembers, t, userId]
  )

  const handleTransferOwnership = React.useCallback(async () => {
    if (!transferOrganization || !transferUserId) return
    setIsTransferring(true)
    setTransferError(null)
    setSuccess(null)
    try {
      await transferOrganizationOwnership({
        organizationId: transferOrganization._id,
        toUserId: transferUserId,
      })
      setSuccess(
        t("transferSuccess", {
          name: transferOrganization.name ?? transferOrganization._id,
        })
      )
      setTransferOrganization(null)
      setTransferMembers(undefined)
      setTransferUserId("")
    } catch (transferOwnershipError) {
      setTransferError(
        transferOwnershipError instanceof Error
          ? transferOwnershipError.message
          : t("errors.transferOwnership")
      )
    } finally {
      setIsTransferring(false)
    }
  }, [transferOrganization, transferOrganizationOwnership, transferUserId, t])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{t("title")}</CardTitle>
            {!isAdmin && (
              <Button type="button" size="sm" onClick={() => setIsCreateOpen(true)}>
                {t("requestNewOrganization")}
              </Button>
            )}
          </div>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mb-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          ) : null}
          {myOrgs === undefined ? (
            <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
          ) : myOrgs.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          ) : (
            <ul className="space-y-2">
              {myOrgs.map((org: OrgRow) => (
                <li key={org._id} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{org.name ?? org._id}</p>
                      <p className="text-muted-foreground text-xs">{org._id}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t("museumLabel")}
                        {org.hasInvalidMuseumContext
                          ? tShell("invalidMuseumContext")
                          : org.linkedMuseumName ?? tShell("museumNotAssigned")}
                      </p>
                      {org.memberRole ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {t("roleLabel")}
                          {org.memberRole === "owner" ? t("roles.owner") : t("roles.member")}
                        </p>
                      ) : null}
                    </div>
                    {org.memberRole === "owner" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleOpenMemberDialog(org)}
                        >
                          {t("manageMembers")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleOpenTransferDialog(org)}
                        >
                          {t("transferOwnership")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isCreateOpen} onOpenChange={(open) => !isSubmitting && setIsCreateOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("requestDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("requestDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form id="request-organization-form" className="space-y-3" onSubmit={handleCreateOrganization}>
            <Input
              id="request-organization-name"
              placeholder={t("museumNamePlaceholder")}
              value={museumName}
              onChange={(event) => setMuseumName(event.target.value)}
              disabled={isSubmitting}
              required
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                id="request-organization-city"
                placeholder={t("cityPlaceholder")}
                value={city}
                onChange={(event) => setCity(event.target.value)}
                disabled={isSubmitting}
                required
              />
              <Input
                id="request-organization-state"
                placeholder={t("statePlaceholder")}
                value={state}
                onChange={(event) => setState(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <Input
              id="request-organization-website"
              placeholder={t("websitePlaceholder")}
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              disabled={isSubmitting}
            />
            <Input
              id="request-organization-role"
              placeholder={t("rolePlaceholder")}
              value={staffRole}
              onChange={(event) => setStaffRole(event.target.value)}
              disabled={isSubmitting}
            />
          </form>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="request-organization-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("submitting") : t("submitRequest")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={memberOrganization !== null}
        onOpenChange={(open) => {
          if (!open && !memberBusyKey) {
            setMemberOrganization(null)
            setMemberManagementMembers(undefined)
            setMemberSearchQuery("")
            setMemberSearchResults([])
            setMemberError(null)
            setMemberSuccess(null)
          }
        }}
      >
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-3xl sm:max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{memberOrganization?.name ?? t("organizationFallback")}</AlertDialogTitle>
            <AlertDialogDescription>{t("membersDialogDescription")}</AlertDialogDescription>
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
              <p className="text-sm font-medium">{t("addUserByEmail")}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input
                  className="min-w-0"
                  placeholder={t("searchEmailPlaceholder")}
                  value={memberSearchQuery}
                  onChange={(event) => setMemberSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handleSearchUsers()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  disabled={isMemberSearchLoading}
                  onClick={() => void handleSearchUsers()}
                >
                  {isMemberSearchLoading ? t("searching") : t("search")}
                </Button>
              </div>

              {memberSearchResults.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {memberSearchResults.map((searchUser) => {
                    const addKey = `add:${searchUser.email.toLowerCase()}`
                    return (
                      <li
                        key={searchUser.id}
                        className="grid gap-2 rounded-lg border bg-background px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <span className="min-w-0 truncate self-center">
                          {searchUser.name ? `${searchUser.name} · ` : ""}
                          {searchUser.email}
                        </span>
                        <Button
                          size="sm"
                          disabled={memberBusyKey === addKey}
                          onClick={() => void handleAddMember(searchUser.email)}
                        >
                          {memberBusyKey === addKey ? t("adding") : t("add")}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              ) : memberSearchQuery.trim().length >= 2 && !isMemberSearchLoading ? (
                <p className="text-muted-foreground mt-2 text-xs">{t("noMatchingUsers")}</p>
              ) : null}
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-sm font-medium">{t("members")}</p>
              {memberManagementMembers === undefined ? (
                <p className="text-muted-foreground mt-2 text-sm">{t("loadingMembers")}</p>
              ) : memberManagementMembers === null ? (
                <p className="text-muted-foreground mt-2 text-sm">{t("unableToLoadMembers")}</p>
              ) : memberManagementMembers.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">{t("noMembers")}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {memberManagementMembers.map((member) => (
                    <li
                      key={member._id}
                      className="grid gap-2 rounded-lg border bg-background px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <span className="min-w-0 truncate">
                        {member.userName ? `${member.userName} · ` : ""}
                        {member.userEmail || member.userId}
                      </span>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <span className="text-muted-foreground text-xs">
                          {member.role === "owner" ? t("roles.owner") : t("roles.member")}
                        </span>
                        {member.role !== "owner" && member.userId !== userId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={memberBusyKey === `remove:${member.userId}`}
                            onClick={() => void handleRemoveMember(member)}
                          >
                            {memberBusyKey === `remove:${member.userId}` ? t("removing") : t("remove")}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(memberBusyKey)}>
              {tCommon("close")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={transferOrganization !== null}
        onOpenChange={(open) => {
          if (!open && !isTransferring) {
            setTransferOrganization(null)
            setTransferMembers(undefined)
            setTransferUserId("")
            setTransferError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("transferDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("transferDialogDescription", {
                name: transferOrganization?.name ?? t("organizationFallback"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            {transferError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {transferError}
              </div>
            ) : null}

            {transferMembers === undefined ? (
              <p className="text-muted-foreground text-sm">{t("loadingMembers")}</p>
            ) : transferMembers === null ? (
              <p className="text-muted-foreground text-sm">{t("unableToLoadMembers")}</p>
            ) : transferCandidates.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("noTransferMembers")}</p>
            ) : (
              <Select
                value={transferUserId}
                disabled={isTransferring}
                onValueChange={(value) => setTransferUserId(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectNewOwner")}>
                    {(value) =>
                      typeof value === "string"
                        ? transferMemberLabelById.get(value) ?? t("selectNewOwner")
                        : t("selectNewOwner")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {transferCandidates.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.userName ? `${member.userName} · ` : ""}
                      {member.userEmail || member.userId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferring}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={!transferUserId || transferCandidates.length === 0 || isTransferring}
              onClick={() => void handleTransferOwnership()}
            >
              {isTransferring ? t("transferring") : t("transfer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
