import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const role = (session.user as { role?: string })?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    // Stats by products
    const products = await db.product.findMany({
      where: { isActive: true },
      include: {
        groupItems: {
          select: {
            assignedQty: true,
            purchasedQty: true,
            userMarkedQty: true,
            modConfirmed: true,
          },
        },
      },
    });

    const byProducts = products.map((p) => ({
      productId: p.id,
      brand: p.brand,
      nomenclature: p.nomenclature,
      monthlyPlan: p.monthlyPlanQty,
      assigned: p.groupItems.reduce((sum, i) => sum + i.assignedQty, 0),
      confirmedByUser: p.groupItems.reduce((sum, i) => sum + i.userMarkedQty, 0),
      confirmedByModerator: p.groupItems.filter((i) => i.modConfirmed).reduce((sum, i) => sum + i.purchasedQty, 0),
    }));

    // Stats by users
    const users = await db.user.findMany({
      where: { role: "USER" },
      include: {
        groups: {
          include: {
            items: {
              select: {
                assignedQty: true,
                purchasedQty: true,
                userMarkedQty: true,
              },
            },
          },
        },
      },
    });

    const byUsers = users.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      groupsCount: u.groups.length,
      assignedItems: u.groups.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.assignedQty, 0), 0),
      confirmedItems: u.groups.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.userMarkedQty, 0), 0),
    }));

    return NextResponse.json({ byProducts, byUsers });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
