import { api } from "@packages/backend/convex/_generated/api";
import * as Sentry from "@sentry/react-native";
import { useQuery } from "convex/react";
import { useEffect } from "react";

import { isSentryEnabledForEnv, resolveMobileAppEnv } from "@/lib/sentry-env";

function pickUserId(user: Record<string, unknown> | null | undefined): string | undefined {
  if (!user) return undefined;
  if (typeof user.id === "string") return user.id;
  if (typeof user._id === "string") return user._id;
  return undefined;
}

function toTruncatedUserId(value: string) {
  return `usr_${value.slice(-12)}`;
}

export function SentryUserSync() {
  const user = useQuery(api.auth.getCurrentUser);

  useEffect(() => {
    const appEnv = resolveMobileAppEnv();
    if (!isSentryEnabledForEnv(appEnv)) return;

    if (user === undefined) return;

    if (user === null) {
      Sentry.setUser(null);
      return;
    }

    const id = pickUserId(user as Record<string, unknown>);
    Sentry.setUser(id ? { id: toTruncatedUserId(id) } : null);
  }, [user]);

  return null;
}
