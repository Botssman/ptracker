import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

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
    const receipt = await db.receipt.findUnique({
      where: { id: Number(id) },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Чек не найден" }, { status: 404 });
    }

    // Delete file from disk
    try {
      const fullPath = path.join(process.cwd(), "public", receipt.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch {
      // Ignore file deletion errors
    }

    await db.receipt.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete receipt error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
