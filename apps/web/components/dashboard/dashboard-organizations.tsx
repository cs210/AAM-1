"use client"

import * as React from "react"
import { useAction, useQuery } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type OrgRow = { _id: string; name: string; slug: string }

export function DashboardOrganizations() {
  const user = useQuery(api.auth.getCurrentUser)
  const isAdmin = (user as { role?: string } | null)?.role === "admin"
  const myOrgs = useQuery(api.admin.listMyOrganizations)
  const listAllOrgs = useAction(api.admin.listOrganizationsForAdmin)
  const [allOrgs, setAllOrgs] = React.useState<OrgRow[] | null | undefined>(undefined)

  React.useEffect(() => {
    if (!isAdmin) {
      setAllOrgs(undefined)
      return
    }
    setAllOrgs(undefined)
    listAllOrgs().then(setAllOrgs).catch(() => setAllOrgs(null))
  }, [isAdmin, listAllOrgs])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your organizations</CardTitle>
          <CardDescription>Organizations you are a member of (affiliations).</CardDescription>
        </CardHeader>
        <CardContent>
          {myOrgs === undefined ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : myOrgs.length === 0 ? (
            <p className="text-muted-foreground text-sm">You are not a member of any organization yet.</p>
          ) : (
            <ul className="space-y-2">
              {myOrgs.map((org: OrgRow) => (
                <li key={org._id} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  {org.name} ({org._id})
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>All organizations</CardTitle>
            <CardDescription>Every organization in the system (admin view).</CardDescription>
          </CardHeader>
          <CardContent>
            {allOrgs === undefined ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : allOrgs === null || allOrgs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No organizations yet.</p>
            ) : (
              <ul className="space-y-2">
                {(allOrgs as OrgRow[]).map((org: OrgRow) => (
                  <li key={org._id} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    {org.name} ({org._id})
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
