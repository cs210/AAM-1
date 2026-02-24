"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { YamiLogo } from "@/components/yami-logo"
import {
  MapPinIcon,
  ArrowRightIcon,
  TrophyIcon,
  TicketIcon,
  BrainCircuitIcon,
  ShareIcon,
  LayoutDashboardIcon,
  BarChart3Icon,
  RefreshCwIcon,
  SparklesIcon,
  SearchIcon,
  ShieldCheckIcon,
  BabyIcon,
} from "lucide-react"

type Mode = "visitor" | "museum"

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

/* ═══════════════════════════════════════════════════════════════════════════
 * VISITOR LANDING — "Manifest + Bento"
 * Giant stacked hero → Bento grid → Stat ticker → Giant quote
 * ═══════════════════════════════════════════════════════════════════════════*/
function VisitorLanding() {
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
    <div key="visitor">
      {/* Hero */}
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

      {/* Bento grid */}
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

      {/* Stat ticker */}
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

      {/* Quote */}
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
 * MUSEUM LANDING — Same "Manifest + Bento" structure
 * Giant stacked hero → Bento grid → Stat ticker → Giant quote
 * ═══════════════════════════════════════════════════════════════════════════*/
function MuseumLanding() {
  const bentoFeatures = [
    {
      icon: RefreshCwIcon,
      label: "TMS Sync",
      title: "Sync with The Museum System",
      desc: "Connect directly to TMS and keep your collection data in sync. No duplicate entry, no data drift. Your source of truth stays your source of truth — YAMI just makes it visible to visitors.",
      span: "md:col-span-2 md:row-span-2",
      size: "lg" as const,
    },
    {
      icon: BarChart3Icon,
      label: "Analytics",
      title: "Engagement Analytics",
      desc: "Understand which exhibitions resonate, how visitors interact, and what drives return visits.",
      span: "",
      size: "sm" as const,
    },
    {
      icon: BabyIcon,
      label: "Kids",
      title: "Interactive Activities for Kids",
      desc: "Scavenger hunts, badge challenges, and guided quests that turn galleries into playgrounds.",
      span: "",
      size: "sm" as const,
    },
    {
      icon: SearchIcon,
      label: "Discovery",
      title: "Exhibition & Activity Discovery",
      desc: "Help visitors find exhibitions, events, and activities before they arrive and while they explore. Better discoverability means more foot traffic and deeper engagement.",
      span: "md:col-span-2",
      size: "md" as const,
    },
  ]

  return (
    <div key="museum">
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 md:px-8 md:pb-20 md:pt-20">
        <div className="animate-landing-fade-up flex flex-col gap-0 leading-[0.88] tracking-tighter">
          <span className="font-display text-[clamp(3rem,12vw,10rem)] font-normal text-foreground/10">
            The
          </span>
          <span className="font-display -mt-2 text-[clamp(3rem,12vw,10rem)] font-normal text-primary md:-mt-6">
            Museum
          </span>
          <span
            className="font-display -mt-2 text-[clamp(3rem,12vw,10rem)] font-normal md:-mt-6"
            style={{ WebkitTextStroke: "1.5px currentColor", WebkitTextFillColor: "transparent" }}
          >
            OS
          </span>
        </div>
        <div className="mt-6 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
          <p
            className="animate-landing-fade-up max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            YAMI gives your museum a visitor engagement layer that syncs with
            TMS, surfaces analytics, and brings interactive discovery to every
            gallery — with near-zero overhead to implement.
          </p>
          <div
            className="animate-landing-fade-up flex shrink-0 flex-wrap gap-3"
            style={{ animationDelay: "320ms" }}
          >
            <Button size="lg" className="gap-2 rounded-full px-6" render={<Link href="/dashboard" />}>
              <LayoutDashboardIcon className="size-4" />
              Open dashboard
            </Button>
            <Button variant="outline" size="lg" className="gap-2 rounded-full px-6" render={<Link href="/sign-in" />}>
              Staff sign in
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Bento grid */}
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

      {/* Stat ticker */}
      <section className="overflow-hidden border-b py-6">
        <div className="animate-landing-fade-in flex items-center justify-center gap-8 whitespace-nowrap px-4 md:gap-16">
          {["TMS integration", "Engagement analytics", "Kids activities", "Exhibition discovery", "Low overhead"].map((stat) => (
            <span key={stat} className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
              <span className="size-1 rounded-full bg-primary" />
              {stat}
            </span>
          ))}
        </div>
      </section>

      {/* Invite-only callout */}
      <section className="border-b bg-foreground text-background dark:bg-card dark:text-card-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-current/10 md:grid-cols-4">
          {[
            { value: "0", label: "Extra hardware" },
            { value: "TMS", label: "Native sync" },
            { value: "Live", label: "Engagement data" },
            { value: "∞", label: "Kid-friendly activities" },
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

      {/* How it works — numbered */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <p className="animate-landing-fade-up font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          How it works
        </p>
        <div className="mt-10 grid gap-12 md:mt-16 md:gap-20">
          {[
            {
              num: "01",
              icon: ShieldCheckIcon,
              title: "Request access.",
              body: "Sign up and submit your museum details. Our team reviews and activates your workspace — no technical setup required.",
            },
            {
              num: "02",
              icon: RefreshCwIcon,
              title: "Connect your TMS.",
              body: "YAMI syncs with The Museum System so your collection data flows in automatically. No duplicate entry, no migration headaches.",
            },
            {
              num: "03",
              icon: SparklesIcon,
              title: "Engage visitors.",
              body: "Interactive activities for kids, exhibition discovery tools, and engagement analytics — all live in your dashboard from day one.",
            },
          ].map((step, i) => {
            const Icon = step.icon
            return (
              <div
                key={step.num}
                className="animate-landing-fade-up grid items-start gap-4 md:grid-cols-[100px_1fr] md:gap-8"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-1">
                  <span className="font-mono text-4xl font-light text-foreground/15 md:text-6xl">
                    {step.num}
                  </span>
                  <Icon className="size-4 text-muted-foreground md:mr-1" />
                </div>
                <div>
                  <h3 className="font-display text-xl md:text-3xl">{step.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                    {step.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Quote */}
      <section className="mx-auto max-w-4xl px-4 py-20 md:py-28">
        <div className="animate-landing-scale-in relative">
          <span className="font-display pointer-events-none absolute -top-10 -left-4 text-[8rem] leading-none text-primary/10 select-none md:-top-16 md:-left-8 md:text-[12rem]">
            &ldquo;
          </span>
          <blockquote className="font-display relative z-10 text-center text-2xl leading-snug md:text-5xl md:leading-[1.15]">
            Make every visit unforgettable — without adding to your workload.
          </blockquote>
          <p className="mt-8 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Low overhead. High engagement. That&apos;s YAMI for museums.
          </p>
        </div>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PAGE
 * ═══════════════════════════════════════════════════════════════════════════*/
export default function LandingPage() {
  const [mode, setMode] = useState<Mode>("visitor")

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(var(--primary)/0.06),transparent_50%)]" />
      </div>

      <div className="flex items-center justify-center gap-4 px-4 pt-4">
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <div key={mode}>
        {mode === "visitor" ? <VisitorLanding /> : <MuseumLanding />}
      </div>

      <footer className="border-t bg-muted/20 py-10 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4">
          <YamiLogo />
          <p className="text-muted-foreground text-xs leading-relaxed">
            YAMI is revolutionizing the social experience of our shared culture and art.
            Beta testing begins soon. Open source on release.
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
