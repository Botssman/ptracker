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
    const userId = Number((session.user as { id?: string })?.id);
    const isAdminOrMod = role === "ADMIN" || role === "MODERATOR";

    const { id } = await params;
    const groupId = Number(id);
    const body = await request.json();

    // Check that the group exists
    const existingGroup = await db.purchaseGroup.findUnique({
      where: { id: groupId },
    });
    if (!existingGroup) {
      return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    }

    // Authorization: any authenticated user can submit for review (PENDING_REVIEW)
    // Only admin/mod can change to ACTIVE or COMPLETED
    // Regular users can only update their own groups
    if (body.status !== undefined) {
      if (body.status === "PENDING_REVIEW") {
        // Any user can submit their own group for review
        if (!isAdminOrMod && existingGroup.userId !== userId) {
          return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
        }
      } else if (body.status === "ACTIVE" || body.status === "COMPLETED") {
        // Only admin/mod can set ACTIVE or COMPLETED
        if (!isAdminOrMod) {
          return NextResponse.json({ error: "Только администратор может изменить статус на Активно или Завершено" }, { status: 403 });
        }
      }
    }

    // Non-admin users can only edit their own groups, and only basic fields
    if (!isAdminOrMod && existingGroup.userId !== userId) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (body.userId !== undefined) updateData.userId = Number(body.userId);
    if (body.network !== undefined) updateData.network = body.network;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.period !== undefined) updateData.period = body.period;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.discountCardPath !== undefined) updateData.discountCardPath = body.discountCardPath;
    if (body.totalSum !== undefined) updateData.totalSum = body.totalSum === null ? null : body.totalSum;

    const group = await db.purchaseGroup.update({
      where: { id: groupId },
      data: updateData,
    });

    // Sync items if provided: delete old, create new
    if (body.items !== undefined) {
      await db.purchaseGroupItem.deleteMany({ where: { groupId } });
      if (Array.isArray(body.items) && body.items.length > 0) {
        await db.purchaseGroupItem.createMany({
          data: body.items.map((item: { productId: number; assignedQty: number; purchasedQty?: number; modConfirmed?: boolean; price?: number | null }) => ({
            groupId,
            productId: Number(item.productId),
            assignedQty: item.assignedQty || 1,
            ...(item.purchasedQty !== undefined && { purchasedQty: item.purchasedQty }),
            ...(item.modConfirmed !== undefined && { modConfirmed: item.modConfirmed }),
            ...(item.price !== undefined && { price: item.price === null ? null : item.price }),
          })),
        });
      }
    }

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
