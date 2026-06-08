import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth routes and public routes
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/invite")
  ) {
    return NextResponse.next();
  }

  // Only protect API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
  });

  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const role = token.role as string;

  // Admin-only routes
  if (
    pathname.startsWith("/api/users") ||
    pathname.startsWith("/api/invite-codes") ||
    pathname.startsWith("/api/stats")
  ) {
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }
  }

  // Moderator/Admin routes for write operations
  if (
    pathname.startsWith("/api/products") ||
    pathname.startsWith("/api/groups") ||
    pathname.startsWith("/api/receipts")
  ) {
    // Read operations are allowed for authenticated users
    // Write operations (POST, PUT, DELETE) checked in route handlers
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
