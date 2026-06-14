/**
 * Скрипт миграции: хеширует все пароли в открытом виде через bcrypt
 * 
 * Запуск: bun scripts/hash-passwords.ts
 * 
 * Безопасный: пропускает пароли, которые уже захешированы (начинаются с $2a$ или $2b$)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Миграция паролей: хеширование открытых паролей...");

  const users = await prisma.user.findMany({
    select: { id: true, email: true, password: true },
  });

  const plainTextUsers = users.filter(
    (u) => !u.password.startsWith("$2a$") && !u.password.startsWith("$2b$")
  );

  if (plainTextUsers.length === 0) {
    console.log("Все пароли уже захешированы! Миграция не нужна.");
    return;
  }

  console.log(`Найдено ${plainTextUsers.length} пользователей с паролями в открытом виде:`);
  plainTextUsers.forEach((u) => console.log(`   - ${u.email} (id: ${u.id})`));

  console.log("\nХеширование паролей...");

  for (const user of plainTextUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    console.log(`   ✓ ${user.email} — пароль захеширован`);
  }

  console.log(`\nГотово! ${plainTextUsers.length} паролей успешно захешировано.`);
}

main()
  .catch((e) => {
    console.error("Ошибка миграции:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
