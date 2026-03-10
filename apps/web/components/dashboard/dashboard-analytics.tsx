"use client"

import * as React from "react"
import {
  Bar,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  AreaChart as RechartsAreaChart,
  PieChart as RechartsPieChart,
  Pie,
  Line,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
} from "recharts"
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
  StarIcon,
  UserPlusIcon,
  TicketCheckIcon,
  CalendarIcon,
  ArrowLeftRightIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type DateRangeKey = "7d" | "30d" | "12w" | "custom"

// Static example: 12 weeks of check-ins with current + previous period for comparison
const allCheckInsData = [
  { week: "Week 1", label: "W1", checkins: 89, previous: 72 },
  { week: "Week 2", label: "W2", checkins: 112, previous: 88 },
  { week: "Week 3", label: "W3", checkins: 98, previous: 95 },
  { week: "Week 4", label: "W4", checkins: 134, previous: 110 },
  { week: "Week 5", label: "W5", checkins: 156, previous: 128 },
  { week: "Week 6", label: "W6", checkins: 145, previous: 142 },
  { week: "Week 7", label: "W7", checkins: 178, previous: 155 },
  { week: "Week 8", label: "W8", checkins: 192, previous: 168 },
  { week: "Week 9", label: "W9", checkins: 165, previous: 180 },
  { week: "Week 10", label: "W10", checkins: 203, previous: 188 },
  { week: "Week 11", label: "W11", checkins: 221, previous: 195 },
  { week: "Week 12", label: "W12", checkins: 248, previous: 210 },
]

const checkInsChartConfigSingle = {
  checkins: {
    label: "Check-ins",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const checkInsChartConfigCompare = {
  checkins: {
    label: "This period",
    color: "var(--chart-1)",
  },
  previous: {
    label: "Previous period",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

// Ratings: use theme chart colors per star (1–5)
const ratingsDistributionData = [
  { stars: "1", count: 4, fill: "var(--chart-1)" },
  { stars: "2", count: 8, fill: "var(--chart-2)" },
  { stars: "3", count: 12, fill: "var(--chart-3)" },
  { stars: "4", count: 35, fill: "var(--chart-4)" },
  { stars: "5", count: 30, fill: "var(--chart-5)" },
]

const ratingsChartConfig = {
  count: {
    label: "Ratings",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

// Line chart: engagement trend (same data as check-ins, line style)
const engagementTrendConfig = {
  checkins: {
    label: "Check-ins",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

// Area chart: cumulative visits
const cumulativeConfig = {
  cumulative: {
    label: "Cumulative visits",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

// Pie chart: where visitors find the museum (traffic source)
const trafficSourceData = [
  { name: "App", value: 42, fill: "var(--chart-1)" },
  { name: "Social", value: 28, fill: "var(--chart-2)" },
  { name: "Website", value: 18, fill: "var(--chart-3)" },
  { name: "Walk-in", value: 12, fill: "var(--chart-4)" },
]
const trafficSourceConfig = {
  value: { label: "Visitors", color: "var(--chart-1)" },
  App: { label: "App", color: "var(--chart-1)" },
  Social: { label: "Social", color: "var(--chart-2)" },
  Website: { label: "Website", color: "var(--chart-3)" },
  "Walk-in": { label: "Walk-in", color: "var(--chart-4)" },
} satisfies ChartConfig

// Pie chart: exhibition popularity (share of visits)
const exhibitionShareData = [
  { name: "Modern Art", value: 35, fill: "var(--chart-1)" },
  { name: "History Wing", value: 28, fill: "var(--chart-2)" },
  { name: "Science Lab", value: 22, fill: "var(--chart-3)" },
  { name: "Kids Zone", value: 15, fill: "var(--chart-4)" },
]
const exhibitionShareConfig = {
  value: { label: "Share of visits", color: "var(--chart-1)" },
  "Modern Art": { label: "Modern Art", color: "var(--chart-1)" },
  "History Wing": { label: "History Wing", color: "var(--chart-2)" },
  "Science Lab": { label: "Science Lab", color: "var(--chart-3)" },
  "Kids Zone": { label: "Kids Zone", color: "var(--chart-4)" },
} satisfies ChartConfig

const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string; points: number }[] = [
  { value: "7d", label: "Last 7 days", points: 7 },
  { value: "30d", label: "Last 30 days", points: 7 },
  { value: "12w", label: "Last 12 weeks", points: 12 },
  { value: "custom", label: "Custom range", points: 12 },
]

export function DashboardAnalytics() {
  const [dateRange, setDateRange] = React.useState<DateRangeKey>("12w")
  const [comparePrevious, setComparePrevious] = React.useState(false)
  const [customFrom, setCustomFrom] = React.useState("")
  const [customTo, setCustomTo] = React.useState("")
  const [sortAsc, setSortAsc] = React.useState(false)

  const pointsToShow = dateRange === "custom" ? 12 : DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.points ?? 12
  const checkInsData = React.useMemo(() => {
    let slice = allCheckInsData.slice(-pointsToShow)
    if (sortAsc) slice = [...slice].reverse()
    return slice
  }, [pointsToShow, sortAsc])

  const cumulativeData = React.useMemo(() => {
    return checkInsData.reduce<Array<(typeof checkInsData)[number] & { cumulative: number }>>((rows, row) => {
      const previousTotal = rows.at(-1)?.cumulative ?? 0
      rows.push({ ...row, cumulative: previousTotal + row.checkins })
      return rows
    }, [])
  }, [checkInsData])

  const areaGradientId = React.useId().replace(/:/g, "")

  const statCards = React.useMemo(() => {
    const base = [
      { title: "Total check-ins", value: "1,247", sub: "Visitor check-ins", icon: TicketCheckIcon, change: "+12% vs previous" },
      { title: "Total ratings", value: "89", sub: "Ratings submitted", icon: StarIcon, change: "+5%" },
      { title: "Average rating", value: "4.2", sub: "Out of 5 stars", icon: StarIcon, change: "+0.2" },
      { title: "Museum followers", value: "312", sub: "Users following", icon: UserPlusIcon, change: "+8%" },
    ]
    return base
  }, [])

  return (
    <div className="space-y-6">
      {/* Controls: date range, sort, compare */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="size-4" />
            Date & range
          </CardTitle>
          <CardDescription>
            Choose date range, sort order, and optionally compare to the previous period.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm whitespace-nowrap">Period</span>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeKey)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border-input bg-background text-foreground h-8 rounded-lg border px-2.5 text-sm"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border-input bg-background text-foreground h-8 rounded-lg border px-2.5 text-sm"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => setSortAsc((a) => !a)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
              sortAsc
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background hover:bg-muted/50"
            )}
          >
            <ArrowLeftRightIcon className="size-4" />
            {sortAsc ? "Oldest first" : "Newest first"}
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted/50">
            <input
              type="checkbox"
              checked={comparePrevious}
              onChange={(e) => setComparePrevious(e.target.checked)}
              className="rounded border-input"
            />
            <span>Compare to previous period</span>
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-muted-foreground text-xs">
                  {stat.sub}
                </p>
                {comparePrevious && stat.change && (
                  <p className="mt-1 text-xs font-medium text-chart-1">
                    {stat.change}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Check-ins over time</CardTitle>
          <CardDescription>
            {comparePrevious
              ? "This period vs previous period (static example)."
              : "Weekly visitor check-ins (static example)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={comparePrevious ? checkInsChartConfigCompare : checkInsChartConfigSingle}
            className="h-[280px] w-full"
          >
            <RechartsBarChart
              data={checkInsData}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
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
                  <Bar dataKey="checkins" fill="var(--color-checkins)" radius={[4, 4, 0, 0]} name="This period" />
                  <Bar dataKey="previous" fill="var(--color-previous)" radius={[4, 4, 0, 0]} name="Previous period" />
                </>
              ) : (
                <Bar
                  dataKey="checkins"
                  fill="var(--color-checkins)"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </RechartsBarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement trend</CardTitle>
          <CardDescription>
            Weekly check-ins as a trend line (same period).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={engagementTrendConfig}
            className="h-[280px] w-full"
          >
            <RechartsLineChart
              data={checkInsData}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
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
          <CardTitle>Cumulative visits</CardTitle>
          <CardDescription>
            Running total of check-ins over the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={cumulativeConfig}
            className="h-[280px] w-full"
          >
            <RechartsAreaChart
              data={cumulativeData}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
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
          <CardTitle>Ratings distribution</CardTitle>
          <CardDescription>
            Number of ratings per star (1–5). Static example data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={ratingsChartConfig}
            className="h-[280px] w-full"
          >
            <RechartsBarChart
              data={ratingsDistributionData}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visitor sources</CardTitle>
            <CardDescription>
              Where visitors discover your museum (App, social, website, walk-in).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={trafficSourceConfig}
              className="h-[280px] w-full"
            >
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
            <CardTitle>Exhibition popularity</CardTitle>
            <CardDescription>
              Share of visits by exhibition or zone (static example).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={exhibitionShareConfig}
              className="h-[280px] w-full"
            >
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
    </div>
  )
}
