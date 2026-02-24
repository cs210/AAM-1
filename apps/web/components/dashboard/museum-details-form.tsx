"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ImageManager } from "@/components/dashboard/image-manager"

type OperatingHour = {
  day: string
  isOpen: boolean
  openTime: string
  closeTime: string
}

const timezoneItems = [
  { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
  { label: "Mountain Time (MT)", value: "America/Denver" },
  { label: "Central Time (CT)", value: "America/Chicago" },
  { label: "Eastern Time (ET)", value: "America/New_York" },
] as const

const languageItems = [
  { label: "English", value: "en" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
] as const

const defaultOperatingHours: OperatingHour[] = [
  { day: "Monday", isOpen: false, openTime: "10:00", closeTime: "18:00" },
  { day: "Tuesday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
  { day: "Wednesday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
  { day: "Thursday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
  { day: "Friday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
  { day: "Saturday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
  { day: "Sunday", isOpen: true, openTime: "10:00", closeTime: "18:00" },
]

const accessibilityOptions = [
  { id: "wheelchair", label: "Wheelchair accessible entrances" },
  { id: "elevators", label: "Elevators available" },
  { id: "accessible-restrooms", label: "Accessible restrooms" },
  { id: "assistive-listening", label: "Assistive listening devices" },
  { id: "braille-signage", label: "Braille / tactile signage" },
  { id: "sensory-hours", label: "Sensory-friendly visiting hours" },
] as const

export function MuseumDetailsForm() {
  const [operatingHours, setOperatingHours] = React.useState<OperatingHour[]>(defaultOperatingHours)
  const [selectedAccessibility, setSelectedAccessibility] = React.useState<string[]>([])
  const [accessibilityAdditionalNotes, setAccessibilityAdditionalNotes] = React.useState("")

  const updateOperatingHour = (
    day: string,
    key: "isOpen" | "openTime" | "closeTime",
    value: boolean | string
  ) => {
    setOperatingHours((prev) =>
      prev.map((entry) => (entry.day === day ? { ...entry, [key]: value } : entry))
    )
  }

  const toggleAccessibilityOption = (optionId: string) => {
    setSelectedAccessibility((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Museum Information</CardTitle>
        <CardDescription>
          This information appears in your visitor-facing mobile app profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="museum-name">Museum Name</FieldLabel>
                <Input id="museum-name" placeholder="City Art Museum" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="museum-tagline">Tagline</FieldLabel>
                <Input id="museum-tagline" placeholder="Art, history, and culture for all" />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="museum-description">Short Description</FieldLabel>
              <Textarea
                id="museum-description"
                placeholder="Tell visitors what makes your museum special."
                rows={4}
              />
              <FieldDescription>
                Keep this concise. It will be shown on the museum profile and discovery card.
              </FieldDescription>
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="museum-phone">Public Phone</FieldLabel>
                <Input id="museum-phone" placeholder="+1 (555) 123-4567" />
              </Field>
              <Field>
                <FieldLabel htmlFor="museum-email">Public Email</FieldLabel>
                <Input id="museum-email" type="email" placeholder="info@museum.org" />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="museum-website">Website</FieldLabel>
              <Input id="museum-website" type="url" placeholder="https://www.museum.org" />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="museum-timezone">Timezone</FieldLabel>
                <Select items={timezoneItems} defaultValue={null}>
                  <SelectTrigger id="museum-timezone" className="w-full">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {timezoneItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="museum-language">Primary App Language</FieldLabel>
                <Select items={languageItems} defaultValue={null}>
                  <SelectTrigger id="museum-language" className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {languageItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="museum-address">Street Address</FieldLabel>
              <Input id="museum-address" placeholder="123 Museum Way" />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="museum-city">City</FieldLabel>
                <Input id="museum-city" placeholder="San Francisco" />
              </Field>
              <Field>
                <FieldLabel htmlFor="museum-state">State / Province</FieldLabel>
                <Input id="museum-state" placeholder="CA" />
              </Field>
              <Field>
                <FieldLabel htmlFor="museum-postal">Postal Code</FieldLabel>
                <Input id="museum-postal" placeholder="94103" />
              </Field>
            </div>

            <Field>
              <FieldLabel>Operating Hours</FieldLabel>
              <div className="rounded-xl border">
                <div className="grid grid-cols-[minmax(120px,1fr)_110px_1fr_1fr] gap-2 border-b px-3 py-2 text-xs font-medium tracking-wide uppercase">
                  <span>Day</span>
                  <span>Open</span>
                  <span>From</span>
                  <span>To</span>
                </div>
                <div className="divide-y">
                  {operatingHours.map((entry) => {
                    const dayId = entry.day.toLowerCase()
                    return (
                      <div
                        key={entry.day}
                        className="grid grid-cols-[minmax(120px,1fr)_110px_1fr_1fr] gap-2 px-3 py-2"
                      >
                        <div className="flex items-center text-sm font-medium">{entry.day}</div>
                        <div className="flex items-center">
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              id={`hours-open-${dayId}`}
                              type="checkbox"
                              className="accent-primary size-4"
                              checked={entry.isOpen}
                              onChange={(event) =>
                                updateOperatingHour(entry.day, "isOpen", event.target.checked)
                              }
                            />
                            Open
                          </label>
                        </div>
                        <Input
                          id={`hours-from-${dayId}`}
                          type="time"
                          disabled={!entry.isOpen}
                          value={entry.openTime}
                          onChange={(event) =>
                            updateOperatingHour(entry.day, "openTime", event.target.value)
                          }
                        />
                        <Input
                          id={`hours-to-${dayId}`}
                          type="time"
                          disabled={!entry.isOpen}
                          value={entry.closeTime}
                          onChange={(event) =>
                            updateOperatingHour(entry.day, "closeTime", event.target.value)
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              <FieldDescription>
                Keep this section up to date to ensure visitors have accurate information about your
                museum&apos;s operating hours.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Accessibility Features</FieldLabel>
              <div className="rounded-xl border p-4">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {accessibilityOptions.map((option) => (
                    <label
                      key={option.id}
                      htmlFor={`accessibility-${option.id}`}
                      className="hover:bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <input
                        id={`accessibility-${option.id}`}
                        type="checkbox"
                        className="accent-primary size-4"
                        checked={selectedAccessibility.includes(option.id)}
                        onChange={() => toggleAccessibilityOption(option.id)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <Field className="mt-4">
                  <FieldLabel htmlFor="museum-accessibility-notes">
                    Additional Accessibility Notes
                  </FieldLabel>
                  <Textarea
                    id="museum-accessibility-notes"
                    rows={3}
                    placeholder="Anything else visitors should know about accessibility services."
                    value={accessibilityAdditionalNotes}
                    onChange={(event) => setAccessibilityAdditionalNotes(event.target.value)}
                  />
                </Field>
              </div>
            </Field>

            <ImageManager />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" type="button">
          Preview in App
        </Button>
        <Button type="button">Save Museum Details</Button>
      </CardFooter>
    </Card>
  )
}
