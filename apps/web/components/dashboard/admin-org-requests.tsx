"use client"

import * as React from "react"
import { useAction, useMutation } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Doc, Id } from "@packages/backend/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function AdminOrgRequests() {
  const listOrgRequests = useAction(api.admin.listOrgRequestsForAdmin)
  const [requests, setRequests] = React.useState<
    ((Doc<"organizationRequests"> & { userDisplay?: string; orgDisplay?: string })[] | null) | undefined
  >(undefined)
  const setStatus = useMutation(api.admin.setOrgRequestStatusForAdmin)
  const [updatingId, setUpdatingId] = React.useState<Id<"organizationRequests"> | null>(null)

  const load = React.useCallback(() => {
    setRequests(undefined)
    listOrgRequests().then(setRequests).catch(() => setRequests(null))
  }, [listOrgRequests])

  React.useEffect(() => {
    load()
  }, [load])

  const handleStatus = async (
    requestId: Id<"organizationRequests">,
    status: "approved" | "rejected"
  ) => {
    setUpdatingId(requestId)
    try {
      await setStatus({ requestId, status })
      load()
    } finally {
      setUpdatingId(null)
    }
  }

  if (requests === undefined) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-muted-foreground text-center text-sm">Loading requests…</div>
        </CardContent>
      </Card>
    )
  }

  if (requests !== undefined && (requests === null || requests.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Org requests</CardTitle>
          <CardDescription>No organization access requests yet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Org requests</CardTitle>
        <CardDescription>Review and approve or reject museum workspace requests.</CardDescription>
        <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={load} disabled={requests === undefined}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(requests ?? []).map((req) => (
            <div
              key={req._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{req.orgDisplay ?? req.museumName}</p>
                <p className="text-muted-foreground text-sm">
                  {req.city}, {req.state}
                  {req.website ? ` · ${req.website}` : ""}
                </p>
                <p className="text-muted-foreground text-xs">
                  User: {req.userDisplay ?? req.userId}
                  {req.staffRole ? ` · ${req.staffRole}` : ""}
                </p>
                <p className="text-muted-foreground text-xs">
                  {new Date(req.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "secondary"}>
                  {req.status}
                </Badge>
                {req.status === "pending" && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={updatingId === req._id}
                      onClick={() => handleStatus(req._id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === req._id}
                      onClick={() => handleStatus(req._id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
