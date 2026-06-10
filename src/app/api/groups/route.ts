import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const role = (session.user as { role?: string })?.role;
    const userId = Number((session.user as { id?: string })?.id);

    const { searchParams } = new URL(request.url);
    const networkFilter = searchParams.get("network") || "";
    const statusFilter = searchParams.get("status") || "";
    const userFilter = searchParams.get("userId") || "";

    const where: Record<string, unknown> = {};

    // Regular users only see their own groups
    if (role === "USER") {
      where.userId = userId;
    } else if (userFilter) {
      where.userId = Number(userFilter);
    }

    if (networkFilter) {
      where.network = networkFilter;
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    const groups = await db.purchaseGroup.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { items: true, receipts: true } },
        items: {
          select: { purchasedQty: true, assignedQty: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = groups.map((g) => ({
      id: g.id,
      userId: g.userId,
      userName: g.user.name,
      userEmail: g.user.email,
      network: g.network,
      name: g.name,
      phone: g.phone,
      period: g.period,
      status: g.status,
      discountCardPath: g.discountCardPath,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      totalItems: g._count.items,
      completedItems: g.items.filter((i) => i.purchasedQty >= i.assignedQty).length,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Get groups error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const role = (session.user as { role?: string })?.role;
    if (role !== "ADMIN" && role !== "MODERATOR") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, network, name, phone, period, status, discountCardPath, items } = body;

    if (!userId || !network || !name || !period) {
      return NextResponse.json({ error: "Заполните обязательные поля" }, { status: 400 });
    }

    const group = await db.purchaseGroup.create({
      data: {
        userId: Number(userId),
        network,
        name,
        phone: phone || null,
        period,
        status: status || "ACTIVE",
        discountCardPath: discountCardPath || null,
        items: items
          ? {
              create: items.map((item: { productId: number; assignedQty: number }) => ({
                productId: Number(item.productId),
                assignedQty: item.assignedQty || 1,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
