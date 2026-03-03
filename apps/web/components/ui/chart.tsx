"use client"

import * as React from "react"
import {
  Area,
  Bar,
  CartesianGrid,
  Line,
  ComposedChart as RechartsComposedChart,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType<{ className?: string }>
    color?: string
    theme?: Record<string, string>
  }
>

const ChartContext = React.createContext<ChartConfig | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

function ChartContainer({
  id,
  config,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  id?: string
  config: ChartConfig
  children: React.ReactElement
}) {
  const uniqueId = React.useId()
  const chartId = React.useRef(`chart-${id || uniqueId.replace(/:/g, "")}`)
  const configKey = JSON.stringify(
    Object.fromEntries(
      Object.entries(config).map(([k, v]) => [k, v?.color ?? v?.theme])
    )
  )

  const style = React.useMemo(() => {
    const vars: string[] = []
    for (const [key, value] of Object.entries(config)) {
      if (value?.color) {
        const varName = `--color-${key.replace(/\s+/g, "_")}`
        vars.push(`${varName}: ${value.color}`)
      }
    }
    return vars.length > 0 ? `[data-chart-id="${chartId.current}"] { ${vars.join("; ")} }` : ""
  }, [configKey])

  return (
    <div
      data-chart-id={chartId.current}
      className={cn("w-full", className)}
      {...props}
    >
      {style ? <style dangerouslySetInnerHTML={{ __html: style }} /> : null}
      <ChartContext.Provider value={config}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </ChartContext.Provider>
    </div>
  )
}

function ChartTooltip({
  content,
  ...props
}: React.ComponentProps<typeof RechartsTooltip> & {
  content?: React.ReactElement
}) {
  return <RechartsTooltip content={content} {...props} />
}

type ChartTooltipPayloadItem = {
  name?: string
  value?: unknown
  dataKey?: string
  color?: string
}

function ChartTooltipContent({
  hideLabel,
  hideIndicator,
  indicator = "dot",
  nameKey,
  labelKey,
  labelFormatter,
  valueFormatter,
  active,
  payload = [],
  label,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
  labelKey?: string
  labelFormatter?: (label: unknown, payload: ChartTooltipPayloadItem[]) => React.ReactNode
  valueFormatter?: (value: number, name: unknown, item: ChartTooltipPayloadItem, index: number, payload: ChartTooltipPayloadItem[]) => React.ReactNode
  active?: boolean
  payload?: ChartTooltipPayloadItem[]
  label?: string
}) {
  const config = useChart()
  if (!active || !payload?.length) return null
  const name = nameKey && payload[0] ? (payload[0].name ?? payload[0].dataKey) : undefined
  const configEntry = name != null ? config[name as string] : undefined
  const displayLabel = labelKey ? (config[labelKey]?.label ?? labelKey) : (label ?? (configEntry?.label ?? name))
  return (
    <div
      className={cn(
        "border-border bg-background text-foreground rounded-lg border px-2.5 py-1.5 shadow-md",
        className
      )}
      {...props}
    >
      <div className="grid gap-1.5">
        {!hideLabel && displayLabel != null && (
          <div className="text-muted-foreground text-xs">
            {typeof labelFormatter === "function" ? labelFormatter(label, payload) : displayLabel}
          </div>
        )}
        {payload.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {!hideIndicator && (
              <span
                className="shrink-0 rounded-[2px] border-2 border-current opacity-100"
                style={{
                  backgroundColor: item.color ?? "var(--color)",
                  borderColor: item.color ?? "var(--color)",
                  ...(indicator === "line" && { width: "8px", height: 0 }),
                  ...(indicator === "dashed" && { width: "8px", height: 0, borderStyle: "dashed" }),
                }}
              />
            )}
            <span className="text-muted-foreground">
              {config[item.dataKey as string]?.label ?? item.dataKey}:
            </span>
            <span className="font-medium tabular-nums">
              {typeof valueFormatter === "function"
                ? valueFormatter(Number(item.value), name, item, i, payload)
                : String(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  useChart,
  Area,
  Bar,
  CartesianGrid,
  Line,
  RechartsBarChart,
  RechartsLineChart,
  RechartsComposedChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
}
