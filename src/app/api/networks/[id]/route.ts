import { NextRequest, NextResponse } from "next/server";
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
    const networkId = Number(id);
    if (isNaN(networkId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Введите название сети" }, { status: 400 });
    }

    const existing = await db.network.findUnique({ where: { name: name.trim() } });
    if (existing && existing.id !== networkId) {
      return NextResponse.json({ error: "Сеть с таким названием уже существует" }, { status: 409 });
    }

    const network = await db.network.update({
      where: { id: networkId },
      data: { name: name.trim() },
    });

    return NextResponse.json(network);
  } catch (error) {
    console.error("Update network error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
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
    const networkId = Number(id);
    if (isNaN(networkId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const network = await db.network.findUnique({ where: { id: networkId } });
    if (!network) {
      return NextResponse.json({ error: "Сеть не найдена" }, { status: 404 });
    }

    // Check if any products use this network name
    const productsUsingNetwork = await db.product.count({
      where: { network: network.name },
    });

    // Check if any purchase groups use this network name
    const groupsUsingNetwork = await db.purchaseGroup.count({
      where: { network: network.name },
    });

    if (productsUsingNetwork > 0 || groupsUsingNetwork > 0) {
      return NextResponse.json(
        {
          error: `Нельзя удалить сеть «${network.name}»: она используется в ${productsUsingNetwork} товаре(ах) и ${groupsUsingNetwork} группе(ах)`,
          productsCount: productsUsingNetwork,
          groupsCount: groupsUsingNetwork,
        },
        { status: 409 }
      );
    }

    await db.network.delete({ where: { id: networkId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete network error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
