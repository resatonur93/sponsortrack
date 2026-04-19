import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as { role?: string } | undefined;
    const method = req.method;
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
    "/dashboard/:path*",
    "/workers/:path*",
    "/notifications/:path*",
    "/compliance/:path*",
    "/api/workers",
    "/api/workers/:path*",
    "/api/notifications",
    "/api/notifications/:path*",
    "/api/dashboard",
    "/api/documents",
    "/api/documents/:path*",
    "/api/organisation",
    "/api/organisation/:path*",
    "/api/compliance",
    "/api/compliance/:path*",
    "/api/payroll/:path*",
  ],
};
