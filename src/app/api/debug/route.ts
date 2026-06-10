import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, string> = {};

  // Test 1: env vars
  results["DATABASE_URL"] = process.env.DATABASE_URL ? "SET" : "MISSING";
  results["NEXTAUTH_SECRET"] = process.env.NEXTAUTH_SECRET ? "SET" : "MISSING";
  results["NEXTAUTH_URL"] = process.env.NEXTAUTH_URL || "NOT SET";
  results["NODE_ENV"] = process.env.NODE_ENV || "NOT SET";

  // Test 2: Prisma client
  try {
    const { db } = await import("@/lib/db");
    const userCount = await db.user.count();
    results["prisma"] = `OK - ${userCount} users`;
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    results["prisma"] = `ERROR: ${err}`;
  }

  // Test 3: NextAuth
  try {
    const { authOptions } = await import("@/lib/auth");
    results["authOptions"] = `OK - ${authOptions.providers.length} providers, secret=${authOptions.secret ? "SET" : "MISSING"}`;
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message + (e instanceof Error && e.stack ? "\n" + e.stack.split("\n").slice(0, 5).join("\n") : "") : String(e);
    results["authOptions"] = `ERROR: ${err}`;
  }

  return NextResponse.json(results, { status: 200 });
}
