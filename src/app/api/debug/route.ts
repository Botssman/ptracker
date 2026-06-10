import { NextResponse } from "next/server";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  const results: Record<string, string | string[]> = {};

  // Test 1: env vars
  results["DATABASE_URL"] = process.env.DATABASE_URL ? "SET" : "MISSING";
  results["NEXTAUTH_SECRET"] = process.env.NEXTAUTH_SECRET ? "SET" : "MISSING";
  results["NEXTAUTH_URL"] = process.env.NEXTAUTH_URL || "NOT SET";
  results["NODE_ENV"] = process.env.NODE_ENV || "NOT SET";

  // Test 2: Check what's in node_modules/.prisma
  try {
    const prismaDir = join(process.cwd(), "node_modules", ".prisma");
    const dirs = readdirSync(prismaDir);
    results["prisma_client_dirs"] = dirs;
    // Read the client index.js to find the hash
    if (dirs.length > 0) {
      const clientDir = join(prismaDir, dirs[0]);
      const indexContent = readFileSync(join(clientDir, "index.js"), "utf-8");
      const hashMatch = indexContent.match(/client-([a-f0-9]+)/);
      results["prisma_client_hash"] = hashMatch ? hashMatch[1] : "NOT_FOUND_IN_INDEX";
    }
  } catch (e: unknown) {
    results["prisma_dirs"] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 3: Check what's in node_modules/@prisma
  try {
    const atPrismaDir = join(process.cwd(), "node_modules", "@prisma");
    const dirs = readdirSync(atPrismaDir);
    results["at_prisma_dirs"] = dirs;
  } catch (e: unknown) {
    results["at_prisma"] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 4: Prisma client direct test
  try {
    const { db } = await import("@/lib/db");
    const userCount = await db.user.count();
    results["prisma_query"] = `OK - ${userCount} users`;
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    results["prisma_query"] = `ERROR: ${err}`;
  }

  return NextResponse.json(results, { status: 200 });
}
