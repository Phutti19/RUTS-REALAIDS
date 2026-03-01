import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

const PUBLIC_PATHS = ["/login", "/forgot-password"];
const STUDENT_PREFIX = "/student";
const STAFF_PREFIX = "/staff";

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname) || pathname === "/") {
    return NextResponse.next();
  }

  // Get access token from Authorization header (set by client-side api.ts)
  // In Next.js middleware we read from cookies (the refresh-token cookie won't
  // help here, but we rely on the client to redirect when needed).
  // For SSR route protection, we check the token passed as a cookie by
  // the frontend after successful login.
  const tokenCookie = request.cookies.get("access_token")?.value;

  if (!tokenCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(tokenCookie, secret);
    const role = payload.role as string;

    // Role-based routing
    if (pathname.startsWith(STUDENT_PREFIX) && role !== "student") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (
      pathname.startsWith(STAFF_PREFIX) &&
      role !== "staff" &&
      role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch {
    // Token expired or invalid
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)",
  ],
};
