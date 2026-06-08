import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const role = (session.user as { role?: string })?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const user = await db.user.update({
      where: { id: Number(id) },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.isBlocked !== undefined && { isBlocked: body.isBlocked }),
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
