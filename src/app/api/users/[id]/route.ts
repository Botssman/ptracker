import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

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

    // Если передан newPassword — хешируем и обновляем пароль
    if (body.newPassword) {
      if (body.newPassword.length < 6) {
        return NextResponse.json(
          { error: "Пароль должен быть не менее 6 символов" },
          { status: 400 }
        );
      }
      const hashedPassword = await bcrypt.hash(body.newPassword, 10);
      const user = await db.user.update({
        where: { id: Number(id) },
        data: { password: hashedPassword },
      });
      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
      });
    }

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

export async function DELETE(
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
      return NextResponse.json({ error: "Доступ запрещён. Только администратор может удалять пользователей" }, { status: 403 });
    }

    const { id } = await params;
    const userId = Number(id);
    const currentUserId = Number((session.user as { id?: string })?.id);

    // Нельзя удалить самого себя
    if (userId === currentUserId) {
      return NextResponse.json({ error: "Нельзя удалить самого себя" }, { status: 400 });
    }

    // Проверяем что пользователь существует
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { groups: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    // Удаляем пользователя (каскадно удалятся группы, товары групп и чеки)
    await db.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: `Пользователь «${user.name}» удалён (вместе с ${user._count.groups} группами)`,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
