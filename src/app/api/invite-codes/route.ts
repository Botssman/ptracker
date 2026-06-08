import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !["USER", "MODERATOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Неверная роль" }, { status: 400 });
    }

    // Generate random code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const nums = "23456789";
    const seg = () =>
      Array.from({ length: 4 }, () =>
        Math.random() > 0.5 ? chars[Math.floor(Math.random() * chars.length)] : nums[Math.floor(Math.random() * nums.length)]
      ).join("");

    let code = `${seg()}-${seg()}-${seg()}`;

    // Ensure uniqueness
    let existing = await db.inviteCode.findUnique({ where: { code } });
    while (existing) {
      code = `${seg()}-${seg()}-${seg()}`;
      existing = await db.inviteCode.findUnique({ where: { code } });
    }

    const inviteCode = await db.inviteCode.create({
      data: { code, role },
    });

    return NextResponse.json(inviteCode);
  } catch (error) {
    console.error("Create invite code error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const codes = await db.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Enrich with user info
    const enriched = await Promise.all(
      codes.map(async (code) => {
        let usedBy = null;
        if (code.usedById) {
          const user = await db.user.findUnique({
            where: { id: code.usedById },
            select: { name: true, email: true },
          });
          usedBy = user;
        }
        return { ...code, usedBy };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Get invite codes error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
