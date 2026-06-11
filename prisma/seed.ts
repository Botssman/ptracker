import { PrismaClient, Role, GroupStatus, CodeStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.receipt.deleteMany();
  await prisma.purchaseGroupItem.deleteMany();
  await prisma.purchaseGroup.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.product.deleteMany();
  await prisma.network.deleteMany();
  await prisma.user.deleteMany();

  // Create networks
  const network1 = await prisma.network.create({ data: { name: "Магнит" } });
  const network2 = await prisma.network.create({ data: { name: "Пятёрочка" } });
  const network3 = await prisma.network.create({ data: { name: "Лента" } });
  const network4 = await prisma.network.create({ data: { name: "Перекрёсток" } });
  const network5 = await prisma.network.create({ data: { name: "Ашан" } });

  console.log("Networks created: 5");

  // Хешируем пароль для сид-данных
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create users
  const admin = await prisma.user.create({
    data: { name: "Иван Петров", email: "admin@example.com", password: hashedPassword, role: Role.ADMIN },
  });
  const maria = await prisma.user.create({
    data: { name: "Мария Сидорова", email: "maria@example.com", password: hashedPassword, role: Role.MODERATOR },
  });
  const alex = await prisma.user.create({
    data: { name: "Алексей Козлов", email: "alex@example.com", password: hashedPassword, role: Role.USER },
  });
  const elena = await prisma.user.create({
    data: { name: "Елена Новикова", email: "elena@example.com", password: hashedPassword, role: Role.USER },
  });
  const dmitry = await prisma.user.create({
    data: { name: "Дмитрий Волков", email: "dmitry@example.com", password: hashedPassword, role: Role.USER },
  });
  const olga = await prisma.user.create({
    data: { name: "Ольга Морозова", email: "olga@example.com", password: hashedPassword, role: Role.MODERATOR },
  });

  console.log("Users created:", { admin: admin.id, maria: maria.id, alex: alex.id, elena: elena.id, dmitry: dmitry.id, olga: olga.id });

  // Create products
  const product1 = await prisma.product.create({
    data: { network: "Магнит", brand: "Добрый", nomenclature: "Сок Добрый Апельсин 1л", link: "https://magnit.ru/product/1", monthlyPlanQty: 10, isActive: true },
  });
  const product2 = await prisma.product.create({
    data: { network: "Магнит", brand: "Домик в деревне", nomenclature: "Молоко Домик в деревне 3.2% 900мл", link: "https://magnit.ru/product/2", monthlyPlanQty: 8, isActive: true },
  });
  const product3 = await prisma.product.create({
    data: { network: "Пятёрочка", brand: "Простоквашино", nomenclature: "Кефир Простоквашино 2.5% 450мл", link: "https://pyaterochka.ru/product/3", monthlyPlanQty: 12, isActive: true },
  });
  const product4 = await prisma.product.create({
    data: { network: "Лента", brand: "Greenfield", nomenclature: "Чай Greenfield Flying Dragon 25пак", link: "https://lenta.com/product/4", monthlyPlanQty: 6, isActive: false },
  });
  const product5 = await prisma.product.create({
    data: { network: "Перекрёсток", brand: "Bustero", nomenclature: "Печенье Bustero Кокос 150г", link: "https://perekrestok.ru/product/5", monthlyPlanQty: 15, isActive: true },
  });
  const product6 = await prisma.product.create({
    data: { network: "Ашан", brand: "Saveurs de nos Regions", nomenclature: "Сыр Saveurs de nos Regions Бри 200г", link: "https://auchan.ru/product/6", monthlyPlanQty: 7, isActive: true },
  });
  const product7 = await prisma.product.create({
    data: { network: "Магнит", brand: "Чудо", nomenclature: "Йогурт Чудо Клубника 130г", link: "https://magnit.ru/product/7", monthlyPlanQty: 20, isActive: true },
  });
  const product8 = await prisma.product.create({
    data: { network: "Пятёрочка", brand: "Агуша", nomenclature: "Творожок Агуша с грушей 100г", link: "https://pyaterochka.ru/product/8", monthlyPlanQty: 14, isActive: true },
  });
  const product9 = await prisma.product.create({
    data: { network: "Лента", brand: "Lipton", nomenclature: "Чай Lipton Английский Завтрак 50пак", link: "https://lenta.com/product/9", monthlyPlanQty: 9, isActive: true },
  });
  const product10 = await prisma.product.create({
    data: { network: "Перекрёсток", brand: "Milka", nomenclature: "Шоколад Milka Альпийское Молоко 100г", link: "https://perekrestok.ru/product/10", monthlyPlanQty: 11, isActive: false },
  });
  const product11 = await prisma.product.create({
    data: { network: "Магнит", brand: "Красная Цена", nomenclature: "Гречка Красная Цена 800г", link: "https://magnit.ru/product/11", monthlyPlanQty: 18, isActive: true },
  });
  const product12 = await prisma.product.create({
    data: { network: "Ашан", brand: "Bonduelle", nomenclature: "Кукуруза Bonduelle 340г", link: "https://auchan.ru/product/12", monthlyPlanQty: 10, isActive: true },
  });

  console.log("Products created: 12");

  // Create invite codes
  const code1 = await prisma.inviteCode.create({
    data: { code: "ABCD-1234-EFGH", role: Role.USER, status: CodeStatus.UNUSED },
  });
  const code2 = await prisma.inviteCode.create({
    data: { code: "IJKL-5678-MNOP", role: Role.USER, status: CodeStatus.USED, usedById: alex.id, usedAt: new Date("2025-04-12") },
  });
  const code3 = await prisma.inviteCode.create({
    data: { code: "QRST-9012-UVWX", role: Role.MODERATOR, status: CodeStatus.EXPIRED },
  });
  const code4 = await prisma.inviteCode.create({
    data: { code: "YZAB-3456-CDEF", role: Role.ADMIN, status: CodeStatus.UNUSED },
  });
  const code5 = await prisma.inviteCode.create({
    data: { code: "GHIJ-7890-KLMN", role: Role.USER, status: CodeStatus.USED, usedById: elena.id, usedAt: new Date("2025-04-05") },
  });
  const code6 = await prisma.inviteCode.create({
    data: { code: "OPQR-2345-STUV", role: Role.MODERATOR, status: CodeStatus.UNUSED },
  });

  console.log("Invite codes created: 6");

  // Create purchase groups
  const group1 = await prisma.purchaseGroup.create({
    data: { userId: alex.id, network: "Магнит", name: "Закупка июнь — Магнит", period: "Июнь 2025", status: GroupStatus.ACTIVE, phone: "+7 (900) 123-45-67" },
  });
  const group2 = await prisma.purchaseGroup.create({
    data: { userId: alex.id, network: "Пятёрочка", name: "Закупка июнь — Пятёрочка", period: "Июнь 2025", status: GroupStatus.ACTIVE, phone: "+7 (900) 765-43-21" },
  });
  const group3 = await prisma.purchaseGroup.create({
    data: { userId: elena.id, network: "Лента", name: "Закупка май — Лента", period: "Май 2025", status: GroupStatus.COMPLETED, phone: "+7 (901) 222-33-44" },
  });
  const group4 = await prisma.purchaseGroup.create({
    data: { userId: alex.id, network: "Перекрёсток", name: "Закупка май — Перекрёсток", period: "Май 2025", status: GroupStatus.COMPLETED, phone: "+7 (902) 555-66-77" },
  });
  const group5 = await prisma.purchaseGroup.create({
    data: { userId: elena.id, network: "Ашан", name: "Закупка июнь — Ашан", period: "Июнь 2025", status: GroupStatus.ACTIVE, phone: "+7 (903) 888-99-00" },
  });
  const group6 = await prisma.purchaseGroup.create({
    data: { userId: admin.id, network: "Магнит", name: "Закупка май — Магнит", period: "Май 2025", status: GroupStatus.COMPLETED, phone: "" },
  });
  const group7 = await prisma.purchaseGroup.create({
    data: { userId: maria.id, network: "Пятёрочка", name: "Закупка июнь — Пятёрочка (мод)", period: "Июнь 2025", status: GroupStatus.ACTIVE, phone: "+7 (910) 111-22-33" },
  });

  console.log("Groups created: 7");

  // Create group items
  // Group 1 items
  await prisma.purchaseGroupItem.createMany({
    data: [
      { groupId: group1.id, productId: product1.id, assignedQty: 3, purchasedQty: 2, userMarkedQty: 2 },
      { groupId: group1.id, productId: product2.id, assignedQty: 2, purchasedQty: 2, userMarkedQty: 2 },
      { groupId: group1.id, productId: product7.id, assignedQty: 4, purchasedQty: 0, userMarkedQty: 0 },
      { groupId: group1.id, productId: product11.id, assignedQty: 2, purchasedQty: 1, userMarkedQty: 1 },
      { groupId: group1.id, productId: product3.id, assignedQty: 1, purchasedQty: 0, userMarkedQty: 0 },
    ],
  });

  // Group 2 items
  await prisma.purchaseGroupItem.createMany({
    data: [
      { groupId: group2.id, productId: product3.id, assignedQty: 3, purchasedQty: 0, userMarkedQty: 0 },
      { groupId: group2.id, productId: product8.id, assignedQty: 2, purchasedQty: 0, userMarkedQty: 0 },
      { groupId: group2.id, productId: product10.id, assignedQty: 5, purchasedQty: 0, userMarkedQty: 0 },
    ],
  });

  // Group 3 items
  await prisma.purchaseGroupItem.createMany({
    data: [
      { groupId: group3.id, productId: product4.id, assignedQty: 2, purchasedQty: 2, userMarkedQty: 2, modConfirmed: true },
      { groupId: group3.id, productId: product9.id, assignedQty: 1, purchasedQty: 1, userMarkedQty: 1, modConfirmed: true },
      { groupId: group3.id, productId: product12.id, assignedQty: 3, purchasedQty: 3, userMarkedQty: 3, modConfirmed: true },
      { groupId: group3.id, productId: product6.id, assignedQty: 2, purchasedQty: 2, userMarkedQty: 2, modConfirmed: true },
    ],
  });

  console.log("Group items created: 12");

  // Create receipts
  await prisma.receipt.createMany({
    data: [
      { groupId: group1.id, filePath: "/uploads/receipts/receipt_1.webp", originalName: "receipt1.jpg" },
      { groupId: group1.id, filePath: "/uploads/receipts/receipt_2.webp", originalName: "receipt2.jpg" },
      { groupId: group2.id, filePath: "/uploads/receipts/receipt_3.webp", originalName: "receipt3.jpg" },
      { groupId: group3.id, filePath: "/uploads/receipts/receipt_4.webp", originalName: "receipt4.jpg" },
      { groupId: group3.id, filePath: "/uploads/receipts/receipt_5.webp", originalName: "receipt5.jpg" },
      { groupId: group3.id, filePath: "/uploads/receipts/receipt_6.webp", originalName: "receipt6.jpg" },
    ],
  });

  console.log("Receipts created: 6");
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
