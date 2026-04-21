import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { isSentryEnabledForEnv, mobileRelease, resolveMobileAppEnv } from "./sentry-env";

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

const appEnv = resolveMobileAppEnv();
const enabled = isSentryEnabledForEnv(appEnv);

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: enabled && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  environment: appEnv,
  release: mobileRelease(),
  sendDefaultPii: false,

  tracesSampleRate: appEnv === "production" ? 0.15 : 0.35,
  profilesSampleRate: appEnv === "production" ? 0.1 : 0.3,
  replaysSessionSampleRate: appEnv === "production" ? 0 : 0.15,
  replaysOnErrorSampleRate: 1,
  enableLogs: appEnv !== "production",

  integrations: [navigationIntegration, Sentry.mobileReplayIntegration()],

  enableNativeFramesTracking: !isRunningInExpoGo(),

  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    event.tags = { ...event.tags, app: "mobile", os: Platform.OS };
    event.contexts = {
      ...event.contexts,
      app: {
        name: "mobile",
        version: Constants.expoConfig?.version,
        sdkVersion: Constants.expoConfig?.sdkVersion,
      },
      device: {
        brand: Constants.brand ?? undefined,
        modelName: Constants.deviceName ?? undefined,
      },
    };
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category?.includes("navigation") && typeof breadcrumb.data?.url === "string") {
      try {
        const parsed = new URL(breadcrumb.data.url);
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
