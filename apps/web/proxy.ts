import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Routes that unauthenticated users can access (path without locale prefix)
const publicRoutes = ["/", "/sign-in", "/sign-up", "/accept-invitation"];

/** Pathname without the locale prefix (e.g. /en/dashboard -> /dashboard) */
function pathnameWithoutLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // First segment is locale
  if (segments.length > 0 && routing.locales.includes(segments[0] as (typeof routing.locales)[number])) {
    return "/" + segments.slice(1).join("/") || "/";
  }
  return pathname;
}

/** Locale from pathname (e.g. /en/dashboard -> en) */
function localeFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && routing.locales.includes(segments[0] as (typeof routing.locales)[number])) {
    return segments[0] as (typeof routing.locales)[number];
  }
  return routing.defaultLocale;
}

export default async function proxy(request: NextRequest) {
  // Run next-intl first (locale detection and redirect to prefix)
  const intlResponse = await intlMiddleware(request);
  if (intlResponse && intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const configuredSiteUrlRaw = process.env.SITE_URL?.trim();
  const configuredSiteUrl =
    configuredSiteUrlRaw && !configuredSiteUrlRaw.includes("$") ? configuredSiteUrlRaw : null;
  if (configuredSiteUrl) {
    try {
      const canonicalUrl = new URL(
        configuredSiteUrl.startsWith("http") ? configuredSiteUrl : `https://${configuredSiteUrl}`
      );
      const requestHost = request.headers.get("host");
      const isGetLikeMethod = request.method === "GET" || request.method === "HEAD";
      if (isGetLikeMethod && requestHost && requestHost !== canonicalUrl.host) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.protocol = canonicalUrl.protocol;
        redirectUrl.host = canonicalUrl.host;
        return NextResponse.redirect(redirectUrl, 308);
      }
    } catch {
      // Ignore invalid SITE_URL values and continue request handling.
    }
  }

  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = pathnameWithoutLocale(pathname);
  const isPublicRoute = publicRoutes.includes(pathWithoutLocale);

  const sessionCookie = getSessionCookie(request);

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    const locale = localeFromPathname(pathname);
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    return NextResponse.redirect(signInUrl, 302);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|monitoring|.*\\..*).*)"],
};
