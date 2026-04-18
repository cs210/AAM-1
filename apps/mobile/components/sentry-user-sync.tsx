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
    const email = typeof user.email === "string" ? user.email : undefined;
    const username = typeof user.name === "string" ? user.name : undefined;

    Sentry.setUser(
      id
        ? { id, email, username }
        : email || username
          ? { email, username }
          : null,
    );
  }, [user]);

  return null;
}
