// Mock Data for Purchase Tracking System

export const networks = ["Магнит", "Пятёрочка", "Лента", "Перекрёсток", "Ашан"];

export type Product = {
  id: number;
  network: string;
  brand: string;
  nomenclature: string;
  link: string;
  monthlyPlanQty: number;
  isActive: boolean;
  thumbnail?: string;
};

export const products: Product[] = [
  { id: 1, network: "Магнит", brand: "Добрый", nomenclature: "Сок Добрый Апельсин 1л", link: "https://magnit.ru/product/1", monthlyPlanQty: 10, isActive: true },
  { id: 2, network: "Магнит", brand: "Домик в деревне", nomenclature: "Молоко Домик в деревне 3.2% 900мл", link: "https://magnit.ru/product/2", monthlyPlanQty: 8, isActive: true },
  { id: 3, network: "Пятёрочка", brand: "Простоквашино", nomenclature: "Кефир Простоквашино 2.5% 450мл", link: "https://pyaterochka.ru/product/3", monthlyPlanQty: 12, isActive: true },
  { id: 4, network: "Лента", brand: "Greenfield", nomenclature: "Чай Greenfield Flying Dragon 25пак", link: "https://lenta.com/product/4", monthlyPlanQty: 6, isActive: false },
  { id: 5, network: "Перекрёсток", brand: "Bustero", nomenclature: "Печенье Bustero Кокос 150г", link: "https://perekrestok.ru/product/5", monthlyPlanQty: 15, isActive: true },
  { id: 6, network: "Ашан", brand: "Saveurs de nos Regions", nomenclature: "Сыр Saveurs de nos Regions Бри 200г", link: "https://auchan.ru/product/6", monthlyPlanQty: 7, isActive: true },
  { id: 7, network: "Магнит", brand: "Чудо", nomenclature: "Йогурт Чудо Клубника 130г", link: "https://magnit.ru/product/7", monthlyPlanQty: 20, isActive: true },
  { id: 8, network: "Пятёрочка", brand: "Агуша", nomenclature: "Творожок Агуша с грушей 100г", link: "https://pyaterochka.ru/product/8", monthlyPlanQty: 14, isActive: true },
  { id: 9, network: "Лента", brand: "Lipton", nomenclature: "Чай Lipton Английский Завтрак 50пак", link: "https://lenta.com/product/9", monthlyPlanQty: 9, isActive: true },
  { id: 10, network: "Перекрёсток", brand: "Milka", nomenclature: "Шоколад Milka Альпийское Молоко 100г", link: "https://perekrestok.ru/product/10", monthlyPlanQty: 11, isActive: false },
  { id: 11, network: "Магнит", brand: "Красная Цена", nomenclature: "Гречка Красная Цена 800г", link: "https://magnit.ru/product/11", monthlyPlanQty: 18, isActive: true },
  { id: 12, network: "Ашан", brand: "Bonduelle", nomenclature: "Кукуруза Bonduelle 340г", link: "https://auchan.ru/product/12", monthlyPlanQty: 10, isActive: true },
];

export type UserRole = "admin" | "moderator" | "user";

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  registeredAt: string;
  groupsCount: number;
  isBlocked?: boolean;
};

export const users: User[] = [
  { id: 1, name: "Иван Петров", email: "ivan@example.com", role: "admin", registeredAt: "2025-01-15", groupsCount: 5 },
  { id: 2, name: "Мария Сидорова", email: "maria@example.com", role: "moderator", registeredAt: "2025-02-20", groupsCount: 3 },
  { id: 3, name: "Алексей Козлов", email: "alex@example.com", role: "user", registeredAt: "2025-03-10", groupsCount: 2 },
  { id: 4, name: "Елена Новикова", email: "elena@example.com", role: "user", registeredAt: "2025-04-05", groupsCount: 1 },
  { id: 5, name: "Дмитрий Волков", email: "dmitry@example.com", role: "user", registeredAt: "2025-04-18", groupsCount: 0 },
  { id: 6, name: "Ольга Морозова", email: "olga@example.com", role: "moderator", registeredAt: "2025-05-01", groupsCount: 2 },
];

export type GroupStatus = "active" | "completed";

export type Group = {
  id: number;
  userId: number;
  network: string;
  name: string;
  period: string;
  status: GroupStatus;
  phone: string;
  totalItems: number;
  completedItems: number;
  discountCardImage?: string;
};

export const groups: Group[] = [
  { id: 1, userId: 3, network: "Магнит", name: "Закупка июнь — Магнит", period: "Июнь 2025", status: "active", phone: "+7 (900) 123-45-67", totalItems: 5, completedItems: 3 },
  { id: 2, userId: 3, network: "Пятёрочка", name: "Закупка июнь — Пятёрочка", period: "Июнь 2025", status: "active", phone: "+7 (900) 765-43-21", totalItems: 3, completedItems: 0 },
  { id: 3, userId: 4, network: "Лента", name: "Закупка май — Лента", period: "Май 2025", status: "completed", phone: "+7 (901) 222-33-44", totalItems: 4, completedItems: 4 },
  { id: 4, userId: 3, network: "Перекрёсток", name: "Закупка май — Перекрёсток", period: "Май 2025", status: "completed", phone: "+7 (902) 555-66-77", totalItems: 2, completedItems: 2 },
  { id: 5, userId: 4, network: "Ашан", name: "Закупка июнь — Ашан", period: "Июнь 2025", status: "active", phone: "+7 (903) 888-99-00", totalItems: 6, completedItems: 1 },
  { id: 6, userId: 1, network: "Магнит", name: "Закупка май — Магнит", period: "Май 2025", status: "completed", phone: "", totalItems: 3, completedItems: 3 },
  { id: 7, userId: 2, network: "Пятёрочка", name: "Закупка июнь — Пятёрочка (мод)", period: "Июнь 2025", status: "active", phone: "+7 (910) 111-22-33", totalItems: 4, completedItems: 2 },
];

export type GroupItem = {
  id: number;
  groupId: number;
  productId: number;
  brand: string;
  nomenclature: string;
  assignedQty: number;
  purchasedQty: number;
  link: string;
};

export const groupItems: GroupItem[] = [
  // Group 1 items
  { id: 1, groupId: 1, productId: 1, brand: "Добрый", nomenclature: "Сок Добрый Апельсин 1л", assignedQty: 3, purchasedQty: 2, link: "https://magnit.ru/product/1" },
  { id: 2, groupId: 1, productId: 2, brand: "Домик в деревне", nomenclature: "Молоко Домик в деревне 3.2% 900мл", assignedQty: 2, purchasedQty: 2, link: "https://magnit.ru/product/2" },
  { id: 3, groupId: 1, productId: 7, brand: "Чудо", nomenclature: "Йогурт Чудо Клубника 130г", assignedQty: 4, purchasedQty: 0, link: "https://magnit.ru/product/7" },
  { id: 4, groupId: 1, productId: 11, brand: "Красная Цена", nomenclature: "Гречка Красная Цена 800г", assignedQty: 2, purchasedQty: 1, link: "https://magnit.ru/product/11" },
  { id: 5, groupId: 1, productId: 3, brand: "Простоквашино", nomenclature: "Кефир Простоквашино 2.5% 450мл", assignedQty: 1, purchasedQty: 0, link: "https://magnit.ru/product/3" },
  // Group 2 items
  { id: 6, groupId: 2, productId: 3, brand: "Простоквашино", nomenclature: "Кефир Простоквашино 2.5% 450мл", assignedQty: 3, purchasedQty: 0, link: "https://pyaterochka.ru/product/3" },
  { id: 7, groupId: 2, productId: 8, brand: "Агуша", nomenclature: "Творожок Агуша с грушей 100г", assignedQty: 2, purchasedQty: 0, link: "https://pyaterochka.ru/product/8" },
  { id: 8, groupId: 2, productId: 10, brand: "Milka", nomenclature: "Шоколад Milka Альпийское Молоко 100г", assignedQty: 5, purchasedQty: 0, link: "https://perekrestok.ru/product/10" },
  // Group 3 items
  { id: 9, groupId: 3, productId: 4, brand: "Greenfield", nomenclature: "Чай Greenfield Flying Dragon 25пак", assignedQty: 2, purchasedQty: 2, link: "https://lenta.com/product/4" },
  { id: 10, groupId: 3, productId: 9, brand: "Lipton", nomenclature: "Чай Lipton Английский Завтрак 50пак", assignedQty: 1, purchasedQty: 1, link: "https://lenta.com/product/9" },
  { id: 11, groupId: 3, productId: 12, brand: "Bonduelle", nomenclature: "Кукуруза Bonduelle 340г", assignedQty: 3, purchasedQty: 3, link: "https://auchan.ru/product/12" },
  { id: 12, groupId: 3, productId: 6, brand: "Saveurs de nos Regions", nomenclature: "Сыр Saveurs de nos Regions Бри 200г", assignedQty: 2, purchasedQty: 2, link: "https://auchan.ru/product/6" },
];

export type Receipt = {
  id: number;
  groupId: number;
  thumbnail: string | null;
  uploadedAt: string;
};

export const receipts: Receipt[] = [
  { id: 1, groupId: 1, thumbnail: null, uploadedAt: "2025-06-01 14:30" },
  { id: 2, groupId: 1, thumbnail: null, uploadedAt: "2025-06-03 10:15" },
  { id: 3, groupId: 2, thumbnail: null, uploadedAt: "2025-06-02 18:45" },
  { id: 4, groupId: 3, thumbnail: null, uploadedAt: "2025-05-15 09:20" },
  { id: 5, groupId: 3, thumbnail: null, uploadedAt: "2025-05-20 12:10" },
  { id: 6, groupId: 3, thumbnail: null, uploadedAt: "2025-05-28 16:30" },
];

export type InviteCodeStatus = "unused" | "used" | "expired";

export type InviteCode = {
  id: number;
  code: string;
  role: UserRole;
  status: InviteCodeStatus;
  usedBy: { name: string; email: string } | null;
  createdAt: string;
  usedAt: string | null;
};

export const inviteCodes: InviteCode[] = [
  { id: 1, code: "ABCD-1234-EFGH", role: "user", status: "unused", usedBy: null, createdAt: "2025-05-20", usedAt: null },
  { id: 2, code: "IJKL-5678-MNOP", role: "user", status: "used", usedBy: { name: "Алексей Козлов", email: "alex@example.com" }, createdAt: "2025-04-10", usedAt: "2025-04-12" },
  { id: 3, code: "QRST-9012-UVWX", role: "moderator", status: "expired", usedBy: null, createdAt: "2025-03-01", usedAt: null },
  { id: 4, code: "YZAB-3456-CDEF", role: "admin", status: "unused", usedBy: null, createdAt: "2025-06-01", usedAt: null },
  { id: 5, code: "GHIJ-7890-KLMN", role: "user", status: "used", usedBy: { name: "Елена Новикова", email: "elena@example.com" }, createdAt: "2025-03-25", usedAt: "2025-04-05" },
  { id: 6, code: "OPQR-2345-STUV", role: "moderator", status: "unused", usedBy: null, createdAt: "2025-05-30", usedAt: null },
];

export type StatsByProduct = {
  productId: number;
  brand: string;
  nomenclature: string;
  monthlyPlan: number;
  assigned: number;
  confirmedByUser: number;
  confirmedByModerator: number;
};

export const statsByProducts: StatsByProduct[] = [
  { productId: 1, brand: "Добрый", nomenclature: "Сок Добрый Апельсин 1л", monthlyPlan: 10, assigned: 8, confirmedByUser: 6, confirmedByModerator: 5 },
  { productId: 2, brand: "Домик в деревне", nomenclature: "Молоко Домик в деревне 3.2% 900мл", monthlyPlan: 8, assigned: 6, confirmedByUser: 5, confirmedByModerator: 5 },
  { productId: 3, brand: "Простоквашино", nomenclature: "Кефир Простоквашино 2.5% 450мл", monthlyPlan: 12, assigned: 10, confirmedByUser: 3, confirmedByModerator: 2 },
  { productId: 5, brand: "Bustero", nomenclature: "Печенье Bustero Кокос 150г", monthlyPlan: 15, assigned: 12, confirmedByUser: 10, confirmedByModerator: 8 },
  { productId: 7, brand: "Чудо", nomenclature: "Йогурт Чудо Клубника 130г", monthlyPlan: 20, assigned: 15, confirmedByUser: 8, confirmedByModerator: 6 },
  { productId: 11, brand: "Красная Цена", nomenclature: "Гречка Красная Цена 800г", monthlyPlan: 18, assigned: 14, confirmedByUser: 12, confirmedByModerator: 12 },
];

export type StatsByUser = {
  userId: number;
  name: string;
  email: string;
  groupsCount: number;
  assignedItems: number;
  confirmedItems: number;
};

export const statsByUsers: StatsByUser[] = [
  { userId: 3, name: "Алексей Козлов", email: "alex@example.com", groupsCount: 2, assignedItems: 10, confirmedItems: 4 },
  { userId: 4, name: "Елена Новикова", email: "elena@example.com", groupsCount: 1, assignedItems: 6, confirmedItems: 6 },
  { userId: 1, name: "Иван Петров", email: "ivan@example.com", groupsCount: 1, assignedItems: 3, confirmedItems: 3 },
  { userId: 2, name: "Мария Сидорова", email: "maria@example.com", groupsCount: 1, assignedItems: 4, confirmedItems: 2 },
];

// Helper: get user by id
export function getUserById(id: number): User | undefined {
  return users.find(u => u.id === id);
}

// Helper: get items for a group
export function getItemsForGroup(groupId: number): GroupItem[] {
  return groupItems.filter(item => item.groupId === groupId);
}

// Helper: get receipts for a group
export function getReceiptsForGroup(groupId: number): Receipt[] {
  return receipts.filter(r => r.groupId === groupId);
}

// Helper: get groups for a user
export function getGroupsForUser(userId: number): Group[] {
  return groups.filter(g => g.userId === userId);
}
