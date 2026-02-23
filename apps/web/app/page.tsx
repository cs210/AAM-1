"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { YamiLogo } from "@/components/yami-logo"
import {
  MapPinIcon,
  BarChart3Icon,
  DatabaseIcon,
  ZapIcon,
  ArrowRightIcon,
  TrophyIcon,
  TicketIcon,
  BrainCircuitIcon,
  ShareIcon,
  LayoutDashboardIcon,
  ActivityIcon,
  CircleDotIcon,
} from "lucide-react"

type Mode = "visitor" | "museum"
type VisitorStyle = 1 | 2 | 3

const museumFeatures = [
  {
    icon: ZapIcon,
    tag: "Engine",
    title: "Auto-Collect",
    description:
      "A groundbreaking data engine that automatically populates collection data and visitor interactions, reducing the administrative burden on museum staff. Less spreadsheets, more curation.",
  },
  {
    icon: ActivityIcon,
    tag: "Analytics",
    title: "Real-Time Analytics",
    description:
      "Curators finally get Google Analytics for the physical floor. See which exhibits are drawing crowds and which are being skipped — in real-time. Heatmaps, flow patterns, dwell times.",
  },
  {
    icon: DatabaseIcon,
    tag: "CMS",
    title: "Database Management",
    description:
      "A centralized hub to manage activities, rewards, and exhibition metadata across the entire institution. Best of all? Completely optional — adopt only what you need.",
  },
]

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="relative flex items-center rounded-full border bg-muted/60 p-0.5 backdrop-blur-sm">
      <div
        className="absolute top-0.5 bottom-0.5 rounded-full bg-foreground shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          left: mode === "visitor" ? "2px" : "calc(50% + 0px)",
          width: "calc(50% - 2px)",
        }}
      />
      {(["visitor", "museum"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
            mode === m ? "text-background" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {m === "visitor" ? "For Visitors" : "For Museums"}
        </button>
      ))}
    </div>
  )
}

function StyleSwitcher({ style, onChange }: { style: VisitorStyle; onChange: (s: VisitorStyle) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {([1, 2, 3] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`size-2 rounded-full transition-all duration-300 ${
            style === s ? "scale-125 bg-foreground" : "bg-foreground/20 hover:bg-foreground/40"
          }`}
          aria-label={`Design ${s}`}
        />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Shared hero — Variant 1's giant stacked type
 * ═══════════════════════════════════════════════════════════════════════════*/
function StackedHero() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 md:px-8 md:pb-20 md:pt-20">
      <div className="animate-landing-fade-up flex flex-col gap-0 leading-[0.88] tracking-tighter">
        <span className="font-display text-[clamp(3rem,12vw,10rem)] font-normal text-foreground/10">
          Your
        </span>
        <span className="font-display -mt-2 text-[clamp(3rem,12vw,10rem)] font-normal text-primary md:-mt-6">
          Cultural
        </span>
        <span
          className="font-display -mt-2 text-[clamp(3rem,12vw,10rem)] font-normal md:-mt-6"
          style={{ WebkitTextStroke: "1.5px currentColor", WebkitTextFillColor: "transparent" }}
        >
          Passport
        </span>
      </div>
      <div className="mt-6 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
        <p
          className="animate-landing-fade-up max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
          style={{ animationDelay: "200ms" }}
        >
          The first social, automated record of human cultural engagement.
          Every visit, every masterpiece, every hour in the gallery — yours forever.
        </p>
        <div
          className="animate-landing-fade-up flex shrink-0 flex-wrap gap-3"
          style={{ animationDelay: "320ms" }}
        >
          <Button size="lg" className="gap-2 rounded-full px-6">
            <TicketIcon className="size-4" />
            Get early access
          </Button>
          <Button variant="outline" size="lg" className="gap-2 rounded-full px-6" render={<Link href="/sign-up" />}>
            Create account
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
 * VARIANT 1 — "Manifest + Bento" (Your favorite hybrid)
 * Giant stacked hero → Bento grid → Stat ticker → Giant quote
 * ═══════════════════════════════════════════════════════════════════════════*/
function VisitorVariant1() {
  const bentoFeatures = [
    {
      icon: MapPinIcon,
      label: "Passport",
      title: "The Global Cultural Passport",
      desc: "Every gallery visit, every ticket scanned, every masterpiece — automatically logged. Miles walked, hours in galleries, your most-visited movements.",
      span: "md:col-span-2 md:row-span-2",
      size: "lg" as const,
    },
    {
      icon: TrophyIcon,
      label: "Rewards",
      title: "Gamified Discovery",
      desc: "Turn a casual stroll into a quest. Earn badges and rewards for exploring collections.",
      span: "",
      size: "sm" as const,
    },
    {
      icon: BrainCircuitIcon,
      label: "AI",
      title: "The AI Docent",
      desc: "Your personal curator — suggesting your next must-see exhibit based on your taste and history.",
      span: "",
      size: "sm" as const,
    },
    {
      icon: ShareIcon,
      label: "Social",
      title: "Social Connectivity",
      desc: "Share your passport, compare museum journeys with friends, see what's trending in your circle, and plan visits together.",
      span: "md:col-span-2",
      size: "md" as const,
    },
  ]

  return (
    <div key="v1">
      <StackedHero />

      <section className="landing-grain relative border-y bg-muted/20 py-12 md:py-20">
        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-3 px-4 md:grid-cols-4 md:grid-rows-[auto_auto] md:px-6">
          {bentoFeatures.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={f.label}
                className={`animate-landing-fade-up group relative overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-xl ${f.span} ${
                  f.size === "lg" ? "p-8 md:p-10" : f.size === "md" ? "p-6 md:p-8" : "p-5 md:p-6"
                }`}
                style={{ animationDelay: `${150 + i * 100}ms` }}
              >
                {f.size === "lg" && (
                  <div className="pointer-events-none absolute -right-16 -bottom-16 size-64 rounded-full bg-primary/8 blur-3xl transition-all group-hover:bg-primary/14" />
                )}
                <div className="relative z-10">
                  <div className="mb-3 flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      {f.label}
                    </span>
                  </div>
                  <h3 className={`font-display leading-tight ${
                    f.size === "lg" ? "text-3xl md:text-4xl" : f.size === "md" ? "text-xl md:text-2xl" : "text-lg"
                  }`}>
                    {f.title}
                  </h3>
                  <p className={`text-muted-foreground mt-2 leading-relaxed ${
                    f.size === "lg" ? "max-w-md text-sm md:text-base" : "text-sm"
                  }`}>
                    {f.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden border-b py-6">
        <div className="animate-landing-fade-in flex items-center justify-center gap-8 whitespace-nowrap px-4 md:gap-16">
          {["Miles walked in galleries", "Hours in front of canvases", "Masterpieces encountered", "Badges earned", "Friends connected"].map((stat) => (
            <span key={stat} className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
              <span className="size-1 rounded-full bg-primary" />
              {stat}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 md:py-28">
        <div className="animate-landing-scale-in relative">
          <span className="font-display pointer-events-none absolute -top-10 -left-4 text-[8rem] leading-none text-primary/10 select-none md:-top-16 md:-left-8 md:text-[12rem]">
            &ldquo;
          </span>
          <blockquote className="font-display relative z-10 text-center text-2xl leading-snug md:text-5xl md:leading-[1.15]">
            Once a visitor enters the gallery, they become invisible.
          </blockquote>
          <p className="mt-8 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
            YAMI illuminates the entire journey.
          </p>
        </div>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
 * VARIANT 2 — "The Exhibition Catalog"
 * Museum-world catalog / placard aesthetic. Features as exhibited works.
 * Catalog numbers (YAMI.001), horizontal rules, metadata columns,
 * specimen-card layout, archival/editorial treatment.
 * ═══════════════════════════════════════════════════════════════════════════*/
function VisitorVariant2() {
  const works = [
    {
      id: "YAMI.001",
      title: "The Global Cultural Passport",
      medium: "Automatic logging · Personal data · Location tracking",
      year: "2026–",
      body: "Every gallery visit, every ticket scanned, every masterpiece encountered is automatically logged into a high-fidelity personal history. See your life in art: miles walked in galleries, hours spent in front of canvases, your most-visited movements.",
      icon: MapPinIcon,
    },
    {
      id: "YAMI.002",
      title: "Gamified Discovery",
      medium: "Reward system · Badges · Interactive challenges",
      year: "2026–",
      body: "A reward system built into museum activities. Turn a casual stroll into an interactive quest — earning badges and rewards for exploring collections, visiting new exhibitions, and completing cultural challenges.",
      icon: TrophyIcon,
    },
    {
      id: "YAMI.003",
      title: "The AI Docent",
      medium: "Chatbot · Recommendation engine · Personal curation",
      year: "2026–",
      body: "An integrated chatbot and recommendation engine that acts as your personal curator. It suggests your next must-see exhibit based on your taste, your history, and what's trending in your city.",
      icon: BrainCircuitIcon,
    },
    {
      id: "YAMI.004",
      title: "Social Connectivity",
      medium: "Shared passports · Trending exhibitions · Group planning",
      year: "2026–",
      body: "Share your passport, compare museum histories with friends, and see what exhibitions are trending in your social circle. Plan group visits and discover culture together.",
      icon: ShareIcon,
    },
  ]

  return (
    <div key="v2">
      <StackedHero />

      {/* Catalog header strip */}
      <div className="border-y">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Exhibited features — permanent collection
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {works.length} works
          </span>
        </div>
      </div>

      {/* Catalog entries */}
      <section className="mx-auto max-w-6xl px-4 md:px-8">
        {works.map((work, i) => {
          const Icon = work.icon
          return (
            <div
              key={work.id}
              className="animate-landing-fade-up border-b py-10 last:border-b-0 md:py-16"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="grid gap-6 md:grid-cols-[200px_1fr] md:gap-12">
                {/* Metadata column */}
                <div className="flex flex-col gap-3 md:border-r md:pr-8">
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="font-mono text-xs tracking-widest text-primary">
                      {work.id}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Medium
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {work.medium}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Date
                    </p>
                    <p className="text-xs text-muted-foreground">{work.year}</p>
                  </div>
                </div>

                {/* Body */}
                <div>
                  <h3 className="font-display text-2xl leading-tight md:text-4xl">
                    {work.title}
                  </h3>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                    {work.body}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {/* Visitor counter strip */}
      <section className="border-y bg-foreground text-background dark:bg-card dark:text-card-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-current/10 md:grid-cols-4">
          {[
            { value: "∞", label: "Miles to walk" },
            { value: "∞", label: "Hours to spend" },
            { value: "∞", label: "Works to see" },
            { value: "1", label: "App to hold" },
          ].map((s) => (
            <div key={s.label} className="px-4 py-8 text-center md:py-12">
              <p className="font-display text-3xl md:text-5xl">{s.value}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] opacity-50">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing placard */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center md:py-28">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Artist Statement
        </p>
        <div className="mx-auto my-4 h-px w-8 bg-primary/40" />
        <blockquote className="font-display text-xl leading-snug md:text-3xl">
          &ldquo;Museums have long suffered from a data blindspot. Once a
          visitor enters the gallery, they become invisible.&rdquo;
        </blockquote>
        <p className="mt-6 text-sm text-muted-foreground">
          YAMI illuminates the entire journey.
        </p>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
 * VARIANT 3 — "Data Canvas"
 * Futuristic dashboard-as-landing-page. Glassmorphism panels. Pulsing live
 * status indicators. Grid-paper background. Floating decorative geometry.
 * Counter-like stat displays. Warm neon glow on primary color.
 * ═══════════════════════════════════════════════════════════════════════════*/
function VisitorVariant3() {
  const modules = [
    {
      icon: MapPinIcon,
      status: "ACTIVE",
      id: "PSP",
      title: "Cultural Passport",
      desc: "Auto-logging every gallery visit, ticket scan, and masterpiece encounter into a personal cultural history. Track miles walked, hours spent, and movements visited.",
      metrics: ["12,847 mi tracked", "3,291 hrs logged", "94 museums"],
    },
    {
      icon: TrophyIcon,
      status: "ACTIVE",
      id: "RWD",
      title: "Reward Engine",
      desc: "Gamified discovery system. Badges, challenges, and rewards earned by exploring collections and completing cultural quests.",
      metrics: ["156 badges", "42 quests", "8 streaks"],
    },
    {
      icon: BrainCircuitIcon,
      status: "LEARNING",
      id: "AID",
      title: "AI Docent",
      desc: "Personal curator powered by your taste graph. Recommendations, chatbot guidance, and trend analysis based on your history.",
      metrics: ["98% match rate", "1.2k recs", "Live"],
    },
    {
      icon: ShareIcon,
      status: "CONNECTED",
      id: "SOC",
      title: "Social Layer",
      desc: "Share passports, compare journeys, follow trending exhibitions in your circle, and coordinate group visits.",
      metrics: ["47 friends", "12 circles", "3 plans"],
    },
  ]

  const statusColor: Record<string, string> = {
    ACTIVE: "text-emerald-500",
    LEARNING: "text-amber-500",
    CONNECTED: "text-sky-500",
  }

  return (
    <div key="v3">
      {/* Grid-paper background */}
      <div
        className="pointer-events-none fixed inset-0 -z-5 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <StackedHero />

      {/* System status bar */}
      <div className="border-y bg-muted/30 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              System online
            </span>
          </div>
          <span className="hidden h-3 w-px bg-border md:block" />
          <span className="font-mono text-[11px] text-muted-foreground">
            4 modules active
          </span>
          <span className="hidden h-3 w-px bg-border md:block" />
          <span className="font-mono text-[11px] text-muted-foreground">
            Beta v0.9
          </span>
        </div>
      </div>

      {/* Data modules grid */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-20">
        <div className="grid gap-3 md:grid-cols-2">
          {modules.map((mod, i) => {
            const Icon = mod.icon
            return (
              <div
                key={mod.id}
                className="animate-landing-fade-up group relative overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-[0_0_40px_-12px] hover:shadow-primary/20"
                style={{ animationDelay: `${150 + i * 100}ms` }}
              >
                {/* Glow */}
                <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), hsl(var(--primary) / 0.06), transparent 40%)" }} />

                <div className="relative z-10 p-6 md:p-8">
                  {/* Module header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg border bg-background/60">
                        <Icon className="size-4" />
                      </div>
                      <span className="font-mono text-xs font-medium tracking-wider">
                        {mod.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CircleDotIcon className={`size-3 ${statusColor[mod.status] ?? "text-muted-foreground"}`} />
                      <span className={`font-mono text-[10px] uppercase tracking-widest ${statusColor[mod.status] ?? "text-muted-foreground"}`}>
                        {mod.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-display text-xl leading-tight md:text-2xl">
                    {mod.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {mod.desc}
                  </p>

                  {/* Metric chips */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {mod.metrics.map((m) => (
                      <span
                        key={m}
                        className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Live data strip */}
      <section className="border-y bg-foreground text-background dark:bg-card dark:text-card-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-current/10 md:grid-cols-4">
          {[
            { value: "12,847", unit: "mi", label: "Gallery miles tracked" },
            { value: "3,291", unit: "hrs", label: "Time in museums" },
            { value: "847", unit: "k", label: "Works encountered" },
            { value: "99.7", unit: "%", label: "Uptime" },
          ].map((s) => (
            <div key={s.label} className="px-4 py-8 text-center md:py-12">
              <p className="font-mono text-2xl tabular-nums md:text-4xl">
                {s.value}
                <span className="ml-0.5 text-sm opacity-40">{s.unit}</span>
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Terminal-style closing */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center md:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Incoming transmission
          </span>
        </div>
        <blockquote className="font-display mt-8 text-2xl leading-snug md:text-4xl">
          Once a visitor enters the gallery,
          <br />
          they become{" "}
          <span className="relative">
            invisible
            <span className="absolute -inset-x-1 bottom-0 h-[3px] bg-primary/60" />
          </span>
          .
        </blockquote>
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          YAMI illuminates the entire journey.
        </p>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MUSEUM LANDING (shared)
 * ═══════════════════════════════════════════════════════════════════════════*/
function MuseumLanding() {
  return (
    <div key="museum">
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-center md:px-6 md:pb-24 md:pt-16">
        <Badge variant="secondary" className="animate-landing-fade-up mb-6 text-xs uppercase tracking-widest">
          Invite-only beta
        </Badge>
        <h1 className="font-display animate-landing-fade-up text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-7xl" style={{ animationDelay: "80ms" }}>
          See your floor<br /><span className="text-primary">like never before.</span>
        </h1>
        <p className="text-muted-foreground animate-landing-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed md:text-lg" style={{ animationDelay: "160ms" }}>
          YAMI is the curator-side OS that turns your physical space into a data platform. Real-time analytics, automated collection management, and zero extra hardware.
        </p>
        <div className="animate-landing-fade-up mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "240ms" }}>
          <Button size="lg" className="gap-2 rounded-full px-6" render={<Link href="/dashboard" />}>
            <LayoutDashboardIcon className="size-4" />
            Open dashboard
          </Button>
          <Button variant="outline" size="lg" className="gap-2 rounded-full px-6" render={<Link href="/sign-in" />}>
            Staff sign in
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </section>

      <section className="landing-grain relative overflow-hidden border-y bg-muted/30 py-12 md:py-20">
        <div className="relative z-10 mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-3 md:px-6">
          {museumFeatures.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={f.tag} className="animate-landing-fade-up group relative overflow-hidden rounded-2xl border bg-card p-6 transition-shadow hover:shadow-lg md:p-8" style={{ animationDelay: `${200 + i * 120}ms` }}>
                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl border bg-background/80 shadow-sm">
                      <Icon className="size-5 text-foreground" />
                    </div>
                    <Badge variant="outline" className="text-xs uppercase tracking-wider">{f.tag}</Badge>
                  </div>
                  <h3 className="font-display text-xl leading-tight md:text-2xl">{f.title}</h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{f.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
        <div className="animate-landing-scale-in grid gap-8 md:grid-cols-3">
          {[
            { icon: BarChart3Icon, stat: "Real-time", label: "Visitor flow analytics, heatmaps, dwell times" },
            { icon: ZapIcon, stat: "Automated", label: "Collection data populated without manual entry" },
            { icon: DatabaseIcon, stat: "Optional", label: "Adopt only the modules your institution needs" },
          ].map((item) => (
            <div key={item.stat} className="flex flex-col items-center text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border bg-card"><item.icon className="size-5" /></div>
              <p className="font-display text-2xl">{item.stat}</p>
              <p className="text-muted-foreground mt-1 text-sm">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16 text-center md:px-6 md:pb-24">
        <blockquote className="font-display text-2xl leading-snug italic md:text-4xl">
          &ldquo;Google Analytics for the physical floor.&rdquo;
        </blockquote>
        <p className="text-muted-foreground mt-6 text-sm uppercase tracking-widest">Finally, curators can see what visitors actually do.</p>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PAGE
 * ═══════════════════════════════════════════════════════════════════════════*/
export default function LandingPage() {
  const [mode, setMode] = useState<Mode>("visitor")
  const [visitorStyle, setVisitorStyle] = useState<VisitorStyle>(1)

  const visitorVariants: Record<VisitorStyle, () => React.JSX.Element> = {
    1: VisitorVariant1,
    2: VisitorVariant2,
    3: VisitorVariant3,
  }
  const VisitorComponent = visitorVariants[visitorStyle]

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(var(--primary)/0.06),transparent_50%)]" />
      </div>

      <div className="flex items-center justify-center gap-4 px-4 pt-4">
        <ModeToggle mode={mode} onChange={setMode} />
        {mode === "visitor" && <StyleSwitcher style={visitorStyle} onChange={setVisitorStyle} />}
      </div>

      <div key={mode === "visitor" ? `visitor-${visitorStyle}` : "museum"}>
        {mode === "visitor" ? <VisitorComponent /> : <MuseumLanding />}
      </div>

      <footer className="border-t bg-muted/20 py-10 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4">
          <YamiLogo />
          <p className="text-muted-foreground text-xs leading-relaxed">
            YAMI is revolutionizing the social experience of our shared culture and art. Beta testing begins soon. Open source on release.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}>Sign in</Button>
            <Button variant="ghost" size="sm" render={<Link href="/sign-up" />}>Sign up</Button>
            <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>Dashboard</Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
