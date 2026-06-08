import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id: Number(id) },
    });

    if (!product) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

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
    if (role !== "ADMIN" && role !== "MODERATOR") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const product = await db.product.update({
      where: { id: Number(id) },
      data: {
        ...(body.network !== undefined && { network: body.network }),
        ...(body.brand !== undefined && { brand: body.brand }),
        ...(body.nomenclature !== undefined && { nomenclature: body.nomenclature }),
        ...(body.link !== undefined && { link: body.link }),
        ...(body.monthlyPlanQty !== undefined && { monthlyPlanQty: body.monthlyPlanQty }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.thumbnailPath !== undefined && { thumbnailPath: body.thumbnailPath }),
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Update product error:", error);
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
    if (role !== "ADMIN" && role !== "MODERATOR") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { id } = await params;
    await db.product.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
