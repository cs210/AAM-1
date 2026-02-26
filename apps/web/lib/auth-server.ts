import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

// Derive Convex site URL from Convex deployment URL (.convex.cloud → .convex.site) when not set
function getConvexSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (fromEnv && !fromEnv.includes("$")) return fromEnv;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl?.includes(".convex.cloud"))
    return convexUrl.replace(".convex.cloud", ".convex.site");
  return fromEnv ?? "";
}

export const {
  handler,
  getToken,
  isAuthenticated,
  preloadAuthQuery,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: getConvexSiteUrl(),
});
