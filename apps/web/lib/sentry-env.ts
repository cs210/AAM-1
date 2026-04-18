/**
 * Deployment tier for Sentry and observability.
 * - Set NEXT_PUBLIC_APP_ENV in each environment (Vercel / local): development | staging | production
 * - On Vercel server runtimes, VERCEL_ENV is used as a fallback when NEXT_PUBLIC_APP_ENV is unset
 * - In the browser, only NEXT_PUBLIC_* / NEXT_PUBLIC_VERCEL_ENV apply
 */
export type AppEnv = "development" | "staging" | "production";

export function resolveClientAppEnv(): AppEnv {
  const explicit = process.env.NEXT_PUBLIC_APP_ENV;
  if (explicit === "staging" || explicit === "production" || explicit === "development") {
    return explicit;
  }
  const vercel = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (vercel === "production") return "production";
  if (vercel === "preview") return "staging";
  return "development";
}

export function resolveServerAppEnv(): AppEnv {
  const explicit = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV;
  if (explicit === "staging" || explicit === "production" || explicit === "development") {
    return explicit;
  }
  const vercel = process.env.VERCEL_ENV;
  if (vercel === "production") return "production";
  if (vercel === "preview") return "staging";
  return "development";
}

export function isSentryEnabledForEnv(env: AppEnv): boolean {
  return env === "staging" || env === "production";
}

export function webSentryRelease(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  );
}
