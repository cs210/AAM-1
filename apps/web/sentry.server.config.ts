import * as Sentry from "@sentry/nextjs";
import {
  isSentryEnabledForEnv,
  resolveServerAppEnv,
  webSentryRelease,
} from "./lib/sentry-env";

const appEnv = resolveServerAppEnv();
const enabled = isSentryEnabledForEnv(appEnv);

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: enabled && Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: appEnv,
  release: webSentryRelease(),
  sendDefaultPii: true,
  tracesSampleRate: appEnv === "production" ? 0.15 : 0.35,
  includeLocalVariables: true,
  enableLogs: true,

  beforeSend(event) {
    event.tags = { ...event.tags, app: "web", runtime: "nodejs" };
    event.contexts = {
      ...event.contexts,
      deploy: {
        vercel_env: process.env.VERCEL_ENV ?? null,
        vercel_region: process.env.VERCEL_REGION ?? null,
        vercel_url: process.env.VERCEL_URL ?? null,
        git_commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        git_branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      },
    };
    return event;
  },
});
