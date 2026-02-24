import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Routes that unauthenticated users can access
const publicRoutes = ["/sign-in", "/sign-up"];

export default async function proxy(request: NextRequest) {
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
