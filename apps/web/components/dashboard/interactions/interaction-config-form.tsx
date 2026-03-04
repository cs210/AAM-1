"use client"

import * as React from "react"
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
  const [title, setTitle] = React.useState(initialTitle)
  const [config, setConfig] = React.useState(initialConfig)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const t = title.trim()
    if (!t) {
      setError("Title is required.")
      return
    }
    if (type === "quiz") {
      const q = (config.question as string)?.trim()
      const opts = (config.options as string[]) ?? []
      if (!q) {
        setError("Question is required.")
        return
      }
      if (opts.length < 2) {
        setError("At least two options are required.")
        return
      }
      const correctIndex = Number(config.correctIndex)
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= opts.length) {
        setError("Please select the correct answer (0-based index).")
        return
      }
      onSave(t, { question: q, options: opts, correctIndex })
      return
    }
    if (type === "scavenger_step") {
      const clue = (config.clue as string)?.trim()
      const answer = (config.answer as string)?.trim()
      if (!clue) {
        setError("Clue is required.")
        return
      }
      onSave(t, { clue, answer: answer || undefined })
      return
    }
    if (type === "badge") {
      const badgeName = (config.badgeName as string)?.trim()
      const criteria = (config.criteria as string)?.trim()
      if (!badgeName) {
        setError("Badge name is required.")
        return
      }
      onSave(t, { badgeName, criteria: criteria || undefined })
      return
    }
    if (type === "info_audio") {
      const script = (config.script as string)?.trim()
      if (!script) {
        setError("Script or description is required.")
        return
      }
      onSave(t, { script, audioUrl: (config.audioUrl as string)?.trim() || undefined })
      return
    }
    onSave(t, config)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ia-title">Title</Label>
        <Input
          id="ia-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Quiz: Artist trivia"
        />
      </div>
      {type === "quiz" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="ia-question">Question</Label>
            <Input
              id="ia-question"
              value={(config.question as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, question: e.target.value }))}
              placeholder="What year was this work created?"
            />
          </div>
          <div className="space-y-2">
            <Label>Options (one per line)</Label>
            <Textarea
              value={((config.options as string[]) ?? []).join("\n")}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                }))
              }
              placeholder={"1965\n1970\n1975"}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ia-correct">Correct option index (0 = first)</Label>
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
            <Label htmlFor="ia-clue">Clue</Label>
            <Textarea
              id="ia-clue"
              value={(config.clue as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, clue: e.target.value }))}
              placeholder="Look for the painting with..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ia-answer">Answer (optional)</Label>
            <Input
              id="ia-answer"
              value={(config.answer as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, answer: e.target.value }))}
              placeholder="Exact text to match"
            />
          </div>
        </>
      )}
      {type === "badge" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="ia-badge">Badge name</Label>
            <Input
              id="ia-badge"
              value={(config.badgeName as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, badgeName: e.target.value }))}
              placeholder="e.g. First visit"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ia-criteria">Criteria (optional)</Label>
            <Input
              id="ia-criteria"
              value={(config.criteria as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, criteria: e.target.value }))}
              placeholder="Complete this hall"
            />
          </div>
        </>
      )}
      {type === "info_audio" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="ia-script">Script / description</Label>
            <Textarea
              id="ia-script"
              value={(config.script as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, script: e.target.value }))}
              placeholder="Audio or info content..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ia-audio">Audio URL (optional)</Label>
            <Input
              id="ia-audio"
              value={(config.audioUrl as string) ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, audioUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit">Save interaction</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
