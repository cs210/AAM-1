"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
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

type OrgRow = {
  _id: string
  name?: string
  slug?: string
  linkedMuseumId?: string | null
  linkedMuseumName?: string | null
  hasInvalidMuseumContext?: boolean
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
  const myOrgs = useQuery(api.admin.listMyOrganizations) as OrgRow[] | undefined
  const submitRequest = useMutation(api.organizationRequests.submitRequest)

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [museumName, setMuseumName] = React.useState("")
  const [city, setCity] = React.useState("")
  const [state, setState] = React.useState("")
  const [website, setWebsite] = React.useState("")
  const [staffRole, setStaffRole] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

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
                  <p className="font-medium">{org.name ?? org._id}</p>
                  <p className="text-muted-foreground text-xs">{org._id}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("museumLabel")}
                    {org.hasInvalidMuseumContext
                      ? tShell("invalidMuseumContext")
                      : org.linkedMuseumName ?? tShell("museumNotAssigned")}
                  </p>
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
    </div>
  )
}
