"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { ArrowDownIcon, ArrowUpIcon, StarIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sanitizeExternalUrl } from "@/lib/security"

type MuseumImageManagerProps = {
  museumId: string
  onPrimaryImageChange?: (nextImageUrl: string | null) => void
}

type MuseumImageRow = {
  _id: Id<"museumImages">
  museumId: Id<"museums">
  imageUrl: string
  storageId?: Id<"_storage">
  alt?: string
  sortOrder: number
  isPrimary: boolean
}

type AddMuseumImageResult = {
  imageId: Id<"museumImages">
  imageUrl: string
  isPrimary: boolean
}

type SetPrimaryMuseumImageResult = {
  imageUrl: string
}

type DeleteMuseumImageResult = {
  nextPrimaryImageUrl: string | null
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function MuseumImageManager({ museumId, onPrimaryImageChange }: MuseumImageManagerProps) {
  const t = useTranslations("dashboard.images")
  const convexMuseumId = museumId as Id<"museums">
  const images = useQuery(api.museums.listMuseumImagesForDashboard, { museumId: convexMuseumId }) as
    | MuseumImageRow[]
    | undefined

  const addImage = useMutation(api.museums.addMuseumImageForDashboard)
  const generateUploadUrl = useMutation(api.museums.generateMuseumImageUploadUrl)
  const setPrimary = useMutation(api.museums.setPrimaryMuseumImageForDashboard)
  const deleteImage = useMutation(api.museums.deleteMuseumImageForDashboard)
  const reorderImages = useMutation(api.museums.reorderMuseumImagesForDashboard)

  const [urlDraft, setUrlDraft] = React.useState("")
  const [altDraft, setAltDraft] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const imageList = React.useMemo(
    () => (images ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [images]
  )

  const handleAddByUrl = async () => {
    const imageUrl = urlDraft.trim()
    if (!imageUrl) {
      setError(t("imageUrlRequired"))
      return
    }

    setError(null)
    setSaving(true)
    try {
      const result = (await addImage({
        museumId: convexMuseumId,
        imageUrl,
        alt: optionalText(altDraft),
      })) as AddMuseumImageResult
      if (result.isPrimary) {
        onPrimaryImageChange?.(result.imageUrl)
      }
      setUrlDraft("")
      setAltDraft("")
    } catch (e) {
      setError(e instanceof Error ? e.message : t("addFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setError(null)
    setSaving(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          continue
        }

        const uploadUrl = await generateUploadUrl({ museumId: convexMuseumId })
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: file.type ? { "Content-Type": file.type } : undefined,
          body: file,
        })
        if (!uploadResponse.ok) {
          throw new Error(t("uploadFileFailed"))
        }
        const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> }
        const result = (await addImage({
          museumId: convexMuseumId,
          storageId,
          alt: optionalText(altDraft) ?? file.name,
        })) as AddMuseumImageResult
        if (result.isPrimary) {
          onPrimaryImageChange?.(result.imageUrl)
        }
      }
      setAltDraft("")
    } catch (e) {
      setError(e instanceof Error ? e.message : t("uploadFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleSetPrimary = async (image: MuseumImageRow) => {
    setError(null)
    setSaving(true)
    try {
      const result = (await setPrimary({
        museumId: convexMuseumId,
        imageId: image._id,
      })) as SetPrimaryMuseumImageResult
      onPrimaryImageChange?.(result.imageUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("setPrimaryFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (image: MuseumImageRow) => {
    setError(null)
    setSaving(true)
    try {
      const result = (await deleteImage({
        museumId: convexMuseumId,
        imageId: image._id,
      })) as DeleteMuseumImageResult
      onPrimaryImageChange?.(result.nextPrimaryImageUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("deleteFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleMove = async (image: MuseumImageRow, direction: "up" | "down") => {
    const currentIndex = imageList.findIndex((entry) => entry._id === image._id)
    if (currentIndex === -1) return

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= imageList.length) return

    const reordered = [...imageList]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    setError(null)
    setSaving(true)
    try {
      await reorderImages({
        museumId: convexMuseumId,
        orderedImageIds: reordered.map((entry) => entry._id),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t("reorderFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div>
        <Label>{t("title")}</Label>
        <p className="text-muted-foreground mt-1 text-xs">
          {t("description")}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
        <Input
          type="url"
          placeholder={t("urlPlaceholder")}
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          disabled={saving}
        />
        <Input
          placeholder={t("altPlaceholder")}
          value={altDraft}
          onChange={(event) => setAltDraft(event.target.value)}
          disabled={saving}
        />
        <Button type="button" onClick={handleAddByUrl} disabled={saving}>
          {t("addUrl")}
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Input
          type="file"
          accept="image/*"
          multiple
          disabled={saving}
          onChange={(event) => {
            void handleUploadFiles(event.target.files)
            event.currentTarget.value = ""
          }}
        />
        <span className="text-muted-foreground inline-flex items-center text-xs">
          <UploadIcon className="mr-1 size-3.5" />
          {t("uploadHint")}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {images === undefined ? (
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      ) : imageList.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {imageList.map((image, index) => (
            (() => {
              const safeImageUrl = sanitizeExternalUrl(image.imageUrl)
              return (
            <div key={image._id} className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div
                className="aspect-4/3 rounded-md bg-cover bg-center"
                style={{
                  backgroundImage: safeImageUrl
                    ? `url(${safeImageUrl})`
                    : "linear-gradient(135deg, rgba(15,23,42,0.12), rgba(15,23,42,0.35))",
                }}
              />
              <div className="space-y-1">
                <p className="truncate text-sm font-medium">
                  {image.alt?.trim() || t("untitled")}
                </p>
                <p className="text-muted-foreground truncate text-xs">{image.imageUrl}</p>
                {image.isPrimary && (
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {t("primaryCardImage")}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={image.isPrimary ? "default" : "outline"}
                  onClick={() => handleSetPrimary(image)}
                  disabled={saving || image.isPrimary}
                >
                  <StarIcon className="mr-1 size-3.5" />
                  {image.isPrimary ? t("primary") : t("setPrimary")}
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => handleMove(image, "up")}
                  disabled={saving || index === 0}
                  aria-label={t("moveUp")}
                >
                  <ArrowUpIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => handleMove(image, "down")}
                  disabled={saving || index === imageList.length - 1}
                  aria-label={t("moveDown")}
                >
                  <ArrowDownIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  onClick={() => handleDelete(image)}
                  disabled={saving}
                  aria-label={t("delete")}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
              )
            })()
          ))}
        </div>
      )}
    </div>
  )
}
