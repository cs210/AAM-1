import * as Sentry from "@sentry/nextjs";
import {
  isSentryEnabledForEnv,
  resolveClientAppEnv,
  webSentryRelease,
} from "./lib/sentry-env";

const appEnv = resolveClientAppEnv();
const enabled = isSentryEnabledForEnv(appEnv);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: enabled && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: appEnv,
  release: webSentryRelease(),
  sendDefaultPii: false,

  tracesSampleRate: appEnv === "production" ? 0.15 : 0.35,
  replaysSessionSampleRate: appEnv === "production" ? 0.08 : 0.15,
  replaysOnErrorSampleRate: 1,

  enableLogs: true,

  integrations: [Sentry.replayIntegration()],

  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    event.tags = { ...event.tags, app: "web" };
    event.contexts = {
      ...event.contexts,
      app: {
        name: "web",
        locale: typeof window !== "undefined" ? document.documentElement.lang : undefined,
      },
    };
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (typeof breadcrumb.data?.url === "string") {
      try {
        const parsed = new URL(breadcrumb.data.url, window.location.origin);
        parsed.search = "";
        parsed.hash = "";
        return {
          ...breadcrumb,
          data: { ...breadcrumb.data, url: parsed.toString() },
        };
      } catch {
        return { ...breadcrumb, data: { ...breadcrumb.data, url: "[redacted-url]" } };
      }
    }
    return breadcrumb;
  },
});

Sentry.setTag("app_env", appEnv);
if (typeof window !== "undefined" && window.location?.host) {
  Sentry.setTag("host", window.location.host);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
