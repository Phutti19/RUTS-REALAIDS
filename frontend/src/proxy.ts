import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

const PUBLIC_PATHS = ["/login", "/forgot-password"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname) || pathname === "/") {
    return NextResponse.next();
  }

  // Route protection uses access_token cookie set after login
  const tokenCookie = request.cookies.get("access_token")?.value;

  if (!tokenCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(tokenCookie, secret);
    const role = payload.role as string;

    if (pathname.startsWith("/student") && role !== "student") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname.startsWith("/staff") && role !== "staff" && role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)",
  ],
};
