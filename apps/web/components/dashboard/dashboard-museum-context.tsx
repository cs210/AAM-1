"use client"

import * as React from "react"

export type DashboardMuseumContextSource = "regular" | "softwareFair"
export type SetDashboardMuseumContextOptions = {
  source?: DashboardMuseumContextSource
}

const DashboardMuseumContext = React.createContext<string | null>(null)
const DashboardMuseumActionsContext = React.createContext<{
  setMuseumContext: (
    museumId: string,
    options?: SetDashboardMuseumContextOptions,
  ) => void
} | null>(null)

export function DashboardMuseumProvider({
  museumId,
  onMuseumContextChange,
  children,
}: {
  museumId: string | null
  onMuseumContextChange?: (
    museumId: string,
    options?: SetDashboardMuseumContextOptions,
  ) => void
  children: React.ReactNode
}) {
  const actions = React.useMemo(
    () => ({
      setMuseumContext: (
        nextMuseumId: string,
        options?: SetDashboardMuseumContextOptions,
      ) => {
        onMuseumContextChange?.(nextMuseumId, options)
      },
    }),
    [onMuseumContextChange],
  )

  return (
    <DashboardMuseumActionsContext.Provider value={actions}>
      <DashboardMuseumContext.Provider value={museumId}>
        {children}
      </DashboardMuseumContext.Provider>
    </DashboardMuseumActionsContext.Provider>
  )
}

export function useDashboardMuseumId(): string | null {
  return React.useContext(DashboardMuseumContext)
}

export function useDashboardMuseumContextActions() {
  return React.useContext(DashboardMuseumActionsContext)
}
