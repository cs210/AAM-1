"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { LocaleSwitcher } from "@/components/locale-switcher"
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
  const t = useTranslations("landing")
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
          {t(m)}
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
  const t = useTranslations("landing.hero")
  const tBento = useTranslations("landing.visitorBento")
  const tStats = useTranslations("landing.visitorStats")
  const tQuote = useTranslations("landing.visitorQuote")
  const bentoFeatures = [
    {
      icon: MapPinIcon,
      label: tBento("passportLabel"),
      title: tBento("passportTitle"),
      desc: tBento("passportDesc"),
      span: "md:col-span-2 md:row-span-2",
      size: "lg" as const,
    },
    {
      icon: TrophyIcon,
      label: tBento("rewardsLabel"),
      title: tBento("rewardsTitle"),
      desc: tBento("rewardsDesc"),
      span: "",
      size: "sm" as const,
    },
    {
      icon: BrainCircuitIcon,
      label: tBento("aiLabel"),
      title: tBento("aiTitle"),
      desc: tBento("aiDesc"),
      span: "",
      size: "sm" as const,
    },
    {
      icon: ShareIcon,
      label: tBento("socialLabel"),
      title: tBento("socialTitle"),
      desc: tBento("socialDesc"),
      span: "md:col-span-2",
      size: "md" as const,
    },
  ]
  const statKeys = ["miles", "hours", "masterpieces", "badges", "friends"] as const

  return (
    <div key="visitor">
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 md:px-8 md:pb-20 md:pt-20">
        <div className="animate-landing-fade-up flex flex-col gap-0 leading-[0.88] tracking-tighter">
          <span className="font-display text-[clamp(3rem,12vw,10rem)] font-normal text-foreground/10">
            {t("your")}
          </span>
          <span className="font-display -mt-2 text-[clamp(3rem,12vw,10rem)] font-normal text-primary md:-mt-6">
            {t("cultural")}
          </span>
          <span
            className="font-display -mt-2 text-[clamp(3rem,12vw,10rem)] font-normal md:-mt-6"
            style={{ WebkitTextStroke: "1.5px currentColor", WebkitTextFillColor: "transparent" }}
          >
            {t("passport")}
          </span>
        </div>
        <div className="mt-6 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
          <p
            className="animate-landing-fade-up max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            {t("visitorSubline")}
          </p>
          <div
            className="animate-landing-fade-up flex shrink-0 flex-wrap gap-3"
            style={{ animationDelay: "320ms" }}
          >
            <Button size="lg" className="gap-2 rounded-full px-6">
              <TicketIcon className="size-4" />
              {t("getEarlyAccess")}
            </Button>
            <Button variant="outline" size="lg" className="gap-2 rounded-full px-6" render={<Link href="/sign-up" />}>
              {t("createAccount")}
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
          {statKeys.map((key) => (
            <span key={key} className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
              <span className="size-1 rounded-full bg-primary" />
              {tStats(key)}
            </span>
          ))}
        </div>
      </section>

      {/* Quote */}
      <section className="mx-auto max-w-4xl px-4 py-20 md:py-28">
        <div className="animate-landing-scale-in relative">
          <span className="font-display pointer-events-none absolute -top-10 -left-4 text-[8rem] leading-none text-primary/10 select-none md:-top-16 md:-left-8 md:text-[12rem]">
            {tQuote("openQuote")}
          </span>
          <blockquote className="font-display relative z-10 text-center text-2xl leading-snug md:text-5xl md:leading-[1.15]">
            {tQuote("quote")}
          </blockquote>
          <p className="mt-8 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
            {tQuote("attribution")}
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
  const t = useTranslations("landing.hero")
  const tBento = useTranslations("landing.museumBento")
  const tStats = useTranslations("landing.museumStats")
  const tCallout = useTranslations("landing.museumCallout")
  const tHow = useTranslations("landing.museumHowItWorks")
  const tQuote = useTranslations("landing.museumQuote")
  const bentoFeatures = [
    {
      icon: RefreshCwIcon,
      label: tBento("tmsLabel"),
      title: tBento("tmsTitle"),
      desc: tBento("tmsDesc"),
      span: "md:col-span-2 md:row-span-2",
      size: "lg" as const,
    },
    {
      icon: BarChart3Icon,
      label: tBento("analyticsLabel"),
      title: tBento("analyticsTitle"),
      desc: tBento("analyticsDesc"),
      span: "",
      size: "sm" as const,
    },
    {
      icon: BabyIcon,
      label: tBento("kidsLabel"),
      title: tBento("kidsTitle"),
      desc: tBento("kidsDesc"),
      span: "",
      size: "sm" as const,
    },
    {
      icon: SearchIcon,
      label: tBento("discoveryLabel"),
      title: tBento("discoveryTitle"),
      desc: tBento("discoveryDesc"),
      span: "md:col-span-2",
      size: "md" as const,
    },
  ]
  const statKeys = ["tms", "analytics", "kids", "discovery", "overhead"] as const
  const calloutItems: { value: string; labelKey: "extraHardware" | "nativeSync" | "engagementData" | "kidFriendly" }[] = [
    { value: "0", labelKey: "extraHardware" },
    { value: "TMS", labelKey: "nativeSync" },
    { value: "Live", labelKey: "engagementData" },
    { value: "∞", labelKey: "kidFriendly" },
  ]
  const steps = [
    { num: "01", icon: ShieldCheckIcon, titleKey: "step1Title" as const, bodyKey: "step1Body" as const },
    { num: "02", icon: RefreshCwIcon, titleKey: "step2Title" as const, bodyKey: "step2Body" as const },
    { num: "03", icon: SparklesIcon, titleKey: "step3Title" as const, bodyKey: "step3Body" as const },
  ]

  return (
    <div key="museum">
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 md:px-8 md:pb-20 md:pt-20">
        <div className="animate-landing-fade-up flex flex-col gap-0 leading-[0.88] tracking-tighter">
          <span className="font-display text-[clamp(3rem,12vw,10rem)] font-normal text-foreground/10">
            {t("the")}
          </span>
          <span className="font-display -mt-2 text-[clamp(3rem,12vw,10rem)] font-normal text-primary md:-mt-6">
            {t("museum")}
          </span>
          <span
            className="font-display -mt-2 text-[clamp(3rem,12vw,10rem)] font-normal md:-mt-6"
            style={{ WebkitTextStroke: "1.5px currentColor", WebkitTextFillColor: "transparent" }}
          >
            {t("os")}
          </span>
        </div>
        <div className="mt-6 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
          <p
            className="animate-landing-fade-up max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            {t("museumSubline")}
          </p>
          <div
            className="animate-landing-fade-up flex shrink-0 flex-wrap gap-3"
            style={{ animationDelay: "320ms" }}
          >
            <Button size="lg" className="gap-2 rounded-full px-6" render={<Link href="/dashboard" />}>
              <LayoutDashboardIcon className="size-4" />
              {t("openDashboard")}
            </Button>
            <Button variant="outline" size="lg" className="gap-2 rounded-full px-6" render={<Link href="/sign-in" />}>
              {t("staffSignIn")}
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
          {statKeys.map((key) => (
            <span key={key} className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
              <span className="size-1 rounded-full bg-primary" />
              {tStats(key)}
            </span>
          ))}
        </div>
      </section>

      {/* Invite-only callout */}
      <section className="border-b bg-foreground text-background dark:bg-card dark:text-card-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-current/10 md:grid-cols-4">
          {calloutItems.map((s) => (
            <div key={s.labelKey} className="px-4 py-8 text-center md:py-12">
              <p className="font-display text-3xl md:text-5xl">{s.value}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] opacity-50">
                {tCallout(s.labelKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — numbered */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <p className="animate-landing-fade-up font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          {tHow("title")}
        </p>
        <div className="mt-10 grid gap-12 md:mt-16 md:gap-20">
          {steps.map((step, i) => {
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
                  <h3 className="font-display text-xl md:text-3xl">{tHow(step.titleKey)}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                    {tHow(step.bodyKey)}
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
            {tQuote("openQuote")}
          </span>
          <blockquote className="font-display relative z-10 text-center text-2xl leading-snug md:text-5xl md:leading-[1.15]">
            {tQuote("quote")}
          </blockquote>
          <p className="mt-8 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
            {tQuote("attribution")}
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
  const t = useTranslations("landing.footer")
  const tCommon = useTranslations("common")
  const [mode, setMode] = useState<Mode>("visitor")

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(var(--primary)/0.06),transparent_50%)]" />
      </div>

      <div className="flex items-center justify-center gap-4 px-4 pt-4">
        <ModeToggle mode={mode} onChange={setMode} />
        <LocaleSwitcher />
      </div>

      <div key={mode}>
        {mode === "visitor" ? <VisitorLanding /> : <MuseumLanding />}
      </div>

      <footer className="border-t bg-muted/20 py-10 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4">
          <YamiLogo />
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("tagline")}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}>{tCommon("signIn")}</Button>
            <Button variant="ghost" size="sm" render={<Link href="/sign-up" />}>{tCommon("signUp")}</Button>
            <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>{tCommon("dashboard")}</Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
