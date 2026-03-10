"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { InteractionType } from "@/components/dashboard/interactions/types"

export function InteractionConfigForm({
  type,
  initialTitle,
  initialConfig,
  onSave,
  onCancel,
}: {
  type: InteractionType
  initialTitle: string
  initialConfig: Record<string, unknown>
  onSave: (title: string, config: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const t = useTranslations("dashboard.interactions.configForm")
  const tCommon = useTranslations("common")
  const [title, setTitle] = React.useState(initialTitle)
  const [config, setConfig] = React.useState(initialConfig)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = title.trim()
    if (!trimmed) {
      setError(t("titleRequired"))
      return
    }
    if (type === "quiz") {
      const q = (config.question as string)?.trim()
      const opts = (config.options as string[]) ?? []
      if (!q) {
        setError(t("questionRequired"))
        return
      }
      if (opts.length < 2) {
        setError(t("atLeastTwoOptions"))
        return
      }
      const correctIndex = Number(config.correctIndex)
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= opts.length) {
        setError(t("selectCorrectAnswer"))
        return
      }
      onSave(trimmed, { question: q, options: opts, correctIndex })
      return
    }
    if (type === "scavenger_step") {
      const clue = (config.clue as string)?.trim()
      const answer = (config.answer as string)?.trim()
      if (!clue) {
        setError(t("clueRequired"))
        return
      }
      onSave(trimmed, { clue, answer: answer || undefined })
      return
    }
    if (type === "badge") {
      const badgeName = (config.badgeName as string)?.trim()
      const criteria = (config.criteria as string)?.trim()
      if (!badgeName) {
        setError(t("badgeNameRequired"))
        return
      }
      onSave(trimmed, { badgeName, criteria: criteria || undefined })
      return
    }
    if (type === "info_audio") {
      const script = (config.script as string)?.trim()
      if (!script) {
        setError(t("scriptRequired"))
        return
      }
      onSave(trimmed, { script, audioUrl: (config.audioUrl as string)?.trim() || undefined })
      return
    }
    onSave(trimmed, config)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ia-title">{t("title")}</Label>
        <Input
          id="ia-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
        />
      </div>
      {type === "quiz" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="ia-question">{t("question")}</Label>
            <Input
              id="ia-question"
              value={(config.question as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, question: e.target.value }))}
              placeholder={t("questionPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("options")}</Label>
            <Textarea
              value={((config.options as string[]) ?? []).join("\n")}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                }))
              }
              placeholder={t("optionsPlaceholder")}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ia-correct">{t("correctIndex")}</Label>
            <Input
              id="ia-correct"
              type="number"
              min={0}
              value={Number(config.correctIndex) ?? 0}
              onChange={(e) =>
                setConfig((c) => ({ ...c, correctIndex: parseInt(e.target.value, 10) || 0 }))
              }
            />
          </div>
        </>
      )}
      {type === "scavenger_step" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="ia-clue">{t("clue")}</Label>
            <Textarea
              id="ia-clue"
              value={(config.clue as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, clue: e.target.value }))}
              placeholder={t("cluePlaceholder")}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ia-answer">{t("answerOptional")}</Label>
            <Input
              id="ia-answer"
              value={(config.answer as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, answer: e.target.value }))}
              placeholder={t("answerPlaceholder")}
            />
          </div>
        </>
      )}
      {type === "badge" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="ia-badge">{t("badgeName")}</Label>
            <Input
              id="ia-badge"
              value={(config.badgeName as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, badgeName: e.target.value }))}
              placeholder={t("badgeNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ia-criteria">{t("criteriaOptional")}</Label>
            <Input
              id="ia-criteria"
              value={(config.criteria as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, criteria: e.target.value }))}
              placeholder={t("criteriaPlaceholder")}
            />
          </div>
        </>
      )}
      {type === "info_audio" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="ia-script">{t("scriptDescription")}</Label>
            <Textarea
              id="ia-script"
              value={(config.script as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, script: e.target.value }))}
              placeholder={t("scriptPlaceholder")}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ia-audio">{t("audioUrlOptional")}</Label>
            <Input
              id="ia-audio"
              value={(config.audioUrl as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, audioUrl: e.target.value }))}
              placeholder={t("audioUrlPlaceholder")}
            />
          </div>
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit">{t("saveInteraction")}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
      </div>
    </form>
  )
}
