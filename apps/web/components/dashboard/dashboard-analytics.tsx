"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
} from "recharts"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { api } from "@packages/backend/convex/_generated/api"
import { useDashboardMuseumId } from "@/components/dashboard/dashboard-museum-context"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeftRightIcon,
  CalendarIcon,
  StarIcon,
  TicketCheckIcon,
  UserPlusIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type DateRangeKey = "7d" | "30d" | "12w" | "all" | "custom"
type AnalyticsBucket = "day" | "week"

type PeriodStats = {
  totalCheckIns: number
  totalRatings: number
  averageRating: number | null
  newFollowers: number
}

type AnalyticsSeriesRow = {
  bucketStart: number
  label: string
  checkins: number
}

type DashboardAnalyticsData = {
  totals: {
    totalCheckIns: number
    totalRatings: number
    averageRating: number | null
    museumFollowers: number
  }
  currentPeriod: {
    from: number
    to: number
    series: AnalyticsSeriesRow[]
    stats: PeriodStats
  }
  previousPeriod: {
    from: number
    to: number
    series: AnalyticsSeriesRow[]
    stats: PeriodStats
  }
  ratingsDistribution: { stars: string; count: number }[]
}

type AnalyticsRange = {
  from: number
  to: number
  bucket: AnalyticsBucket
  allTime?: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

const DATE_RANGE_OPTIONS: { value: DateRangeKey }[] = [
  { value: "7d" },
  { value: "30d" },
  { value: "12w" },
  { value: "all" },
  { value: "custom" },
]

const makeCheckInsChartConfigSingle = (checkinsLabel: string) =>
  ({
    checkins: { label: checkinsLabel, color: "var(--chart-1)" },
  }) satisfies ChartConfig

const makeCheckInsChartConfigCompare = (thisPeriodLabel: string, previousLabel: string) =>
  ({
    checkins: { label: thisPeriodLabel, color: "var(--chart-1)" },
    previous: { label: previousLabel, color: "var(--chart-2)" },
  }) satisfies ChartConfig

const makeRatingsChartConfig = (label: string) =>
  ({ count: { label, color: "var(--chart-2)" } }) satisfies ChartConfig

const makeEngagementTrendConfig = (label: string) =>
  ({ checkins: { label, color: "var(--chart-1)" } }) satisfies ChartConfig

const makeCumulativeConfig = (label: string) =>
  ({ cumulative: { label, color: "var(--chart-3)" } }) satisfies ChartConfig

const trafficSourceData = [
  { name: "App", value: 42, fill: "var(--chart-1)" },
  { name: "Social", value: 28, fill: "var(--chart-2)" },
  { name: "Website", value: 18, fill: "var(--chart-3)" },
  { name: "Walk-in", value: 12, fill: "var(--chart-4)" },
]

const makeTrafficSourceConfig = (
  visitorsLabel: string,
  appLabel: string,
  socialLabel: string,
  websiteLabel: string,
  walkInLabel: string
) =>
  ({
    value: { label: visitorsLabel, color: "var(--chart-1)" },
    App: { label: appLabel, color: "var(--chart-1)" },
    Social: { label: socialLabel, color: "var(--chart-2)" },
    Website: { label: websiteLabel, color: "var(--chart-3)" },
    "Walk-in": { label: walkInLabel, color: "var(--chart-4)" },
  }) satisfies ChartConfig

const exhibitionShareData = [
  { name: "Modern Art", value: 35, fill: "var(--chart-1)" },
  { name: "History Wing", value: 28, fill: "var(--chart-2)" },
  { name: "Science Lab", value: 22, fill: "var(--chart-3)" },
  { name: "Kids Zone", value: 15, fill: "var(--chart-4)" },
]

const makeExhibitionShareConfig = (
  shareLabel: string,
  modernArt: string,
  historyWing: string,
  scienceLab: string,
  kidsZone: string
) =>
  ({
    value: { label: shareLabel, color: "var(--chart-1)" },
    "Modern Art": { label: modernArt, color: "var(--chart-1)" },
    "History Wing": { label: historyWing, color: "var(--chart-2)" },
    "Science Lab": { label: scienceLab, color: "var(--chart-3)" },
    "Kids Zone": { label: kidsZone, color: "var(--chart-4)" },
  }) satisfies ChartConfig

function startOfLocalDay(timestamp: number) {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function parseLocalDateStart(value: string) {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day).getTime()
}

function getAnalyticsRange(dateRange: DateRangeKey, customFrom: string, customTo: string, now: number): AnalyticsRange | null {
  const tomorrowStart = startOfLocalDay(now) + DAY_MS
  if (dateRange === "7d") {
    return { from: tomorrowStart - 7 * DAY_MS, to: tomorrowStart, bucket: "day" }
  }
  if (dateRange === "30d") {
    return { from: tomorrowStart - 30 * DAY_MS, to: tomorrowStart, bucket: "day" }
  }
  if (dateRange === "12w") {
    return { from: tomorrowStart - 12 * WEEK_MS, to: tomorrowStart, bucket: "week" }
  }
  if (dateRange === "all") {
    return { from: 0, to: tomorrowStart, bucket: "week", allTime: true }
  }

  const from = parseLocalDateStart(customFrom)
  const customToStart = parseLocalDateStart(customTo)
  if (from === null || customToStart === null) return null
  const to = customToStart + DAY_MS
  if (to <= from) return null
  return {
    from,
    to,
    bucket: to - from <= 31 * DAY_MS ? "day" : "week",
  }
}

function getSignedIntegerFormatter() {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  })
}

function getSignedDecimalFormatter() {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  })
}

export function DashboardAnalytics() {
  const t = useTranslations("dashboard.analytics")
  const museumId = useDashboardMuseumId()
  const [dateRange, setDateRange] = React.useState<DateRangeKey>("all")
  const [comparePrevious, setComparePrevious] = React.useState(false)
  const [customFrom, setCustomFrom] = React.useState("")
  const [customTo, setCustomTo] = React.useState("")
  const [sortAsc, setSortAsc] = React.useState(true)
  const [initialNow, setInitialNow] = React.useState<number | null>(null)

  const numberFormatter = React.useMemo(() => new Intl.NumberFormat(), [])
  const signedIntegerFormatter = React.useMemo(() => getSignedIntegerFormatter(), [])
  const signedDecimalFormatter = React.useMemo(() => getSignedDecimalFormatter(), [])

  React.useEffect(() => {
    setInitialNow(Date.now())
  }, [])

  const dateRangeLabels: Record<DateRangeKey, string> = React.useMemo(
    () => ({
      "7d": t("last7Days"),
      "30d": t("last30Days"),
      "12w": t("last12Weeks"),
      all: t("allTime"),
      custom: t("customRange"),
    }),
    [t]
  )

  React.useEffect(() => {
    if (dateRange === "all" && comparePrevious) {
      setComparePrevious(false)
    }
  }, [comparePrevious, dateRange])

  const analyticsRange = React.useMemo(
    () => (initialNow === null ? null : getAnalyticsRange(dateRange, customFrom, customTo, initialNow)),
    [customFrom, customTo, dateRange, initialNow]
  )

  const analytics = useQuery(
    api.museums.getMuseumAnalyticsForDashboard,
    museumId && analyticsRange
      ? {
          museumId: museumId as Id<"museums">,
          range: analyticsRange,
        }
      : "skip"
  ) as DashboardAnalyticsData | null | undefined

  const checkInsData = React.useMemo(() => {
    if (!analytics) return []
    const rows = analytics.currentPeriod.series.map((row, index) => ({
      ...row,
      previous: analytics.previousPeriod.series[index]?.checkins ?? 0,
    }))
    return sortAsc ? rows : [...rows].reverse()
  }, [analytics, sortAsc])

  const cumulativeData = React.useMemo(() => {
    return checkInsData.reduce<Array<(typeof checkInsData)[number] & { cumulative: number }>>((rows, row) => {
      const previousTotal = rows.at(-1)?.cumulative ?? 0
      rows.push({ ...row, cumulative: previousTotal + row.checkins })
      return rows
    }, [])
  }, [checkInsData])

  const ratingsDistributionData = React.useMemo(
    () =>
      (analytics?.ratingsDistribution ?? ["1", "2", "3", "4", "5"].map((stars) => ({ stars, count: 0 }))).map(
        (entry, index) => ({
          ...entry,
          fill: `var(--chart-${index + 1})`,
        })
      ),
    [analytics]
  )

  const formatChange = React.useCallback(
    (current: number, previous: number) => {
      if (previous === 0) {
        if (current === 0) return t("changeNoPrevious")
        return t("changeNewVsPrevious", { count: numberFormatter.format(current) })
      }
      const percent = ((current - previous) / previous) * 100
      return t("changePercentVsPrevious", {
        value: signedIntegerFormatter.format(percent),
      })
    },
    [numberFormatter, signedIntegerFormatter, t]
  )

  const formatAverageRatingChange = React.useCallback(
    (current: number | null, previous: number | null) => {
      if (current === null) return t("noRatingsThisPeriod")
      if (previous === null) return t("changeNoPreviousRating")
      return t("changeRatingDelta", {
        value: signedDecimalFormatter.format(current - previous),
      })
    },
    [signedDecimalFormatter, t]
  )

  const statCards = React.useMemo(() => {
    if (!analytics) return []
    const currentStats = analytics.currentPeriod.stats
    const previousStats = analytics.previousPeriod.stats
    return [
      {
        title: t("totalCheckIns"),
        value: numberFormatter.format(analytics.totals.totalCheckIns),
        sub: t("visitorCheckIns"),
        icon: TicketCheckIcon,
        change: formatChange(currentStats.totalCheckIns, previousStats.totalCheckIns),
      },
      {
        title: t("totalRatings"),
        value: numberFormatter.format(analytics.totals.totalRatings),
        sub: t("ratingsSubmitted"),
        icon: StarIcon,
        change: formatChange(currentStats.totalRatings, previousStats.totalRatings),
      },
      {
        title: t("averageRating"),
        value: analytics.totals.averageRating === null ? t("notAvailable") : analytics.totals.averageRating.toFixed(1),
        sub: t("outOf5Stars"),
        icon: StarIcon,
        change: formatAverageRatingChange(currentStats.averageRating, previousStats.averageRating),
      },
      {
        title: t("museumFollowers"),
        value: numberFormatter.format(analytics.totals.museumFollowers),
        sub: t("usersFollowing"),
        icon: UserPlusIcon,
        change: formatChange(currentStats.newFollowers, previousStats.newFollowers),
      },
    ]
  }, [analytics, formatAverageRatingChange, formatChange, numberFormatter, t])

  const areaGradientId = React.useId().replace(/:/g, "")
  const checkInsChartConfigSingle = React.useMemo(() => makeCheckInsChartConfigSingle(t("checkInsLabel")), [t])
  const checkInsChartConfigCompare = React.useMemo(
    () => makeCheckInsChartConfigCompare(t("thisPeriod"), t("previousPeriod")),
    [t]
  )
  const ratingsChartConfig = React.useMemo(() => makeRatingsChartConfig(t("ratingsLabel")), [t])
  const engagementTrendConfig = React.useMemo(() => makeEngagementTrendConfig(t("checkInsLabel")), [t])
  const cumulativeConfig = React.useMemo(() => makeCumulativeConfig(t("cumulativeVisits")), [t])
  const trafficSourceConfig = React.useMemo(
    () =>
      makeTrafficSourceConfig(
        t("visitorsLabel"),
        t("appLabel"),
        t("socialLabel"),
        t("websiteLabel"),
        t("walkInLabel")
      ),
    [t]
  )
  const exhibitionShareConfig = React.useMemo(
    () =>
      makeExhibitionShareConfig(
        t("shareOfVisits"),
        t("modernArt"),
        t("historyWing"),
        t("scienceLab"),
        t("kidsZone")
      ),
    [t]
  )

  if (!museumId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("selectMuseumDescription")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="size-4" />
            {t("dateRange")}
          </CardTitle>
          <CardDescription>{t("dateRangeDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground whitespace-nowrap text-sm">{t("period")}</span>
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeKey)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("selectRange")} />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {dateRangeLabels[option.value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="border-input bg-background text-foreground h-8 rounded-lg border px-2.5 text-sm"
              />
              <span className="text-muted-foreground text-sm">{t("to")}</span>
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="border-input bg-background text-foreground h-8 rounded-lg border px-2.5 text-sm"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => setSortAsc((ascending) => !ascending)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
              sortAsc
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background hover:bg-muted/50"
            )}
          >
            <ArrowLeftRightIcon className="size-4" />
            {sortAsc ? t("oldestFirst") : t("newestFirst")}
          </button>
          <label className="border-input hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={comparePrevious}
              onChange={(event) => setComparePrevious(event.target.checked)}
              disabled={dateRange === "all"}
              className="border-input rounded"
            />
            <span>{t("comparePrevious")}</span>
          </label>
        </CardContent>
      </Card>

      {initialNow === null ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("loadingTitle")}</CardTitle>
            <CardDescription>{t("loadingDescription")}</CardDescription>
          </CardHeader>
        </Card>
      ) : !analyticsRange ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("customRange")}</CardTitle>
            <CardDescription>{t("customRangePrompt")}</CardDescription>
          </CardHeader>
        </Card>
      ) : analytics === undefined ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("loadingTitle")}</CardTitle>
            <CardDescription>{t("loadingDescription")}</CardDescription>
          </CardHeader>
        </Card>
      ) : analytics === null ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("notAvailable")}</CardTitle>
            <CardDescription>{t("analyticsUnavailable")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <Icon className="text-muted-foreground size-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-muted-foreground text-xs">{stat.sub}</p>
                    {comparePrevious && stat.change && (
                      <p className="text-chart-1 mt-1 text-xs font-medium">{stat.change}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("checkInsOverTime")}</CardTitle>
              <CardDescription>
                {comparePrevious ? t("checkInsDescCompare") : t("checkInsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={comparePrevious ? checkInsChartConfigCompare : checkInsChartConfigSingle}
                className="h-[280px] w-full"
              >
                <RechartsBarChart data={checkInsData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    className="text-muted-foreground text-xs"
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-muted-foreground text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {comparePrevious ? (
                    <>
                      <Bar dataKey="checkins" fill="var(--color-checkins)" radius={[4, 4, 0, 0]} name={t("thisPeriod")} />
                      <Bar dataKey="previous" fill="var(--color-previous)" radius={[4, 4, 0, 0]} name={t("previousPeriod")} />
                    </>
                  ) : (
                    <Bar dataKey="checkins" fill="var(--color-checkins)" radius={[4, 4, 0, 0]} />
                  )}
                </RechartsBarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("engagementTrend")}</CardTitle>
              <CardDescription>{t("engagementTrendDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={engagementTrendConfig} className="h-[280px] w-full">
                <RechartsLineChart data={checkInsData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    className="text-muted-foreground text-xs"
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-muted-foreground text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="checkins"
                    stroke="var(--color-checkins)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-checkins)", r: 3 }}
                  />
                </RechartsLineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("cumulativeVisits")}</CardTitle>
              <CardDescription>{t("cumulativeVisitsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={cumulativeConfig} className="h-[280px] w-full">
                <RechartsAreaChart data={cumulativeData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-cumulative)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-cumulative)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    className="text-muted-foreground text-xs"
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-muted-foreground text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="var(--color-cumulative)"
                    strokeWidth={2}
                    fill={`url(#${areaGradientId})`}
                  />
                </RechartsAreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("ratingsDistribution")}</CardTitle>
              <CardDescription>{t("ratingsDistributionDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={ratingsChartConfig} className="h-[280px] w-full">
                <RechartsBarChart data={ratingsDistributionData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="stars"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    className="text-muted-foreground text-xs"
                    tickFormatter={(value) => `${value} ★`}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-muted-foreground text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {ratingsDistributionData.map((entry) => (
                      <Cell key={entry.stars} fill={entry.fill} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{t("upcomingFeatures")}</h2>
                <Badge variant="outline">{t("sampleDataBadge")}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">{t("upcomingFeaturesDesc")}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>{t("visitorSources")}</CardTitle>
                      <CardDescription>{t("visitorSourcesDesc")}</CardDescription>
                    </div>
                    <Badge variant="secondary">{t("sampleDataBadge")}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-xs">{t("sampleDataNotice")}</p>
                  <ChartContainer config={trafficSourceConfig} className="h-[280px] w-full">
                    <RechartsPieChart margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={trafficSourceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {trafficSourceData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>{t("exhibitionPopularity")}</CardTitle>
                      <CardDescription>{t("exhibitionPopularityDesc")}</CardDescription>
                    </div>
                    <Badge variant="secondary">{t("sampleDataBadge")}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-xs">{t("sampleDataNotice")}</p>
                  <ChartContainer config={exhibitionShareConfig} className="h-[280px] w-full">
                    <RechartsPieChart margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={exhibitionShareData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {exhibitionShareData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
