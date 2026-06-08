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
