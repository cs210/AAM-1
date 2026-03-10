"use client"

import * as React from "react"
import { useAction } from "convex/react"
import { useTranslations } from "next-intl"
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
  { value: "member", key: "member" },
  { value: "admin", key: "admin" },
  { value: "owner", key: "owner" },
] as const

type OrgRow = { _id: string; name?: string; slug?: string }

export function AdminInvitations() {
  const t = useTranslations("dashboard.adminInvitations")
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
    listOrgs()
      .then((rows) => setOrgs((rows as OrgRow[]) ?? []))
      .catch(() => setOrgs(null))
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
      setError(res.error.message ?? t("errors.sendFailed"))
    } else {
      setSuccess(t("success", { email: email.trim() }))
      setEmail("")
      loadOrgs()
    }
  }

  const orgList = orgs ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {orgs === undefined ? (
          <p className="text-muted-foreground text-sm">{t("loading")}</p>
        ) : orgList.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
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
                <Label htmlFor="invite-email">{t("fields.email")}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder={t("placeholders.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-org">{t("fields.organization")}</Label>
                <Select value={organizationId} onValueChange={(v) => setOrganizationId(v ?? "")} required>
                  <SelectTrigger id="invite-org">
                    <SelectValue placeholder={t("placeholders.organization")} />
                  </SelectTrigger>
                  <SelectContent>
                    {orgList.map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name ?? org._id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">{t("fields.role")}</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "member" | "admin" | "owner")}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {t(`roles.${r.key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("sending") : t("send")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
