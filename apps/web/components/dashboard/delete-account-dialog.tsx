"use client"

import * as React from "react"
import { Trash2Icon } from "lucide-react"
import { useQuery } from "convex/react"
import { useTranslations } from "next-intl"
import { api } from "@packages/backend/convex/_generated/api"

import { useRouter } from "@/i18n/navigation"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type DeleteAccountDialogProps = {
  className?: string
  size?: "sm" | "default"
  variant?: "destructive" | "outline" | "ghost" | "link"
}

type OrganizationRow = {
  _id: string
  name?: string
  memberRole?: string | null
}

export function DeleteAccountDialog({
  className,
  size = "sm",
  variant = "destructive",
}: DeleteAccountDialogProps) {
  const t = useTranslations("dashboard.accountDeletion")
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const organizations = useQuery(api.admin.listMyOrganizations) as OrganizationRow[] | undefined
  const ownedOrganizations = React.useMemo(
    () => (organizations ?? []).filter((organization) => organization.memberRole === "owner"),
    [organizations]
  )
  const isLoadingOrganizations = organizations === undefined

  const reset = React.useCallback(() => {
    setPassword("")
    setError(null)
  }, [])

  const onOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (isDeleting) return
      setOpen(nextOpen)
      if (!nextOpen) reset()
    },
    [isDeleting, reset],
  )

  const deleteAccount = async () => {
    const trimmedPassword = password.trim()
    if (!trimmedPassword || isDeleting || isLoadingOrganizations) return

    setError(null)
    setIsDeleting(true)
    const { error: deleteError } = await authClient.deleteUser({
      password: trimmedPassword,
      callbackURL: "/sign-in",
    })

    if (deleteError) {
      setError(deleteError.message ?? t("error"))
      setIsDeleting(false)
      return
    }

    reset()
    setOpen(false)
    router.push("/sign-in")
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("gap-2", className)}
        onClick={() => setOpen(true)}
      >
        <Trash2Icon className="size-4" />
        {t("button")}
      </Button>

      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("description")}</AlertDialogDescription>
          </AlertDialogHeader>

          {ownedOrganizations.length > 0 ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <p className="font-medium">{t("ownerWarningTitle")}</p>
              <p className="mt-1">{t("ownerWarningDescription")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {ownedOrganizations.map((organization) => (
                  <li key={organization._id}>{organization.name ?? organization._id}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="delete-account-password">
              {t("passwordLabel")}
            </Label>
            <Input
              id="delete-account-password"
              type="password"
              value={password}
              autoComplete="current-password"
              disabled={isDeleting}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void deleteAccount()
                }
              }}
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={!password.trim() || isDeleting || isLoadingOrganizations}
              onClick={() => void deleteAccount()}
            >
              {isDeleting ? t("deleting") : t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
