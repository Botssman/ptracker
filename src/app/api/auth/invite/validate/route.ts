import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const inviteCode = await db.inviteCode.findUnique({
      where: { code },
    });

    if (!inviteCode || inviteCode.status !== "UNUSED") {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      role: inviteCode.role,
    });
  } catch (error) {
    console.error("Validate invite code error:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
