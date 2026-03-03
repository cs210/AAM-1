import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Routes that unauthenticated users can access
const publicRoutes = ["/sign-in", "/sign-up"];

export default async function proxy(request: NextRequest) {
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

  const sessionCookie = getSessionCookie(request);
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

  // Allow public routes and API auth routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to sign-in
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run proxy on all routes except static assets and auth API routes
  matcher: ["/((?!.*\\..*|_next|api/auth).+)", "/trpc(.*)"],
};
