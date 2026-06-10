# Worklog — Purchase Tracker Frontend Prototype

## Entry 1 — 2025-06-08: Initial full prototype creation

### Summary
Built a complete frontend prototype for a Purchase Tracking System (Система учёта закупок) as a single-page Next.js application using client-side routing via React context/state.

### Files Created/Modified

1. **`/src/app/globals.css`** — Updated color theme to warm emerald green palette:
   - Primary: Deep emerald green `oklch(0.45 0.15 160)` for trust/shopping feel
   - Secondary: Warm cream/ivory
   - Accent: Warm orange `oklch(0.72 0.17 55)` for CTAs
   - Added custom success/warning color variables
   - Added custom scrollbar styles

2. **`/src/app/layout.tsx`** — Updated metadata title and description to Russian

3. **`/src/app/page.tsx`** — Main entry point with:
   - `RouterProvider` wrapping entire app
   - `DemoStateContext` for toggling loaded/loading/empty states
   - `AppContent` component managing role state and page routing
   - Floating role switcher pill (Гость/Пользователь/Модератор/Админ) at bottom-right
   - Demo state toggle (Данные/Загрузка/Пусто) in the switcher panel
   - `PageRenderer` switching between all 12 page components

4. **`/src/lib/mock-data.ts`** — Comprehensive Russian-language mock data:
   - 5 networks, 12 products, 6 users, 7 groups, 12 group items, 6 receipts, 6 invite codes
   - Stats by products and users
   - Helper functions: `getUserById`, `getItemsForGroup`, `getReceiptsForGroup`, `getGroupsForUser`

5. **`/src/lib/router-context.tsx`** — React context for client-side routing:
   - `currentPage`, `routeParams`, `navigate(page, params)` 
   - 12 page names defined as `PageName` type

6. **`/src/components/shared/EmptyState.tsx`** — Reusable empty state with icon, message, optional action button

7. **`/src/components/shared/LoadingState.tsx`** — Reusable skeleton placeholders for cards, table, form, and detail layouts

8. **`/src/components/shared/ValidationErrors.tsx`** — Error display component + `FieldError` for inline validation

9. **`/src/components/layout/AppHeader.tsx`** — Role-based navigation header:
   - Guest: Logo + "Войти по коду" + "Войти"
   - User: "Мои группы" + "Выйти"
   - Moderator: "Группы заданий" + "Товары" + "Выйти"
   - Admin: All nav items + "Пользователи" + "Коды приглашения" + "Статистика" + "Выйти"
   - Responsive hamburger menu for mobile via Sheet component

10. **`/src/components/layout/AppLayout.tsx`** — Layout wrapper with header + main content + sticky footer

11. **`/src/components/pages/InvitePage.tsx`** — Invite code entry with validation

12. **`/src/components/pages/RegisterPage.tsx`** — Registration form with code display, field validation

13. **`/src/components/pages/LoginPage.tsx`** — Login form with email/password, remember me, links

14. **`/src/components/pages/UserGroupsPage.tsx`** — User dashboard:
    - Grid of group cards with discount card placeholder, network badge, progress bar
    - Empty state when no groups

15. **`/src/components/pages/GroupDetailPage.tsx`** — Group detail with:
    - Group header card with discount card image
    - Items list with purchase dropdown selector, visual status (not bought/partial/fully bought)
    - Receipts grid with upload form
    - All three states: empty items, empty receipts, full data

16. **`/src/components/pages/AdminProductsPage.tsx`** — Admin products table:
    - Search + network + brand filters
    - Desktop table + mobile card views
    - Edit/delete actions

17. **`/src/components/pages/ProductFormPage.tsx`** — Product create/edit form with all fields

18. **`/src/components/pages/AdminGroupsPage.tsx`** — Admin groups table:
    - Filters by user, network, status
    - Progress bars in table
    - View/edit actions

19. **`/src/components/pages/GroupFormPage.tsx`** — Group create/edit form with:
    - Basic info block (user, network, name, discount card upload, phone, period, status)
    - Items block with search, add from products, set quantities, remove

20. **`/src/components/pages/AdminUsersPage.tsx`** — Users table with edit dialog

21. **`/src/components/pages/InviteCodesPage.tsx`** — Invite codes with:
    - Generate code form with role selection
    - Generated code dialog with copy button
    - Status badges (unused/used/expired)

22. **`/src/components/pages/StatsPage.tsx`** — Statistics with:
    - Summary cards (plan, assigned, confirmed by user, confirmed by moderator)
    - Tabs: By products / By users
    - Desktop table + mobile card layouts

### Technical Details
- All text in Russian as specified
- Responsive design with mobile-first approach (hamburger menu, card-based mobile layouts)
- Uses existing shadcn/ui components: Button, Input, Label, Card, Table, Select, Badge, Progress, Dialog, Checkbox, Textarea, Separator, Tabs, Skeleton, Sheet
- Lucide icons throughout
- Custom scrollbar styling
- No indigo/blue as primary colors — using emerald green + warm orange accent
- All pages support loading/empty/loaded demo states
- Touch-friendly targets (minimum 44px)
- Semantic HTML with proper labels and ARIA support

## Entry 2 — 2026-06-08: Fullstack conversion — from frontend-only to full Next.js backend

### Summary
Converted the Purchase Tracker from a frontend-only prototype with mock data to a fullstack Next.js application with real backend: Prisma ORM database, NextAuth.js authentication, complete API routes, and frontend wired to real data.

### Files Created

1. **`/prisma/schema.prisma`** — Complete database schema with:
   - `User` model (id, name, email, password, role, isBlocked)
   - `Product` model (network, brand, nomenclature, link, monthlyPlanQty, isActive, thumbnailPath)
   - `PurchaseGroup` model (userId, network, name, phone, period, status, discountCardPath)
   - `PurchaseGroupItem` model (groupId, productId, assignedQty, purchasedQty, userMarkedQty, modConfirmed)
   - `Receipt` model (groupId, filePath, originalName)
   - `InviteCode` model (code, role, status, usedById)
   - Enums: `Role` (ADMIN/MODERATOR/USER), `GroupStatus` (ACTIVE/COMPLETED), `CodeStatus` (UNUSED/USED/EXPIRED)
   - SQLite database with autoincrement IDs

2. **`/prisma/seed.ts`** — Database seed script:
   - Admin: admin@example.com / password123
   - Moderator: maria@example.com / password123
   - Users: alex@example.com, elena@example.com, dmitry@example.com, olga@example.com (all password123)
   - 12 products across 5 networks
   - 6 invite codes (mix of UNUSED/USED/EXPIRED)
   - 7 purchase groups with 12 items and 6 receipts

3. **`/src/lib/auth.ts`** — NextAuth.js v4 configuration:
   - Credentials provider (email + password)
   - JWT strategy with role and userId in token
   - Custom callbacks for session/jwt enrichment
   - Dev secret for development

4. **`/src/lib/auth-context.tsx`** — React auth context provider:
   - `useAuth()` hook with user, isAuthenticated, isLoading, login, register, logout, validateInviteCode
   - Uses `signIn`/`signOut` from next-auth/react for proper CSRF handling
   - Auto-fetches session on mount

5. **`/src/lib/api.ts`** — API client wrapper:
   - `apiFetch<T>()` — Generic fetch wrapper with credentials, error handling, 401/403 handling
   - `apiUpload<T>()` — FormData upload helper
   - `ApiError` class for typed error handling

6. **`/src/middleware.ts`** — Auth middleware:
   - Protects all `/api/` routes (except `/api/auth/*`)
   - Requires authentication for API access
   - Admin-only routes: `/api/users`, `/api/invite-codes`, `/api/stats`
   - JWT token validation via next-auth/jwt

7. **API Routes (17 route files):**
   - `/api/auth/[...nextauth]/route.ts` — NextAuth handler
   - `/api/auth/register/route.ts` — Register with invite code
   - `/api/auth/invite/validate/route.ts` — Validate invite code
   - `/api/products/route.ts` — GET (list), POST (create)
   - `/api/products/[id]/route.ts` — GET, PUT, DELETE
   - `/api/groups/route.ts` — GET (list with enrichment), POST (create with items)
   - `/api/groups/[id]/route.ts` — GET (with items/receipts), PUT, DELETE
   - `/api/groups/[id]/items/route.ts` — POST (add items)
   - `/api/groups/[id]/items/[itemId]/route.ts` — PUT, DELETE
   - `/api/groups/[id]/receipts/route.ts` — GET, POST (file upload)
   - `/api/receipts/[id]/route.ts` — DELETE (with file cleanup)
   - `/api/users/route.ts` — GET (admin only)
   - `/api/users/[id]/route.ts` — PUT (admin only)
   - `/api/invite-codes/route.ts` — GET (admin), POST (admin, generate code)
   - `/api/stats/route.ts` — GET (admin, byProducts + byUsers)
   - `/api/upload/route.ts` — POST (generic file upload)

### Files Modified

8. **`/src/app/page.tsx`** — Replaced demo switcher with real auth:
   - Removed `DemoStateContext` and `useDemoState` export
   - Added `AuthProvider` wrapping `RouterProvider`
   - `AppContent` uses `useAuth()` for auth state
   - Role mapping: ADMIN→admin, MODERATOR→moderator, USER→user
   - Loading spinner during session check
   - Clean logout flow via `signOut`

9. **`/src/components/layout/AppHeader.tsx`** — Updated for real auth:
   - Uses `UserRole` from `@/lib/auth-context` instead of mock-data
   - Nav items mapped to ADMIN/MODERATOR/USER roles
   - Displays real user name in header
   - Logout via `signOut` from next-auth/react

10. **`/src/components/layout/AppLayout.tsx`** — Updated for real auth:
    - Accepts `userName` prop
    - Uses `UserRole` from auth-context

11. **`/src/components/pages/InvitePage.tsx`** — Real API integration:
    - Uses `validateInviteCode` from auth context
    - Passes code and codeRole to register page

12. **`/src/components/pages/RegisterPage.tsx`** — Real API integration:
    - Uses `register` from auth context (auto-login after registration)
    - Displays role from invite code

13. **`/src/components/pages/LoginPage.tsx`** — Real API integration:
    - Uses `login` from auth context (next-auth signIn)
    - Error handling for invalid credentials

14. **`/src/components/pages/UserGroupsPage.tsx`** — Real API integration:
    - Fetches groups from `/api/groups` on mount
    - Loading/empty/data states with React state

15. **`/src/components/pages/GroupDetailPage.tsx`** — Real API integration:
    - Fetches group detail from `/api/groups/[id]` with items and receipts
    - Real purchase quantity updates via PUT API
    - Real receipt upload via POST with FormData
    - Receipt deletion via DELETE API

16. **`/src/components/pages/AdminProductsPage.tsx`** — Real API integration:
    - Fetches products from `/api/products`
    - Real delete via DELETE API with confirmation

17. **`/src/components/pages/ProductFormPage.tsx`** — Real API integration:
    - Fetches product for editing from `/api/products/[id]`
    - Create via POST, update via PUT
    - Thumbnail upload via `/api/upload`

18. **`/src/components/pages/AdminGroupsPage.tsx`** — Real API integration:
    - Fetches groups and users from API
    - Status filter uses ACTIVE/COMPLETED enum values

19. **`/src/components/pages/GroupFormPage.tsx`** — Real API integration:
    - Fetches users and products from API
    - Group create via POST, update via PUT
    - Discount card upload via `/api/upload`

20. **`/src/components/pages/AdminUsersPage.tsx`** — Real API integration:
    - Fetches users from `/api/users`
    - Edit dialog saves via PUT API
    - Block/unblock via PUT API
    - Shows block status badge

21. **`/src/components/pages/InviteCodesPage.tsx`** — Real API integration:
    - Fetches codes from `/api/invite-codes`
    - Generate via POST API (server-side code generation)
    - Copy to clipboard functionality

22. **`/src/components/pages/StatsPage.tsx`** — Real API integration:
    - Fetches stats from `/api/stats`
    - Summary cards and tables from real data

23. **`/package.json`** — Added seed scripts:
    - `"db:seed": "bun prisma/db seed"`
    - `"prisma:seed": "bun prisma/seed.ts"`
    - Prisma seed configuration

24. **`/.env`** — Added NextAuth environment variables:
    - `NEXTAUTH_URL=http://localhost:3000`
    - `NEXTAUTH_SECRET=dev-secret-change-in-production`

### Key Architecture Decisions

- **Database**: SQLite via Prisma ORM (autoincrement integer IDs)
- **Auth**: NextAuth.js v4 with Credentials provider, JWT strategy
- **API Design**: RESTful routes with role-based access control
- **Frontend**: Kept client-side routing (SPA pattern) but wired to real API
- **File Uploads**: Saved to `/public/uploads/` with multipart form data
- **Password**: Plain text comparison for development (bcrypt recommended for production)
- **Role System**: Three-tier (ADMIN > MODERATOR > USER) with middleware enforcement

## Entry 3 — 2026-03-05: Networks management + custom favicon

### Summary
Added a Network model and full CRUD management for store networks (Сети магазинов), replacing hardcoded network lists across the app with data loaded from the API. Also added a custom AI-generated favicon.

### Files Created

1. **`/src/app/api/networks/route.ts`** — Networks API (list + create):
   - GET — list all networks (any authenticated user)
   - POST — create network (admin/moderator only), unique name validation

2. **`/src/app/api/networks/[id]/route.ts`** — Networks API (update + delete):
   - PUT — update network name (admin only), unique name validation
   - DELETE — delete network (admin only), checks if used by products/groups before allowing deletion

3. **`/src/components/pages/AdminNetworksPage.tsx`** — Admin networks management page:
   - Title: "Сети магазинов"
   - Desktop table with columns: ID, Название, Дата создания, Действия (Редактировать, Удалить)
   - Mobile card layout
   - "Добавить сеть" button
   - Add/Edit dialog with name field
   - Delete confirmation dialog with usage check error display
   - Empty state and loading skeleton

4. **`/public/favicon.png`** — AI-generated favicon (shopping cart with checkmark, emerald green)

### Files Modified

5. **`/prisma/schema.prisma`** — Added Network model:
   - `id` (Int, autoincrement PK)
   - `name` (String, unique)
   - `createdAt` (DateTime, default now())
   - Kept existing `network` string fields in Product and PurchaseGroup as-is

6. **`/prisma/seed.ts`** — Added Network seeding:
   - Inserted 5 networks: Магнит, Пятёрочка, Лента, Перекрёсток, Ашан
   - Added `network.deleteMany()` to cleanup

7. **`/src/app/layout.tsx`** — Updated favicon:
   - Changed icon from `https://z-cdn.chatglm.cn/z-ai/static/logo.svg` to `/favicon.png`
   - Title remains "Purchase Tracker — Система учёта закупок"

8. **`/src/lib/mock-data.ts`** — Removed `export const networks = [...]` line (now loaded from API)

9. **`/src/lib/router-context.tsx`** — Added "admin-networks" to `PageName` type

10. **`/src/components/layout/AppHeader.tsx`** — Added "Сети магазинов" nav item for ADMIN role (between "Товары" and "Пользователи")

11. **`/src/app/page.tsx`** — Added `AdminNetworksPage` import and "admin-networks" case in PageRenderer

12. **`/src/middleware.ts`** — Added `/api/networks` to the moderator/admin routes list

13. **`/src/components/pages/AdminProductsPage.tsx`** — Networks now loaded from `/api/networks` instead of derived from products

14. **`/src/components/pages/ProductFormPage.tsx`** — Networks now loaded from `/api/networks` for the network select field (replaced hardcoded array)

15. **`/src/components/pages/AdminGroupsPage.tsx`** — Networks now loaded from `/api/networks` for the filter dropdown

16. **`/src/components/pages/GroupFormPage.tsx`** — Networks now loaded from `/api/networks` for both the group network select and the product search filter
