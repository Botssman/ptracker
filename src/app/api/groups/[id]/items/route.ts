import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Нет товаров для добавления" }, { status: 400 });
    }

    const groupId = Number(id);

    // Verify group exists
    const group = await db.purchaseGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    }

    const created = await db.purchaseGroupItem.createMany({
      data: items.map((item: { productId: number; assignedQty: number }) => ({
        groupId,
        productId: Number(item.productId),
        assignedQty: item.assignedQty || 1,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ count: created.count }, { status: 201 });
  } catch (error) {
    console.error("Add items error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
