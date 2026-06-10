import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id, itemId } = await params;
    const body = await request.json();

    // Verify item belongs to group
    const existingItem = await db.purchaseGroupItem.findFirst({
      where: { id: Number(itemId), groupId: Number(id) },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Товар не найден в группе" }, { status: 404 });
    }

    const item = await db.purchaseGroupItem.update({
      where: { id: Number(itemId) },
      data: {
        ...(body.assignedQty !== undefined && { assignedQty: body.assignedQty }),
        ...(body.purchasedQty !== undefined && { purchasedQty: body.purchasedQty }),
        ...(body.userMarkedQty !== undefined && { userMarkedQty: body.userMarkedQty }),
        ...(body.modConfirmed !== undefined && { modConfirmed: body.modConfirmed }),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Update item error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const role = (session.user as { role?: string })?.role;
    if (role !== "ADMIN" && role !== "MODERATOR") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { id, itemId } = await params;

    // Verify item belongs to group
    const existingItem = await db.purchaseGroupItem.findFirst({
      where: { id: Number(itemId), groupId: Number(id) },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Товар не найден в группе" }, { status: 404 });
    }

    await db.purchaseGroupItem.delete({
      where: { id: Number(itemId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete item error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
