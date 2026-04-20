"use client";

import { api } from "@packages/backend/convex/_generated/api";
import * as Sentry from "@sentry/nextjs";
import { useQuery } from "convex/react";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { isSentryEnabledForEnv, resolveClientAppEnv } from "@/lib/sentry-env";

function pickUserId(user: Record<string, unknown> | null | undefined): string | undefined {
  if (!user) return undefined;
  if (typeof user.id === "string") return user.id;
  if (typeof user._id === "string") return user._id;
  return undefined;
}

/**
 * Keeps Sentry scope aligned with the signed-in user and active organization.
 */
export function SentryUserSync() {
  const user = useQuery(api.auth.getCurrentUser);
  const { data: activeOrganization } = authClient.useActiveOrganization();

  useEffect(() => {
    const appEnv = resolveClientAppEnv();
    if (!isSentryEnabledForEnv(appEnv)) return;

    if (user === undefined) return;

    if (user === null) {
      Sentry.setUser(null);
      Sentry.setTag("organization_id", undefined);
      Sentry.setTag("organization_slug", undefined);
      return;
    }

    const id = pickUserId(user as Record<string, unknown>);
    const email = typeof user.email === "string" ? user.email : undefined;
    const username = typeof user.name === "string" ? user.name : undefined;

    Sentry.setUser(
      id
        ? {
            id,
            email,
            username,
          }
        : email || username
          ? { email, username }
          : null,
    );

    if (activeOrganization?.id) {
      Sentry.setTag("organization_id", activeOrganization.id);
    }
    if (activeOrganization?.slug) {
      Sentry.setTag("organization_slug", activeOrganization.slug);
    }
  }, [user, activeOrganization]);

  return null;
}
