import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

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
    const group = await db.purchaseGroup.findUnique({
      where: { id: Number(id) },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: true,
          },
        },
        receipts: { orderBy: { uploadedAt: "desc" } },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("Get group error:", error);
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

    const group = await db.purchaseGroup.update({
      where: { id: Number(id) },
      data: {
        ...(body.userId !== undefined && { userId: Number(body.userId) }),
        ...(body.network !== undefined && { network: body.network }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.period !== undefined && { period: body.period }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.discountCardPath !== undefined && { discountCardPath: body.discountCardPath }),
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Update group error:", error);
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
    const groupId = Number(id);

    // Check group exists
    const group = await db.purchaseGroup.findUnique({
      where: { id: groupId },
      include: {
        receipts: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    }

    // Delete receipt files from disk
    for (const receipt of group.receipts) {
      try {
        const fullPath = path.join(process.cwd(), "public", receipt.filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch {
        // Ignore file deletion errors
      }
    }

    // Cascade delete: receipts → items → group
    await db.receipt.deleteMany({ where: { groupId } });
    await db.purchaseGroupItem.deleteMany({ where: { groupId } });
    await db.purchaseGroup.delete({ where: { id: groupId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete group error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
