import Constants from "expo-constants";

export type AppEnv = "development" | "staging" | "production";

/**
 * Set EXPO_PUBLIC_APP_ENV per EAS profile (staging / production). Local dev stays development.
 */
export function resolveMobileAppEnv(): AppEnv {
  const explicit = process.env.EXPO_PUBLIC_APP_ENV;
  if (explicit === "staging" || explicit === "production" || explicit === "development") {
    return explicit;
  }
  if (__DEV__) return "development";
  return "production";
}

export function isSentryEnabledForEnv(env: AppEnv): boolean {
  return env === "staging" || env === "production";
}

export function mobileRelease(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_SENTRY_RELEASE;
  if (fromEnv) return fromEnv;
  const version = Constants.expoConfig?.version;
  if (!version) return undefined;
  const build = getNativeBuildLabel();
  return build ? `${version}+${build}` : version;
}

function getNativeBuildLabel(): string | undefined {
  const ios = Constants.expoConfig?.ios;
  if (ios && typeof ios === "object" && "buildNumber" in ios && typeof ios.buildNumber === "string") {
    return ios.buildNumber;
  }
  const android = Constants.expoConfig?.android;
  if (android && typeof android === "object" && "versionCode" in android) {
    const vc = (android as { versionCode?: number }).versionCode;
    return vc !== undefined ? String(vc) : undefined;
  }
  return undefined;
}
