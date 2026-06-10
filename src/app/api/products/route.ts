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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const network = searchParams.get("network") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { brand: { contains: search } },
        { nomenclature: { contains: search } },
      ];
    }

    if (network) {
      where.network = network;
    }

    const products = await db.product.findMany({
      where,
      orderBy: { id: "asc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Get products error:", error);
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
    const { network, brand, nomenclature, link, monthlyPlanQty, isActive, thumbnailPath } = body;

    if (!network || !brand || !nomenclature) {
      return NextResponse.json({ error: "Заполните обязательные поля" }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        network,
        brand,
        nomenclature,
        link: link || null,
        monthlyPlanQty: monthlyPlanQty || 0,
        isActive: isActive !== undefined ? isActive : true,
        thumbnailPath: thumbnailPath || null,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
