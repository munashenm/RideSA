import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const AUTH_PATHS = ["/api/auth/login", "/api/auth/register", "/api/otp"];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host === "vayasa.co.za") {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    url.host = "www.vayasa.co.za";
    return NextResponse.redirect(url, 301);
  }

  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    const { ok, remaining } = rateLimit(`auth:${ip}`, 20, 60_000);
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }
    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Remaining", String(remaining));
    return res;
  }

  if (pathname.startsWith("/api/emergency")) {
    const { ok } = rateLimit(`sos:${ip}`, 5, 60_000);
    if (!ok) {
      return NextResponse.json({ error: "SOS rate limit exceeded" }, { status: 429 });
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/).*)",
  ],
};
