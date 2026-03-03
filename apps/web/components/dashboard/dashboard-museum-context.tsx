"use client"

import * as React from "react"

const DashboardMuseumContext = React.createContext<string | null>(null)

export function DashboardMuseumProvider({
  museumId,
  children,
}: {
  museumId: string | null
  children: React.ReactNode
}) {
  return (
    <DashboardMuseumContext.Provider value={museumId}>
      {children}
    </DashboardMuseumContext.Provider>
  )
}

export function useDashboardMuseumId(): string | null {
  return React.useContext(DashboardMuseumContext)
}
