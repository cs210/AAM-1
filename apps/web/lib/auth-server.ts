import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

// On Vercel, derive site URL from VERCEL_URL when NEXT_PUBLIC_CONVEX_SITE_URL is unset or not substituted
function getConvexSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (fromEnv && !fromEnv.includes("$")) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
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
