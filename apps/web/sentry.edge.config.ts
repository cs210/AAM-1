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
  enableLogs: true,

  beforeSend(event) {
    event.tags = { ...event.tags, app: "web", runtime: "edge" };
    event.contexts = {
      ...event.contexts,
      deploy: {
        vercel_env: process.env.VERCEL_ENV ?? null,
        vercel_region: process.env.VERCEL_REGION ?? null,
      },
    };
    return event;
  },
});
