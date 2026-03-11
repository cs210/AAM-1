"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import {
  GripVerticalIcon,
  ImageIcon,
  ImagePlusIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type MuseumImage = {
  id: string
  previewUrl: string
  source: "upload" | "url"
  name: string
}

export function ImageManager() {
  const t = useTranslations("dashboard.images")
  const [images, setImages] = React.useState<MuseumImage[]>([])
  const [heroImageId, setHeroImageId] = React.useState<string | null>(null)
  const [urlDraft, setUrlDraft] = React.useState("")
  const [draggedImageId, setDraggedImageId] = React.useState<string | null>(null)
  const imagesRef = React.useRef<MuseumImage[]>([])
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const heroImage = images.find((image) => image.id === heroImageId) ?? null

  const addImages = React.useCallback((incomingImages: MuseumImage[]) => {
    if (!incomingImages.length) {
      return
    }

    setImages((prev) => [...prev, ...incomingImages])
    setHeroImageId((current) => current ?? incomingImages[0]?.id ?? null)
  }, [])

  const handleImageFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []).filter((file) =>
        file.type.startsWith("image/")
      )
      const nextImages = files.map((file) => ({
        id: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(file),
        source: "upload" as const,
        name: file.name,
      }))

      addImages(nextImages)
      event.target.value = ""
    },
    [addImages]
  )

  const handleAddImageByUrl = () => {
    const url = urlDraft.trim()
    if (!url) {
      return
    }

    addImages([
      {
        id: crypto.randomUUID(),
        previewUrl: url,
        source: "url",
        name: "Linked image",
      },
    ])
    setUrlDraft("")
  }

  const removeImage = (image: MuseumImage) => {
    setImages((prev) => prev.filter((item) => item.id !== image.id))
    if (image.source === "upload") {
      URL.revokeObjectURL(image.previewUrl)
    }
    setHeroImageId((currentHeroId) => {
      if (currentHeroId !== image.id) {
        return currentHeroId
      }
      const next = imagesRef.current.find((item) => item.id !== image.id)
      return next?.id ?? null
    })
  }

  const reorderImages = (fromImageId: string, toImageId: string) => {
    if (fromImageId === toImageId) {
      return
    }
    setImages((prev) => {
      const fromIndex = prev.findIndex((image) => image.id === fromImageId)
      const toIndex = prev.findIndex((image) => image.id === toImageId)

      if (fromIndex === -1 || toIndex === -1) {
        return prev
      }

      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const handleDropFiles = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    )
    const nextImages = files.map((file) => ({
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      source: "upload" as const,
      name: file.name,
    }))
    addImages(nextImages)
  }

  React.useEffect(() => {
    imagesRef.current = images
  }, [images])

  React.useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => {
        if (image.source === "upload") {
          URL.revokeObjectURL(image.previewUrl)
        }
      })
    }
  }, [])

  return (
    <Field>
      <FieldLabel className="mb-1">{t("title")}</FieldLabel>
      <div className="rounded-xl border p-4">
        <FieldGroup>
          <FieldDescription>
            {t("description")}
          </FieldDescription>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="url"
              placeholder={t("urlPlaceholderPaste")}
              value={urlDraft}
              onChange={(event) => setUrlDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleAddImageByUrl()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={handleAddImageByUrl}>
              {t("addUrl")}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleImageFileChange}
          />
          <div
            className="bg-muted/20 hover:bg-muted/35 rounded-xl border border-dashed p-6 text-center transition-colors"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropFiles}
          >
            <ImagePlusIcon className="text-muted-foreground mx-auto size-5" />
            <p className="mt-2 text-sm font-medium">{t("dropImagesHere")}</p>
            <p className="text-muted-foreground text-xs">{t("orChooseFiles")}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => fileInputRef.current?.click()}
            >
              {t("selectImages")}
            </Button>
          </div>

          {heroImage ? (
            <div className="flex items-center justify-between rounded-xl border bg-muted/25 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <StarIcon className="size-4 fill-current" />
                {t("heroImageLabel")} <span className="font-medium">{heroImage.name || t("selectedImage")}</span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setHeroImageId(null)}>
                {t("clear")}
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {images.length > 0 ? (
              images.map((image) => {
                const isHero = heroImageId === image.id
                return (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={() => setDraggedImageId(image.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedImageId) {
                        reorderImages(draggedImageId, image.id)
                      }
                      setDraggedImageId(null)
                    }}
                    onDragEnd={() => setDraggedImageId(null)}
                    className={cn(
                      "group relative aspect-4/3 overflow-hidden rounded-lg border bg-muted",
                      isHero && "ring-primary ring-2"
                    )}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url("${image.previewUrl}")` }}
                    />
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-black/45 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1">
                        <GripVerticalIcon className="size-3.5" />
                        {t("drag")}
                      </span>
                      <span className="max-w-[110px] truncate">{image.name}</span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-black/65 to-transparent p-2">
                      <Button
                        type="button"
                        size="xs"
                        variant={isHero ? "secondary" : "outline"}
                        className="h-6 rounded-md border-white/30 bg-black/50 px-2 text-[11px] text-white hover:bg-black/65"
                        onClick={() => setHeroImageId(image.id)}
                      >
                        <StarIcon className={cn("size-3", isHero && "fill-current")} />
                        {isHero ? "Hero" : "Set Hero"}
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        className="border-white/30 bg-black/50 text-white hover:bg-black/65"
                        onClick={() => removeImage(image)}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-muted-foreground col-span-full flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm">
                <ImageIcon className="size-4" />
                {t("noImagesAddedYet")}
              </div>
            )}
          </div>
        </FieldGroup>
      </div>
    </Field>
  )
}
