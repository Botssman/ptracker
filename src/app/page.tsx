"use client";

import { RouterProvider, useRouterContext, type PageName } from "@/lib/router-context";
import { AuthProvider, useAuth, type UserRole } from "@/lib/auth-context";
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
import { AdminNetworksPage } from "@/components/pages/AdminNetworksPage";
import { AdminUsersPage } from "@/components/pages/AdminUsersPage";
import { InviteCodesPage } from "@/components/pages/InviteCodesPage";
import { StatsPage } from "@/components/pages/StatsPage";

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
    case "admin-networks":
      return <AdminNetworksPage />;
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
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const role: UserRole | "guest" = !isAuthenticated
    ? "guest"
    : user?.role === "ADMIN"
      ? "ADMIN"
      : user?.role === "MODERATOR"
        ? "MODERATOR"
        : "USER";

  const handleLogout = async () => {
    await logout();
    navigate("invite");
  };

  const handleLogin = () => {
    navigate("login");
  };

  const handleInvite = () => {
    navigate("invite");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout role={role} onLogout={handleLogout} onLogin={handleLogin} onInvite={handleInvite} userName={user?.name}>
      <PageRenderer />
    </AppLayout>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </AuthProvider>
  );
}
