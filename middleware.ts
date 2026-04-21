import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccessAdminPanel } from "@/lib/admin-panel-access";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as
      | { role?: string; email?: string | null }
      | undefined;
    const method = req.method;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
      if (!canAccessAdminPanel(token?.email, token?.role)) {
        if (path.startsWith("/api/admin")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    if (
      token?.role === "LEVEL_2_USER" &&
      method !== "GET" &&
      method !== "HEAD"
    ) {
      return NextResponse.json(
        { error: "Forbidden: read-only role" },
        { status: 403 }
      );
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/workers/:path*",
    "/notifications/:path*",
    "/events",
    "/events/:path*",
    "/alerts",
    "/alerts/:path*",
    "/compliance/:path*",
    "/api/workers",
    "/api/workers/:path*",
    "/api/notifications",
    "/api/notifications/:path*",
    "/api/events",
    "/api/events/:path*",
    "/api/alerts",
    "/api/alerts/:path*",
    "/api/cron/escalation",
    "/api/dashboard",
    "/api/documents",
    "/api/documents/:path*",
    "/api/organisation",
    "/api/organisation/:path*",
    "/api/tenant-users",
    "/api/compliance",
    "/api/compliance/:path*",
    "/api/payroll/:path*",
  ],
};
