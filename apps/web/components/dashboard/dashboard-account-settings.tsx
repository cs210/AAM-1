"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { useTranslations } from "next-intl"
import { Loader2Icon } from "lucide-react"
import { api } from "@packages/backend/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function normalizeUsernameInput(raw: string) {
  return raw.trim().toLowerCase()
}

function getUsernameFormatError(raw: string): "tooShort" | "tooLong" | "invalidChars" | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length < 3) return "tooShort"
  if (trimmed.length > 30) return "tooLong"
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return "invalidChars"
  return null
}

export function DashboardAccountSettings() {
  const t = useTranslations("dashboard.account")
  const profile = useQuery(api.userProfiles.getCurrentUserProfile)
  const setUsername = useMutation(api.userProfiles.setUsername)
  const [username, setUsernameValue] = React.useState("")
  const [debouncedUsername, setDebouncedUsername] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (profile?.username) {
      setUsernameValue(profile.username)
    }
  }, [profile?.username])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedUsername(normalizeUsernameInput(username))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [username])

  const formatErrorKey = getUsernameFormatError(username)
  const availability = useQuery(
    api.userProfiles.isUsernameAvailable,
    debouncedUsername.length >= 3 && !formatErrorKey ? { username: debouncedUsername } : "skip",
  )

  const usernameChanged = normalizeUsernameInput(username) !== (profile?.username ?? "")
  const canSave =
    usernameChanged &&
    !formatErrorKey &&
    Boolean(username.trim()) &&
    availability?.available === true &&
    !saving

  const availabilityMessage = React.useMemo(() => {
    if (!username.trim()) return null
    if (formatErrorKey === "tooShort") return t("errors.tooShort")
    if (formatErrorKey === "tooLong") return t("errors.tooLong")
    if (formatErrorKey === "invalidChars") return t("errors.invalidChars")
    if (debouncedUsername !== normalizeUsernameInput(username)) return null
    if (availability === undefined) return t("checking")
    if (availability.available) return t("available")
    return availability.reason ?? t("errors.taken")
  }, [availability, debouncedUsername, formatErrorKey, t, username])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) return

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await setUsername({ username: normalizeUsernameInput(username) })
      setSuccess(t("saved"))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("errors.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  if (profile === undefined) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-muted-foreground text-center text-sm">{t("loading")}</div>
        </CardContent>
      </Card>
    )
  }

  if (profile === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("emptyState")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="space-y-4">
          {profile.username ? (
            <div className="text-muted-foreground text-sm">
              {t("currentUsername", { username: profile.username })}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">{t("emptyState")}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="account-username">{t("usernameLabel")}</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                @
              </span>
              <Input
                id="account-username"
                value={username}
                onChange={(event) => setUsernameValue(event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={t("usernamePlaceholder")}
                className="pl-8"
              />
            </div>
            {availabilityMessage ? (
              <p
                className={
                  availability?.available && !formatErrorKey
                    ? "text-sm text-green-600 dark:text-green-400"
                    : "text-destructive text-sm"
                }
              >
                {availabilityMessage}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">{t("usernameHint")}</p>
            )}
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          {success ? <p className="text-sm text-green-600 dark:text-green-400">{success}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={!canSave}>
            {saving ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("save")
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
