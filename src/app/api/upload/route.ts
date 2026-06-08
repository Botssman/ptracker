import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const subfolder = (formData.get("subfolder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "Нет файла для загрузки" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name;
    const ext = ".webp";
    const fileName = `${subfolder}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const relativePath = `/uploads/${subfolder}/${fileName}`;

    return NextResponse.json({
      filePath: relativePath,
      originalName,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
