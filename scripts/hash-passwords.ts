import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Миграция паролей: хеширование открытых паролей...");

  const users = await prisma.user.findMany();
  let migrated = 0;

  for (const user of users) {
    // Если пароль уже захеширован — пропускаем
    if (user.password.startsWith("$2")) {
      console.log(`  Пропуск: ${user.email} — пароль уже захеширован`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log(`  ✓ ${user.email} — пароль захеширован`);
    migrated++;
  }

  console.log(`\nГотово! Захешировано паролей: ${migrated} из ${users.length}`);
}

main()
  .catch((e) => {
    console.error("Ошибка миграции:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
