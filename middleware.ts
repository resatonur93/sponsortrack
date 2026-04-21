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
      authorized: ({ req, token }) => {
        const p = req.nextUrl.pathname;
        if (p.startsWith("/api/cron/")) {
          return true;
        }
        if (p.startsWith("/self-service") || p.startsWith("/api/self-service")) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/self-service/:path*",
    "/api/self-service/:path*",
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
    "/audit",
    "/audit/:path*",
    "/risk-report",
    "/risk-report/:path*",
    "/organisation-changes",
    "/organisation-changes/:path*",
    "/api/workers",
    "/api/workers/:path*",
    "/api/notifications",
    "/api/notifications/:path*",
    "/api/events",
    "/api/events/:path*",
    "/api/sms-drafts",
    "/api/sms-drafts/:path*",
    "/api/alerts",
    "/api/alerts/:path*",
    "/api/cron/escalation",
    "/api/cron/risk-scores",
    "/api/dashboard",
    "/api/documents",
    "/api/documents/:path*",
    "/api/organisation",
    "/api/organisation/:path*",
    "/api/org-changes",
    "/api/org-changes/:path*",
    "/api/tenant-users",
    "/api/compliance",
    "/api/compliance/:path*",
    "/api/audit",
    "/api/audit/:path*",
    "/api/risk-scores",
    "/api/risk-scores/:path*",
    "/api/workflow",
    "/api/workflow/:path*",
    "/api/payroll/:path*",
    "/api/salary",
    "/api/salary/:path*",
    "/api/absences",
    "/api/absences/:path*",
    "/api/uk-law",
    "/api/uk-law/:path*",
  ],
};
