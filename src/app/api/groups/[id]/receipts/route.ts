import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs";

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
    const receipts = await db.receipt.findMany({
      where: { groupId: Number(id) },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error("Get receipts error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const groupId = Number(id);

    // Verify group exists
    const group = await db.purchaseGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Нет файлов для загрузки" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const receipts = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const originalName = file.name;
      const ext = path.extname(originalName) || ".webp";
      const fileName = `receipt_${groupId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, buffer);

      const relativePath = `/uploads/receipts/${fileName}`;

      const receipt = await db.receipt.create({
        data: {
          groupId,
          filePath: relativePath,
          originalName,
        },
      });

      receipts.push(receipt);
    }

    return NextResponse.json(receipts, { status: 201 });
  } catch (error) {
    console.error("Upload receipts error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
