"use client";

import { useState, createContext, useContext } from "react";
import { RouterProvider, useRouterContext, type PageName } from "@/lib/router-context";
import type { UserRole } from "@/lib/mock-data";
import { AppLayout } from "@/components/layout/AppLayout";
import { InvitePage } from "@/components/pages/InvitePage";
import { RegisterPage } from "@/components/pages/RegisterPage";
import { LoginPage } from "@/components/pages/LoginPage";
import { UserGroupsPage } from "@/components/pages/UserGroupsPage";
import { GroupDetailPage } from "@/components/pages/GroupDetailPage";
import { AdminProductsPage } from "@/components/pages/AdminProductsPage";
import { ProductFormPage } from "@/components/pages/ProductFormPage";
import { AdminGroupsPage } from "@/components/pages/AdminGroupsPage";
import { GroupFormPage } from "@/components/pages/GroupFormPage";
import { AdminUsersPage } from "@/components/pages/AdminUsersPage";
import { InviteCodesPage } from "@/components/pages/InviteCodesPage";
import { StatsPage } from "@/components/pages/StatsPage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, ToggleLeft, ToggleRight, ChevronUp } from "lucide-react";

// Demo state context for toggling loading/empty/loaded states
type DemoState = "loaded" | "loading" | "empty";

interface DemoStateContextType {
  demoState: DemoState;
  setDemoState: (state: DemoState) => void;
}

const DemoStateContext = createContext<DemoStateContextType>({
  demoState: "loaded",
  setDemoState: () => {},
});

export function useDemoState() {
  return useContext(DemoStateContext);
}

// Role type
type Role = UserRole | "guest";

const roleLabels: Record<Role, string> = {
  guest: "Гость",
  user: "Пользователь",
  moderator: "Модератор",
  admin: "Админ",
};

function PageRenderer() {
  const { currentPage } = useRouterContext();

  switch (currentPage) {
    case "invite":
      return <InvitePage />;
    case "register":
      return <RegisterPage />;
    case "login":
      return <LoginPage />;
    case "groups":
      return <UserGroupsPage />;
    case "group-detail":
      return <GroupDetailPage />;
    case "admin-products":
      return <AdminProductsPage />;
    case "product-form":
      return <ProductFormPage />;
    case "admin-groups":
      return <AdminGroupsPage />;
    case "group-form":
      return <GroupFormPage />;
    case "admin-users":
      return <AdminUsersPage />;
    case "invite-codes":
      return <InviteCodesPage />;
    case "stats":
      return <StatsPage />;
    default:
      return <InvitePage />;
  }
}

function AppContent() {
  const { navigate } = useRouterContext();
  const [role, setRole] = useState<Role>("guest");
  const [demoState, setDemoState] = useState<DemoState>("loaded");
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const handleLogout = () => {
    setRole("guest");
    navigate("invite");
  };

  const handleLogin = () => {
    setRole("user");
    navigate("groups", { userId: 3 });
  };

  const handleInvite = () => {
    navigate("invite");
  };

  const handleRoleSwitch = (newRole: Role) => {
    setRole(newRole);
    setSwitcherOpen(false);
    if (newRole === "guest") {
      navigate("invite");
    } else if (newRole === "user") {
      navigate("groups", { userId: 3 });
    } else if (newRole === "moderator") {
      navigate("admin-groups");
    } else if (newRole === "admin") {
      navigate("admin-groups");
    }
  };

  return (
    <DemoStateContext.Provider value={{ demoState, setDemoState }}>
      <AppLayout role={role} onLogout={handleLogout} onLogin={handleLogin} onInvite={handleInvite}>
        <PageRenderer />
      </AppLayout>

      {/* Floating role switcher pill */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {switcherOpen && (
          <div className="bg-card border rounded-xl shadow-xl p-3 space-y-2 min-w-[200px] animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
            <p className="text-xs font-semibold text-muted-foreground px-1 mb-1">Роль:</p>
            {(Object.keys(roleLabels) as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => handleRoleSwitch(r)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  role === r
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {roleLabels[r]}
              </button>
            ))}
            <div className="border-t my-1" />
            <p className="text-xs font-semibold text-muted-foreground px-1 mb-1">Состояние:</p>
            <div className="flex gap-1 px-1">
              {(["loaded", "loading", "empty"] as DemoState[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setDemoState(s)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    demoState === s
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {s === "loaded" ? "Данные" : s === "loading" ? "Загрузка" : "Пусто"}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => setSwitcherOpen(!switcherOpen)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Users className="h-4 w-4" />
          <span className="text-sm font-medium">{roleLabels[role]}</span>
          <ChevronUp className={`h-4 w-4 transition-transform ${switcherOpen ? "" : "rotate-180"}`} />
        </button>
      </div>
    </DemoStateContext.Provider>
  );
}

export default function Home() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}
