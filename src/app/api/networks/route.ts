import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const networks = await db.network.findMany({
      orderBy: { id: "asc" },
    });

    return NextResponse.json(networks);
  } catch (error) {
    console.error("Get networks error:", error);
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
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Введите название сети" }, { status: 400 });
    }

    const existing = await db.network.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Сеть с таким названием уже существует" }, { status: 409 });
    }

    const network = await db.network.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(network, { status: 201 });
  } catch (error) {
    console.error("Create network error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
